-- =============================================================================
-- HELIGXIAM — Schéma OPÉRATEUR / ADMIN (PostgreSQL 14+)
-- À exécuter APRÈS : heligxiam_marketplace_core.sql
--
-- Rôle : comptes console (/admin), files KYC, modération, audit, messagerie
-- vendeur↔opérateur, paramètres globaux (santé, pondérations), alignement
-- avec les écrans « Espace vendeurs » (Annuaire, Activation, Profil, Santé).
--
-- NoSQL (hors de ce script, recommandé en prod) :
--   • Redis : sessions opérateur, file courtes, rate limits, compteurs temps réel
--   • Elasticsearch / OpenSearch : recherche full-text annuaire, logs
--   • S3-compatible : binaires KYC, factures, exports (métadonnées ici, objet là)
--   • Event bus (Kafka, RabbitMQ) : asynchrone, hors schéma relationnel
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0) Compléments sur le schéma vendeur (enums + onboarding)
-- -----------------------------------------------------------------------------

-- Statuts boutique : aligner avec l’UI admin (activation, KYC en cours, etc.)
-- Compatible PG 14 (pas d’ADD VALUE IF NOT EXISTS avant PG 15)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'statut_boutique' AND e.enumlabel = 'kyc_en_cours'
  ) THEN
    ALTER TYPE statut_boutique ADD VALUE 'kyc_en_cours';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'statut_boutique' AND e.enumlabel = 'en_attente_activation'
  ) THEN
    ALTER TYPE statut_boutique ADD VALUE 'en_attente_activation';
  END IF;
END $$;

COMMENT ON TYPE statut_boutique IS
  'Valeurs possibles côté prod : brouillon, kyc_en_attente | kyc_en_cours, en_attente_activation, active, suspendue, fermee.';

-- Onboarding 0 % → 100 % : manquait l’étape « plan d’abonnement »
ALTER TABLE etapes_onboarding_boutique
  ADD COLUMN IF NOT EXISTS plan_abonnement_valide  BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE etapes_onboarding_boutique
  ADD COLUMN IF NOT EXISTS pourcentage_avancement   SMALLINT NOT NULL DEFAULT 0
    CHECK (pourcentage_avancement >= 0 AND pourcentage_avancement <= 100);
ALTER TABLE etapes_onboarding_boutique
  ADD COLUMN IF NOT EXISTS date_pret_activation    TIMESTAMPTZ;
COMMENT ON COLUMN etapes_onboarding_boutique.pourcentage_avancement IS
  'Dérivé des boolean ou recalculé côté API ; le vendeur + admin le voient (barre 0–100).';

-- Dossier KYC : file opé (une ligne par soumission, reliée à la boutique)
DO $$ BEGIN
  CREATE TYPE statut_dossier_kyc AS ENUM (
    'brouillon',
    'soumis',
    'en_analyse',
    'pieces_manquantes',
    'valide',
    'refuse'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS dossiers_conformite_kyc (
  identifiant          BIGSERIAL PRIMARY KEY,
  identifiant_boutique  BIGINT NOT NULL REFERENCES boutiques (identifiant) ON DELETE CASCADE,
  reference_publique   VARCHAR(32) NOT NULL UNIQUE, -- ex. KYC-2041
  statut                statut_dossier_kyc NOT NULL DEFAULT 'soumis',
  date_soumission       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_derniere_action  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  commentaire_interne  TEXT
);
CREATE INDEX IF NOT EXISTS idx_dossier_kyc_boutique
  ON dossiers_conformite_kyc (identifiant_boutique);
CREATE INDEX IF NOT EXISTS idx_dossier_kyc_statut
  ON dossiers_conformite_kyc (statut, date_soumission);

COMMENT ON TABLE dossiers_conformite_kyc IS
  'File opé : une entrée (ou version) de dossier KYC liée aux documents (documents_conformite_boutique).';

-- Lien logique (optionnel) document → dossier
ALTER TABLE documents_conformite_boutique
  ADD COLUMN IF NOT EXISTS identifiant_dossier_kyc BIGINT
    REFERENCES dossiers_conformite_kyc (identifiant) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_doc_conf_dossier
  ON documents_conformite_boutique (identifiant_dossier_kyc);

-- -----------------------------------------------------------------------------
-- 1) Comptes opérateur & rôles
-- -----------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE role_operateur AS ENUM (
    'super_admin',
    'admin',
    'moderateur',
    'support',
    'finance',
    'conformite',
    'lecture_seule'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE comptes_operateur (
  identifiant         BIGSERIAL PRIMARY KEY,
  courriel            VARCHAR(255) NOT NULL UNIQUE,
  mot_de_passe_hache  TEXT NOT NULL,
  prenom              VARCHAR(100),
  nom                 VARCHAR(100),
  actif               BOOLEAN NOT NULL DEFAULT TRUE,
  role_primaire        role_operateur NOT NULL DEFAULT 'conformite',
  date_creation       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_mise_a_jour    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE comptes_operateur IS
  'Identités console HELIGXIAM. Les permissions fines se gèrent par role_primaire + (option) table de délégation.';

-- Droit optionnel : plusieurs rôles par opé
CREATE TABLE roles_secondaires_operateur (
  identifiant_operateur BIGINT NOT NULL REFERENCES comptes_operateur (identifiant) ON DELETE CASCADE,
  role                   role_operateur NOT NULL,
  PRIMARY KEY (identifiant_operateur, role)
);

-- -----------------------------------------------------------------------------
-- 2) Modération produits (qui a décidé, quand) — complète file_moderation_produits
-- -----------------------------------------------------------------------------

ALTER TABLE file_moderation_produits
  ADD COLUMN IF NOT EXISTS identifiant_moderateur BIGINT
    REFERENCES comptes_operateur (identifiant) ON DELETE SET NULL;
ALTER TABLE file_moderation_produits
  ADD COLUMN IF NOT EXISTS date_decision TIMESTAMPTZ;
ALTER TABLE file_moderation_produits
  ADD COLUMN IF NOT EXISTS commentaire_moderation TEXT;

-- -----------------------------------------------------------------------------
-- 3) Journal d’audit (KYC, activation boutique, forçage vérif, santé, annuaire)
-- -----------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE type_evenement_audit AS ENUM (
    'kyc',
    'moderation_produit',
    'activation_boutique',
    'onboarding_manuel',
    'profil_forcage_verif',
    'sante_recalcul',
    'compte_alerte',
    'retour',
    'msg_operateur',
    'autre'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE journal_audit_operateur (
  identifiant            BIGSERIAL PRIMARY KEY,
  identifiant_operateur  BIGINT NOT NULL REFERENCES comptes_operateur (identifiant) ON DELETE RESTRICT,
  type_evenement         type_evenement_audit NOT NULL,
  cible_type             VARCHAR(64) NOT NULL, -- ex. boutique, compte_vendeur, produit, dossier_kyc
  cible_id               VARCHAR(64) NOT NULL, -- ex. id numérique en texte, ou référence publique
  identifiant_boutique   BIGINT REFERENCES boutiques (identifiant) ON DELETE SET NULL,
  details_json           JSONB,
  adresse_ip             INET,
  date_action            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_oper_boutique ON journal_audit_operateur (identifiant_boutique, date_action);
CREATE INDEX idx_audit_oper_type ON journal_audit_operateur (type_evenement, date_action);

COMMENT ON TABLE journal_audit_operateur IS
  'Traçabilité légale / interne : chaque action sensible de la console (aligné admin-dashboard démo).';

-- -----------------------------------------------------------------------------
-- 4) Forçage manuel des étapes onboarding (après relecture des preuves)
-- -----------------------------------------------------------------------------

CREATE TABLE validations_onboarding_manuelles (
  identifiant            BIGSERIAL PRIMARY KEY,
  identifiant_boutique   BIGINT NOT NULL REFERENCES boutiques (identifiant) ON DELETE CASCADE,
  code_etape             VARCHAR(32) NOT NULL, -- plan, documents, profil, produits, livraison, compte_bancaire
  valide                 BOOLEAN NOT NULL,
  identifiant_operateur  BIGINT NOT NULL REFERENCES comptes_operateur (identifiant) ON DELETE RESTRICT,
  commentaire            TEXT,
  date_action            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (identifiant_boutique, code_etape, date_action)
);
CREATE INDEX idx_val_onb_boutique ON validations_onboarding_manuelles (identifiant_boutique);

COMMENT ON TABLE validations_onboarding_manuelles IS
  'Équivalent « Basculer (interne) » : ne remplace pas etapes_onboarding_boutique mais historise l’acte.';

-- -----------------------------------------------------------------------------
-- 5) Paramètres globaux plateforme (santé : pondérations, seuils) — modifiables admin
-- -----------------------------------------------------------------------------

CREATE TABLE parametres_plateforme (
  cle                  VARCHAR(128) PRIMARY KEY,
  valeur_json          JSONB NOT NULL,
  description          TEXT,
  date_mise_a_jour     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO parametres_plateforme (cle, valeur_json, description) VALUES
  (
    'sante_ponderations',
    '{
      "delais_expedition": 0.22,
      "taux_reclamation": 0.2,
      "taux_reponse_messagerie": 0.2,
      "taux_retours": 0.15,
      "taux_annulations": 0.1,
      "conformite_listings": 0.13
    }',
    'Poids des critères pour le recalcul du score sante_compte_courant (écran admin Santé).'
  ),
  (
    'seuils_sante_niveau',
    '{
      "excellent_min": 90,
      "bon_min": 70,
      "a_surveiller_min": 50
    }',
    'Seuils pour le mapping score → niveau (niveau_sante_compte).'
  )
ON CONFLICT (cle) DO UPDATE SET
  valeur_json = EXCLUDED.valeur_json,
  date_mise_a_jour = NOW();

-- -----------------------------------------------------------------------------
-- 6) Comptes & alertes (revue de comptes) — côté opé
-- -----------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE type_compte_suspect AS ENUM ('client', 'vendeur');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE statut_dossier_compte_suspect AS ENUM ('ouvert', 'en_cours', 'cloture');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE dossiers_compte_suspect (
  identifiant            BIGSERIAL PRIMARY KEY,
  reference               VARCHAR(32) NOT NULL UNIQUE, -- ex. AR-441
  type_compte            type_compte_suspect NOT NULL,
  courriel_masque        VARCHAR(255) NOT NULL,
  identifiant_boutique   BIGINT REFERENCES boutiques (identifiant) ON DELETE SET NULL,
  identifiant_compte_client BIGINT, -- logique, schéma client ailleurs
  raison                 TEXT,
  priorite                VARCHAR(32),
  statut                 statut_dossier_compte_suspect NOT NULL DEFAULT 'ouvert',
  identifiant_assigne     BIGINT REFERENCES comptes_operateur (identifiant) ON DELETE SET NULL,
  date_ouverture         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_cloture            TIMESTAMPTZ
);
CREATE INDEX idx_doss_suspect_boutique ON dossiers_compte_suspect (identifiant_boutique);
CREATE INDEX idx_doss_suspect_statut ON dossiers_compte_suspect (statut, date_ouverture);

-- -----------------------------------------------------------------------------
-- 7) Messagerie opérateur ↔ vendeur (complète tickets_support côté vendeur)
-- -----------------------------------------------------------------------------

CREATE TABLE conversations_operateur_vendeur (
  identifiant            BIGSERIAL PRIMARY KEY,
  identifiant_boutique   BIGINT NOT NULL REFERENCES boutiques (identifiant) ON DELETE CASCADE,
  identifiant_vendeur     BIGINT NOT NULL REFERENCES comptes_vendeur (identifiant) ON DELETE CASCADE,
  sujet                  VARCHAR(500),
  statut                 VARCHAR(32) NOT NULL DEFAULT 'ouvert', -- ouvert, en_cours, resolu, ferme
  identifiant_dernier_operateur BIGINT REFERENCES comptes_operateur (identifiant) ON DELETE SET NULL,
  date_dernier_message   TIMESTAMPTZ,
  date_creation          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_conv_op_vend_boutique ON conversations_operateur_vendeur (identifiant_boutique);
CREATE INDEX idx_conv_op_vend_vendeur ON conversations_operateur_vendeur (identifiant_vendeur);

CREATE TABLE messages_operateur_vendeur (
  identifiant              BIGSERIAL PRIMARY KEY,
  identifiant_conversation  BIGINT NOT NULL
    REFERENCES conversations_operateur_vendeur (identifiant) ON DELETE CASCADE,
  expediteur_type          VARCHAR(16) NOT NULL, -- operateur, vendeur
  identifiant_expediteur   BIGINT NOT NULL, -- comptes_operateur ou comptes_vendeur
  contenu                  TEXT NOT NULL,
  piece_jointe_url         TEXT,
  lu_cote_vendeur          BOOLEAN NOT NULL DEFAULT FALSE,
  lu_cote_operateur        BOOLEAN NOT NULL DEFAULT FALSE,
  date_envoi               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_msg_opv_conv ON messages_operateur_vendeur (identifiant_conversation, date_envoi);

-- -----------------------------------------------------------------------------
-- 8) Litiges (vue admin) — si pas dans un autre schéma, squelette
-- -----------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE statut_litige AS ENUM (
    'ouvert',
    'en_mediation',
    'resolu',
    'cloture'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE litiges_plateforme (
  identifiant            BIGSERIAL PRIMARY KEY,
  reference               VARCHAR(32) NOT NULL UNIQUE, -- ex. LP-30211
  identifiant_commande    BIGINT NOT NULL, -- logique, peut FK vers commandes_boutique si même DB
  identifiant_boutique    BIGINT NOT NULL REFERENCES boutiques (identifiant) ON DELETE RESTRICT,
  identifiant_acheteur    BIGINT NOT NULL,
  sujet                  TEXT,
  statut                 statut_litige NOT NULL DEFAULT 'ouvert',
  identifiant_mediarice   BIGINT REFERENCES comptes_operateur (identifiant) ON DELETE SET NULL,
  date_ouverture         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_resolution        TIMESTAMPTZ
);
CREATE INDEX idx_litige_boutique ON litiges_plateforme (identifiant_boutique, statut);

-- -----------------------------------------------------------------------------
-- 9) Notifications & centre opé (file transverse) — comptage / priorités
-- -----------------------------------------------------------------------------

CREATE TABLE notifications_operateur (
  identifiant            BIGSERIAL PRIMARY KEY,
  identifiant_operateur  BIGINT REFERENCES comptes_operateur (identifiant) ON DELETE CASCADE,
  type                   VARCHAR(32) NOT NULL, -- kyc, moderation, compte, litige, systeme
  titre                  VARCHAR(255) NOT NULL,
  texte                  TEXT,
  type_reference         VARCHAR(32),
  identifiant_reference  BIGINT,
  lue                    BOOLEAN NOT NULL DEFAULT FALSE,
  date_creation          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notif_op_lue ON notifications_operateur (identifiant_operateur, lue, date_creation);

-- -----------------------------------------------------------------------------
-- 10) Vues pratiques pour l’API admin (exemples)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW vue_annuaire_boutique_admin AS
SELECT
  b.identifiant,
  b.slug,
  b.nom_affichage,
  b.raison_sociale,
  b.siret,
  b.statut,
  c.courriel AS courriel_pro,
  c.telephone,
  p.courriel_verifie,
  p.telephone_verifie,
  (SELECT COUNT(*)::INT FROM produits pr WHERE pr.identifiant_boutique = b.identifiant) AS nombre_lignes_catalogue,
  s.score_global AS sante_pourcent,
  s.niveau AS sante_niveau,
  b.date_mise_a_jour
FROM boutiques b
JOIN comptes_vendeur c ON c.identifiant = b.identifiant_vendeur
LEFT JOIN profils_vendeur p ON p.identifiant_vendeur = c.identifiant
LEFT JOIN sante_compte_courant s ON s.identifiant_boutique = b.identifiant;

COMMENT ON VIEW vue_annuaire_boutique_admin IS
  'Jointure annuaire : une ligne par boutique pour les listes admin (filtrer côté API par statut, recherche, etc.).';

-- =============================================================================
-- Fin — schéma OPÉRATEUR (dépend de heligxiam_marketplace_core.sql)
-- =============================================================================
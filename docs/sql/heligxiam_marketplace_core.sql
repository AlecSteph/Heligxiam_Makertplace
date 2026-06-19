-- =============================================================================
-- HELIGXIAM — Schéma SQL VENDEUR UNIQUEMENT (PostgreSQL 14+)
-- Tables et colonnes en français. Le « compte acheteur » n’est référencé
-- qu’en identifiant (pas de table client dans ce script).
-- Couverture : navigation vendeur (catalogue, stock, logistique, commandes, prix,
-- pub, international, rapports, trafic, santé compte, growth coach, compte, etc.)
-- Exécution : psql -f heligxiam_marketplace_core.sql
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- Types énumérés (libellés en français, valeurs en snake_case)
-- -----------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE statut_boutique AS ENUM (
    'brouillon',
    'kyc_en_attente',
    'active',
    'suspendue',
    'fermee'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE statut_moderation_produit AS ENUM (
    'brouillon',
    'en_attente_moderation',
    'publie',
    'refuse',
    'archive'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE statut_ligne_commande AS ENUM (
    'en_attente_paiement',
    'payee',
    'a_expedier',
    'expediee',
    'livree',
    'annulee',
    'remboursee'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE statut_retour AS ENUM (
    'demande',
    'accepte',
    'refuse',
    'en_transit',
    'recu',
    'rembourse',
    'cloture'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE statut_document_conformite AS ENUM ('en_attente', 'valide', 'refuse');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- 1) Compte vendeur (seule table « compte » dans ce script)
-- -----------------------------------------------------------------------------

CREATE TABLE comptes_vendeur (
  identifiant        BIGSERIAL PRIMARY KEY,
  courriel           VARCHAR(255) NOT NULL UNIQUE,
  mot_de_passe_hache TEXT NOT NULL,
  prenom             VARCHAR(100),
  nom                VARCHAR(100),
  telephone          VARCHAR(32),
  actif              BOOLEAN NOT NULL DEFAULT TRUE,
  date_creation      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_mise_a_jour   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE comptes_vendeur IS
  'Compte professionnel vendeur (connexion /seller).';

-- -----------------------------------------------------------------------------
-- 1 bis) Profil vendeur (consultation, mise à jour et vérification des infos)
-- -----------------------------------------------------------------------------

CREATE TABLE profils_vendeur (
  identifiant_vendeur BIGINT PRIMARY KEY
    REFERENCES comptes_vendeur (identifiant) ON DELETE CASCADE,
  /* Présentation (écran « Mon profil ») */
  url_photo                 TEXT,
  biographie                TEXT,
  poste_ou_fonction         VARCHAR(128),
  site_web                  TEXT,
  /* Paramètres d’affichage */
  langue_interface          VARCHAR(8) NOT NULL DEFAULT 'fr',
  fuseau_horaire            VARCHAR(64) NOT NULL DEFAULT 'Europe/Paris',
  /* Vérification des moyens de contact (e-mail = compte, téléphone) */
  courriel_verifie          BOOLEAN NOT NULL DEFAULT FALSE,
  date_verification_courriel TIMESTAMPTZ,
  jeton_verification_courriel_expiration TIMESTAMPTZ, -- en attente de clic dans le mail
  telephone_verifie         BOOLEAN NOT NULL DEFAULT FALSE,
  date_verification_telephone TIMESTAMPTZ,
  code_pays_telephone       CHAR(2),                 -- ex. +33
  /* Adresse de correspondance (personne / siège, distincte de la fiche légale boutique) */
  adresse_ligne1            VARCHAR(255),
  adresse_ligne2            VARCHAR(255),
  ville                     VARCHAR(128),
  code_postal               VARCHAR(16),
  code_pays                 CHAR(2),
  /* Préférences (notifications, affichage) */
  preferences_json          JSONB,
  /* Conformité & consentements (à afficher / faire accepter dans le profil) */
  version_cgu_acceptee      VARCHAR(32),
  date_acceptation_cgu      TIMESTAMPTZ,
  version_chartes_donnees   VARCHAR(32),
  date_acceptation_charte_donnees TIMESTAMPTZ,
  /* Horodatage */
  profil_complet            BOOLEAN NOT NULL DEFAULT FALSE, -- toutes les infos obligatoires saisies
  date_mise_a_jour          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE profils_vendeur IS
  'Profil : informations personnelles visibles/éditables par le vendeur, état de vérification (courriel, téléphone) et adresse. À relier côté app à l’écran de profil.';

COMMENT ON COLUMN profils_vendeur.courriel_verifie IS
  'Indique que le courriel du compte a été vérifié (lien ou code).';
COMMENT ON COLUMN profils_vendeur.telephone_verifie IS
  'Indique que le numéro a été vérifié (SMS, double opt-in, etc.).';
COMMENT ON COLUMN profils_vendeur.preferences_json IS
  'Ex. {"courriel_commande": true, "couriel_promotions": false, "sms_urgence": true}.';
COMMENT ON COLUMN profils_vendeur.profil_complet IS
  'Bascule vrai lorsque le vendeur a rempli les champs obligatoires de la fiche.';

-- Traçabilité : le vendeur « confirme à nouveau » des données sensibles (audit léger, optionnel)
CREATE TABLE historique_relectures_profil (
  identifiant        BIGSERIAL PRIMARY KEY,
  identifiant_vendeur BIGINT NOT NULL
    REFERENCES comptes_vendeur (identifiant) ON DELETE CASCADE,
  type_relecture     VARCHAR(64) NOT NULL, -- ex. donnees_personnelles, rib_boutique, cgu
  adresse_ip         INET,
  user_agent         TEXT,
  date_action        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_historique_relecture_vendeur
  ON historique_relectures_profil (identifiant_vendeur, date_action);

COMMENT ON TABLE historique_relectures_profil IS
  'Journal des actions « j’ai relu / je confirme mes informations » (RGPD, audit interne).';

-- -----------------------------------------------------------------------------
-- 2) Marché & boutique
-- -----------------------------------------------------------------------------

CREATE TABLE marches (
  identifiant   SMALLSERIAL PRIMARY KEY,
  code_pays     CHAR(2) NOT NULL UNIQUE,
  libelle       VARCHAR(100) NOT NULL,
  devise        CHAR(3) NOT NULL DEFAULT 'EUR',
  domaine_boutique VARCHAR(128)
);

COMMENT ON TABLE marches IS
  'Boutique en ligne côté vendeur (France, Allemagne, etc.).';

CREATE TABLE boutiques (
  identifiant            BIGSERIAL PRIMARY KEY,
  identifiant_vendeur    BIGINT NOT NULL REFERENCES comptes_vendeur (identifiant) ON DELETE RESTRICT,
  slug                   VARCHAR(128) NOT NULL UNIQUE,
  raison_sociale         VARCHAR(255) NOT NULL,
  nom_affichage          VARCHAR(255),
  identifiant_marche_defaut SMALLINT REFERENCES marches (identifiant),
  code_pays              CHAR(2),
  numero_tva             VARCHAR(32),
  siret                  VARCHAR(32),
  statut                 statut_boutique NOT NULL DEFAULT 'brouillon',
  politique_retours      TEXT,
  retours_auto_acceptes  BOOLEAN NOT NULL DEFAULT TRUE,
  date_creation          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_mise_a_jour      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_boutiques_vendeur ON boutiques (identifiant_vendeur);
CREATE INDEX idx_boutiques_statut ON boutiques (statut);

COMMENT ON TABLE boutiques IS
  'Boutique marchande : cœur du périmètre vendeur.';

CREATE TABLE reglages_marche_boutique (
  identifiant         BIGSERIAL PRIMARY KEY,
  identifiant_boutique BIGINT NOT NULL REFERENCES boutiques (identifiant) ON DELETE CASCADE,
  identifiant_marche  SMALLINT NOT NULL REFERENCES marches (identifiant),
  actif               BOOLEAN NOT NULL DEFAULT FALSE,
  reglementation_tva  VARCHAR(32),
  UNIQUE (identifiant_boutique, identifiant_marche)
);

CREATE TABLE etapes_onboarding_boutique (
  identifiant_boutique BIGINT PRIMARY KEY REFERENCES boutiques (identifiant) ON DELETE CASCADE,
  documents_kyc_ok     BOOLEAN NOT NULL DEFAULT FALSE,
  profil_complet         BOOLEAN NOT NULL DEFAULT FALSE,
  premier_produits_ok    BOOLEAN NOT NULL DEFAULT FALSE,
  frais_livraison_ok     BOOLEAN NOT NULL DEFAULT FALSE,
  compte_bancaire_ok     BOOLEAN NOT NULL DEFAULT FALSE,
  date_mise_a_jour       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE documents_conformite_boutique (
  identifiant         BIGSERIAL PRIMARY KEY,
  identifiant_boutique BIGINT NOT NULL REFERENCES boutiques (identifiant) ON DELETE CASCADE,
  type_document         VARCHAR(64) NOT NULL, -- ex. kbis, identite, rib
  url_fichier          TEXT NOT NULL,
  statut               statut_document_conformite NOT NULL DEFAULT 'en_attente',
  date_deposit         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_doc_conf_boutique ON documents_conformite_boutique (identifiant_boutique);

CREATE TABLE parametres_versement (
  identifiant_boutique BIGINT PRIMARY KEY REFERENCES boutiques (identifiant) ON DELETE CASCADE,
  dernier_chiffres_iban  VARCHAR(4),
  titulaire_compte     VARCHAR(255),
  date_mise_a_jour     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE profils_livraison_boutique (
  identifiant         BIGSERIAL PRIMARY KEY,
  identifiant_boutique BIGINT NOT NULL REFERENCES boutiques (identifiant) ON DELETE CASCADE,
  libelle              VARCHAR(128) NOT NULL,
  regles_json          JSONB,
  est_defaut            BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX idx_profils_livraison ON profils_livraison_boutique (identifiant_boutique);

-- -----------------------------------------------------------------------------
-- 3) Marque & import (catalogue côté vendeur)
-- -----------------------------------------------------------------------------

CREATE TABLE enregistrements_marque (
  identifiant         BIGSERIAL PRIMARY KEY,
  identifiant_boutique BIGINT NOT NULL REFERENCES boutiques (identifiant) ON DELETE CASCADE,
  libelle_marque       VARCHAR(255) NOT NULL,
  url_preuve           TEXT,
  statut_dossier       VARCHAR(32) NOT NULL DEFAULT 'en_attente', -- ex. en_attente, valide, refuse
  date_soumission      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_enr_marque_boutique ON enregistrements_marque (identifiant_boutique);

CREATE TABLE imports_catalogue (
  identifiant         BIGSERIAL PRIMARY KEY,
  identifiant_boutique BIGINT NOT NULL REFERENCES boutiques (identifiant) ON DELETE CASCADE,
  nom_fichier          VARCHAR(255) NOT NULL,
  statut               VARCHAR(32) NOT NULL DEFAULT 'en_attente', -- en_cours, termine, erreur
  nombre_lignes        INT,
  nombre_succes         INT,
  nombre_erreurs        INT,
  rapport_erreurs       TEXT,
  date_creation        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_fin             TIMESTAMPTZ
);
CREATE INDEX idx_imports_boutique ON imports_catalogue (identifiant_boutique);

-- -----------------------------------------------------------------------------
-- 4) Produits, variantes, images, stock
-- -----------------------------------------------------------------------------

CREATE TABLE produits (
  identifiant         BIGSERIAL PRIMARY KEY,
  identifiant_boutique BIGINT NOT NULL REFERENCES boutiques (identifiant) ON DELETE CASCADE,
  reference_sku        VARCHAR(64) NOT NULL,
  titre                 VARCHAR(500) NOT NULL,
  description           TEXT,
  prix_de_base         NUMERIC(12, 2) NOT NULL,
  devise                CHAR(3) NOT NULL DEFAULT 'EUR',
  statut_moderation     statut_moderation_produit NOT NULL DEFAULT 'brouillon',
  date_publication      TIMESTAMPTZ,
  date_creation         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_mise_a_jour      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (identifiant_boutique, reference_sku)
);
CREATE INDEX idx_produits_boutique ON produits (identifiant_boutique);

CREATE TABLE variantes_produit (
  identifiant   BIGSERIAL PRIMARY KEY,
  identifiant_produit BIGINT NOT NULL REFERENCES produits (identifiant) ON DELETE CASCADE,
  suffixe_sku   VARCHAR(64),
  libelle        VARCHAR(255),
  prix            NUMERIC(12, 2)
);
CREATE INDEX idx_variants_produit ON variantes_produit (identifiant_produit);

CREATE TABLE images_produit (
  identifiant   BIGSERIAL PRIMARY KEY,
  identifiant_produit BIGINT NOT NULL REFERENCES produits (identifiant) ON DELETE CASCADE,
  url_image      TEXT NOT NULL,
  ordre_affichage INT NOT NULL DEFAULT 0
);

CREATE TABLE inventaire (
  identifiant          BIGSERIAL PRIMARY KEY,
  identifiant_produit  BIGINT NOT NULL REFERENCES produits (identifiant) ON DELETE CASCADE,
  identifiant_variante BIGINT REFERENCES variantes_produit (identifiant) ON DELETE CASCADE,
  quantite_disponible   INT NOT NULL DEFAULT 0,
  quantite_reservee     INT NOT NULL DEFAULT 0,
  seuil_alerte          INT,
  date_mise_a_jour     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (identifiant_produit, identifiant_variante)
);
CREATE INDEX idx_inventaire_produit ON inventaire (identifiant_produit);

CREATE TABLE mouvements_stock (
  identifiant   BIGSERIAL PRIMARY KEY,
  identifiant_produit  BIGINT NOT NULL REFERENCES produits (identifiant) ON DELETE CASCADE,
  identifiant_variante BIGINT REFERENCES variantes_produit (identifiant) ON DELETE SET NULL,
  variation             INT NOT NULL, -- + entrée, - sortie
  motif                 VARCHAR(64) NOT NULL, -- vente, retour, regul, import
  type_reference        VARCHAR(32), -- commande, retour, manuel
  identifiant_reference BIGINT,
  date_mouvement        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_mouv_stock_produit ON mouvements_stock (identifiant_produit);

CREATE TABLE file_moderation_produits (
  identifiant   BIGSERIAL PRIMARY KEY,
  identifiant_produit BIGINT NOT NULL REFERENCES produits (identifiant) ON DELETE CASCADE,
  statut        VARCHAR(32) NOT NULL DEFAULT 'ouvert', -- côté opé rateur, hors détail ici
  motif         TEXT,
  date_creation TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_moderation_produit ON file_moderation_produits (identifiant_produit);

-- -----------------------------------------------------------------------------
-- 5) Commandes reçues par la boutique (acheteur = clé étrangère logique)
--    identifiant_acheteur = référence vers le compte client (hors script vendeur)
-- -----------------------------------------------------------------------------

CREATE TABLE commandes_boutique (
  identifiant            BIGSERIAL PRIMARY KEY,
  reference_publique     VARCHAR(32) NOT NULL UNIQUE, -- ex. HX-2026-84027
  identifiant_boutique   BIGINT NOT NULL REFERENCES boutiques (identifiant) ON DELETE RESTRICT,
  identifiant_acheteur   BIGINT NOT NULL, -- compte client (table absente ici)
  identifiant_marche     SMALLINT REFERENCES marches (identifiant),
  statut                 statut_ligne_commande NOT NULL DEFAULT 'en_attente_paiement',
  devise                 CHAR(3) NOT NULL DEFAULT 'EUR',
  total_ht               NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_frais_livraison  NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_tva              NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_ttc              NUMERIC(12, 2) NOT NULL DEFAULT 0,
  adresse_livraison_json  JSONB,
  adresse_facturation_json JSONB,
  date_creation          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_mise_a_jour        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_cmd_boutique ON commandes_boutique (identifiant_boutique);
CREATE INDEX idx_cmd_acheteur ON commandes_boutique (identifiant_acheteur);
CREATE INDEX idx_cmd_statut ON commandes_boutique (statut);

COMMENT ON COLUMN commandes_boutique.identifiant_acheteur IS
  'Lien logique vers le compte acheteur (défini dans le schéma site / client).';

CREATE TABLE lignes_commande_boutique (
  identifiant              BIGSERIAL PRIMARY KEY,
  identifiant_commande     BIGINT NOT NULL REFERENCES commandes_boutique (identifiant) ON DELETE CASCADE,
  identifiant_boutique     BIGINT NOT NULL REFERENCES boutiques (identifiant) ON DELETE RESTRICT,
  identifiant_produit      BIGINT NOT NULL REFERENCES produits (identifiant) ON DELETE RESTRICT,
  identifiant_variante     BIGINT REFERENCES variantes_produit (identifiant) ON DELETE SET NULL,
  prix_unitaire            NUMERIC(12, 2) NOT NULL,
  quantite                 INT NOT NULL CHECK (quantite > 0),
  total_ligne              NUMERIC(12, 2) NOT NULL,
  taux_commission_pourcent NUMERIC(5, 2),
  statut_ligne             statut_ligne_commande
);
CREATE INDEX idx_lignes_cmd_commande ON lignes_commande_boutique (identifiant_commande);
CREATE INDEX idx_lignes_cmd_boutique ON lignes_commande_boutique (identifiant_boutique);

CREATE TABLE historique_statut_commande (
  identifiant        BIGSERIAL PRIMARY KEY,
  identifiant_commande BIGINT NOT NULL REFERENCES commandes_boutique (identifiant) ON DELETE CASCADE,
  statut             statut_ligne_commande NOT NULL,
  type_auteur        VARCHAR(16) NOT NULL, -- systeme, acheteur, vendeur
  identifiant_auteur BIGINT, -- compte_vendeur ou null
  message            TEXT,
  date_changement     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE envois_colis (
  identifiant        BIGSERIAL PRIMARY KEY,
  identifiant_commande BIGINT NOT NULL REFERENCES commandes_boutique (identifiant) ON DELETE CASCADE,
  transporteur         VARCHAR(64),
  numero_suivi         VARCHAR(128),
  date_expedition      TIMESTAMPTZ,
  date_livraison       TIMESTAMPTZ
);

CREATE TABLE demandes_retour_boutique (
  identifiant            BIGSERIAL PRIMARY KEY,
  reference_retour        VARCHAR(32) NOT NULL UNIQUE,
  identifiant_commande    BIGINT NOT NULL REFERENCES commandes_boutique (identifiant) ON DELETE CASCADE,
  identifiant_ligne        BIGINT NOT NULL REFERENCES lignes_commande_boutique (identifiant) ON DELETE CASCADE,
  identifiant_boutique     BIGINT NOT NULL REFERENCES boutiques (identifiant) ON DELETE RESTRICT,
  identifiant_acheteur     BIGINT NOT NULL, -- compte client (hors script)
  motif                    TEXT,
  statut                  statut_retour NOT NULL DEFAULT 'demande',
  montant_remboursement   NUMERIC(12, 2),
  date_creation            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_mise_a_jour         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_retour_boutique ON demandes_retour_boutique (identifiant_boutique);

-- -----------------------------------------------------------------------------
-- 6) Finances vendeur
-- -----------------------------------------------------------------------------

CREATE TABLE grand_livre_solde_boutique (
  identifiant        BIGSERIAL PRIMARY KEY,
  identifiant_boutique BIGINT NOT NULL REFERENCES boutiques (identifiant) ON DELETE CASCADE,
  montant              NUMERIC(12, 2) NOT NULL,
  type_operation       VARCHAR(64) NOT NULL, -- encaissement, commission, remboursement, pub, versement
  type_reference       VARCHAR(32),
  identifiant_reference BIGINT,
  date_ecriture        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_livre_boutique ON grand_livre_solde_boutique (identifiant_boutique);

CREATE TABLE versements_boutique (
  identifiant        BIGSERIAL PRIMARY KEY,
  identifiant_boutique BIGINT NOT NULL REFERENCES boutiques (identifiant) ON DELETE CASCADE,
  montant              NUMERIC(12, 2) NOT NULL,
  devise                CHAR(3) NOT NULL DEFAULT 'EUR',
  statut                VARCHAR(32) NOT NULL, -- en_attente, paye, echoue
  libelle_periode       VARCHAR(32),
  reference_bancaire    VARCHAR(128),
  date_versement        TIMESTAMPTZ,
  date_creation         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_vers_boutique ON versements_boutique (identifiant_boutique);

CREATE TABLE factures_vendeur (
  identifiant        BIGSERIAL PRIMARY KEY,
  identifiant_boutique BIGINT NOT NULL REFERENCES boutiques (identifiant) ON DELETE CASCADE,
  type_facture         VARCHAR(64) NOT NULL, -- commission, logistique, publicite
  libelle_periode      VARCHAR(32),
  montant              NUMERIC(12, 2) NOT NULL,
  devise                CHAR(3) NOT NULL DEFAULT 'EUR',
  statut                VARCHAR(32) NOT NULL,
  url_piece_jointe     TEXT,
  date_emission         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_factures_boutique ON factures_vendeur (identifiant_boutique);

-- -----------------------------------------------------------------------------
-- 7) Messagerie (vendeur ↔ acheteur, réf. acheteur sans table client ici)
-- -----------------------------------------------------------------------------

CREATE TABLE conversations_acheteur (
  identifiant        BIGSERIAL PRIMARY KEY,
  identifiant_boutique BIGINT NOT NULL REFERENCES boutiques (identifiant) ON DELETE CASCADE,
  identifiant_acheteur BIGINT NOT NULL, -- compte client (hors script)
  identifiant_commande BIGINT REFERENCES commandes_boutique (identifiant) ON DELETE SET NULL,
  date_dernier_message TIMESTAMPTZ,
  date_creation         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_conv_boutique ON conversations_acheteur (identifiant_boutique);

CREATE TABLE messages_conversation (
  identifiant            BIGSERIAL PRIMARY KEY,
  identifiant_conversation BIGINT NOT NULL REFERENCES conversations_acheteur (identifiant) ON DELETE CASCADE,
  identifiant_expediteur  BIGINT NOT NULL, -- id vendeur OU acheteur
  type_expediteur         VARCHAR(16) NOT NULL, -- vendeur, acheteur
  contenu                 TEXT NOT NULL,
  lu                      BOOLEAN NOT NULL DEFAULT FALSE,
  date_envoi              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_msg_conv ON messages_conversation (identifiant_conversation);

-- -----------------------------------------------------------------------------
-- 8) Prix, bons, retarification
-- -----------------------------------------------------------------------------

CREATE TABLE regles_retarification (
  identifiant        BIGSERIAL PRIMARY KEY,
  identifiant_boutique BIGINT NOT NULL REFERENCES boutiques (identifiant) ON DELETE CASCADE,
  libelle            VARCHAR(255) NOT NULL,
  configuration_json  JSONB NOT NULL,
  active             BOOLEAN NOT NULL DEFAULT TRUE,
  date_creation      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE bons_remise_boutique (
  identifiant        BIGSERIAL PRIMARY KEY,
  identifiant_boutique BIGINT NOT NULL REFERENCES boutiques (identifiant) ON DELETE CASCADE,
  code                 VARCHAR(64) NOT NULL,
  type_remise          VARCHAR(32) NOT NULL, -- pourcent, montant_fixe
  valeur               NUMERIC(12, 2) NOT NULL,
  plafond_utilisation  INT,
  nombre_utilisations  INT NOT NULL DEFAULT 0,
  date_debut           TIMESTAMPTZ,
  date_fin             TIMESTAMPTZ,
  actif                 BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (identifiant_boutique, code)
);

-- -----------------------------------------------------------------------------
-- 9) Logistique (envoi stock vers entrepôt)
-- -----------------------------------------------------------------------------

CREATE TABLE expeditions_vers_entrepot (
  identifiant        BIGSERIAL PRIMARY KEY,
  identifiant_boutique BIGINT NOT NULL REFERENCES boutiques (identifiant) ON DELETE CASCADE,
  reference            VARCHAR(32) NOT NULL UNIQUE,
  code_destination     VARCHAR(32),
  statut               VARCHAR(32) NOT NULL, -- a_envoyer, en_transit, recu
  date_reception_prevue DATE,
  nombre_unites        INT,
  date_creation         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_exped_ent_boutique ON expeditions_vers_entrepot (identifiant_boutique);

-- -----------------------------------------------------------------------------
-- 10) Publicité & offres
-- -----------------------------------------------------------------------------

CREATE TABLE campagnes_publicitaires_boutique (
  identifiant        BIGSERIAL PRIMARY KEY,
  identifiant_boutique BIGINT NOT NULL REFERENCES boutiques (identifiant) ON DELETE CASCADE,
  libelle            VARCHAR(255) NOT NULL,
  type_campagne      VARCHAR(32) NOT NULL, -- produits_sponsorises, marque, display
  statut              VARCHAR(32) NOT NULL, -- active, en_pause
  budget_journalier   NUMERIC(12, 2),
  depense_totale     NUMERIC(12, 2) NOT NULL DEFAULT 0,
  donnees_complement JSONB,
  date_creation        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_campagnes_boutique ON campagnes_publicitaires_boutique (identifiant_boutique);

CREATE TABLE contenus_creatifs_campagne (
  identifiant        BIGSERIAL PRIMARY KEY,
  identifiant_campagne BIGINT NOT NULL REFERENCES campagnes_publicitaires_boutique (identifiant) ON DELETE CASCADE,
  format              VARCHAR(32),
  titre                VARCHAR(500),
  url_ressource        TEXT,
  statut                VARCHAR(32) NOT NULL DEFAULT 'brouillon'
);

CREATE TABLE offres_flash_boutique (
  identifiant        BIGSERIAL PRIMARY KEY,
  identifiant_boutique BIGINT NOT NULL REFERENCES boutiques (identifiant) ON DELETE CASCADE,
  identifiant_produit  BIGINT NOT NULL REFERENCES produits (identifiant) ON DELETE CASCADE,
  remise_pourcent      NUMERIC(5, 2),
  date_debut           TIMESTAMPTZ,
  date_fin              TIMESTAMPTZ,
  statut                VARCHAR(32) NOT NULL,
  date_creation         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 11) Programmes (Vine, marque, A+, …) — côté vendeur
-- -----------------------------------------------------------------------------

CREATE TABLE programmes_plateforme (
  identifiant SMALLSERIAL PRIMARY KEY,
  code         VARCHAR(32) NOT NULL UNIQUE,
  libelle      VARCHAR(128) NOT NULL
);

CREATE TABLE inscriptions_programme_boutique (
  identifiant        BIGSERIAL PRIMARY KEY,
  identifiant_boutique BIGINT NOT NULL REFERENCES boutiques (identifiant) ON DELETE CASCADE,
  identifiant_programme SMALLINT NOT NULL REFERENCES programmes_plateforme (identifiant),
  statut              VARCHAR(32) NOT NULL,
  date_inscription   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (identifiant_boutique, identifiant_programme)
);

-- -----------------------------------------------------------------------------
-- 12) Support & avis (lecture côté vendeur)
-- -----------------------------------------------------------------------------

CREATE TABLE tickets_support_vendeur (
  identifiant        BIGSERIAL PRIMARY KEY,
  identifiant_boutique BIGINT REFERENCES boutiques (identifiant) ON DELETE SET NULL,
  identifiant_vendeur  BIGINT NOT NULL REFERENCES comptes_vendeur (identifiant) ON DELETE CASCADE,
  identifiant_commande  BIGINT REFERENCES commandes_boutique (identifiant) ON DELETE SET NULL,
  sujet                 VARCHAR(500) NOT NULL,
  rubrique              VARCHAR(64),
  priorite              VARCHAR(32),
  statut                VARCHAR(32) NOT NULL,
  date_creation         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_tickets_boutique ON tickets_support_vendeur (identifiant_boutique);

CREATE TABLE messages_ticket_support_vendeur (
  identifiant        BIGSERIAL PRIMARY KEY,
  identifiant_ticket BIGINT NOT NULL REFERENCES tickets_support_vendeur (identifiant) ON DELETE CASCADE,
  expediteur          VARCHAR(16) NOT NULL DEFAULT 'vendeur'
    CHECK (expediteur IN ('vendeur', 'operateur', 'systeme')),
  contenu              TEXT NOT NULL,
  date_envoi           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_msg_ticket_date ON messages_ticket_support_vendeur (identifiant_ticket, date_envoi);

CREATE TABLE avis_produits_boutique (
  identifiant        BIGSERIAL PRIMARY KEY,
  identifiant_produit BIGINT NOT NULL REFERENCES produits (identifiant) ON DELETE CASCADE,
  identifiant_commande BIGINT REFERENCES commandes_boutique (identifiant) ON DELETE SET NULL,
  identifiant_acheteur BIGINT NOT NULL, -- compte client (hors script)
  note                 SMALLINT NOT NULL CHECK (note >= 1 AND note <= 5),
  titre                 VARCHAR(255),
  commentaire            TEXT,
  date_avis              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_avis_produit ON avis_produits_boutique (identifiant_produit);

-- -----------------------------------------------------------------------------
-- 13) Reporting (vue vendeur)
-- -----------------------------------------------------------------------------

CREATE TABLE rapports_vente_journalier (
  identifiant        BIGSERIAL PRIMARY KEY,
  identifiant_boutique BIGINT NOT NULL REFERENCES boutiques (identifiant) ON DELETE CASCADE,
  identifiant_marche  SMALLINT REFERENCES marches (identifiant),
  jour                 DATE NOT NULL,
  nombre_commandes     INT NOT NULL DEFAULT 0,
  chiffre_affaires     NUMERIC(14, 2) NOT NULL DEFAULT 0,
  unites_vendues        INT NOT NULL DEFAULT 0,
  UNIQUE (identifiant_boutique, identifiant_marche, jour)
);
CREATE INDEX idx_rvj_boutique_jour ON rapports_vente_journalier (identifiant_boutique, jour);

CREATE TABLE performance_termes_recherche (
  identifiant        BIGSERIAL PRIMARY KEY,
  identifiant_boutique BIGINT NOT NULL REFERENCES boutiques (identifiant) ON DELETE CASCADE,
  terme                 TEXT NOT NULL,
  jour                  DATE NOT NULL,
  impressions            BIGINT NOT NULL DEFAULT 0,
  clics                  BIGINT NOT NULL DEFAULT 0,
  ventes_attribuees     NUMERIC(14, 2) NOT NULL DEFAULT 0,
  UNIQUE (identifiant_boutique, terme, jour)
);
CREATE INDEX idx_ptr_boutique ON performance_termes_recherche (identifiant_boutique, jour);

-- -----------------------------------------------------------------------------
-- 14) Notifications
-- -----------------------------------------------------------------------------

CREATE TABLE notifications_vendeur (
  identifiant        BIGSERIAL PRIMARY KEY,
  identifiant_boutique BIGINT NOT NULL REFERENCES boutiques (identifiant) ON DELETE CASCADE,
  type                 VARCHAR(32) NOT NULL, -- commande, stock, message, versement
  titre                VARCHAR(255) NOT NULL,
  texte                 TEXT,
  date_lecture         TIMESTAMPTZ,
  type_reference        VARCHAR(32),
  identifiant_reference BIGINT,
  date_creation         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notif_boutique ON notifications_vendeur (identifiant_boutique, date_creation);

-- -----------------------------------------------------------------------------
-- 15) Tarification (règles au-delà du prix fiche / retarification)
--     Écrans : Tarification, marges, prix par marché ou segment
-- -----------------------------------------------------------------------------

CREATE TABLE regles_tarification_boutique (
  identifiant         BIGSERIAL PRIMARY KEY,
  identifiant_boutique BIGINT NOT NULL REFERENCES boutiques (identifiant) ON DELETE CASCADE,
  libelle              VARCHAR(255) NOT NULL,
  priorite             INT NOT NULL DEFAULT 0,
  identifiant_marche   SMALLINT REFERENCES marches (identifiant) ON DELETE SET NULL,
  code_categorie       VARCHAR(64),
  cible_sku_prefixe     VARCHAR(32),
  regles_json          JSONB NOT NULL,
  actif                 BOOLEAN NOT NULL DEFAULT TRUE,
  date_creation         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_mise_a_jour     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_regles_tarf_boutique ON regles_tarification_boutique (identifiant_boutique, actif);
COMMENT ON TABLE regles_tarification_boutique IS
  'Règles de prix (marge min/max, arrondi, plafond par marché, etc.). S’applique en complément de produits / regles_retarification.';

-- -----------------------------------------------------------------------------
-- 16) Trafic & conversion (hors seuls termes de recherche)
--     Écrans : Trafic & conversion, vues, sessions
-- -----------------------------------------------------------------------------

CREATE TABLE metriques_trafic_boutique (
  identifiant          BIGSERIAL PRIMARY KEY,
  identifiant_boutique BIGINT NOT NULL REFERENCES boutiques (identifiant) ON DELETE CASCADE,
  identifiant_marche   SMALLINT REFERENCES marches (identifiant) ON DELETE SET NULL,
  jour                 DATE NOT NULL,
  segment              VARCHAR(32) NOT NULL DEFAULT 'tout',
  visiteurs_uniques    INT NOT NULL DEFAULT 0,
  pages_vues           INT NOT NULL DEFAULT 0,
  sessions             INT NOT NULL DEFAULT 0,
  ajouts_panier         INT NOT NULL DEFAULT 0,
  passages_checkout     INT NOT NULL DEFAULT 0,
  commandes_passees     INT NOT NULL DEFAULT 0,
  revenu_estime         NUMERIC(14, 2) NOT NULL DEFAULT 0,
  taux_conversion       NUMERIC(7, 4),
  details_json         JSONB
);
CREATE INDEX idx_mtb_boutique_jour ON metriques_trafic_boutique (identifiant_boutique, jour);
CREATE UNIQUE INDEX uq_mtb_unicity ON metriques_trafic_boutique (
  identifiant_boutique, (COALESCE(identifiant_marche, 0::smallint)), jour, segment
);
COMMENT ON COLUMN metriques_trafic_boutique.segment IS
  'tout, organique, publicite, reseau_social, email, direct, autre.';

-- Entonnoir (étapes) pour courbes de conversion
CREATE TABLE entonnoir_conversion_boutique (
  identifiant          BIGSERIAL PRIMARY KEY,
  identifiant_boutique BIGINT NOT NULL REFERENCES boutiques (identifiant) ON DELETE CASCADE,
  identifiant_marche   SMALLINT REFERENCES marches (identifiant) ON DELETE SET NULL,
  jour                 DATE NOT NULL,
  code_etape           VARCHAR(40) NOT NULL,
  libelle_etape         VARCHAR(128),
  nombre               INT NOT NULL DEFAULT 0
);
CREATE INDEX idx_entonnoir_boutique ON entonnoir_conversion_boutique (identifiant_boutique, jour);
CREATE UNIQUE INDEX uq_entonnoir_unicity ON entonnoir_conversion_boutique (
  identifiant_boutique, (COALESCE(identifiant_marche, 0::smallint)), jour, code_etape
);
COMMENT ON COLUMN entonnoir_conversion_boutique.code_etape IS
  'fiche_produit, liste_categorie, panier, identification, livraison, paiement, confirmation.';

-- -----------------------------------------------------------------------------
-- 17) Santé du compte (score persisté, historique, avertissements)
--     Écran : Performance — Santé du compte
-- -----------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE niveau_sante_compte AS ENUM (
    'excellent',
    'bon',
    'a_surveiller',
    'critique'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE sante_compte_courant (
  identifiant_boutique BIGINT PRIMARY KEY REFERENCES boutiques (identifiant) ON DELETE CASCADE,
  score_global         SMALLINT NOT NULL CHECK (score_global >= 0 AND score_global <= 100),
  niveau                niveau_sante_compte NOT NULL DEFAULT 'bon',
  delais_expedition     NUMERIC(5, 2),
  taux_reclamation     NUMERIC(5, 2),
  taux_reponse_messagerie NUMERIC(5, 2),
  conformite_listings  NUMERIC(5, 2),
  avertissements_json  JSONB,
  recommandations_json JSONB,
  date_mise_a_jour     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE historique_sante_compte (
  identifiant          BIGSERIAL PRIMARY KEY,
  identifiant_boutique BIGINT NOT NULL REFERENCES boutiques (identifiant) ON DELETE CASCADE,
  date_evaluation      DATE NOT NULL,
  score_global         SMALLINT NOT NULL CHECK (score_global >= 0 AND score_global <= 100),
  niveau                niveau_sante_compte NOT NULL,
  metriques_json        JSONB,
  UNIQUE (identifiant_boutique, date_evaluation)
);
CREATE INDEX idx_hist_sante_boutique ON historique_sante_compte (identifiant_boutique, date_evaluation);

COMMENT ON TABLE sante_compte_courant IS
  'Vue à jour (cache) des indicateurs de santé affichés au vendeur.';
COMMENT ON TABLE historique_sante_compte IS
  'Série temporelle pour graphiques d’évolution du score.';

-- -----------------------------------------------------------------------------
-- 18) Growth Coach (conseils, parcours, suivi côté boutique)
--     Écran : Croissance — Growth Coach
-- -----------------------------------------------------------------------------

CREATE TABLE contenus_growth_coach (
  identifiant   BIGSERIAL PRIMARY KEY,
  code          VARCHAR(64) NOT NULL UNIQUE,
  titre         VARCHAR(255) NOT NULL,
  resume         TEXT,
  contenu        TEXT,
  type_conseil   VARCHAR(32) NOT NULL,
  public_cible   VARCHAR(32),
  ordre_affichage INT NOT NULL DEFAULT 0,
  actif         BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE parcours_growth_coach (
  identifiant   BIGSERIAL PRIMARY KEY,
  code          VARCHAR(64) NOT NULL UNIQUE,
  libelle       VARCHAR(128) NOT NULL,
  description   TEXT
);

CREATE TABLE liens_parcours_conseils (
  identifiant_parcours BIGINT NOT NULL REFERENCES parcours_growth_coach (identifiant) ON DELETE CASCADE,
  identifiant_conseil  BIGINT NOT NULL REFERENCES contenus_growth_coach (identifiant) ON DELETE CASCADE,
  ordre                 INT NOT NULL DEFAULT 0,
  PRIMARY KEY (identifiant_parcours, identifiant_conseil)
);

CREATE TABLE progression_growth_coach_boutique (
  identifiant          BIGSERIAL PRIMARY KEY,
  identifiant_boutique BIGINT NOT NULL REFERENCES boutiques (identifiant) ON DELETE CASCADE,
  identifiant_conseil  BIGINT NOT NULL REFERENCES contenus_growth_coach (identifiant) ON DELETE CASCADE,
  statut               VARCHAR(32) NOT NULL DEFAULT 'a_faire',
  date_commencee       TIMESTAMPTZ,
  date_terminee        TIMESTAMPTZ,
  notes                 TEXT,
  UNIQUE (identifiant_boutique, identifiant_conseil)
);
CREATE INDEX idx_prog_coach_boutique ON progression_growth_coach_boutique (identifiant_boutique, statut);

COMMENT ON COLUMN progression_growth_coach_boutique.statut IS
  'a_faire, en_cours, termine, ignore.';

-- =============================================================================
-- Données d’amorçage (marchés, programmes, growth coach)
-- =============================================================================

INSERT INTO marches (code_pays, libelle, devise, domaine_boutique) VALUES
  ('FR', 'France', 'EUR', 'heligxiam.fr'),
  ('DE', 'Allemagne', 'EUR', 'heligxiam.de'),
  ('IT', 'Italie', 'EUR', 'heligxiam.it'),
  ('ES', 'Espagne', 'EUR', 'heligxiam.es'),
  ('GB', 'Royaume-Uni', 'GBP', 'heligxiam.co.uk')
ON CONFLICT (code_pays) DO NOTHING;

INSERT INTO programmes_plateforme (code, libelle) VALUES
  ('vine', 'Programme Vine (avis authentiques)'),
  ('marque', 'Marque enregistree'),
  ('aplus', 'Contenu A+')
ON CONFLICT (code) DO NOTHING;

INSERT INTO contenus_growth_coach (code, titre, resume, contenu, type_conseil, public_cible, ordre_affichage) VALUES
  ('seo_titres', 'Optimiser les titres produit', 'Titres clairs, mots-clés en tête, marque en fin si place.', NULL, 'seo', 'debutant', 1),
  ('fiches_images', 'Images : fond neutre, 4 angles minimum', 'Aligner les visuels sur la charte HELIGXIAM pour la conversion.', NULL, 'catalogue', 'debutant', 2),
  ('reponse_msg_24h', 'Viser une réponse messagerie sous 24h', 'Impact sur la satisfaction et la santé du compte.', NULL, 'relation_client', 'tous', 3),
  ('stock_reassort', 'Paramétrer des alertes stock bas', 'Lier à la gestion d’inventaire et éviter les annulations.', NULL, 'logistique', 'intermediaire', 4)
ON CONFLICT (code) DO NOTHING;

INSERT INTO parcours_growth_coach (code, libelle, description) VALUES
  ('onboarding_7j', 'Premiers 7 jours', 'Checklist lancement : fiches, stock, expédition.')
ON CONFLICT (code) DO NOTHING;

-- Liaison parcours ↔ conseils (idempotent)
INSERT INTO liens_parcours_conseils (identifiant_parcours, identifiant_conseil, ordre)
SELECT p.identifiant, c.identifiant, v.ordre
FROM (VALUES
  ('onboarding_7j', 'seo_titres', 1),
  ('onboarding_7j', 'fiches_images', 2),
  ('onboarding_7j', 'reponse_msg_24h', 3)
) AS v(code_parcours, code_conseil, ordre)
JOIN parcours_growth_coach p ON p.code = v.code_parcours
JOIN contenus_growth_coach c ON c.code = v.code_conseil
ON CONFLICT (identifiant_parcours, identifiant_conseil) DO NOTHING;

-- =============================================================================
-- Fin — schéma VENDEUR uniquement (noms en français)
-- =============================================================================

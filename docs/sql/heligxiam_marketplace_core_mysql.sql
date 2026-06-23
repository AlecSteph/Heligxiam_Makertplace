-- =============================================================================
-- HELIGXIAM — Schéma vendeur (MySQL 8.0+)
-- Même périmètre métier que heligxiam_marketplace_core.sql (PostgreSQL).
-- InnoDB, utf8mb4. Acheteur référencé par identifiant (pas de table client ici).
-- Exécution : mysql -u USER -p SCHEMA < heligxiam_marketplace_core_mysql.sql
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------------
-- 1) Compte & profil vendeur
-- ---------------------------------------------------------------------------

CREATE TABLE comptes_vendeur (
  identifiant BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  courriel VARCHAR(255) NOT NULL,
  mot_de_passe_hache TEXT NOT NULL,
  prenom VARCHAR(100) NULL,
  nom VARCHAR(100) NULL,
  telephone VARCHAR(32) NULL,
  actif TINYINT(1) NOT NULL DEFAULT 1,
  date_creation DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  date_mise_a_jour DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (identifiant),
  UNIQUE KEY uk_comptes_vendeur_courriel (courriel)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Compte professionnel vendeur (connexion /seller).';

CREATE TABLE profils_vendeur (
  identifiant_vendeur BIGINT UNSIGNED NOT NULL,
  url_photo TEXT NULL,
  biographie TEXT NULL,
  poste_ou_fonction VARCHAR(128) NULL,
  site_web TEXT NULL,
  langue_interface VARCHAR(8) NOT NULL DEFAULT 'fr',
  fuseau_horaire VARCHAR(64) NOT NULL DEFAULT 'Europe/Paris',
  courriel_verifie TINYINT(1) NOT NULL DEFAULT 0,
  date_verification_courriel DATETIME(6) NULL,
  jeton_verification_courriel_expiration DATETIME(6) NULL,
  telephone_verifie TINYINT(1) NOT NULL DEFAULT 0,
  date_verification_telephone DATETIME(6) NULL,
  code_pays_telephone CHAR(2) NULL,
  adresse_ligne1 VARCHAR(255) NULL,
  adresse_ligne2 VARCHAR(255) NULL,
  ville VARCHAR(128) NULL,
  code_postal VARCHAR(16) NULL,
  code_pays CHAR(2) NULL,
  preferences_json JSON NULL,
  version_cgu_acceptee VARCHAR(32) NULL,
  date_acceptation_cgu DATETIME(6) NULL,
  version_chartes_donnees VARCHAR(32) NULL,
  date_acceptation_charte_donnees DATETIME(6) NULL,
  profil_complet TINYINT(1) NOT NULL DEFAULT 0,
  date_mise_a_jour DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (identifiant_vendeur),
  CONSTRAINT fk_profils_vendeur_compte FOREIGN KEY (identifiant_vendeur)
    REFERENCES comptes_vendeur (identifiant) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE historique_relectures_profil (
  identifiant BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  identifiant_vendeur BIGINT UNSIGNED NOT NULL,
  type_relecture VARCHAR(64) NOT NULL,
  adresse_ip VARCHAR(45) NULL,
  user_agent TEXT NULL,
  date_action DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (identifiant),
  KEY idx_historique_relecture_vendeur (identifiant_vendeur, date_action),
  CONSTRAINT fk_hist_relecture_vendeur FOREIGN KEY (identifiant_vendeur)
    REFERENCES comptes_vendeur (identifiant) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 2) Marchés & boutique
-- ---------------------------------------------------------------------------

CREATE TABLE marches (
  identifiant SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code_pays CHAR(2) NOT NULL,
  libelle VARCHAR(100) NOT NULL,
  devise CHAR(3) NOT NULL DEFAULT 'EUR',
  domaine_boutique VARCHAR(128) NULL,
  PRIMARY KEY (identifiant),
  UNIQUE KEY uk_marches_code_pays (code_pays)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE boutiques (
  identifiant BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  identifiant_vendeur BIGINT UNSIGNED NOT NULL,
  slug VARCHAR(128) NOT NULL,
  raison_sociale VARCHAR(255) NOT NULL,
  nom_affichage VARCHAR(255) NULL,
  identifiant_marche_defaut SMALLINT UNSIGNED NULL,
  code_pays CHAR(2) NULL,
  numero_tva VARCHAR(32) NULL,
  siret VARCHAR(32) NULL,
  statut ENUM('brouillon','kyc_en_attente','active','suspendue','fermee') NOT NULL DEFAULT 'brouillon',
  politique_retours TEXT NULL,
  retours_auto_acceptes TINYINT(1) NOT NULL DEFAULT 1,
  date_creation DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  date_mise_a_jour DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (identifiant),
  UNIQUE KEY uk_boutiques_slug (slug),
  KEY idx_boutiques_vendeur (identifiant_vendeur),
  KEY idx_boutiques_statut (statut),
  CONSTRAINT fk_boutiques_vendeur FOREIGN KEY (identifiant_vendeur)
    REFERENCES comptes_vendeur (identifiant) ON DELETE RESTRICT,
  CONSTRAINT fk_boutiques_marche_defaut FOREIGN KEY (identifiant_marche_defaut)
    REFERENCES marches (identifiant)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE reglages_marche_boutique (
  identifiant BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  identifiant_boutique BIGINT UNSIGNED NOT NULL,
  identifiant_marche SMALLINT UNSIGNED NOT NULL,
  actif TINYINT(1) NOT NULL DEFAULT 0,
  reglementation_tva VARCHAR(32) NULL,
  PRIMARY KEY (identifiant),
  UNIQUE KEY uk_reglages_marche (identifiant_boutique, identifiant_marche),
  CONSTRAINT fk_reglages_boutique FOREIGN KEY (identifiant_boutique)
    REFERENCES boutiques (identifiant) ON DELETE CASCADE,
  CONSTRAINT fk_reglages_marche FOREIGN KEY (identifiant_marche)
    REFERENCES marches (identifiant)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE etapes_onboarding_boutique (
  identifiant_boutique BIGINT UNSIGNED NOT NULL,
  documents_kyc_ok TINYINT(1) NOT NULL DEFAULT 0,
  profil_complet TINYINT(1) NOT NULL DEFAULT 0,
  premier_produits_ok TINYINT(1) NOT NULL DEFAULT 0,
  frais_livraison_ok TINYINT(1) NOT NULL DEFAULT 0,
  compte_bancaire_ok TINYINT(1) NOT NULL DEFAULT 0,
  date_mise_a_jour DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (identifiant_boutique),
  CONSTRAINT fk_etapes_onb_boutique FOREIGN KEY (identifiant_boutique)
    REFERENCES boutiques (identifiant) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE documents_conformite_boutique (
  identifiant BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  identifiant_boutique BIGINT UNSIGNED NOT NULL,
  type_document VARCHAR(64) NOT NULL,
  url_fichier TEXT NOT NULL,
  statut ENUM('en_attente','valide','refuse') NOT NULL DEFAULT 'en_attente',
  date_deposit DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (identifiant),
  KEY idx_doc_conf_boutique (identifiant_boutique),
  CONSTRAINT fk_docs_conf_boutique FOREIGN KEY (identifiant_boutique)
    REFERENCES boutiques (identifiant) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE parametres_versement (
  identifiant_boutique BIGINT UNSIGNED NOT NULL,
  dernier_chiffres_iban VARCHAR(4) NULL,
  titulaire_compte VARCHAR(255) NULL,
  date_mise_a_jour DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (identifiant_boutique),
  CONSTRAINT fk_param_vers_boutique FOREIGN KEY (identifiant_boutique)
    REFERENCES boutiques (identifiant) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE profils_livraison_boutique (
  identifiant BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  identifiant_boutique BIGINT UNSIGNED NOT NULL,
  libelle VARCHAR(128) NOT NULL,
  regles_json JSON NULL,
  est_defaut TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (identifiant),
  KEY idx_profils_livraison (identifiant_boutique),
  CONSTRAINT fk_profils_liv_boutique FOREIGN KEY (identifiant_boutique)
    REFERENCES boutiques (identifiant) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 3) Marque & import
-- ---------------------------------------------------------------------------

CREATE TABLE enregistrements_marque (
  identifiant BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  identifiant_boutique BIGINT UNSIGNED NOT NULL,
  libelle_marque VARCHAR(255) NOT NULL,
  url_preuve TEXT NULL,
  statut_dossier VARCHAR(32) NOT NULL DEFAULT 'en_attente',
  date_soumission DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (identifiant),
  KEY idx_enr_marque_boutique (identifiant_boutique),
  CONSTRAINT fk_enr_marque_boutique FOREIGN KEY (identifiant_boutique)
    REFERENCES boutiques (identifiant) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE imports_catalogue (
  identifiant BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  identifiant_boutique BIGINT UNSIGNED NOT NULL,
  nom_fichier VARCHAR(255) NOT NULL,
  statut VARCHAR(32) NOT NULL DEFAULT 'en_attente',
  nombre_lignes INT NULL,
  nombre_succes INT NULL,
  nombre_erreurs INT NULL,
  rapport_erreurs TEXT NULL,
  date_creation DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  date_fin DATETIME(6) NULL,
  PRIMARY KEY (identifiant),
  KEY idx_imports_boutique (identifiant_boutique),
  CONSTRAINT fk_imports_boutique FOREIGN KEY (identifiant_boutique)
    REFERENCES boutiques (identifiant) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 4) Produits, variantes, images, stock
-- ---------------------------------------------------------------------------

CREATE TABLE produits (
  identifiant BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  identifiant_boutique BIGINT UNSIGNED NOT NULL,
  reference_sku VARCHAR(64) NOT NULL,
  titre VARCHAR(500) NOT NULL,
  description TEXT NULL,
  prix_de_base DECIMAL(12,2) NOT NULL,
  devise CHAR(3) NOT NULL DEFAULT 'EUR',
  statut_moderation ENUM('brouillon','en_attente_moderation','publie','refuse','archive') NOT NULL DEFAULT 'brouillon',
  date_publication DATETIME(6) NULL,
  date_creation DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  date_mise_a_jour DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (identifiant),
  UNIQUE KEY uk_produit_sku_boutique (identifiant_boutique, reference_sku),
  KEY idx_produits_boutique (identifiant_boutique),
  CONSTRAINT fk_produits_boutique FOREIGN KEY (identifiant_boutique)
    REFERENCES boutiques (identifiant) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE variantes_produit (
  identifiant BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  identifiant_produit BIGINT UNSIGNED NOT NULL,
  suffixe_sku VARCHAR(64) NULL,
  libelle VARCHAR(255) NULL,
  prix DECIMAL(12,2) NULL,
  PRIMARY KEY (identifiant),
  KEY idx_variants_produit (identifiant_produit),
  CONSTRAINT fk_variantes_produit FOREIGN KEY (identifiant_produit)
    REFERENCES produits (identifiant) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE images_produit (
  identifiant BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  identifiant_produit BIGINT UNSIGNED NOT NULL,
  url_image TEXT NOT NULL,
  ordre_affichage INT NOT NULL DEFAULT 0,
  PRIMARY KEY (identifiant),
  CONSTRAINT fk_images_produit FOREIGN KEY (identifiant_produit)
    REFERENCES produits (identifiant) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE inventaire (
  identifiant BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  identifiant_produit BIGINT UNSIGNED NOT NULL,
  identifiant_variante BIGINT UNSIGNED NULL,
  quantite_disponible INT NOT NULL DEFAULT 0,
  quantite_reservee INT NOT NULL DEFAULT 0,
  seuil_alerte INT NULL,
  date_mise_a_jour DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (identifiant),
  UNIQUE KEY uk_inventaire_prod_var (identifiant_produit, identifiant_variante),
  KEY idx_inventaire_produit (identifiant_produit),
  CONSTRAINT fk_inv_produit FOREIGN KEY (identifiant_produit)
    REFERENCES produits (identifiant) ON DELETE CASCADE,
  CONSTRAINT fk_inv_variante FOREIGN KEY (identifiant_variante)
    REFERENCES variantes_produit (identifiant) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE mouvements_stock (
  identifiant BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  identifiant_produit BIGINT UNSIGNED NOT NULL,
  identifiant_variante BIGINT UNSIGNED NULL,
  variation INT NOT NULL,
  motif VARCHAR(64) NOT NULL,
  type_reference VARCHAR(32) NULL,
  identifiant_reference BIGINT NULL,
  date_mouvement DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (identifiant),
  KEY idx_mouv_stock_produit (identifiant_produit),
  CONSTRAINT fk_mouv_produit FOREIGN KEY (identifiant_produit)
    REFERENCES produits (identifiant) ON DELETE CASCADE,
  CONSTRAINT fk_mouv_variante FOREIGN KEY (identifiant_variante)
    REFERENCES variantes_produit (identifiant) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE file_moderation_produits (
  identifiant BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  identifiant_produit BIGINT UNSIGNED NOT NULL,
  statut VARCHAR(32) NOT NULL DEFAULT 'ouvert',
  motif TEXT NULL,
  date_creation DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (identifiant),
  KEY idx_moderation_produit (identifiant_produit),
  CONSTRAINT fk_mod_produit FOREIGN KEY (identifiant_produit)
    REFERENCES produits (identifiant) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 5) Commandes & retours
-- ---------------------------------------------------------------------------

CREATE TABLE commandes_boutique (
  identifiant BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  reference_publique VARCHAR(32) NOT NULL,
  identifiant_boutique BIGINT UNSIGNED NOT NULL,
  identifiant_acheteur BIGINT NOT NULL COMMENT 'compte client (hors script)',
  identifiant_marche SMALLINT UNSIGNED NULL,
  statut ENUM('en_attente_paiement','payee','a_expedier','expediee','livree','annulee','remboursee') NOT NULL DEFAULT 'en_attente_paiement',
  devise CHAR(3) NOT NULL DEFAULT 'EUR',
  total_ht DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_frais_livraison DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_tva DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_ttc DECIMAL(12,2) NOT NULL DEFAULT 0,
  adresse_livraison_json JSON NULL,
  adresse_facturation_json JSON NULL,
  date_creation DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  date_mise_a_jour DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (identifiant),
  UNIQUE KEY uk_cmd_ref_pub (reference_publique),
  KEY idx_cmd_boutique (identifiant_boutique),
  KEY idx_cmd_acheteur (identifiant_acheteur),
  KEY idx_cmd_statut (statut),
  CONSTRAINT fk_cmd_boutique FOREIGN KEY (identifiant_boutique)
    REFERENCES boutiques (identifiant) ON DELETE RESTRICT,
  CONSTRAINT fk_cmd_marche FOREIGN KEY (identifiant_marche)
    REFERENCES marches (identifiant)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE lignes_commande_boutique (
  identifiant BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  identifiant_commande BIGINT UNSIGNED NOT NULL,
  identifiant_boutique BIGINT UNSIGNED NOT NULL,
  identifiant_produit BIGINT UNSIGNED NOT NULL,
  identifiant_variante BIGINT UNSIGNED NULL,
  prix_unitaire DECIMAL(12,2) NOT NULL,
  quantite INT NOT NULL,
  total_ligne DECIMAL(12,2) NOT NULL,
  taux_commission_pourcent DECIMAL(5,2) NULL,
  statut_ligne ENUM('en_attente_paiement','payee','a_expedier','expediee','livree','annulee','remboursee') NULL,
  PRIMARY KEY (identifiant),
  KEY idx_lignes_cmd_commande (identifiant_commande),
  KEY idx_lignes_cmd_boutique (identifiant_boutique),
  CONSTRAINT fk_ligne_cmd FOREIGN KEY (identifiant_commande)
    REFERENCES commandes_boutique (identifiant) ON DELETE CASCADE,
  CONSTRAINT fk_ligne_boutique FOREIGN KEY (identifiant_boutique)
    REFERENCES boutiques (identifiant) ON DELETE RESTRICT,
  CONSTRAINT fk_ligne_produit FOREIGN KEY (identifiant_produit)
    REFERENCES produits (identifiant) ON DELETE RESTRICT,
  CONSTRAINT fk_ligne_variante FOREIGN KEY (identifiant_variante)
    REFERENCES variantes_produit (identifiant) ON DELETE SET NULL,
  CONSTRAINT chk_ligne_qty CHECK (quantite > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE historique_statut_commande (
  identifiant BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  identifiant_commande BIGINT UNSIGNED NOT NULL,
  statut ENUM('en_attente_paiement','payee','a_expedier','expediee','livree','annulee','remboursee') NOT NULL,
  type_auteur VARCHAR(16) NOT NULL,
  identifiant_auteur BIGINT NULL,
  message TEXT NULL,
  date_changement DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (identifiant),
  CONSTRAINT fk_hist_stat_cmd FOREIGN KEY (identifiant_commande)
    REFERENCES commandes_boutique (identifiant) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE envois_colis (
  identifiant BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  identifiant_commande BIGINT UNSIGNED NOT NULL,
  transporteur VARCHAR(64) NULL,
  numero_suivi VARCHAR(128) NULL,
  date_expedition DATETIME(6) NULL,
  date_livraison DATETIME(6) NULL,
  PRIMARY KEY (identifiant),
  CONSTRAINT fk_envois_cmd FOREIGN KEY (identifiant_commande)
    REFERENCES commandes_boutique (identifiant) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE demandes_retour_boutique (
  identifiant BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  reference_retour VARCHAR(32) NOT NULL,
  identifiant_commande BIGINT UNSIGNED NOT NULL,
  identifiant_ligne BIGINT UNSIGNED NOT NULL,
  identifiant_boutique BIGINT UNSIGNED NOT NULL,
  identifiant_acheteur BIGINT NOT NULL,
  motif TEXT NULL,
  statut ENUM('demande','accepte','refuse','en_transit','recu','rembourse','cloture') NOT NULL DEFAULT 'demande',
  montant_remboursement DECIMAL(12,2) NULL,
  date_creation DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  date_mise_a_jour DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (identifiant),
  UNIQUE KEY uk_retour_ref (reference_retour),
  KEY idx_retour_boutique (identifiant_boutique),
  CONSTRAINT fk_retour_cmd FOREIGN KEY (identifiant_commande)
    REFERENCES commandes_boutique (identifiant) ON DELETE CASCADE,
  CONSTRAINT fk_retour_ligne FOREIGN KEY (identifiant_ligne)
    REFERENCES lignes_commande_boutique (identifiant) ON DELETE CASCADE,
  CONSTRAINT fk_retour_boutique FOREIGN KEY (identifiant_boutique)
    REFERENCES boutiques (identifiant) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 6) Finances
-- ---------------------------------------------------------------------------

CREATE TABLE grand_livre_solde_boutique (
  identifiant BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  identifiant_boutique BIGINT UNSIGNED NOT NULL,
  montant DECIMAL(12,2) NOT NULL,
  type_operation VARCHAR(64) NOT NULL,
  type_reference VARCHAR(32) NULL,
  identifiant_reference BIGINT NULL,
  date_ecriture DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (identifiant),
  KEY idx_livre_boutique (identifiant_boutique),
  CONSTRAINT fk_livre_boutique FOREIGN KEY (identifiant_boutique)
    REFERENCES boutiques (identifiant) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE versements_boutique (
  identifiant BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  identifiant_boutique BIGINT UNSIGNED NOT NULL,
  montant DECIMAL(12,2) NOT NULL,
  devise CHAR(3) NOT NULL DEFAULT 'EUR',
  statut VARCHAR(32) NOT NULL,
  libelle_periode VARCHAR(32) NULL,
  reference_bancaire VARCHAR(128) NULL,
  date_versement DATETIME(6) NULL,
  date_creation DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (identifiant),
  KEY idx_vers_boutique (identifiant_boutique),
  CONSTRAINT fk_vers_boutique FOREIGN KEY (identifiant_boutique)
    REFERENCES boutiques (identifiant) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE factures_vendeur (
  identifiant BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  identifiant_boutique BIGINT UNSIGNED NOT NULL,
  type_facture VARCHAR(64) NOT NULL,
  libelle_periode VARCHAR(32) NULL,
  montant DECIMAL(12,2) NOT NULL,
  devise CHAR(3) NOT NULL DEFAULT 'EUR',
  statut VARCHAR(32) NOT NULL,
  url_piece_jointe TEXT NULL,
  date_emission DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (identifiant),
  KEY idx_factures_boutique (identifiant_boutique),
  CONSTRAINT fk_fact_boutique FOREIGN KEY (identifiant_boutique)
    REFERENCES boutiques (identifiant) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 7) Messagerie vendeur ↔ acheteur
-- ---------------------------------------------------------------------------

CREATE TABLE conversations_acheteur (
  identifiant BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  identifiant_boutique BIGINT UNSIGNED NOT NULL,
  identifiant_acheteur BIGINT NOT NULL,
  identifiant_commande BIGINT UNSIGNED NULL,
  date_dernier_message DATETIME(6) NULL,
  date_creation DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (identifiant),
  KEY idx_conv_boutique (identifiant_boutique),
  CONSTRAINT fk_conv_boutique FOREIGN KEY (identifiant_boutique)
    REFERENCES boutiques (identifiant) ON DELETE CASCADE,
  CONSTRAINT fk_conv_commande FOREIGN KEY (identifiant_commande)
    REFERENCES commandes_boutique (identifiant) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE messages_conversation (
  identifiant BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  identifiant_conversation BIGINT UNSIGNED NOT NULL,
  identifiant_expediteur BIGINT NOT NULL,
  type_expediteur VARCHAR(16) NOT NULL,
  contenu TEXT NOT NULL,
  lu TINYINT(1) NOT NULL DEFAULT 0,
  date_envoi DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (identifiant),
  KEY idx_msg_conv (identifiant_conversation),
  CONSTRAINT fk_msg_conv FOREIGN KEY (identifiant_conversation)
    REFERENCES conversations_acheteur (identifiant) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 8) Prix & bons
-- ---------------------------------------------------------------------------

CREATE TABLE regles_retarification (
  identifiant BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  identifiant_boutique BIGINT UNSIGNED NOT NULL,
  libelle VARCHAR(255) NOT NULL,
  configuration_json JSON NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  date_creation DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (identifiant),
  CONSTRAINT fk_retarif_boutique FOREIGN KEY (identifiant_boutique)
    REFERENCES boutiques (identifiant) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE bons_remise_boutique (
  identifiant BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  identifiant_boutique BIGINT UNSIGNED NOT NULL,
  code VARCHAR(64) NOT NULL,
  type_remise VARCHAR(32) NOT NULL,
  valeur DECIMAL(12,2) NOT NULL,
  plafond_utilisation INT NULL,
  nombre_utilisations INT NOT NULL DEFAULT 0,
  date_debut DATETIME(6) NULL,
  date_fin DATETIME(6) NULL,
  actif TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (identifiant),
  UNIQUE KEY uk_bon_code_boutique (identifiant_boutique, code),
  CONSTRAINT fk_bons_boutique FOREIGN KEY (identifiant_boutique)
    REFERENCES boutiques (identifiant) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 9) Logistique entrepôt
-- ---------------------------------------------------------------------------

CREATE TABLE expeditions_vers_entrepot (
  identifiant BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  identifiant_boutique BIGINT UNSIGNED NOT NULL,
  reference VARCHAR(32) NOT NULL,
  code_destination VARCHAR(32) NULL,
  statut VARCHAR(32) NOT NULL,
  date_reception_prevue DATE NULL,
  nombre_unites INT NULL,
  date_creation DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (identifiant),
  UNIQUE KEY uk_exped_ref (reference),
  KEY idx_exped_ent_boutique (identifiant_boutique),
  CONSTRAINT fk_exped_boutique FOREIGN KEY (identifiant_boutique)
    REFERENCES boutiques (identifiant) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 10) Publicité
-- ---------------------------------------------------------------------------

CREATE TABLE campagnes_publicitaires_boutique (
  identifiant BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  identifiant_boutique BIGINT UNSIGNED NOT NULL,
  libelle VARCHAR(255) NOT NULL,
  type_campagne VARCHAR(32) NOT NULL,
  statut VARCHAR(32) NOT NULL,
  budget_journalier DECIMAL(12,2) NULL,
  depense_totale DECIMAL(12,2) NOT NULL DEFAULT 0,
  donnees_complement JSON NULL,
  date_creation DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (identifiant),
  KEY idx_campagnes_boutique (identifiant_boutique),
  CONSTRAINT fk_camp_boutique FOREIGN KEY (identifiant_boutique)
    REFERENCES boutiques (identifiant) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE contenus_creatifs_campagne (
  identifiant BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  identifiant_campagne BIGINT UNSIGNED NOT NULL,
  format VARCHAR(32) NULL,
  titre VARCHAR(500) NULL,
  url_ressource TEXT NULL,
  statut VARCHAR(32) NOT NULL DEFAULT 'brouillon',
  PRIMARY KEY (identifiant),
  CONSTRAINT fk_creatif_campagne FOREIGN KEY (identifiant_campagne)
    REFERENCES campagnes_publicitaires_boutique (identifiant) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE offres_flash_boutique (
  identifiant BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  identifiant_boutique BIGINT UNSIGNED NOT NULL,
  identifiant_produit BIGINT UNSIGNED NOT NULL,
  remise_pourcent DECIMAL(5,2) NULL,
  date_debut DATETIME(6) NULL,
  date_fin DATETIME(6) NULL,
  statut VARCHAR(32) NOT NULL,
  date_creation DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (identifiant),
  CONSTRAINT fk_offres_boutique FOREIGN KEY (identifiant_boutique)
    REFERENCES boutiques (identifiant) ON DELETE CASCADE,
  CONSTRAINT fk_offres_produit FOREIGN KEY (identifiant_produit)
    REFERENCES produits (identifiant) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 11) Programmes plateforme
-- ---------------------------------------------------------------------------

CREATE TABLE programmes_plateforme (
  identifiant SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(32) NOT NULL,
  libelle VARCHAR(128) NOT NULL,
  PRIMARY KEY (identifiant),
  UNIQUE KEY uk_prog_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE inscriptions_programme_boutique (
  identifiant BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  identifiant_boutique BIGINT UNSIGNED NOT NULL,
  identifiant_programme SMALLINT UNSIGNED NOT NULL,
  statut VARCHAR(32) NOT NULL,
  date_inscription DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (identifiant),
  UNIQUE KEY uk_inscr_prog (identifiant_boutique, identifiant_programme),
  CONSTRAINT fk_inscr_boutique FOREIGN KEY (identifiant_boutique)
    REFERENCES boutiques (identifiant) ON DELETE CASCADE,
  CONSTRAINT fk_inscr_programme FOREIGN KEY (identifiant_programme)
    REFERENCES programmes_plateforme (identifiant)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 12) Support & avis
-- ---------------------------------------------------------------------------

CREATE TABLE tickets_support_vendeur (
  identifiant BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  identifiant_boutique BIGINT UNSIGNED NULL,
  identifiant_vendeur BIGINT UNSIGNED NOT NULL,
  identifiant_commande BIGINT UNSIGNED NULL,
  sujet VARCHAR(500) NOT NULL,
  rubrique VARCHAR(64) NULL,
  priorite VARCHAR(32) NULL,
  statut VARCHAR(32) NOT NULL,
  date_creation DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (identifiant),
  KEY idx_tickets_boutique (identifiant_boutique),
  CONSTRAINT fk_ticket_boutique FOREIGN KEY (identifiant_boutique)
    REFERENCES boutiques (identifiant) ON DELETE SET NULL,
  CONSTRAINT fk_ticket_vendeur FOREIGN KEY (identifiant_vendeur)
    REFERENCES comptes_vendeur (identifiant) ON DELETE CASCADE,
  CONSTRAINT fk_ticket_commande FOREIGN KEY (identifiant_commande)
    REFERENCES commandes_boutique (identifiant) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Échanges sur un ticket support vendeur (messagerie opérateur, suivi dossier, etc.)
CREATE TABLE messages_ticket_support_vendeur (
  identifiant BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  identifiant_ticket BIGINT UNSIGNED NOT NULL,
  expediteur ENUM('vendeur','operateur','systeme') NOT NULL DEFAULT 'vendeur',
  contenu TEXT NOT NULL,
  date_envoi DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (identifiant),
  KEY idx_msg_ticket_date (identifiant_ticket, date_envoi),
  CONSTRAINT fk_msg_ticket_support FOREIGN KEY (identifiant_ticket)
    REFERENCES tickets_support_vendeur (identifiant) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE avis_produits_boutique (
  identifiant BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  identifiant_produit BIGINT UNSIGNED NOT NULL,
  identifiant_commande BIGINT UNSIGNED NULL,
  identifiant_acheteur BIGINT NOT NULL,
  note SMALLINT NOT NULL,
  titre VARCHAR(255) NULL,
  commentaire TEXT NULL,
  date_avis DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (identifiant),
  KEY idx_avis_produit (identifiant_produit),
  CONSTRAINT fk_avis_produit FOREIGN KEY (identifiant_produit)
    REFERENCES produits (identifiant) ON DELETE CASCADE,
  CONSTRAINT fk_avis_commande FOREIGN KEY (identifiant_commande)
    REFERENCES commandes_boutique (identifiant) ON DELETE SET NULL,
  CONSTRAINT chk_avis_note CHECK (note >= 1 AND note <= 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 13) Reporting
-- ---------------------------------------------------------------------------

CREATE TABLE rapports_vente_journalier (
  identifiant BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  identifiant_boutique BIGINT UNSIGNED NOT NULL,
  identifiant_marche SMALLINT UNSIGNED NULL,
  jour DATE NOT NULL,
  nombre_commandes INT NOT NULL DEFAULT 0,
  chiffre_affaires DECIMAL(14,2) NOT NULL DEFAULT 0,
  unites_vendues INT NOT NULL DEFAULT 0,
  PRIMARY KEY (identifiant),
  UNIQUE KEY uk_rvj (identifiant_boutique, identifiant_marche, jour),
  KEY idx_rvj_boutique_jour (identifiant_boutique, jour),
  CONSTRAINT fk_rvj_boutique FOREIGN KEY (identifiant_boutique)
    REFERENCES boutiques (identifiant) ON DELETE CASCADE,
  CONSTRAINT fk_rvj_marche FOREIGN KEY (identifiant_marche)
    REFERENCES marches (identifiant)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE performance_termes_recherche (
  identifiant BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  identifiant_boutique BIGINT UNSIGNED NOT NULL,
  terme VARCHAR(512) NOT NULL,
  jour DATE NOT NULL,
  impressions BIGINT NOT NULL DEFAULT 0,
  clics BIGINT NOT NULL DEFAULT 0,
  ventes_attribuees DECIMAL(14,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (identifiant),
  UNIQUE KEY uk_ptr (identifiant_boutique, terme, jour),
  KEY idx_ptr_boutique (identifiant_boutique, jour),
  CONSTRAINT fk_ptr_boutique FOREIGN KEY (identifiant_boutique)
    REFERENCES boutiques (identifiant) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 14) Notifications
-- ---------------------------------------------------------------------------

CREATE TABLE notifications_vendeur (
  identifiant BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  identifiant_boutique BIGINT UNSIGNED NOT NULL,
  type VARCHAR(32) NOT NULL,
  titre VARCHAR(255) NOT NULL,
  texte TEXT NULL,
  date_lecture DATETIME(6) NULL,
  type_reference VARCHAR(32) NULL,
  identifiant_reference BIGINT NULL,
  date_creation DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (identifiant),
  KEY idx_notif_boutique (identifiant_boutique, date_creation),
  CONSTRAINT fk_notif_boutique FOREIGN KEY (identifiant_boutique)
    REFERENCES boutiques (identifiant) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notifications_operateur (
  identifiant BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  identifiant_operateur BIGINT UNSIGNED NULL,
  type VARCHAR(32) NOT NULL,
  titre VARCHAR(255) NOT NULL,
  texte TEXT NULL,
  type_reference VARCHAR(32) NULL,
  identifiant_reference BIGINT NULL,
  lue TINYINT(1) NOT NULL DEFAULT 0,
  date_creation DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (identifiant),
  KEY idx_notif_op_lue (identifiant_operateur, lue, date_creation)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 15) Tarification
-- ---------------------------------------------------------------------------

CREATE TABLE regles_tarification_boutique (
  identifiant BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  identifiant_boutique BIGINT UNSIGNED NOT NULL,
  libelle VARCHAR(255) NOT NULL,
  priorite INT NOT NULL DEFAULT 0,
  identifiant_marche SMALLINT UNSIGNED NULL,
  code_categorie VARCHAR(64) NULL,
  cible_sku_prefixe VARCHAR(32) NULL,
  regles_json JSON NOT NULL,
  actif TINYINT(1) NOT NULL DEFAULT 1,
  date_creation DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  date_mise_a_jour DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (identifiant),
  KEY idx_regles_tarf_boutique (identifiant_boutique, actif),
  CONSTRAINT fk_regles_tarf_boutique FOREIGN KEY (identifiant_boutique)
    REFERENCES boutiques (identifiant) ON DELETE CASCADE,
  CONSTRAINT fk_regles_tarf_marche FOREIGN KEY (identifiant_marche)
    REFERENCES marches (identifiant) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 16) Trafic & entonnoir (unicité marché NULL → colonne générée)
-- ---------------------------------------------------------------------------

CREATE TABLE metriques_trafic_boutique (
  identifiant BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  identifiant_boutique BIGINT UNSIGNED NOT NULL,
  identifiant_marche SMALLINT UNSIGNED NULL,
  jour DATE NOT NULL,
  segment VARCHAR(32) NOT NULL DEFAULT 'tout',
  visiteurs_uniques INT NOT NULL DEFAULT 0,
  pages_vues INT NOT NULL DEFAULT 0,
  sessions INT NOT NULL DEFAULT 0,
  ajouts_panier INT NOT NULL DEFAULT 0,
  passages_checkout INT NOT NULL DEFAULT 0,
  commandes_passees INT NOT NULL DEFAULT 0,
  revenu_estime DECIMAL(14,2) NOT NULL DEFAULT 0,
  taux_conversion DECIMAL(7,4) NULL,
  details_json JSON NULL,
  marche_norm SMALLINT UNSIGNED GENERATED ALWAYS AS (COALESCE(identifiant_marche, 0)) STORED,
  PRIMARY KEY (identifiant),
  UNIQUE KEY uq_mtb_unicity (identifiant_boutique, marche_norm, jour, segment),
  KEY idx_mtb_boutique_jour (identifiant_boutique, jour)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE entonnoir_conversion_boutique (
  identifiant BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  identifiant_boutique BIGINT UNSIGNED NOT NULL,
  identifiant_marche SMALLINT UNSIGNED NULL,
  jour DATE NOT NULL,
  code_etape VARCHAR(40) NOT NULL,
  libelle_etape VARCHAR(128) NULL,
  nombre INT NOT NULL DEFAULT 0,
  marche_norm SMALLINT UNSIGNED GENERATED ALWAYS AS (COALESCE(identifiant_marche, 0)) STORED,
  PRIMARY KEY (identifiant),
  UNIQUE KEY uq_entonnoir_unicity (identifiant_boutique, marche_norm, jour, code_etape),
  KEY idx_entonnoir_boutique (identifiant_boutique, jour)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 17) Santé du compte
-- ---------------------------------------------------------------------------

CREATE TABLE sante_compte_courant (
  identifiant_boutique BIGINT UNSIGNED NOT NULL,
  score_global SMALLINT NOT NULL,
  niveau ENUM('excellent','bon','a_surveiller','critique') NOT NULL DEFAULT 'bon',
  delais_expedition DECIMAL(5,2) NULL,
  taux_reclamation DECIMAL(5,2) NULL,
  taux_reponse_messagerie DECIMAL(5,2) NULL,
  conformite_listings DECIMAL(5,2) NULL,
  avertissements_json JSON NULL,
  recommandations_json JSON NULL,
  date_mise_a_jour DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (identifiant_boutique),
  CONSTRAINT fk_sante_boutique FOREIGN KEY (identifiant_boutique)
    REFERENCES boutiques (identifiant) ON DELETE CASCADE,
  CONSTRAINT chk_sante_score CHECK (score_global >= 0 AND score_global <= 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE historique_sante_compte (
  identifiant BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  identifiant_boutique BIGINT UNSIGNED NOT NULL,
  date_evaluation DATE NOT NULL,
  score_global SMALLINT NOT NULL,
  niveau ENUM('excellent','bon','a_surveiller','critique') NOT NULL,
  metriques_json JSON NULL,
  PRIMARY KEY (identifiant),
  UNIQUE KEY uk_hist_sante_jour (identifiant_boutique, date_evaluation),
  KEY idx_hist_sante_boutique (identifiant_boutique, date_evaluation),
  CONSTRAINT fk_hist_sante_boutique FOREIGN KEY (identifiant_boutique)
    REFERENCES boutiques (identifiant) ON DELETE CASCADE,
  CONSTRAINT chk_hist_sante_score CHECK (score_global >= 0 AND score_global <= 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 18) Growth coach
-- ---------------------------------------------------------------------------

CREATE TABLE contenus_growth_coach (
  identifiant BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL,
  titre VARCHAR(255) NOT NULL,
  resume TEXT NULL,
  contenu TEXT NULL,
  type_conseil VARCHAR(32) NOT NULL,
  public_cible VARCHAR(32) NULL,
  ordre_affichage INT NOT NULL DEFAULT 0,
  actif TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (identifiant),
  UNIQUE KEY uk_growth_contenu_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE parcours_growth_coach (
  identifiant BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL,
  libelle VARCHAR(128) NOT NULL,
  description TEXT NULL,
  PRIMARY KEY (identifiant),
  UNIQUE KEY uk_growth_parcours_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE liens_parcours_conseils (
  identifiant_parcours BIGINT UNSIGNED NOT NULL,
  identifiant_conseil BIGINT UNSIGNED NOT NULL,
  ordre INT NOT NULL DEFAULT 0,
  PRIMARY KEY (identifiant_parcours, identifiant_conseil),
  CONSTRAINT fk_lien_parcours FOREIGN KEY (identifiant_parcours)
    REFERENCES parcours_growth_coach (identifiant) ON DELETE CASCADE,
  CONSTRAINT fk_lien_conseil FOREIGN KEY (identifiant_conseil)
    REFERENCES contenus_growth_coach (identifiant) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE progression_growth_coach_boutique (
  identifiant BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  identifiant_boutique BIGINT UNSIGNED NOT NULL,
  identifiant_conseil BIGINT UNSIGNED NOT NULL,
  statut VARCHAR(32) NOT NULL DEFAULT 'a_faire',
  date_commencee DATETIME(6) NULL,
  date_terminee DATETIME(6) NULL,
  notes TEXT NULL,
  PRIMARY KEY (identifiant),
  UNIQUE KEY uk_prog_coach (identifiant_boutique, identifiant_conseil),
  KEY idx_prog_coach_boutique (identifiant_boutique, statut),
  CONSTRAINT fk_prog_coach_boutique FOREIGN KEY (identifiant_boutique)
    REFERENCES boutiques (identifiant) ON DELETE CASCADE,
  CONSTRAINT fk_prog_coach_conseil FOREIGN KEY (identifiant_conseil)
    REFERENCES contenus_growth_coach (identifiant) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------------
-- Données d’amorçage
-- ---------------------------------------------------------------------------

INSERT IGNORE INTO marches (code_pays, libelle, devise, domaine_boutique) VALUES
  ('FR', 'France', 'EUR', 'heligxiam.fr'),
  ('DE', 'Allemagne', 'EUR', 'heligxiam.de'),
  ('IT', 'Italie', 'EUR', 'heligxiam.it'),
  ('ES', 'Espagne', 'EUR', 'heligxiam.es'),
  ('GB', 'Royaume-Uni', 'GBP', 'heligxiam.co.uk');

INSERT IGNORE INTO programmes_plateforme (code, libelle) VALUES
  ('vine', 'Programme Vine (avis authentiques)'),
  ('marque', 'Marque enregistree'),
  ('aplus', 'Contenu A+');

INSERT IGNORE INTO contenus_growth_coach (code, titre, resume, contenu, type_conseil, public_cible, ordre_affichage) VALUES
  ('seo_titres', 'Optimiser les titres produit', 'Titres clairs, mots-clés en tête, marque en fin si place.', NULL, 'seo', 'debutant', 1),
  ('fiches_images', 'Images : fond neutre, 4 angles minimum', 'Aligner les visuels sur la charte HELIGXIAM pour la conversion.', NULL, 'catalogue', 'debutant', 2),
  ('reponse_msg_24h', 'Viser une réponse messagerie sous 24h', 'Impact sur la satisfaction et la santé du compte.', NULL, 'relation_client', 'tous', 3),
  ('stock_reassort', 'Paramétrer des alertes stock bas', 'Lier à la gestion d’inventaire et éviter les annulations.', NULL, 'logistique', 'intermediaire', 4);

INSERT IGNORE INTO parcours_growth_coach (code, libelle, description) VALUES
  ('onboarding_7j', 'Premiers 7 jours', 'Checklist lancement : fiches, stock, expédition.');

INSERT IGNORE INTO liens_parcours_conseils (identifiant_parcours, identifiant_conseil, ordre)
SELECT p.identifiant, c.identifiant, 1 FROM parcours_growth_coach p JOIN contenus_growth_coach c ON p.code = 'onboarding_7j' AND c.code = 'seo_titres';
INSERT IGNORE INTO liens_parcours_conseils (identifiant_parcours, identifiant_conseil, ordre)
SELECT p.identifiant, c.identifiant, 2 FROM parcours_growth_coach p JOIN contenus_growth_coach c ON p.code = 'onboarding_7j' AND c.code = 'fiches_images';
INSERT IGNORE INTO liens_parcours_conseils (identifiant_parcours, identifiant_conseil, ordre)
SELECT p.identifiant, c.identifiant, 3 FROM parcours_growth_coach p JOIN contenus_growth_coach c ON p.code = 'onboarding_7j' AND c.code = 'reponse_msg_24h';

-- =============================================================================
-- Fin — schéma vendeur MySQL
-- =============================================================================

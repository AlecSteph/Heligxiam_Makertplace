-- Schéma PostgreSQL pour product-service / cart-service.
-- Les tables "majuscules" sont conservées pour compatibilité.
-- Des vues en minuscules sont ajoutées pour les requêtes non quotées.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE "UTILISATEUR" (
  id_user UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'client',
  email VARCHAR(191) NOT NULL UNIQUE
);

CREATE TABLE "CATEGORIE" (
  id_categorie UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  libelle VARCHAR(100) NOT NULL
);

CREATE TABLE "STOCK" (
  id_stock SERIAL PRIMARY KEY,
  quantite INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE "BOUTIQUE" (
  id_boutique UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom_boutique VARCHAR(191) NOT NULL,
  description TEXT,
  id_user UUID NOT NULL REFERENCES "UTILISATEUR" (id_user) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE "PRODUIT" (
  id_produit UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom_produit VARCHAR(255) NOT NULL,
  description TEXT,
  image_produit VARCHAR(500),
  attribut VARCHAR(255),
  prix NUMERIC(10, 2) NOT NULL,
  id_stock INTEGER NOT NULL REFERENCES "STOCK" (id_stock),
  id_categorie UUID NOT NULL REFERENCES "CATEGORIE" (id_categorie),
  id_boutique UUID NOT NULL REFERENCES "BOUTIQUE" (id_boutique),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE "AVIS" (
  id_avis UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notes NUMERIC(3, 2),
  commentaire TEXT,
  date TIMESTAMPTZ DEFAULT NOW(),
  id_produit UUID NOT NULL REFERENCES "PRODUIT" (id_produit) ON DELETE CASCADE,
  id_user UUID NOT NULL REFERENCES "UTILISATEUR" (id_user) ON DELETE CASCADE
);

CREATE TABLE "PANIER" (
  id_panier SERIAL PRIMARY KEY,
  id_user UUID NOT NULL REFERENCES "UTILISATEUR" (id_user) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (id_user)
);

CREATE TABLE "ARTICLE" (
  id_article UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quantite INTEGER NOT NULL,
  prix_unitaire NUMERIC(10, 2) NOT NULL,
  id_produit UUID NOT NULL REFERENCES "PRODUIT" (id_produit) ON DELETE CASCADE,
  id_panier INTEGER REFERENCES "PANIER" (id_panier) ON DELETE CASCADE,
  id_commande UUID
);

-- Données de démo (UUID fixes pour tests manuels / Postman)
INSERT INTO "UTILISATEUR" (id_user, nom, prenom, role, email)
VALUES (
    '11111111-1111-1111-1111-111111111111'::uuid,
    'Démo',
    'Utilisateur',
    'client',
    'demo@heligxiam.local'
  );

INSERT INTO "CATEGORIE" (id_categorie, libelle)
VALUES ('22222222-2222-2222-2222-222222222222'::uuid, 'Général');

INSERT INTO "BOUTIQUE" (id_boutique, nom_boutique, description, id_user)
VALUES (
    '33333333-3333-3333-3333-333333333333'::uuid,
    'Boutique démo',
    'Boutique pour le développement local',
    '11111111-1111-1111-1111-111111111111'::uuid
  );

-- Compatibilité PostgreSQL: les requêtes non quotées utilisent des noms minuscules.
CREATE OR REPLACE VIEW utilisateur AS SELECT * FROM "UTILISATEUR";
CREATE OR REPLACE VIEW categorie AS SELECT * FROM "CATEGORIE";
CREATE OR REPLACE VIEW stock AS SELECT * FROM "STOCK";
CREATE OR REPLACE VIEW boutique AS SELECT * FROM "BOUTIQUE";
CREATE OR REPLACE VIEW produit AS SELECT * FROM "PRODUIT";
CREATE OR REPLACE VIEW avis AS SELECT * FROM "AVIS";
CREATE OR REPLACE VIEW panier AS SELECT * FROM "PANIER";
CREATE OR REPLACE VIEW article AS SELECT * FROM "ARTICLE";

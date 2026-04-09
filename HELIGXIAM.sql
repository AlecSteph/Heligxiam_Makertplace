-- Database: HELIGXIAM


	-- ======================================================================
-- SCHEMA POSTGRESQL - Marketplace (basé sur MCD/MLD fourni)
-- ======================================================================

-- Extension pour UUID (requis)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table Utilisateur (entités principales)
CREATE TABLE "Utilisateur" (
    id_user       UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nom           VARCHAR(100) NOT NULL,
    prenom        VARCHAR(100) NOT NULL,
    role          VARCHAR(20) NOT NULL CHECK (role IN ('client', 'vendeur', 'admin')),
    email         VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);



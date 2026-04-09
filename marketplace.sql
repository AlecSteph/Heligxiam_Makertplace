-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Hôte : 127.0.0.1:3306
-- Généré le : lun. 09 mar. 2026 à 14:30
-- Version du serveur : 9.1.0
-- Version de PHP : 8.3.14

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `marketplace`
--

-- --------------------------------------------------------

--
-- Structure de la table `UTILISATEUR`
--

DROP TABLE IF EXISTS `UTILISATEUR`;
CREATE TABLE IF NOT EXISTS `UTILISATEUR` (
  `id_user` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nom` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `prenom` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_user`),
  UNIQUE KEY `uq_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `ADRESSE`
--

DROP TABLE IF EXISTS `ADRESSE`;
CREATE TABLE IF NOT EXISTS `ADRESSE` (
  `id_adresse` int NOT NULL AUTO_INCREMENT,
  `ville` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code_postal` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pays` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_user` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_adresse`),
  KEY `fk_adresse_user` (`id_user`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `BOUTIQUE`
--

DROP TABLE IF EXISTS `BOUTIQUE`;
CREATE TABLE IF NOT EXISTS `BOUTIQUE` (
  `id_boutique` int NOT NULL AUTO_INCREMENT,
  `nom_boutique` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `id_user` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_boutique`),
  KEY `fk_boutique_user` (`id_user`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `CATEGORIE`
--

DROP TABLE IF EXISTS `CATEGORIE`;
CREATE TABLE IF NOT EXISTS `CATEGORIE` (
  `id_categorie` int NOT NULL AUTO_INCREMENT,
  `libelle` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_categorie`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `STOCK`
--

DROP TABLE IF EXISTS `STOCK`;
CREATE TABLE IF NOT EXISTS `STOCK` (
  `id_stock` int NOT NULL AUTO_INCREMENT,
  `quantite` int NOT NULL DEFAULT 0,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_stock`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `PRODUIT`
--

DROP TABLE IF EXISTS `PRODUIT`;
CREATE TABLE IF NOT EXISTS `PRODUIT` (
  `id_produit` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nom_produit` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `image_produit` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attribut` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `prix` decimal(10,2) NOT NULL,
  `id_stock` int NOT NULL,
  `id_categorie` int NOT NULL,
  `id_boutique` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_produit`),
  KEY `fk_produit_stock` (`id_stock`),
  KEY `fk_produit_categorie` (`id_categorie`),
  KEY `fk_produit_boutique` (`id_boutique`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `PANIER`
--

DROP TABLE IF EXISTS `PANIER`;
CREATE TABLE IF NOT EXISTS `PANIER` (
  `id_panier` int NOT NULL AUTO_INCREMENT,
  `id_user` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_panier`),
  KEY `fk_panier_user` (`id_user`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `ARTICLE`
--

DROP TABLE IF EXISTS `ARTICLE`;
CREATE TABLE IF NOT EXISTS `ARTICLE` (
  `id_article` int NOT NULL AUTO_INCREMENT,
  `quantite` int NOT NULL,
  `prix_unitaire` decimal(10,2) NOT NULL,
  `id_produit` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_panier` int DEFAULT NULL,
  `id_commande` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_article`),
  KEY `fk_article_produit` (`id_produit`),
  KEY `fk_article_panier` (`id_panier`),
  KEY `fk_article_commande` (`id_commande`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `COMMANDE`
--

DROP TABLE IF EXISTS `COMMANDE`;
CREATE TABLE IF NOT EXISTS `COMMANDE` (
  `id_commande` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `date_commande` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `statut` enum('en_attente','confirmee','expedie','livree','annulee') COLLATE utf8mb4_unicode_ci DEFAULT 'en_attente',
  `id_adresse` int NOT NULL,
  `id_user` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_commande`),
  KEY `fk_commande_adresse` (`id_adresse`),
  KEY `fk_commande_user` (`id_user`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `PAIEMENT`
--

DROP TABLE IF EXISTS `PAIEMENT`;
CREATE TABLE IF NOT EXISTS `PAIEMENT` (
  `id_paiement` int NOT NULL AUTO_INCREMENT,
  `mode_paiement` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `statut_paiement` enum('en_attente','accepte','refuse','rembourse') COLLATE utf8mb4_unicode_ci DEFAULT 'en_attente',
  `date_paiement` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `id_commande` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_paiement`),
  KEY `fk_paiement_commande` (`id_commande`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `LIVRAISON`
--

DROP TABLE IF EXISTS `LIVRAISON`;
CREATE TABLE IF NOT EXISTS `LIVRAISON` (
  `id_livraison` int NOT NULL AUTO_INCREMENT,
  `adresse` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `statut_livraison` enum('en_preparation','en_transit','livree','non_livree') COLLATE utf8mb4_unicode_ci DEFAULT 'en_preparation',
  `id_commande` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_paiement` int NOT NULL,
  `date_livraison` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id_livraison`),
  KEY `fk_livraison_commande` (`id_commande`),
  KEY `fk_livraison_paiement` (`id_paiement`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `COUPON`
--

DROP TABLE IF EXISTS `COUPON`;
CREATE TABLE IF NOT EXISTS `COUPON` (
  `id_coupon` int NOT NULL AUTO_INCREMENT,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reduction` decimal(5,2) NOT NULL,
  `expiration` date NOT NULL,
  `limite_utilisation` int DEFAULT NULL,
  `utilisations` int DEFAULT 0,
  PRIMARY KEY (`id_coupon`),
  UNIQUE KEY `uq_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `APPLIQUE`
--

DROP TABLE IF EXISTS `APPLIQUE`;
CREATE TABLE IF NOT EXISTS `APPLIQUE` (
  `id_commande` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_coupon` int NOT NULL,
  PRIMARY KEY (`id_commande`, `id_coupon`),
  KEY `fk_applique_coupon` (`id_coupon`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `RETOUR`
--

DROP TABLE IF EXISTS `RETOUR`;
CREATE TABLE IF NOT EXISTS `RETOUR` (
  `id_return` int NOT NULL AUTO_INCREMENT,
  `motif` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `date_retour` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `id_commande` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_return`),
  KEY `fk_retour_commande` (`id_commande`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Contraintes pour les tables déchargées
--

--
-- Contraintes pour la table `ADRESSE`
--
ALTER TABLE `ADRESSE`
  ADD CONSTRAINT `fk_adresse_user` FOREIGN KEY (`id_user`) REFERENCES `UTILISATEUR` (`id_user`) ON DELETE CASCADE;

--
-- Contraintes pour la table `BOUTIQUE`
--
ALTER TABLE `BOUTIQUE`
  ADD CONSTRAINT `fk_boutique_user` FOREIGN KEY (`id_user`) REFERENCES `UTILISATEUR` (`id_user`) ON DELETE CASCADE;

--
-- Contraintes pour la table `PRODUIT`
--
ALTER TABLE `PRODUIT`
  ADD CONSTRAINT `fk_produit_boutique` FOREIGN KEY (`id_boutique`) REFERENCES `BOUTIQUE` (`id_boutique`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_produit_categorie` FOREIGN KEY (`id_categorie`) REFERENCES `CATEGORIE` (`id_categorie`),
  ADD CONSTRAINT `fk_produit_stock` FOREIGN KEY (`id_stock`) REFERENCES `STOCK` (`id_stock`);

--
-- Contraintes pour la table `PANIER`
--
ALTER TABLE `PANIER`
  ADD CONSTRAINT `fk_panier_user` FOREIGN KEY (`id_user`) REFERENCES `UTILISATEUR` (`id_user`) ON DELETE CASCADE;

--
-- Contraintes pour la table `ARTICLE`
--
ALTER TABLE `ARTICLE`
  ADD CONSTRAINT `fk_article_commande` FOREIGN KEY (`id_commande`) REFERENCES `COMMANDE` (`id_commande`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_article_panier` FOREIGN KEY (`id_panier`) REFERENCES `PANIER` (`id_panier`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_article_produit` FOREIGN KEY (`id_produit`) REFERENCES `PRODUIT` (`id_produit`);

--
-- Contraintes pour la table `COMMANDE`
--
ALTER TABLE `COMMANDE`
  ADD CONSTRAINT `fk_commande_adresse` FOREIGN KEY (`id_adresse`) REFERENCES `ADRESSE` (`id_adresse`),
  ADD CONSTRAINT `fk_commande_user` FOREIGN KEY (`id_user`) REFERENCES `UTILISATEUR` (`id_user`) ON DELETE CASCADE;

--
-- Contraintes pour la table `PAIEMENT`
--
ALTER TABLE `PAIEMENT`
  ADD CONSTRAINT `fk_paiement_commande` FOREIGN KEY (`id_commande`) REFERENCES `COMMANDE` (`id_commande`) ON DELETE CASCADE;

--
-- Contraintes pour la table `LIVRAISON`
--
ALTER TABLE `LIVRAISON`
  ADD CONSTRAINT `fk_livraison_commande` FOREIGN KEY (`id_commande`) REFERENCES `COMMANDE` (`id_commande`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_livraison_paiement` FOREIGN KEY (`id_paiement`) REFERENCES `PAIEMENT` (`id_paiement`) ON DELETE CASCADE;

--
-- Contraintes pour la table `APPLIQUE`
--
ALTER TABLE `APPLIQUE`
  ADD CONSTRAINT `fk_applique_commande` FOREIGN KEY (`id_commande`) REFERENCES `COMMANDE` (`id_commande`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_applique_coupon` FOREIGN KEY (`id_coupon`) REFERENCES `COUPON` (`id_coupon`) ON DELETE CASCADE;

--
-- Contraintes pour la table `RETOUR`
--
ALTER TABLE `RETOUR`
  ADD CONSTRAINT `fk_retour_commande` FOREIGN KEY (`id_commande`) REFERENCES `COMMANDE` (`id_commande`) ON DELETE CASCADE;

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;

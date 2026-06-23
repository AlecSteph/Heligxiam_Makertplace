# 🛒 Modélisation Base de Données – Plateforme E-Commerce

## 📌 Description du projet

Ce projet consiste à concevoir la **structure complète d’une base de données pour une plateforme e-commerce**.

L’objectif est de modéliser les différentes entités d’un site de vente en ligne ainsi que leurs relations, afin de permettre :

* la gestion des utilisateurs
* la gestion des produits
* le traitement des commandes
* le paiement et la livraison
* la gestion des avis et retours
* l’utilisation de coupons de réduction

Le projet est composé de deux parties principales :

* **MCD (Modèle Conceptuel de Données)** : représentation logique des entités et relations.
* **MLD (Modèle Logique de Données)** : transformation du MCD en tables exploitables dans une base de données relationnelle.

---

# 📊 1. Modèle Conceptuel de Données (MCD)

Le **MCD** représente les entités principales du système ainsi que leurs relations.

## Principales entités

### 👤 Utilisateur

Représente les utilisateurs de la plateforme (clients ou administrateurs).

Attributs :

* id_user
* nom
* prenom
* role
* email

Un utilisateur peut :

* posséder un panier
* effectuer des commandes
* laisser des avis
* posséder plusieurs adresses

---

### 🏬 Boutique

Représente une boutique vendant des produits.

Attributs :

* id_boutique
* nom_boutique
* description

Une boutique :

* est gérée par un utilisateur
* propose plusieurs produits

---

### 📦 Produit

Représente un produit vendu sur la plateforme.

Attributs :

* id_produit
* nom_produit
* description
* image_produit
* attribut
* prix

Relations :

* appartient à une catégorie
* possède un stock
* appartient à une boutique
* peut recevoir des avis

---

### 📂 Catégorie

Permet de classer les produits.

Attributs :

* id_categorie
* libelle

Relation :

* une catégorie peut contenir plusieurs produits

---

### 📦 Stock

Permet de gérer les quantités disponibles.

Attributs :

* id_stock
* quantite

Relation :

* un stock est associé à un produit

---

### ⭐ Avis

Permet aux utilisateurs d’évaluer les produits.

Attributs :

* id_avis
* notes
* commentaire
* date

Relations :

* laissé par un utilisateur
* concerne un produit

---

### 🛒 Panier

Représente le panier d’un utilisateur.

Attributs :

* id_panier

Relations :

* appartient à un utilisateur
* contient des articles

---

### 📦 Article

Représente un produit dans un panier ou une commande.

Attributs :

* id_article
* quantite
* prix_unitaire

Relations :

* lié à un produit
* lié à un panier
* lié à une commande

---

### 📑 Commande

Représente une commande passée par un utilisateur.

Attributs :

* id_commande
* date_commande
* statut

Relations :

* initiée par un utilisateur
* contient des articles
* peut utiliser un coupon
* possède un paiement
* possède une livraison
* peut générer un retour

---

### 💳 Paiement

Représente le paiement d’une commande.

Attributs :

* id_paiement
* mode_paiement
* statut_paiement
* date_paiement

Relation :

* associé à une commande

---

### 🚚 Livraison

Représente la livraison d’une commande.

Attributs :

* id_livraison
* adresse
* statut_livraison

Relation :

* associée à une commande

---

### 🎟 Coupon

Permet d’appliquer une réduction sur une commande.

Attributs :

* id_coupon
* code
* reduction
* expiration
* limite_utilisation

Relation :

* appliqué à une commande

---

### ↩ Retour

Permet de gérer les retours produits.

Attributs :

* id_return
* motif
* date_retour

Relation :

* associé à une commande

---

### 📍 Adresse

Représente l’adresse d’un utilisateur.

Attributs :

* id_adresse
* ville
* code_postal
* pays

Relation :

* liée à un utilisateur

---

# 🧩 2. Modèle Logique de Données (MLD)

Le **MLD** transforme le MCD en tables relationnelles utilisables dans un SGBD (MySQL, PostgreSQL, etc.).

Voici les principales tables :

---

### UTILISATEUR

```
UTILISATEUR(
 id_user PK,
 nom,
 prenom,
 role,
 email
)
```

---

### ADRESSE

```
ADRESSE(
 id_adresse PK,
 ville,
 code_postal,
 pays,
 id_user FK
)
```

---

### BOUTIQUE

```
BOUTIQUE(
 id_boutique PK,
 description,
 nom_boutique,
 id_user FK
)
```

---

### PRODUIT

```
PRODUIT(
 id_produit PK,
 nom_produit,
 description,
 image_produit,
 attribut,
 prix,
 id_stock FK,
 id_categorie FK,
 id_boutique FK
)
```

---

### STOCK

```
STOCK(
 id_stock PK,
 quantite
)
```

---

### CATEGORIE

```
CATEGORIE(
 id_categorie PK,
 libelle
)
```

---

### AVIS

```
AVIS(
 id_avis PK,
 notes,
 commentaire,
 date,
 id_produit FK,
 id_user FK
)
```

---

### PANIER

```
PANIER(
 id_panier PK,
 id_user FK
)
```

---

### ARTICLE

```
ARTICLE(
 id_article PK,
 quantite,
 prix_unitaire,
 id_produit FK,
 id_panier FK,
 id_commande FK
)
```

---

### COMMANDE

```
COMMANDE(
 id_commande PK,
 date_commande,
 statut,
 id_adresse FK,
 id_user FK
)
```

---

### PAIEMENT

```
PAIEMENT(
 id_paiement PK,
 mode_paiement,
 statut_paiement,
 date_paiement,
 id_commande FK
)
```

---

### LIVRAISON

```
LIVRAISON(
 id_livraison PK,
 adresse,
 statut_livraison,
 id_commande FK,
 id_paiement FK
)
```

---

### COUPON

```
COUPON(
 id_coupon PK,
 code,
 reduction,
 expiration,
 limite_utilisation
)
```

---

### APPLIQUE

```
APPLIQUE(
 id_commande FK,
 id_coupon FK
)
```

---

### RETOUR

```
RETOUR(
 id_return PK,
 motif,
 date_retour,
 id_commande FK
)
```

---

# ⚙️ Technologies utilisées

* **Modélisation :** Looping / Merise
* **Base de données :** SQL (MySQL / PostgreSQL compatible)
* **Conception :** MCD → MLD

---

# 🎯 Objectifs pédagogiques

Ce projet permet de :

* comprendre la **méthode Merise**
* concevoir un **MCD cohérent**
* transformer un **MCD en MLD**
* comprendre les **relations entre entités**
* préparer la création d’une **base de données réelle pour un site e-commerce**

---

# 📷 Schémas du projet

## MCD

Modèle conceptuel représentant les entités et leurs relations.

## MLD

Modèle logique représentant les tables relationnelles.

---

# 👨‍💻 Auteur

Projet réalisé dans le cadre d’un exercice de **conception de base de données pour un système e-commerce**.

---

# Heligxiam Marketplace — Application

**Installation données locales (après clone) :** [docs/README_SETUP_DONNEES_LOCAL.md](docs/README_SETUP_DONNEES_LOCAL.md) — MySQL, seed, Docker PostgreSQL, comptes test.

**Documentation espace vendeur (backend) :** [docs/README_VENDEUR_BACKEND.md](docs/README_VENDEUR_BACKEND.md) — feuille de route pour brancher `http://localhost:4200/seller` sur des APIs.

Ce projet a été généré avec Angular CLI version 21.1.1. Il s’agit d’une application Angular qui peut être exécutée localement pour le développement, compilée pour la production et testée à l’aide d’outils intégrés.

Pour démarrer un serveur de développement local, il suffit d’exécuter la commande ng serve dans le terminal. Une fois le serveur lancé, vous pouvez ouvrir votre navigateur et accéder à l’adresse http://localhost:4200/
. L’application se rechargera automatiquement chaque fois que vous modifierez les fichiers source, ce qui facilite le développement et les tests en temps réel.

Angular CLI propose également des outils puissants pour générer automatiquement du code. Par exemple, pour créer un nouveau composant, vous pouvez utiliser la commande ng generate component nom-du-composant. Si vous souhaitez voir la liste complète des générateurs disponibles, comme les composants, les directives ou les pipes, vous pouvez utiliser la commande ng generate --help.

Pour compiler le projet, vous pouvez exécuter la commande ng build. Cette opération va compiler l’application et placer les fichiers générés dans le dossier dist/. Par défaut, la compilation en mode production optimise l’application afin d’améliorer ses performances et sa rapidité d’exécution.

Pour exécuter les tests unitaires du projet, la commande ng test permet de lancer les tests avec le framework Vitest. Cela permet de vérifier que les différentes parties de l’application fonctionnent correctement.

Enfin, pour les tests de bout en bout (end-to-end), la commande ng e2e peut être utilisée. Angular CLI ne fournit pas de framework de tests E2E par défaut, il est donc possible d’en choisir un selon les besoins du projet.

Pour obtenir davantage d’informations sur l’utilisation d’Angular CLI et consulter la liste complète des commandes disponibles, vous pouvez consulter la documentation officielle sur le site

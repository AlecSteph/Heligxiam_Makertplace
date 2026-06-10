# Rapport d'audit complet - Backend et microservices

## Contexte et objectif

Ce rapport evalue le projet Heligxiam Marketplace par rapport au cadre "Projet annuel - 2e annee Developpement", avec un focus fort sur:

- architecture microservices,
- qualite backend,
- persistance des donnees,
- coherence SQL/NoSQL,
- capacite a soutenir une soutenance technique.

Audit realise sur l'etat courant du depot local et des services en execution.

---

## Etat de lancement (verifie)

- Frontend Angular: `http://localhost:4200`
- Auth service: `http://localhost:3001`
- Product service: `http://localhost:3002`
- Cart service: `http://localhost:3003`
- PostgreSQL (SQL): `localhost:5432`
- MongoDB (NoSQL): `localhost:27017`

Les conteneurs SQL + NoSQL sont demarres via `docker-compose.yml`.

---

## Conformite au cahier des charges (point par point)

### 1) Cadre general du projet

**Etat:** Conforme globalement.

- Le sujet marketplace est bien respecte.
- Le projet est deja au-dela de la phase purement conceptuelle (code present), ce qui est normal a ce stade avance.

### 2) Role des developpeurs

**Etat:** Partiellement a majoritairement conforme.

- Conception logicielle: presente mais encore a formaliser davantage (diagrammes d'architecture de reference manquants).
- Modelisation de donnees: presente (SQL + script init).
- Architecture applicative: microservices presents.
- Back-end et front-end: implantes.
- Documentation technique: existante mais insuffisamment centralisee et inegale selon les services.

### 3) Architecture imposee (microservices, independance, persistance)

**Etat:** Partiellement conforme.

Points positifs:
- `auth-service`, `product-service`, `cart-service` se lancent separement.
- Chaque service expose son endpoint `/health`.
- Persistance SQL en place.

Limites:
- Couplage eleve entre services via schema de donnees partage (jointures vers des tables d'autres domaines).
- Communication inter-services par API (HTTP) quasi absente: les frontieres de domaines ne sont pas strictes.

### 4) Contrainte obligatoire SQL + NoSQL

**Etat:** Conformite technique minimale atteinte, conformite pedagogique partielle.

- SQL: Oui (PostgreSQL actif).
- NoSQL: Oui (MongoDB ajoute et actif dans `docker-compose.yml`).

Mais:
- MongoDB n'est pas encore exploite par un microservice metier (pas de cas d'usage code clair type sessions, logs metier, recherche, events).
- En soutenance, il faudra justifier **pourquoi** NoSQL est pertinent et **ou** il est utilise.

### 5) Cohérence SQL / NoSQL et justification

**Etat:** Encore insuffisant pour une excellente note.

- Choix SQL coherent pour transactions (auth, produits, panier).
- Choix NoSQL pas encore justifie par un flux metier implemente.
- Separation des responsabilites SQL/NoSQL doit etre formalisee dans une doc d'architecture.

### 6) Modelisation attendue

**Etat:** Bonne base, mais frontieres metier a renforcer.

- Entites principales presentes (utilisateur, panier, produit, boutique, stock).
- Relations principales implantees.
- Frontieres de responsabilite entre services encore melangees en base.

### 7) Ce qui n'etait pas attendu initialement

**Observation pedagogique:** vous avez depasse la phase initiale (normal en fin de cycle), mais il faut montrer que les choix faits sont compris et evolutifs.

### 8) Front-end Angular

**Etat:** Front presente et demarre.

- Le niveau final sera juge sur UX, structure, cohesion des composants, robustesse des appels API.
- A completer par une revue UX et accessibilite dediee (non couverte en profondeur dans ce rapport backend).

### 9) Qualite globale attendue

**Etat:** Bon potentiel, niveau actuel "intermediaire+"

Points forts:
- stack fonctionnelle multi-services,
- securisation auth et authz deja renforcee,
- execution locale complete.

Points faibles:
- manque de tests automatiques backend,
- manque de contrats API formalises (OpenAPI),
- manque de CI/CD qualite.

### 10) Evolution et adaptation

**Etat:** Bon signe.

- Le projet a deja ete adapte (corrections architecture, securite, DB, alignement endpoints front/back).
- Capacite d'iteration presente.

### 11) Outils d'aide et responsabilite

**Etat:** Correct, mais soutenance exigeante.

- Le code evolue vite, mais vous devrez expliquer les choix (JWT, ownership, verrouillage stock, separation SQL/NoSQL).
- Sans tests et sans doc d'architecture solide, la defense orale restera fragile.

---

## Avis "si j'etais votre professeur"

### Impression generale

Vous avez un projet **fonctionnel et ambitieux**, deja au-dessus de nombreux groupes sur l'aspect execution technique locale.

Je mettrais aujourd'hui une appreciation de type: **"bon travail, mais pas encore niveau excellence academique/professionnelle"**.

### En quoi vous avez surpasse

- Vous avez depasse la simple maquette: services reels, auth, panier, produits.
- Vous avez corrige des points critiques (double demarrage service, authz ecriture produits, controle d'acces panier).
- Vous avez une base exploitable pour une vraie soutenance technique.

### Ce qu'il vous manque pour viser une tres bonne note

1. **Tests backend reels** (priorite absolue)
   - unitaires + integration + cas authz + concurrence panier.
2. **Contrat API formel**
   - spec OpenAPI par service.
3. **Justification NoSQL metier**
   - un service/fonctionnalite qui utilise MongoDB de facon defendable.
4. **Decouplage microservices**
   - eviter les lectures SQL cross-domain directes.
5. **Documentation architecture**
   - diagrammes, frontieres de domaines, flux de donnees, choix techniques argumentes.

---

## Reponse explicite a "avons-nous les 2 bases demandees?"

### Oui, sur l'infrastructure:

- SQL: PostgreSQL
- NoSQL: MongoDB

### Pas encore totalement, sur l'usage metier:

- SQL est reellement utilise en production locale.
- NoSQL est disponible mais pas encore integree a un use case metier majeur dans le code actuel.

Conclusion pedagogique:
- **Contrainte "2 bases" techniquement atteinte**,
- **justification fonctionnelle NoSQL a finaliser** pour etre pleinement convaincante a l'oral.

---

## Plan court recommande (pour solidifier avant evaluation)

### Sprint 1 (priorite haute)

- Ajouter tests backend minimaux (auth, products write authz, cart owner/admin, stock lock).
- Mettre en place workflow CI (lint + tests).

### Sprint 2

- Ajouter OpenAPI pour les 3 services.
- Normaliser format d'erreur (code, message, requestId).

### Sprint 3

- Introduire un vrai use case MongoDB (ex: historique de navigation, logs metier, recommandations, events).
- Documenter et justifier la separation SQL/NoSQL.

---

## Verdict final

Le projet est **serieux, en bonne progression, et deja exploitable**.
Vous etes au-dessus d'une base scolaire "minimum", mais pour une evaluation forte:

- vous devez prouver la qualite (tests),
- prouver la maturite d'architecture (contrats + decouplage),
- prouver la pertinence NoSQL par un cas d'usage concret.

---

## Mise a jour apres ameliorations (avril 2026)

### Ce qui a ete ajoute

- Base NoSQL MongoDB dans `docker-compose.yml` avec healthcheck.
- Cas d'usage NoSQL concret: journalisation des evenements d'authentification (`auth_events`) dans MongoDB via:
  - `auth-service/config/mongo.js`
  - integration dans `auth-service/routes/auth.js`.
- OpenAPI pour les 3 microservices:
  - `auth-service/openapi.yaml`
  - `product-service/openapi.yaml`
  - `cart-service/openapi.yaml`.
- Pipeline CI GitHub Actions:
  - `.github/workflows/ci.yml` (tests backend + build frontend).
- Tests backend initiaux (middlewares auth/authz):
  - `auth-service/__tests__/auth.middleware.test.js`
  - `product-service/__tests__/auth.middleware.test.js`
  - `cart-service/__tests__/auth.middleware.test.js`.
- Dossier complet de soutenance:
  - `DOSSIER_SOUTENANCE_TECHNIQUE_FR.md`.

### Ce qui a ete corrige

- Standardisation partielle des erreurs:
  - ajout `requestId` et `code` dans les handlers globaux (`auth-service/app.js`, `product-service/app.js`, `cart-service/app.js`).
- Documentation racine du projet (`README.md`) restructuree et orientee exploitation.

### Ce qui est ameliore mais encore perfectible

- Decouplage microservices: progression, mais encore des jointures SQL cross-domain a supprimer pour un decouplage strict.
- Tests: base presente, mais il manque des tests integration complets (DB, authz metier, concurrence panier en charge).
- OpenAPI: present, mais schemas/reponses d'erreur encore a enrichir pour un contrat enterprise complet.

### Mise a jour passe 2 (decouplage + tests integration)

- `cart-service` utilise desormais un client HTTP vers `product-service` pour une partie des verifications metier panier (`cart-service/clients/productClient.js`), ce qui reduit le couplage cross-domain SQL sur les chemins critiques.
- Ajout de tests integration backend de securite:
  - `auth-service/__tests__/auth.routes.integration.test.js`
  - `product-service/__tests__/products.routes.integration.test.js`
  - `cart-service/__tests__/cart.routes.integration.test.js`
- CI mise a jour pour executer lint (si present), tests backend et build frontend.


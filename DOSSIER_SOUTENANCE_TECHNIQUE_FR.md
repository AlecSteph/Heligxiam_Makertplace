# Dossier soutenance technique - Heligxiam Marketplace

## 1) Ce que le code d'origine n'avait pas

- Pas de base NoSQL operationnelle dans l'infrastructure.
- Contrat API non formalise (pas d'OpenAPI par service).
- Pas de pipeline CI centralisee.
- Pas de tests backend automatises.
- Erreurs non uniformisees (code/requestId non systematiques).
- Couplage eleve entre microservices et base relationnelle partagee.

## 2) Ce qui a ete ajoute

- MongoDB dans `docker-compose.yml` avec healthcheck.
- Usage NoSQL concret: journal d'evenements auth (`auth_events`) dans MongoDB.
- OpenAPI pour les 3 services:
  - `auth-service/openapi.yaml`
  - `product-service/openapi.yaml`
  - `cart-service/openapi.yaml`
- Workflow CI GitHub Actions (`.github/workflows/ci.yml`).
- Tests backend initiaux (middlewares auth/authz) dans les 3 services.
- `requestId` et `code` standardises dans les gestionnaires d'erreurs globaux.

## 3) Ce qui a ete corrige / ameliore

- Securite d'ecriture produits (JWT + roles + ownership).
- Securite acces panier (meme utilisateur ou admin).
- Coherence des validations panier.
- Renforcement partiel de la concurrence stock via transactions et verrous SQL.
- Documentation racine pour installation et exploitation.

## 4) Architecture globale

```text
            +----------------------+
            |   Frontend Angular   |
            |      (localhost4200) |
            +----------+-----------+
                       |
         +-------------+-----------------------------+
         |             |                             |
 +-------v------+ +----v---------+            +------v------+
 | auth-service | | product-svc  |            | cart-service|
 |   (3001)     | |   (3002)     |            |   (3003)    |
 +-------+------+ +------+-------+            +------+------+
         |               |                           |
         +---------------+---------------------------+
                         |
                 +-------v-------+
                 | PostgreSQL    |
                 |    (5432)     |
                 +---------------+

 auth-service -> MongoDB (auth_events)
                 +---------------+
                 | MongoDB 27017 |
                 +---------------+
```

## 5) Flux de donnees principaux

### Authentification

1. `register/login` dans `auth-service`
2. creation/verification utilisateur SQL
3. generation JWT/refresh
4. ecriture d'evenement dans MongoDB (`auth_events`)

### Consultation produit

1. frontend -> `product-service`
2. lecture SQL catalogue
3. retour pagine

### Panier

1. frontend -> `cart-service`
2. verification auth et ownership
3. transaction SQL panier/article + controle stock
4. retour JSON normalise

## 6) SQL vs NoSQL - justification

- SQL (PostgreSQL): coherence transactionnelle, relations fortes, integrite referentielle.
- NoSQL (MongoDB): stockage d'evenements d'auth (structure evolutive, volume potentiellement eleve, lecture temporelle).

## 7) Role de chaque dossier/fichier important

### Racine

- `docker-compose.yml`: orchestration PostgreSQL + MongoDB.
- `.github/workflows/ci.yml`: pipeline CI lint/build/tests.
- `README.md`: guide d'utilisation.
- `RAPPORT_AUDIT_COMPLET_BACKEND_MICROSERVICES_FR.md`: audit.

### Auth service

- `auth-service/app.js`: API Express, securite globale, erreurs standardisees.
- `auth-service/server.js`: bootstrap DB SQL + MongoDB.
- `auth-service/config/database.js`: acces PostgreSQL et schema auth.
- `auth-service/config/mongo.js`: acces MongoDB et events auth.
- `auth-service/routes/auth.js`: endpoints auth.
- `auth-service/middlewares/auth.js`: verification JWT.
- `auth-service/openapi.yaml`: contrat API.

### Product service

- `product-service/app.js`: API Express, requestId, erreurs globales.
- `product-service/server.js`: bootstrap serveur.
- `product-service/routes/products.js`: endpoints produits et authz.
- `product-service/controllers/productController.js`: logique metier produit.
- `product-service/middlewares/auth.js`: JWT + roles.
- `product-service/openapi.yaml`: contrat API.

### Cart service

- `cart-service/app.js`: API Express, requestId, erreurs globales.
- `cart-service/server.js`: bootstrap serveur.
- `cart-service/routes/cart.js`: endpoints panier et authz.
- `cart-service/controllers/cartController.js`: logique panier + transactions.
- `cart-service/middlewares/auth.js`: JWT + ownership.
- `cart-service/openapi.yaml`: contrat API.

## 8) Securite - justification

- JWT obligatoire sur operations sensibles.
- Roles pour operations ecriture produit.
- Ownership pour acces panier.
- Rate limiting global.
- Helmet, CORS controle, validation express-validator.
- Rotation/revocation refresh token.

## 9) CI/CD et qualite

- CI: install + tests backend + build frontend.
- Objectif: casser les regressions avant merge.

## 10) Limites restantes (honnetete soutenance)

- Couplage SQL inter-domaines encore present.
- Couverture de tests encore initiale.
- Pas de bus d'evenements inter-services.
- OpenAPI a enrichir (schemas complets, exemples, erreurs normalisees detaillees).

## 11) Roadmap de finition

1. Ajouter tests integration DB + authz + concurrence panier.
2. Introduire anti-corruption layer pour decoupler les jointures cross-domain.
3. Uniformiser tous les payloads d'erreur (`code`, `message`, `requestId`, `details`).
4. Ajouter dashboard metrics (Prometheus/Grafana) et tracing.

## 12) Mise a jour execution passe 2

### Ajouts concrets

- Decouplage partiel du `cart-service` vers le `product-service` via client HTTP:
  - `cart-service/clients/productClient.js`
  - verification stock/details produits par API sur les flux critiques panier.
- Tests d'integration API de securite:
  - `auth-service/__tests__/auth.routes.integration.test.js`
  - `product-service/__tests__/products.routes.integration.test.js`
  - `cart-service/__tests__/cart.routes.integration.test.js`
- CI enrichie avec etapes lint (si presente) + tests + build.

### Gains obtenus

- Moins de dependance directe SQL cross-domain dans les operations critiques du panier.
- Meilleure defendabilite "microservices" en soutenance (appel inter-service explicite).
- Couverture test backend amelioree sur les controles de securite (401/403).

---

Ce dossier est concu pour une soutenance orale: il explique les choix, les compromis, et la trajectoire d'amelioration.

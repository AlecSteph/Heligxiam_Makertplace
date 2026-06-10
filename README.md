# Heligxiam Marketplace

Plateforme marketplace en architecture microservices avec frontend Angular.

## Services

- `auth-service` (`:3001`) - authentification, JWT, refresh token, gestion profil.
- `product-service` (`:3002`) - catalogue produits et categories.
- `cart-service` (`:3003`) - gestion de panier.
- Frontend Angular (`:4200`).

## Bases de donnees

- SQL: PostgreSQL (`:5432`)
- NoSQL: MongoDB (`:27017`) utilise pour les evenements d'authentification.

## Demarrage rapide

1. Lancer les bases:

```bash
docker compose up -d
```

2. Installer les dependances:

```bash
npm install
npm --prefix auth-service install
npm --prefix product-service install
npm --prefix cart-service install
```

3. Lancer les services backend:

```bash
npm --prefix auth-service start
npm --prefix product-service start
npm --prefix cart-service start
```

4. Lancer le frontend:

```bash
npm start
```

## OpenAPI

- `auth-service/openapi.yaml`
- `product-service/openapi.yaml`
- `cart-service/openapi.yaml`

## Tests backend

```bash
npm --prefix auth-service test
npm --prefix product-service test
npm --prefix cart-service test
```

## Documentation d'audit et soutenance

- `RAPPORT_AUDIT_COMPLET_BACKEND_MICROSERVICES_FR.md`
- `DOSSIER_SOUTENANCE_TECHNIQUE_FR.md`
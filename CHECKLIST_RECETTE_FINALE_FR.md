# Checklist recette finale

## Infrastructure

- [ ] `docker compose up -d` demarre `postgres` et `mongodb`
- [ ] `docker compose ps` montre les services en `healthy`
- [ ] ports ouverts: `5432`, `27017`

## Backend

- [ ] `auth-service` demarre (`:3001`)
- [ ] `product-service` demarre (`:3002`)
- [ ] `cart-service` demarre (`:3003`)
- [ ] `/health` repond pour les 3 services

## Frontend

- [ ] Angular demarre (`:4200`)
- [ ] login/register fonctionnels

## Securite

- [ ] produit POST sans token => 401
- [ ] produit POST avec role client => 403
- [ ] panier d'un autre utilisateur => 403
- [ ] panier du meme utilisateur => 200

## SQL / NoSQL

- [ ] SQL utilise pour users/products/cart
- [ ] NoSQL: un event `register_success` est bien ecrit dans `auth_events`

## Qualite

- [ ] `npm --prefix auth-service test` passe
- [ ] `npm --prefix product-service test` passe
- [ ] `npm --prefix cart-service test` passe
- [ ] OpenAPI present pour les 3 services

## Documentation soutenance

- [ ] `RAPPORT_AUDIT_COMPLET_BACKEND_MICROSERVICES_FR.md` a jour
- [ ] `DOSSIER_SOUTENANCE_TECHNIQUE_FR.md` a jour
- [ ] `SCRIPT_ORAL_SOUTENANCE_12_MIN_FR.md` rehearse

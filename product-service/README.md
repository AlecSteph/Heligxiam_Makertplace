# Product Microservice

Service catalogue (`:3002`) pour produits et categories.

## Responsabilites

- CRUD produit,
- listing/pagination/recherche,
- exposition d'informations produit pour les autres services,
- controle d'acces ecriture (`vendeur`/`admin`) avec ownership.

## Securite

- JWT obligatoire pour creation/modification/suppression produit,
- roles autorises: `vendeur`, `admin`,
- checks ownership boutique sur operations d'ecriture.

## Lancement

```bash
npm install
npm start
```

## Endpoints principaux

- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/products`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`
- `GET /api/categories`
- `GET /api/categories/:id`
- `GET /api/categories/:id/produits`

Contrat complet: `product-service/openapi.yaml`.

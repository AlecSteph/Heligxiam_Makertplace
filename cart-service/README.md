# Cart Microservice

Service panier (`:3003`) pour operations utilisateur panier/article.

## Responsabilites

- gestion des articles panier,
- controle d'acces (meme utilisateur ou admin),
- verification produit/stock en appelant `product-service` (`PRODUCT_SERVICE_URL`),
- conservation transactionnelle du panier en SQL.

## Decouplage inter-service

Le service utilise `cart-service/clients/productClient.js` pour recuperer les informations produit critiques via API (`product-service`) plutot que de reposer uniquement sur des jointures cross-domain.

## Lancement

```bash
npm install
npm start
```

## Endpoints principaux

- `GET /api/cart/:userId`
- `POST /api/cart/:userId/items`
- `PUT /api/cart/:userId/items/:articleId`
- `DELETE /api/cart/:userId/items/:articleId`
- `DELETE /api/cart/:userId`

Contrat complet: `cart-service/openapi.yaml`.

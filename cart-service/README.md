# Cart Microservice

Microservice de gestion des paniers pour la marketplace Heligxiam.

## Fonctionnalités

- **Gestion des paniers** : CRUD complet avec validation
- **Gestion des articles** : Ajout, modification, suppression
- **Vérification des stocks** : Empêche les dépassements de stock
- **Calculs automatiques** : Sous-totaux, totaux, nombre d'articles
- **Transactions sécurisées** : Cohérence des données garantie
- **Rate limiting** : Protection contre les abus
- **Logs complets** : Traçabilité de toutes les opérations

## API Endpoints

- `GET /api/cart/:userId` - Récupérer le panier d'un utilisateur
- `POST /api/cart/:userId/items` - Ajouter un article au panier
- `PUT /api/cart/:userId/items/:articleId` - Mettre à jour la quantité
- `DELETE /api/cart/:userId/items/:articleId` - Supprimer un article
- `DELETE /api/cart/:userId` - Vider le panier

## Installation

```bash
cd cart-service
npm install
cp .env.example .env
# Configurer les variables d'environnement
npm run dev
```

## Exemples d'utilisation

### Ajouter un article au panier
```bash
POST /api/cart/user-uuid/items
{
  "id_produit": "product-uuid",
  "quantite": 2
}
```

### Mettre à jour la quantité
```bash
PUT /api/cart/user-uuid/items/article-uuid
{
  "quantite": 5
}
```

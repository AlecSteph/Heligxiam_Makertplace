# Product Microservice

Microservice de gestion des produits pour la marketplace Heligxiam.

## Fonctionnalités

- **Gestion des produits** : CRUD complet avec validation
- **Recherche avancée** : Par nom, catégorie, boutique, prix
- **Pagination** : Pour les listes de produits
- **Statistiques** : Prix moyen, nombre d'avis, notes
- **Catégories** : Gestion des catégories de produits
- **Sécurité** : Rate limiting, validation, sanitisation
- **Logs** : Traçabilité complète des opérations

## API Endpoints

### Produits

- `GET /api/products` - Liste des produits (avec pagination et filtres)
- `GET /api/products/:id` - Détail d'un produit
- `POST /api/products` - Créer un produit
- `PUT /api/products/:id` - Mettre à jour un produit
- `DELETE /api/products/:id` - Supprimer un produit

### Catégories

- `GET /api/categories` - Liste des catégories
- `GET /api/categories/:id` - Détail d'une catégorie
- `GET /api/categories/:id/produits` - Produits d'une catégorie

## Installation

```bash
cd product-service
npm install
cp .env.example .env
# Configurer les variables d'environnement
npm run dev
```

## Filtres disponibles

- `page` : Numéro de page (défaut: 1)
- `limit` : Nombre par page (défaut: 20)
- `category` : ID de catégorie
- `boutique` : ID de boutique
- `minPrice` : Prix minimum
- `maxPrice` : Prix maximum
- `search` : Recherche textuelle

Exemple : `GET /api/products?category=uuid&minPrice=10&maxPrice=100&page=2`

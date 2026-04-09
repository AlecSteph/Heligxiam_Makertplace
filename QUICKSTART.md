# Quickstart pour le microservice utilisateur

Ce fichier fournit des commandes rapides pour démarrer et tester les principales routes.
Il se veut un résumé de la documentation plus complète dans `README.md`.

## Installation

```bash
cd BACKEND/auth-service
npm install
cp .env.example .env              # modifier les valeurs (incluant PEPPER) selon votre environnement
```

## Initialiser la base de données

```bash
createdb heligxiam
psql -d heligxiam -f ../HELIGXIAM.sql
```

## Lancer le serveur

```bash
npm run dev     # développement avec nodemon
npm start       # production
```

## Exemples de requêtes

### Obtenir un challenge PoW
```bash
curl http://localhost:3001/api/auth/challenge
```

### Enregistrer un utilisateur
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nom":"Dupont",
    "prenom":"Jean",
    "email":"jean@example.com",
    "password":"MotDePasse123!",
    "challenge":"...",
    "nonce":"..."
  }'
```

### Se connecter
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"jean@example.com",
    "password":"MotDePasse123!",
    "challenge":"...",
    "nonce":"..."
  }'
```

### Accéder au profil (avec token)
```bash
curl http://localhost:3001/api/auth/profile \
  -H "Authorization: Bearer <token>"
```

>>> Voir `README.md` pour une documentation complète et des exemples en JavaScript/Python/Postman.

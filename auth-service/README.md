# Auth Microservice

Microservice d'authentification pour la marketplace Heligxiam.

## Fonctionnalités

- ✅ Inscription d'utilisateurs
- ✅ Connexion sécurisée
- ✅ JWT tokens
- ✅ Refresh tokens
- ✅ Validation des données
- ✅ Rate limiting
- ✅ Sécurité (helmet, cors)
- ✅ Proof of Work (challenge)

## Installation

```bash
# Installer les dépendances
npm install

# Créer le fichier .env
cp .env.example .env

# Démarrer le serveur
npm start
```

## Configuration

Variables d'environnement dans `.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=heligxiam_marketplace
DB_USER=postgres
DB_PASSWORD=password

JWT_SECRET=votre_secret_jwt
JWT_REFRESH_SECRET=votre_secret_refresh

PORT=3001
NODE_ENV=development
```

## API Endpoints

### Authentification

- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `POST /api/auth/refresh-token` - Rafraîchir le token
- `GET /api/auth/me` - Profil utilisateur
- `GET /api/auth/challenge` - Challenge Proof of Work

### Santé

- `GET /health` - Health check

## Sécurité

- **Rate limiting**: 100 requêtes / 15 minutes
- **Validation**: Express-validator pour toutes les entrées
- **Hashage**: Bcrypt pour les mots de passe
- **JWT**: Tokens avec expiration
- **CORS**: Origines autorisées uniquement
- **Helmet**: Sécurité des headers HTTP

## Port par défaut

Le service tourne sur le port **3001**.

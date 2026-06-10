# Auth Microservice

Service d'authentification (`:3001`) pour la marketplace.

## Responsabilites

- inscription et connexion utilisateur,
- emission JWT + refresh token,
- gestion profil (`/me`, update, changement mot de passe),
- journalisation NoSQL des evenements d'authentification.

## Donnees et persistance

- SQL (PostgreSQL): table `UTILISATEUR`, table `auth_refresh_tokens`.
- NoSQL (MongoDB): collection `auth_events` (register/login/refresh/password_changed).

## Lancement

```bash
npm install
npm start
```

## Variables d'environnement principales

- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `MONGO_HOST`, `MONGO_PORT`, `MONGO_USER`, `MONGO_PASSWORD`, `MONGO_DB_NAME`
- `ALLOWED_ORIGINS`

Voir `auth-service/.env.example`.

## Endpoints principaux

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh-token`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `PUT /api/auth/user/:id`
- `PUT /api/auth/change-password`
- `GET /health`
- `GET /ready`

Contrat complet: `auth-service/openapi.yaml`.

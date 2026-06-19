# Auth Service (Heligxiam)

Service Node/Express pour l'authentification et les fonctionnalités vendeur.

## Ce que fait le service

- Auth (`/api/auth`) : inscription, connexion, refresh token, profil courant.
- Vendeur (`/api/seller`) : messagerie opérateur et upload KYC.
- Health check : `/health`.

## Modes de persistance

- **Vendeur + MySQL configuré (`MYSQL_HOST`)** :
  - inscription persistée en base (`comptes_vendeur`, `profils_vendeur`, `boutiques`, `etapes_onboarding_boutique`)
  - tokens JWT avec claims `vendeur_id` / `boutique_id`
  - accès aux routes `/api/seller` protégé par JWT vendeur
- **Client (ou vendeur sans MySQL)** :
  - données conservées en mémoire (mode démo)

## Installation

```bash
npm install
npm start
```

## Configuration `.env`

Variables utilisées actuellement :

```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=...
MYSQL_DATABASE=heligxiam_marketplace

JWT_SECRET=...
JWT_REFRESH_SECRET=...

PORT=3001
NODE_ENV=development
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Endpoints principaux

### Auth

- `GET /api/auth/challenge`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh-token`
- `GET /api/auth/me`

### Seller (JWT vendeur requis)

- `GET /api/seller/operator-thread`
- `POST /api/seller/operator-thread/messages`
- `POST /api/seller/documents` (multipart : `kbis`, `cni`, `rib`)
- `GET /api/seller/files/:filename` (fichiers KYC servis en statique)

### Santé

- `GET /health`

## Notes de sécurité

- Rate limiting sur `/api/*`
- Validation d'entrée (`express-validator`)
- Mots de passe hashés (`bcrypt`)
- Headers de sécurité (`helmet`)
- CORS limité aux UIs locales (`localhost` / `127.0.0.1` ports `4200/4201`)

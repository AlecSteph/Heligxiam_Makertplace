# Heligxiam Authentication Service

Un microservice d'authentification sécurisé pour la plateforme de marketplace Heligxiam, construit avec Node.js, Express.js et PostgreSQL.

## Fonctionnalités

- **Inscription et connexion sécurisées** avec validation avancée
- **Authentification JWT** avec tokens d'accès et de rafraîchissement
- **Preuve de travail (Proof of Work)** pour protection contre les attaques DoS
- **Rate limiting** intelligent
- **Protection contre les injections SQL**
- **Gestion des rôles utilisateurs** (client, vendeur, admin)
- **Chiffrement des mots de passe** avec bcrypt
- **Validation des données** avec express-validator
- **Logs de sécurité** complets
- **API RESTful** avec réponses structurées
- **Gestion d'erreurs** robuste
- **Tests unitaires** avec Jest

## Sécurité

### Proof of Work
Le service utilise un algorithme de preuve de travail pour protéger contre les attaques DoS. Chaque requête d'inscription/connexion doit résoudre un challenge cryptographique.

### Rate Limiting
- **Global**: 1000 requêtes par IP toutes les 15 minutes
- **Authentification**: 5 tentatives de connexion par email/IP toutes les 15 minutes
- **Administrateur**: Limites spécifiques pour les opérations sensibles

### Protection des Données
- **Chiffrement des mots de passe** avec bcrypt (12 rounds) + pepper global
- **Sanitisation des entrées** pour éviter les XSS
- **Validation des emails** et mots de passe
- **Protection contre les injections SQL**
- **Headers de sécurité** avec Helmet.js

## Prérequis

- Node.js >= 16.0.0
- PostgreSQL >= 12.0
- npm ou yarn

## Installation

1. **Cloner le repository**
   ```bash
   git clone <repository-url>
   cd heligxiam-marketplace/BACKEND/auth-service
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Configuration de la base de données**
   - Créer une base de données PostgreSQL
   - Exécuter le script `HELIGXIAM.sql` pour créer les tables

4. **Configuration des variables d'environnement**
   Créer un fichier `.env` :
   ```env
   # Serveur
   PORT=3001
   NODE_ENV=development

   # Base de données
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=heligxiam
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password

   # JWT
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_EXPIRES_IN=1h
   JWT_REFRESH_EXPIRES_IN=7d

   # Sécurité
   POW_DIFFICULTY=4
   BCRYPT_ROUNDS=12

   # CORS
   ALLOWED_ORIGINS=http://localhost:4200,https://heligxiam.com

   # Logs
   LOG_LEVEL=info
   ```

5. **Démarrer le service**
   ```bash
   # Développement
   npm run dev

   # Production
   npm start
   ```

## API Documentation

### Endpoints Publics

#### `GET /api/auth/challenge`
Obtenir un challenge Proof of Work.

**Réponse:**
```json
{
  "success": true,
  "challenge": "abc123...",
  "difficulty": 4
}
```

#### `POST /api/auth/register`
Inscrire un nouvel utilisateur.

**Corps de la requête:**
```json
{
  "nom": "Dupont",
  "prenom": "Jean",
  "email": "jean.dupont@example.com",
  "password": "MotDePasse123!",
  "role": "client",
  "challenge": "challenge_from_get_challenge",
  "nonce": "nonce_solving_challenge"
}
```

**Réponse:**
```json
{
  "success": true,
  "message": "Utilisateur créé avec succès",
  "data": {
    "user": { ... },
    "token": "jwt_token",
    "refreshToken": "refresh_token",
    "passwordStrength": "fort"
  }
}
```

#### `POST /api/auth/login`
Connecter un utilisateur.

**Corps de la requête:**
```json
{
  "email": "jean.dupont@example.com",
  "password": "MotDePasse123!",
  "challenge": "challenge_from_get_challenge",
  "nonce": "nonce_solving_challenge"
}
```

#### `POST /api/auth/refresh-token`
Rafraîchir un token d'accès.

**Corps de la requête:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

### Endpoints Protégés (Authentification requise)

#### `GET /api/auth/profile`
Obtenir le profil de l'utilisateur connecté.

**Headers:**
```
Authorization: Bearer jwt_token
```

#### `PUT /api/auth/profile`
Mettre à jour le profil utilisateur.

#### `PUT /api/auth/change-password`
Changer le mot de passe.

**Corps de la requête:**
```json
{
  "currentPassword": "ancien_mot_de_passe",
  "newPassword": "nouveau_mot_de_passe"
}
```

### Endpoints Administrateur

#### `GET /api/auth/users`
Lister tous les utilisateurs (pagination).

**Query parameters:**
- `page`: numéro de page (défaut: 1)
- `limit`: nombre d'utilisateurs par page (défaut: 50)

---

## 📁 Structure du microservice

```text
auth-service/
├── server.js               # Entrée principale
├── app.js                  # Configuration Express
├── package.json            # Dépendances et scripts
├── .env                    # Variables d'environnement (ne pas committer)
├── .env.example            # Exemple de configuration
├── README.md               # Cette documentation
├── SECURITY.md             # Détails des mécanismes de sécurité
├── setup.sh                # Script d'installation automatique
├── config/                 # Configuration PostgreSQL
├── controllers/            # Logique métier des routes
├── middleware/             # Authentification et JWT
├── models/                 # Accès aux données (User.js)
├── routes/                 # Définitions des routes API
├── utils/                  # Fonctions utilitaires de sécurité
├── tests/                  # Tests unitaires (Jest)
└── logs/                   # Fichiers de log générés
```

Consultez `SECURITY.md` pour un résumé des protections en place.


#### `DELETE /api/auth/users/:userId`
Supprimer un utilisateur.

### Health Check

#### `GET /health`
Vérifier la santé du service.

## 🧪 Tests

```bash
# Exécuter tous les tests
npm test

# Tests avec couverture
npm run test:coverage

# Tests en mode watch
npm run test:watch
```

## 📊 Monitoring

### Logs
Les logs sont structurés et incluent :
- **Info**: Opérations normales
- **Warn**: Tentatives suspectes ou limites atteintes
- **Error**: Erreurs système

### Métriques
- Temps de réponse des requêtes
- Taux de succès des authentifications
- Nombre de tentatives de rate limiting
- Utilisation des ressources système

## 🔧 Scripts NPM

- `npm start`: Démarre le serveur en production
- `npm run dev`: Démarre le serveur en développement avec nodemon
- `npm test`: Exécute les tests
- `npm run test:coverage`: Tests avec rapport de couverture
- `npm run lint`: Vérification du code avec ESLint
- `npm run lint:fix`: Correction automatique des erreurs ESLint

## 🏗️ Architecture

```
auth-service/
├── app.js                 # Application Express principale
├── server.js              # Point d'entrée
├── config/
│   └── database.js        # Configuration PostgreSQL
├── controllers/
│   └── authController.js  # Logique métier d'authentification
├── middleware/
│   └── auth.js            # Middleware JWT
├── models/
│   └── User.js            # Modèle utilisateur
├── routes/
│   └── auth.js            # Routes d'authentification
├── utils/
│   └── security.js        # Utilitaires de sécurité
├── tests/                 # Tests unitaires
├── .env                   # Variables d'environnement
├── package.json           # Dépendances
└── README.md             # Cette documentation
```

## 🔐 Variables d'Environnement

| Variable | Description | Défaut |
|----------|-------------|---------|
| `PORT` | Port du serveur | `3001` |
| `NODE_ENV` | Environnement | `development` |
| `DB_HOST` | Hôte PostgreSQL | `localhost` |
| `DB_PORT` | Port PostgreSQL | `5432` |
| `DB_NAME` | Nom de la base | `heligxiam` |
| `DB_USER` | Utilisateur DB | - |
| `DB_PASSWORD` | Mot de passe DB | - |
| `JWT_SECRET` | Clé secrète JWT | - |
| `JWT_EXPIRES_IN` | Expiration token | `1h` |
| `JWT_REFRESH_EXPIRES_IN` | Expiration refresh token | `7d` |
| `POW_DIFFICULTY` | Difficulté Proof of Work | `4` |
| `BCRYPT_ROUNDS` | Rounds bcrypt | `12` |
| `ALLOWED_ORIGINS` | Origines CORS | `http://localhost:4200` |
| `LOG_LEVEL` | Niveau de logs | `info` |

## 🚨 Sécurité - Bonnes Pratiques

1. **Ne jamais commiter** le fichier `.env`
2. **Utiliser des mots de passe forts** pour la base de données
3. **Changer régulièrement** les clés JWT
4. **Monitorer les logs** pour détecter les attaques
5. **Mettre à jour régulièrement** les dépendances
6. **Utiliser HTTPS** en production
7. **Configurer un firewall** pour limiter l'accès au port

## 📞 Support

Pour toute question ou problème :
- Vérifier les logs du service
- Consulter la documentation API
- Ouvrir une issue sur le repository

## 📄 Licence

Ce projet est sous licence MIT.
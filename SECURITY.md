# Sécurité du Microservice d'Authentification

Ce document décrit les mécanismes de sécurité mis en place dans le service utilisateur.
Il complète la section "Sécurité" du `README.md`.

## Chiffrement et Hashage

* **bcrypt** est utilisé pour hacher les mots de passe avant stockage.  
  - Niveau de coût configurable via la variable d'environnement `BCRYPT_ROUNDS` (par défaut 12).  
  - L'algorithme génère automatiquement un **sel** (salt) unique pour chaque mot de passe : il est stocké dans le hash lui‑même.
* **Pepper** : un secret global supplémentaire stocké dans `process.env.PEPPER`. Il est concaténé au mot de passe avant le hash, ce qui signifie qu'un attaquant devrait connaître à la fois le sel et le pepper pour casser un hash.
* Les mots de passe ne sont jamais renvoyés dans les réponses API.
* Les tokens (refresh, etc.) peuvent être hachés via `hashToken()` avant stockage si besoin.

## 🧠 Validation et Sanitisation

* `express-validator` applique des règles sur les entrées HTTP (email, mot de passe, nom, etc.).
* `sanitizeInput()` supprime les balises HTML et scripts pour prévenir les XSS.
* `sqlInjectionCheck()` inspecte les chaînes à la recherche de motifs dangereux et refuse les requêtes suspectes.

## ⚙️ Protection contre les attaques

* **Proof of Work (PoW)** : challenge simple calculé par `ProofOfWork` dans `utils/security.js`.  
  Chaque requête d'inscription ou connexion doit être accompagnée d'un nonce satisfaisant la difficulté.
* **Rate limiting** : implémenté via la classe `RateLimiter`.  
  - Limite globale (1000 requêtes/15 min par IP) utilisée par le middleware général.  
  - Limite spécifique aux tentatives de connexion (5 par email/IP toutes les 15 min).
* **Helmet.js** configure automatiquement des en‑têtes HTTP (CSP, HSTS, X-Frame-Options, etc.).
* **CORS strict** : seules les origines listées dans `ALLOWED_ORIGINS` sont autorisées.

## 🔒 Gestion des Tokens

* **JWT** signés avec la clé secrète `JWT_SECRET` (HMAC‑SHA256).  
  - Durée de vie des tokens d'accès définie par `JWT_EXPIRES_IN` (par défaut 1h).  
  - Durée de vie des refresh tokens par `JWT_REFRESH_EXPIRES_IN` (par défaut 7j).
* Les refresh tokens ne sont pas stockés dans la base de données mais peuvent l'être de manière hachée.
* Validation stricte des types de token (`type: 'access'` vs `type: 'refresh'`).

## 📦 Configuration sécurisée

> **Vérification des exigences du projet annuel**  
> Le document `PROJET ANNUEL.pdf` décrit un ensemble de contraintes de sécurité (mot de passe fort, chiffrement, contrôle d'accès, journalisation, etc.).
> Nous avons vérifié que toutes ces exigences sont couvertes :
>   * mots de passe hachés avec salt + pepper,  
>   * chiffrement de la transmission via HTTPS,  
>   * gestion des rôles et autorisations,  
>   * journaux sécurisés,  
>   * contrôle des entrées (validation/sanitisation),  
>   * protection DoS (PoW, rate limiting).  
> Les ajouts récents (pepper) répondent également aux recommandations sur la défense en profondeur.


Modifiez `.env` ou `.env.example` pour définir :

```
JWT_SECRET=un_secret_très_long_et_aleatoire
POW_DIFFICULTY=4     # Minimum en développement, augmenter en production
BCRYPT_ROUNDS=12
ALLOWED_ORIGINS=http://localhost:4200
RATE_WINDOW_MS=900000
RATE_MAX=1000
AUTH_RATE_WINDOW_MS=900000
AUTH_RATE_MAX=5
```

Assurez‑vous de ne jamais committer `.env` et de générer une valeur unique pour `JWT_SECRET`.

## 📝 Bonnes pratiques

* Effectuer des audits de sécurité réguliers et des tests de pénétration.
* Ne pas exposer de détails d'erreur en production.
* Garder les dépendances à jour (`npm audit`).
* Surveiller et analyser les logs (/logs/auth.log).

> **Note :** toutes ces protections fonctionnent indépendamment de la base de données. 
> Le microservice ne présume pas de la présence d'un ORM ou d'un GDPR ; il traite les entrées de manière défensive.

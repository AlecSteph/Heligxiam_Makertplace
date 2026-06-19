# Installation des données en local (après clone Git)

Ce guide explique **comment obtenir les mêmes données de démo** sur un nouvel ordinateur après `git clone`.  
**Git ne copie pas MySQL Workbench** : chaque développeur a sa propre base locale, vide au départ.

---

## 1. Ce que Git contient — et ce qu’il ne contient pas

| Dans le dépôt Git | Hors Git (par machine) |
|-------------------|-------------------------|
| Code Angular + microservices | Contenu des bases MySQL / PostgreSQL |
| Schémas SQL (`docs/sql/`) | Fichiers uploadés (`auth-service/uploads/`) |
| Script de seed (`auth-service/scripts/seed-catalog-vendors.js`) | Panier / favoris navigateur (`localStorage`) |
| Images catalogue (`public/assets/catalog-seed/`) | Mot de passe MySQL personnel |
| Fichiers `.env.example` | Fichiers `.env` (secrets locaux) |

**Conséquence :** cloner le projet donne le **même code**, pas une copie exacte de la base de données de votre collègue. Il faut **recréer le schéma** puis **lancer le seed**.

---

## 2. Architecture des données du projet

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend Angular (localhost:4200)                          │
└───────────────┬─────────────────────────────────────────────┘
                │
    ┌───────────┼───────────┬──────────────┐
    ▼           ▼           ▼              ▼
 auth-service  product-    cart-service   MongoDB (optionnel)
 port 3001     service     port 3003      observabilité
               port 3002
    │           │           │
    ▼           ▼           ▼
  MySQL       PostgreSQL   PostgreSQL
  vendeur +   (marketplace) (marketplace)
  catalogue   via Docker    via Docker
```

| Base | Rôle | Obligatoire pour… |
|------|------|-------------------|
| **MySQL** `heligxiam_marketplace` | Vendeurs, boutiques, produits, promos, commandes boutique | Catalogue client, espace vendeur, admin |
| **PostgreSQL** `marketplace` | Panier / produits (microservices legacy) | `product-service`, `cart-service` |
| **MongoDB** | Logs / observabilité vendeur | Optionnel en dev |

---

## 3. Prérequis sur la nouvelle machine

- **Node.js** 20+ et **npm**
- **MySQL** 8.0+ (Workbench ou ligne de commande)
- **Docker Desktop** (recommandé pour PostgreSQL) — ou PostgreSQL installé localement
- **MongoDB** local (optionnel ; souvent déjà présent sur Windows en service)

---

## 4. Procédure complète (nouveau clone)

### Étape 1 — Cloner et installer les dépendances

```bash
git clone <url-du-repo> heligxiam-marketplace
cd heligxiam-marketplace

npm install
npm install --prefix auth-service
npm install --prefix product-service
npm install --prefix cart-service
```

### Étape 2 — MySQL : créer la base et le schéma

1. Ouvrir **MySQL Workbench** (ou client SQL).
2. Créer la base si elle n’existe pas :

```sql
CREATE DATABASE IF NOT EXISTS heligxiam_marketplace
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

3. Exécuter le script de schéma (menu *File → Open SQL Script*, puis exécuter) :

```
docs/sql/heligxiam_marketplace_core_mysql.sql
```

En ligne de commande :

```bash
mysql -u root -p heligxiam_marketplace < docs/sql/heligxiam_marketplace_core_mysql.sql
```

### Étape 3 — Configurer `auth-service/.env`

```bash
cd auth-service
copy .env.example .env    # Windows
# cp .env.example .env    # macOS / Linux
```

Adapter au minimum :

```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=<votre_mot_de_passe_mysql>
MYSQL_DATABASE=heligxiam_marketplace

# PostgreSQL auth (comptes clients) — si Docker postgres tourne :
DB_HOST=localhost
DB_PORT=5432
DB_NAME=marketplace
DB_USER=postgres
DB_PASSWORD=password
```

> **Note :** si la base PostgreSQL `heligxiam_marketplace` n’existe pas, utilisez `DB_NAME=marketplace` (créée par Docker) ou créez la base manuellement.

### Étape 4 — Peupler MySQL (données de démo)

Depuis `auth-service/` :

```bash
node scripts/seed-catalog-vendors.js
```

Ce script est **idempotent** : vous pouvez le relancer sans tout casser.

Il crée notamment :

- **10 vendeurs** + boutiques validées
- **47 produits** publiés (SKU `P001` … `P047`)
- Promotions et codes promo catalogue
- Images pointant vers `public/assets/catalog-seed/`

Vérification seule :

```bash
node scripts/seed-catalog-vendors.js --verify
```

### Étape 5 — PostgreSQL (product-service + cart-service)

**Option A — Docker (recommandé)**

```bash
cd ..   # racine du projet
docker compose up -d postgres
```

Créer les fichiers `.env` :

```bash
copy product-service\.env.example product-service\.env
copy cart-service\.env.example cart-service\.env
```

Valeurs par défaut compatibles Docker :

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=marketplace
DB_USER=postgres
DB_PASSWORD=password
```

**Option B — PostgreSQL installé localement**  
Même variables, avec vos identifiants.

### Étape 6 — Démarrer les serveurs

Terminal 1 — auth :

```bash
cd auth-service
npm start
# → http://localhost:3001/health
```

Terminal 2 — product (optionnel si vous testez le panier microservice) :

```bash
cd product-service
npm start
```

Terminal 3 — cart (optionnel) :

```bash
cd cart-service
npm start
```

Terminal 4 — frontend :

```bash
cd ..   # racine
npm start
# → http://localhost:4200
```

### Étape 7 — Vérifier que tout fonctionne

| Test | URL / action |
|------|----------------|
| API catalogue | http://localhost:3001/api/catalog/products |
| Santé auth | http://localhost:3001/health |
| Accueil site | http://localhost:4200 |
| Catégorie Mode | http://localhost:4200/category/mode |

---

## 5. Comptes de test (après seed)

| Rôle | Identifiant | Mot de passe |
|------|-------------|--------------|
| **Vendeur** (ex. TechStore) | `vendeur.techstore-pro@heligxiam.com` | `Vendeur2026!` |
| **Tous les vendeurs** | `vendeur.{slug}@heligxiam.com` | `Vendeur2026!` |
| **Admin** | `admin@heligxiam.com` | `Heligxiam2026!` |

Liste des slugs vendeurs : `techstore-pro`, `electromarket`, `fashion-hub`, `nike-flagship`, `heligxiam-official`, `home-essentials`, `beaute-paris-select`, `sport-performance`, `auto-expert-france`, `samsung-premium`.

Référence complète : [SPEC_VENDEURS_CATALOGUE_CLIENT.txt](./SPEC_VENDEURS_CATALOGUE_CLIENT.txt)

---

## 6. Données uniquement dans le navigateur

Ces éléments **ne suivent pas** le clone Git ni MySQL :

| Clé localStorage | Contenu |
|------------------|---------|
| `heligxiam-wishlist` | Favoris |
| `heligxiam-cart` | Panier (mode local) |
| `auth_token`, `user_data` | Session connectée |

Sur une nouvelle machine : panier et favoris sont **vides** jusqu’à navigation sur le site.  
Si des liens produit cassés apparaissent, vider le cache navigateur :

```js
localStorage.removeItem('heligxiam-wishlist');
localStorage.removeItem('heligxiam-cart');
```

Puis recharger (Ctrl+F5) et ré-ajouter des articles depuis le catalogue.

---

## 7. Réinitialiser ou resynchroniser les données

### Tout recommencer (MySQL)

```sql
DROP DATABASE heligxiam_marketplace;
CREATE DATABASE heligxiam_marketplace
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Puis réexécuter le schéma SQL et :

```bash
node auth-service/scripts/seed-catalog-vendors.js
```

### PostgreSQL Docker

```bash
docker compose down -v
docker compose up -d postgres
```

Les volumes sont recréés vides ; les microservices recréent les tables au démarrage.

---

## 8. Partager des données entre développeurs (avancé)

Le flux **standard** est : schéma SQL + seed (données identiques pour tous).

Si vous devez partager un **état exact** (debug commande, KYC, etc.) :

1. Export Workbench : *Server → Data Export* → base `heligxiam_marketplace`
2. L’autre importe : *Server → Data Import*
3. **Ne pas commiter** les dumps SQL avec des mots de passe ou données personnelles

Les uploads vendeur (`auth-service/uploads/seller-docs/`) ne sont en général **pas** dans Git : les recopier manuellement ou régénérer via le seed.

---

## 9. Dépannage fréquent

| Symptôme | Cause probable | Solution |
|----------|----------------|----------|
| Catalogue vide | Seed non lancé ou MySQL mal configuré | Vérifier `.env`, relancer le seed |
| `Catalogue indisponible (MySQL requis)` | `MYSQL_HOST` absent dans `.env` | Copier et remplir `auth-service/.env` |
| Catégories vides sauf Électronique | Ancienne version API (noms catégories) | Mettre à jour le code, redémarrer auth-service |
| `heligxiam_marketplace` does not exist (PostgreSQL) | Mauvaise base pour auth PG | `DB_NAME=marketplace` ou créer la base |
| product/cart ne démarrent pas | PostgreSQL arrêté | `docker compose up -d postgres` |
| Fiche produit « Impossible de charger » | Favoris/panier avec anciens IDs | Vider `localStorage` (§6) |
| Vidéos ne jouent pas | URLs externes (YouTube, Google) | Réseau / pare-feu ; pas lié à MySQL |

---

## 10. Checklist rapide (collègue qui clone)

- [ ] `git clone` + `npm install` (racine + 3 microservices)
- [ ] MySQL : base + `heligxiam_marketplace_core_mysql.sql`
- [ ] `auth-service/.env` configuré
- [ ] `node auth-service/scripts/seed-catalog-vendors.js`
- [ ] Docker PostgreSQL OU PostgreSQL local + `.env` product/cart
- [ ] `auth-service` + `npm start` (frontend)
- [ ] http://localhost:4200 — produits visibles
- [ ] Connexion vendeur test OK

---

## Fichiers utiles

| Fichier | Description |
|---------|-------------|
| [heligxiam_marketplace_core_mysql.sql](./sql/heligxiam_marketplace_core_mysql.sql) | Schéma MySQL vendeur / catalogue |
| [SPEC_VENDEURS_CATALOGUE_CLIENT.txt](./SPEC_VENDEURS_CATALOGUE_CLIENT.txt) | Spécification catalogue et comptes |
| [README_VENDEUR_BACKEND.md](./README_VENDEUR_BACKEND.md) | API espace vendeur |
| [../docker-compose.yml](../docker-compose.yml) | PostgreSQL + MongoDB Docker |
| [../auth-service/scripts/seed-catalog-vendors.js](../auth-service/scripts/seed-catalog-vendors.js) | Seed données démo |

---

*Document maintenu pour l’équipe HELIGXIAM — environnement de développement local.*

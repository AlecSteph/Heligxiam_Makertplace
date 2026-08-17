# Guide de soutenance — Heligxiam Marketplace
## Côté client Angular + Microservices

*Document de préparation pour expliquer le projet à un professeur.*

---

# PARTIE 1 — CÔTÉ CLIENT (Frontend Angular)

## 1. Pitch d'ouverture (30 secondes)

> « Notre marketplace est une **SPA Angular 21** : une seule page web qui charge les écrans à la demande. Le **côté client**, c'est tout ce que voit l'acheteur : accueil, catalogue, fiche produit, panier, favoris, compte et profil. On communique avec le backend via **HTTP** (auth sur le port 3001, commandes sur le 3004). Côté navigateur, on gère l'**état** avec des **services Angular + RxJS**, sans NgRx. »

**Si le prof demande « c'est quoi une SPA ? » :**

> « Single Page Application : le navigateur charge Angular une fois, puis Angular change les écrans via le **router** sans recharger toute la page. »

---

## 2. Architecture globale

### Stack technique

| Élément | Détail |
|--------|--------|
| **Angular** | Version 21, composants **standalone** (pas de NgModule racine) |
| **Bootstrap** | `main.ts` → `bootstrapApplication(AppComponent, appConfig)` |
| **Routing** | `app.routes.ts` — lazy loading pour presque toutes les pages |
| **HTTP** | `HttpClient` + 3 interceptors dans `app.config.ts` |
| **État** | `BehaviorSubject` dans les services (panier, auth, locale) |
| **Styles** | Tailwind CSS + CSS par composant |
| **Icônes** | lucide-angular |

### Structure des dossiers (`src/app/`)

```
src/app/
├── app.component.ts          # Shell : header, footer, router-outlet, chatbot
├── app.config.ts             # Providers globaux (router, HTTP, interceptors)
├── app.routes.ts             # Définition des routes
├── components/               # UI réutilisable (header, footer, product-card, logo)
├── pages/                    # Pages routées (home, cart, login, profile…)
├── services/                 # Logique métier + appels HTTP
├── guards/                   # Protection des routes
├── interceptors/             # Token JWT, erreurs, logs
├── pipes/                    # | t (traduction), localizedPrice
├── models/                   # Interfaces TypeScript (User, Product)
├── i18n/                     # Dictionnaires de traduction
└── utils/                    # password.util.ts
```

**Phrase clé :** « On sépare **composants de présentation** (header, product-card) et **pages** (cart, profile) qui orchestrent les services. »

### Fichier central : `app.config.ts`

Ce fichier configure toute l'application :

- **Router** avec scroll en haut à chaque navigation
- **HttpClient** avec interceptors
- **APP_INITIALIZER** : au démarrage, restaure la session utilisateur (token localStorage + appel `/me`)
- **Interceptors** : AuthInterceptor, ErrorInterceptor, LoggingInterceptor

---

## 3. Parcours client — fil conducteur

```
Accueil → Catalogue → Fiche produit → Panier → Checkout → Profil (commandes)
```

### Étape 1 — Accueil (`/` → HomeComponent)

- Charge les produits via `CatalogService.loadProducts()`
- Affiche carrousels (bestsellers, promos) avec `ProductCardComponent`
- Header : recherche, langue, compteur panier

### Étape 2 — Catalogue

| Route | Composant | Rôle |
|-------|-----------|------|
| `/search` | SearchComponent | Recherche + filtres |
| `/category/:category` | CategoryComponent | Produits par catégorie |
| `/product/:id` | ProductDetailComponent | Détail, avis, ajout panier/favoris |

**CatalogService** appelle `http://localhost:3001/api/catalog/products` et met en cache en mémoire.

**API catalogue (testée) :** `GET /api/catalog/products` → `{ success: true, data: { rows: [...], total: 47 } }` — 47 produits seed.

### Étape 3 — Panier (`/cart`)

- Géré par **CartService** — 100 % côté navigateur (localStorage)
- Au checkout → **BuyerService.checkout()** → `order-service:3004`

### Étape 4 — Compte (`/account`)

- Login, inscription, mot de passe oublié
- Redirection selon le rôle : client → `/profile`, vendeur → `/seller`

### Étape 5 — Profil (`/profile` — protégé par AuthGuard)

- Commandes, retours, paramètres, changement de mot de passe
- Vues via query param : `?view=orders`, `?view=settings`

---

## 4. Routes principales (`app.routes.ts`)

| Route | Composant | Guard |
|-------|-----------|-------|
| `''` | HomeComponent | — |
| `search` | SearchComponent | lazy |
| `product/:id` | ProductDetailComponent | lazy |
| `category/:category` | CategoryComponent | lazy |
| `cart` | CartComponent | lazy |
| `wishlist` | WishlistComponent | lazy |
| `account` | LoginComponent | lazy |
| `reset-password` | ResetPasswordComponent | lazy |
| `profile` | ProfileComponent | **AuthGuard** |
| `seller` | SellerDashboardComponent | **SellerGuard** |
| `admin/*` | Admin components | **adminAuthGuard** |

---

## 5. Les 6 concepts Angular à maîtriser

### ① Composants standalone

Chaque page déclare ses imports explicitement :

```typescript
@Component({
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
})
```

> « Chaque feature est autonome, sans gros NgModule central. »

### ② Lazy loading

```typescript
loadComponent: () => import('./pages/cart/cart.component').then(m => m.CartComponent)
```

> « Le code du panier n'est téléchargé que quand l'utilisateur va sur `/cart` → bundle initial plus léger. »

### ③ Reactive Forms

Login / register : `FormBuilder`, `Validators`, validateurs custom (`passwordMatchValidator`).

> « On valide avant d'envoyer au serveur : email, longueur mot de passe, correspondance confirm password. »

### ④ Services injectables

```typescript
@Injectable({ providedIn: 'root' })
export class CartService { ... }
```

Singleton partagé dans toute l'application.

### ⑤ RxJS — BehaviorSubject

```typescript
private cartItems = new BehaviorSubject<CartItem[]>([]);
public cart$ = this.cartItems.asObservable();
```

> « BehaviorSubject garde la dernière valeur. Les composants s'abonnent et se mettent à jour automatiquement. »

### ⑥ Guards

```typescript
path: 'profile',
canActivate: [() => import('./guards/auth.guard').then(m => m.AuthGuard)]
```

> « Avant d'afficher `/profile`, Angular appelle le guard. Si pas connecté → redirect `/account?returnUrl=/profile`. »

---

## 6. Services Angular (`src/app/services`)

| Service | Rôle | API |
|---------|------|-----|
| **AuthService** | Login, JWT, session, profil | `localhost:3001/api/auth/*` |
| **CatalogService** | Catalogue produits (cache) | `localhost:3001/api/catalog/*` |
| **BuyerService** | Commandes, checkout, retours | `localhost:3004/api/buyer/*` |
| **CartService** | Panier localStorage | Aucune API |
| **WishlistService** | Favoris localStorage | Aucune API |
| **LocaleService** | Langue, pays, devise, i18n | Aucune API |
| **RecaptchaService** | Widget reCAPTCHA v2 | `GET /api/auth/recaptcha-config` |
| **NotificationService** | Toast « Article ajouté » | Aucune API |

---

## 7. Authentification — sujet n°1

### Flux login

1. Formulaire → `AuthService.login()` → `POST /api/auth/login`
2. Réponse : `token`, `refreshToken`, `user`
3. Stockage **localStorage** : `auth_token`, `refresh_token`, `user_data`
4. Mise à jour `authState$` (BehaviorSubject)
5. Redirection selon `user.role`

### Rôles (`auth.model.ts`)

```typescript
role: 'client' | 'vendeur' | 'admin'
```

### Intercepteur (AuthInterceptor)

> « Chaque requête HTTP reçoit `Authorization: Bearer {token}`. Si 401, on tente un refresh token puis on relance la requête. »

### Register ≠ login auto

> « Après inscription, l'utilisateur doit se connecter explicitement — choix de sécurité / UX. »

### reCAPTCHA

- Config depuis le backend (`RecaptchaService`)
- Token dans `LoginRequest.recaptchaToken`

### Politique mot de passe (`password.util.ts`)

```
/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}$/
```

Min 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre. Underscore et symboles autorisés. Même règle frontend et backend.

### APP_INITIALIZER

Au F5 (rechargement page) : `bootstrapSession()` relit le token et appelle `GET /me` pour restaurer l'état connecté.

---

## 8. Panier — sujet n°2

**CartService** (`cart.service.ts`) :

1. **Invité** : clé localStorage `heligxiam-cart-guest`
2. **Connecté** : clé `heligxiam-cart-{userId}`
3. **Au login** : fusion panier invité + panier utilisateur (`mergeGuestCartIntoUser`)
4. **reconcileWithCatalog()** : corrige prix/stock si produit modifié en API

**Question piège : « Pourquoi pas NgRx ? »**

> « Pour notre échelle, service + BehaviorSubject + localStorage suffit. NgRx ajouterait de la complexité sans gain immédiat. »

**Question piège : « Pourquoi le panier n'appelle pas cart-service ? »**

> « Choix de simplicité : persistance locale immédiate. Le checkout passe par l'API commandes (order-service). »

---

## 9. Internationalisation (i18n)

Solution **maison** (pas @angular/localize) :

| Couche | Fichier |
|--------|---------|
| Dictionnaires | `i18n/translations.ts` |
| Home/Footer | `i18n/home-footer.translations.ts` |
| Service | `LocaleService.t('header.nav.cart')` |
| Template | `{{ 'header.nav.cart' | t }}` |
| Pipe | `translate.pipe.ts` — **pure: false** pour réagir au changement de langue |

8 langues : fr, en, es, de, it, pt, nl, ar. Layout LTR même pour l'arabe.

Prix : `LocalizedPricePipe` + `Intl.NumberFormat`.

---

## 10. Composants clés

| Composant | Rôle |
|-----------|------|
| **Header** | Nav, recherche, panier, langue, menu utilisateur |
| **Footer** | Liens légaux, newsletter, slogan i18n |
| **ProductCard** | Carte produit réutilisée (home, search, category) |
| **Logo** | Identité Heligxiam + tagline |
| **Chatbot** | FAQ rule-based (pas de LLM), position en localStorage |
| **Notification** | Toast « Article ajouté au panier » |

**AppComponent** masque header/footer sur `/account`, `/seller`, `/reset-password`.

---

## 11. Checkout — flux bout en bout

Dans `cart.component.ts` :

1. Vérifier adresse livraison
2. `buyerService.checkout({ items, address, promo, delivery })`
3. `POST http://localhost:3004/api/buyer/orders/checkout`
4. Succès → vider panier, redirect profil commandes

---

## 12. Fichiers à ouvrir pendant la soutenance

| Priorité | Fichier | Pour montrer |
|----------|---------|--------------|
| ★★★ | `app.routes.ts` | Toutes les routes |
| ★★★ | `app.config.ts` | Wiring global |
| ★★★ | `services/auth.service.ts` | Login, tokens |
| ★★★ | `services/cart.service.ts` | État + localStorage |
| ★★ | `guards/auth.guard.ts` | Protection /profile |
| ★★ | `interceptors/auth.interceptor.ts` | Bearer + refresh |
| ★★ | `pages/login/login.component.ts` | Forms + reCAPTCHA |
| ★ | `services/locale.service.ts` | i18n |
| ★ | `models/auth.model.ts` | Contrats TypeScript |

---

## 13. Questions du prof + réponses

**« Différence composant vs service ? »**
> Composant = UI. Service = logique réutilisable + appels HTTP.

**« C'est quoi un interceptor ? »**
> Middleware HTTP : modifie requêtes/réponses avant le composant.

**« Où est stocké le JWT ? »**
> localStorage (`auth_token`). Admin séparé en sessionStorage.

**« Que se passe-t-il au F5 ? »**
> APP_INITIALIZER → bootstrapSession() → GET /me → restaure l'état.

**« Comment empêcher l'accès à /profile ? »**
> AuthGuard + validateSession().

**« Reactive vs Template-driven forms ? »**
> Reactive = définition en TypeScript, testable, validateurs composables.

**« Observable vs Promise ? »**
> Observable = flux RxJS, annulable, opérateurs (map, filter).

**« Pourquoi TypeScript ? »**
> Typage fort : User, CartItem, AuthResponse — moins d'erreurs.

**« CORS ? »**
> Backend autorise localhost:4200. Frontend appelle URLs absolues (3001, 3004).

---

## 14. Script démo (3 minutes)

1. **Home** — CatalogService charge le catalogue
2. **Clic produit** — getProductById
3. **Ajouter au panier** — CartService.addToCart(), compteur header
4. **Changer langue** — LocaleService, pipe | t
5. **Panier** — localStorage, promo, livraison
6. **Login** — Reactive form, reCAPTCHA
7. **Profile** — Guard + commandes BuyerService

---

## 15. Ce qu'il vaut mieux ne pas dire

- « L'IA a fait le frontend »
- « Tout est synchronisé en temps réel » (le panier est local)
- « NgRx gère l'état » (c'est BehaviorSubject)

**Points honnêtes (ça impressionne) :**
- Panier localStorage, pas cart-service en temps réel
- Chatbot rule-based, pas ChatGPT
- i18n custom, pas la lib officielle Angular
- Favoris pas liés au compte utilisateur

---

## 16. Vocabulaire à placer

| Terme | Explication |
|-------|-------------|
| SPA | Une page, navigation sans reload complet |
| Lazy loading | Charger le code à la demande |
| Guard | Videur à l'entrée d'une route |
| Interceptor | Filtre sur toutes les requêtes HTTP |
| BehaviorSubject | Variable observable avec valeur courante |
| Standalone | Composant autonome sans NgModule |
| JWT | Token signé pour identifier l'utilisateur |
| Refresh token | Renouveler l'accès sans re-login |

---

## 17. Phrase de conclusion (côté client)

> « Le côté client Heligxiam, c'est une SPA Angular modulaire : routing lazy, services pour l'état, guards pour la sécurité, interceptors pour l'auth HTTP, et une UX marketplace complète du catalogue au checkout. On a gardé le panier côté navigateur pour la réactivité, et on délègue la persistance métier au backend au moment du paiement. »

---

# PARTIE 2 — MICROSERVICES (Backend)

## 1. Qu'est-ce qu'un microservice ?

Une **petite application backend indépendante** qui fait **une seule chose bien** et communique via **HTTP** (API REST).

**Monolithe** = tout dans un seul serveur.

**Microservices** = chaque domaine métier a son dossier, son port, souvent sa base.

### Services Heligxiam

| Service | Port | Rôle |
|---------|------|------|
| auth-service | 3001 | Connexion, JWT, catalogue, vendeurs |
| product-service | 3002 | Produits |
| cart-service | 3003 | Panier serveur |
| order-service | 3004 | Commandes, checkout |

Frontend Angular (:4200) appelle ces APIs.

---

## 2. Les 7 étapes pour créer un microservice

### Étape 1 — Définir le périmètre

« Ce service fait quoi, et quoi seulement ? »

Exemple order-service : créer commande, lister, annuler, reçu PDF. Pas le login.

### Étape 2 — Structure du dossier

```
order-service/
├── server.js          # Point d'entrée
├── app.js             # Express (middlewares, routes)
├── package.json
├── Dockerfile
├── .env.example
├── config/database.js
├── routes/buyer.js, seller.js
├── lib/ordersRepository.js
├── middlewares/auth.js
└── utils/security.js
```

### Étape 3 — Node.js + Express

```json
{
  "name": "order-microservice",
  "main": "server.js",
  "scripts": { "start": "node server.js", "dev": "nodemon server.js" },
  "dependencies": { "express", "cors", "dotenv", "pg" }
}
```

### Étape 4 — Configurer Express (app.js)

- helmet() — sécurité headers
- cors() — autorise Angular (:4200)
- express.json() — parse JSON
- GET /health — santé du service
- app.use('/api/buyer', buyerRoutes)

### Étape 5 — Démarrer (server.js)

```javascript
const PORT = process.env.PORT || 3004;
await db.testConnection();
app.listen(PORT, () => console.log(`Order service on ${PORT}`));
```

### Étape 6 — Routes REST

| Méthode | URL | Action |
|---------|-----|--------|
| GET | /api/buyer/orders | Lire |
| POST | /api/buyer/orders/checkout | Créer |
| PUT | /api/buyer/orders/:id/cancel | Modifier |

### Étape 7 — Docker + docker-compose

**Dockerfile :**
```
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 3004
CMD ["node", "server.js"]
```

**docker-compose.yml :** ports, environment, depends_on, healthcheck, network.

---

## 3. Schéma architecture

```
Angular :4200
    │ HTTP
    ├── auth-service :3001 → MySQL, PostgreSQL, MongoDB
    ├── product-service :3002 → PostgreSQL
    ├── cart-service :3003 → PostgreSQL
    └── order-service :3004 → PostgreSQL
```

---

## 4. Critères d'un vrai microservice

| Critère | Heligxiam |
|---------|-----------|
| Responsabilité unique | order = commandes |
| Déploiement indépendant | Dockerfile + Docker séparé |
| API HTTP | /api/buyer/orders |
| État propre | Tables PostgreSQL |
| Health check | GET /health |
| Config externe | Variables d'environnement |
| Auth partagée | JWT même secret |

---

## 5. Communication frontend ↔ microservice

```typescript
// buyer.service.ts
private API = 'http://localhost:3004/api/buyer';
checkout(payload) {
  return this.http.post(`${this.API}/orders/checkout`, payload);
}
```

---

## 6. Phrases pour le prof (microservices)

> « Un microservice, c'est une app Node.js autonome avec Express, un port dédié et une API REST. On le containerise avec Docker et on l'orchestre via docker-compose. »

> « order-service sur le port 3004 gère uniquement les commandes. Il se connecte à PostgreSQL, expose /api/buyer/orders/checkout, et vérifie le JWT. »

> « Le endpoint /health permet à Docker de savoir si le service est prêt (depends_on). »

---

## 7. Erreurs fréquentes

- Tout dans un seul service
- Oublier CORS
- Hardcoder localhost dans Docker (utiliser order-service:3004)
- Pas de /health
- Pas de gestion d'erreur JSON

---

## 8. Checklist nouveau microservice

1. Créer le dossier
2. npm init + express, cors, dotenv
3. app.js + server.js + /health
4. Routes métier
5. Connexion DB
6. Dockerfile
7. Bloc docker-compose.yml
8. Test curl /health
9. Brancher frontend ou autre service

---

# PARTIE 3 — SYNTHÈSE GLOBALE PROJET

## Ports et URLs

| Composant | URL |
|-----------|-----|
| Frontend Angular | http://localhost:4200 |
| Auth + Catalogue | http://localhost:3001 |
| Product | http://localhost:3002 |
| Cart | http://localhost:3003 |
| Order | http://localhost:3004 |
| MySQL Docker | localhost:3307 |
| PostgreSQL | localhost:5432 |

## Compte test (si seed)

- Email : vendeur.techstore-pro@heligxiam.com
- Mot de passe : Vendeur2026!

## Commandes utiles

```bash
# Frontend
npm start

# Stack Docker
docker compose up -d

# Vérifier catalogue
curl http://localhost:3001/api/catalog/products

# Vérifier order-service
curl http://localhost:3004/health
```

## Branche Git

Travail poussé sur la branche **Heloise** (fusion code Alec + doc Héloïse).

---

*Document généré pour la soutenance Heligxiam Marketplace — Bonne chance !*

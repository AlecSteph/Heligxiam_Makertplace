# Cahier des charges — Contrat d’API HELIGXIAM (Marketplace)

| Attribut | Valeur |
|----------|--------|
| **Version** | **2.2** — avril 2026 |
| **Statut** | Référence d’ingénierie — aligné revue code Angular + SQL dépôt |
| **Changement v2.2** | **Exigence explicite** : client, vendeur et admin passent par des **microservices sécurisés** (§1.2). |
| **Changement v2.1** | Revue **client / vendeur / admin** : parcours profil détaillé, **double canal d’authentification**, matrice modules admin, marchés vendeur, annexes de traçabilité, NFR et dettes techniques. |

**Note** : les corps JSON détaillés et les matrices d’erreurs HTTP restent **allégés** ; le détail contractuel doit vivre dans une **OpenAPI** versionnée à côté de ce document.

---

## 0. Historique d’évolution

| Version | Contenu |
|---------|---------|
| **1.0** (équipe, début de projet) | API Gateway, JWT, 6 microservices (users SQL + catalog / cart / orders / payments / addresses NoSQL), conventions communes. |
| **2.0** | Parcours **client**, **vendeur** (`/seller`), **admin** (3 zones), scripts PostgreSQL HELIGXIAM + pont `users`. |
| **2.1** | Compléments **profil client** (vues internes), **auth marketplace vs admin**, **marchés** vendeur, **matrice fonctionnelle admin**, **NFR**, **dettes code**, **annexes** de couverture. |
| **2.2** | Principe **sécurité transverse** : **client**, **vendeur** et **admin** — chaque flux traverse la Gateway et des **microservices protégés** (§1.2). |

---

## 0.1 Portée, lecteurs et glossaire

**Lecteurs cibles** : architectes logiciel, développeurs backend/front, QA, product owner, équipe conformité.

**Hors périmètre implicite** : implémentation UI pixel-perfect, charte graphique, contenus légaux rédigés par le juridique.

| Terme | Définition |
|--------|------------|
| **Gateway** | Point d’entrée unique `http://localhost:3000/api` (exemple), routage vers microservices. |
| **Utilisateur plateforme** | Enregistrement dans `users` (UUID) — client ou vendeur selon rôles. |
| **Opérateur** | Compte console **admin** (authentification **distincte** de l’app marketplace dans l’implémentation actuelle). |
| **Boutique** | Entité métier vendeur (`boutiques` SQL), liée au compte vendeur. |
| **Fiche vendeur (admin)** | Écran détail accessible depuis l’annuaire (`vendor-detail`), hors entrée menu latérale. |

---

## 1. Contexte et conventions générales

- **Architecture cible** : **API Gateway** + microservices derrière.
- **Services (cible v1)**  
  - `users` **:3001** — PostgreSQL  
  - `catalog` **:3002** — MongoDB  
  - `orders` **:3003** — MongoDB  
  - `cart` **:3004** — MongoDB  
  - `payments` **:3005** — MongoDB  
  - `addresses` **:3006** — MongoDB  
- **Format** : JSON pour les corps de requête/réponse.
- **Authentification marketplace** : `Authorization: Bearer <JWT>` ; refresh token côté client (voir `AuthService`). La Gateway propage `X-User-Id`, `X-User-Role`, `X-Request-Id` vers les services internes.
- **Rôles métier** (JWT marketplace) : `client` | `vendeur` | `admin` (énumération `UserRole` côté front).
- **Inscription / login marketplace** : le front utilise aujourd’hui **e-mail** + mot de passe (+ `nom` / `prenom` à l’inscription) — le CDG historique mentionnait `username` : **à unifier** dans l’OpenAPI (soit `username` = alias de l’e-mail, soit schéma `email` officiel).
- **Pagination** : `?page=0&limit=20&sort=price:desc` (ou équivalent par domaine).
- **Erreurs** : enveloppe type `{ "error": "message", "code": "ERR_CODE" }` (détail par endpoint en OpenAPI).

**Évolution métier (SQL)** : `heligxiam_marketplace_core.sql`, `heligxiam_marketplace_operateur.sql`, `heligxiam_users_cdg_postgresql.sql` — voir §7.

---

## 1.1 Authentification multi-canal (revue code)

| Canal | Route UI | Service front | Exigence API |
|--------|-----------|---------------|--------------|
| **Marketplace** | `/account`, `/profile`, `/seller`, … | `AuthService` — JWT + **refresh token** | `POST /auth/login`, `POST /auth/register`, refresh, `GET /auth/me`, `POST /auth/logout` (+ invalidation côté serveur / Redis). |
| **Console opérateur** | `/admin/login`, `/admin/*` | `AdminAuthService` — **session dédiée** (`adminAuthGuard`) | **JWT ou session serveur séparés** recommandés : ex. `POST /admin/auth/login`, `POST /admin/auth/logout` — *ne pas mélanger* les tokens marketplace et admin en production. |

**Garde d’accès** : `SellerGuard` — utilisateur connecté avec rôle **vendeur** ou **admin** ; `adminAuthGuard` — opérateur connecté sur la console.

**Redirection après login** : support de `returnUrl` (query) lors du refus d’accès — l’API d’auth doit permettre au client de reprendre le parcours.

**Dette technique** : dans `auth.guard.ts`, les redirections par rôle pointent encore vers des routes **non alignées** (`/vendor-dashboard`, `/admin-dashboard`) alors que les routes réelles sont `/seller` et `/admin/dashboard` — **à corriger** côté front et reflété dans les tests E2E.

---

## 1.2 Exigence — **Client**, **vendeur** et **admin** : microservices **toujours sécurisés**

**Objectif** : quel que soit le public (acheteur, marchand, opérateur), **aucun appel métier sensible** ne contourne la sécurité : tout passe par la **Gateway** et des **microservices** qui appliquent **authentification**, **autorisation** et **traçabilité**.

| Public | Point d’entrée typique | Sécurité attendue |
|--------|-------------------------|-------------------|
| **Client** | `/api/...` (panier, commandes, profil…) | JWT marketplace (ou session) ; Gateway vérifie le token ; services reçoivent `X-User-Id` / `X-User-Role` ; **refus** si rôle insuffisant (ex. créer un produit avec rôle `client`). |
| **Vendeur** | `/api/vendor/...` + mêmes règles sur ressources partagées | Même chaîne ; rôle **`vendeur`** (ou `admin` si dérogation) ; contrôle que `sellerId` / `boutique` = utilisateur autorisé. |
| **Admin** | `/api/admin/...` (recommandé) | **Identité opérateur distincte** du JWT marketplace (token ou session **admin** dédié) ; droits fins (rôles opérateur) ; **audit** des actions sensibles. |

**Règles d’architecture (non négociables)** :

1. **TLS** partout (HTTPS) entre client et Gateway ; idéalement **mTLS** ou **réseau privé** entre Gateway et microservices en production.  
2. **Pas d’exposition directe** des bases PostgreSQL / MongoDB sur Internet — uniquement via APIs derrière la Gateway.  
3. Chaque microservice **valide le contexte** (identité + rôle + périmètre ressource) : ne pas se fier uniquement au front.  
4. **Séparation des jetons** : marketplace (`client` / `vendeur`) ≠ console **admin** (évite qu’un token acheteur donne accès opérateur).  
5. **Journalisation** : `X-Request-Id` pour corrélation ; actions admin → journal d’audit (SQL `journal_audit_operateur` ou équivalent).

*Résumé* : **client**, **vendeur** et **admin** utilisent tous des **microservices sécurisés** ; la différence est le **type d’identité** et les **autorisations**, pas l’absence de sécurité pour l’un d’eux.

---

## 2. Cartographie front-end (Angular)

### 2.1 Parcours **client** (marketplace public + compte)

| Route | Écran | Besoins API / données |
|-------|--------|------------------------|
| `/` | Accueil | Hero / carrousel, catégories, mises en avant, badges (ex. Premium) — **CMS ou service merchandising** si contenu dynamique. |
| `/search` | Recherche | Filtres, tri, `queryParams` (ex. `badge`) — **catalog** + éventuel moteur de recherche. |
| `/product/:id` | Fiche produit | Produit, médias, vendeur, disponibilité, avis agrégés. |
| `/category/:category` | Liste par catégorie | Arbre / fil d’Ariane + listing paginé. |
| `/cart` | Panier | Service **cart** ; cohérence prix/stock avec **catalog**. |
| `/wishlist` | Liste d’envies | Persistance **par utilisateur** (Mongo dédié ou sous-document user) ; synchronisation avec profil (voir §2.1.1). |
| `/account` | Connexion / inscription | Auth marketplace ; **lien vendeur** si parcours « devenir vendeur » (`/sell`). |
| `/profile` | Espace client (protégé) | Voir **§2.1.1** (vues multiples). |
| `/sell` | Landing vendeur | Contenu marketing + CTA vers inscription **rôle vendeur** + onboarding. |
| `/guide`, `/legal` | Contenu | Pages statiques ou **headless CMS**. |
| `/offres` | Offres | Promotions / campagnes catalogue. |

#### 2.1.1 Espace **profil client** (`/profile`, `?view=`)

Vues internes (`ProfileView`) à couvrir par des agrégats ou microservices :

| Vue | Contenu métier | Services concernés |
|-----|----------------|-------------------|
| `dashboard` | Synthèse, stats, activité | users, orders, loyalty |
| `orders` | Commandes en cours | orders |
| `purchases` | Historique d’achats | orders |
| `wishlist` | Souhaits | wishlist + catalog |
| `reviews` | Avis laissés | reviews / orders |
| `addresses` | Carnet d’adresses | addresses |
| `payments` | Moyens de paiement | payments (tokens / masques PCI) |
| `messages` | Messagerie | notifications / messaging |
| `coupons` | Codes promo possédés | coupons / promotions |
| `loyalty` | Points fidélité, paliers | programme fidélité (SQL ou service dédié) |
| `subscriptions` | Abonnements HELIGXIAM+ | billing / subscriptions |
| `settings` | Paramètres compte | users |
| `security` | Mot de passe, 2FA, préférences notif | users + préférences RGPD |
| `help` | Aide & tickets | support / FAQ |

**Données affichées** (démo UI) : niveau membre, points, crédit boutique, abonnements type « Premium » — à modéliser selon stratégie produit (extensions du schéma `users` ou collections dédiées).

---

### 2.2 Parcours **vendeur** (`/seller`, `SellerGuard`)

#### Navigation fonctionnelle (ids `activeNav`)

| Domaine UI | Id section | Besoin API (résumé) |
|------------|------------|---------------------|
| Accueil | `dashboard` | KPIs, commandes récentes, activité, graphiques, **sélecteur de marché** (FR / DE / IT / ES / UK) — reporting multi-marché. |
| Catalogue | `catalog` | Liste / statut produits, Buy Box, modération. |
| | `add-product` | Création fiche, médias, attributs. |
| | `brand-registry` | Dossiers marque. |
| | `bulk-upload` | Jobs import CSV + rapport. |
| Stock & expédition | `inventory` | Stock, alertes, mouvements. |
| | `fba-shipments` | Expéditions vers logistique HX. |
| | `returns` | Retours & remboursements côté vendeur. |
| Prix | `pricing` | Règles de prix, marges. |
| | `auto-pricing` | Règles de retarification automatique. |
| | `promotions` | Coupons / promos boutique. |
| Commandes | `orders` | Liste commandes, statuts, SLA. |
| | `unshipped` | File « à expédier ». |
| | `messages` | **Messagerie acheteur** (conversations liées commandes). |
| Publicité | `campaigns` | Campagnes sponsorisées, budgets. |
| | `sponsored-brands` | Marques sponsorisées. |
| | `deals` | Ventes flash & deals. |
| Croissance | `coach` | Contenus Growth Coach + progression. |
| | `programs` | Inscriptions programmes plateforme. |
| | `global-selling` | Paramètres international (marchés). |
| Rapports | `analytics` | CA, unités, tendances. |
| | `traffic` | Trafic & conversion. |
| | `search-terms` | Performance mots-clés. |
| Performance | `account-health` | Score santé, indicateurs, alertes. |
| | `feedback` | Évaluations & avis. |
| | `cases` | Cas & réclamations. |
| Compte | `seller-profile` | Profil + **vérifications** (e-mail, téléphone), données légales. |
| | `admin-messaging` | **Messagerie opérateur** (file conversationnelle avec la plateforme). |
| | `payouts` | Versements, statuts, RIB masqué. |
| | `invoices` | Factures & fiscalité. |
| | `settings` | Paramètres boutique, politique de retours, etc. |

#### Onboarding boutique (0 % → 100 %)

1. Plan d’abonnement (**particulier** | **professionnel**)  
2. Documents KYC (Kbis, CNI, RIB…)  
3. Profil boutique (raison sociale, SIRET, contact…)  
4. Cinq premiers produits  
5. Frais de livraison (transporteurs, zones)  
6. Compte bancaire (IBAN, titulaire, vérification)

**Statuts boutique** (SQL, enum étendu) : `brouillon`, `kyc_en_attente`, `kyc_en_cours`, `en_attente_activation`, `active`, `suspendue`, `fermee`.

---

### 2.3 Console **admin** / opérateur

#### Routes et zones

| Route | Zone | Description |
|-------|------|---------------|
| `/admin/login` | Auth | Connexion opérateur ; `returnUrl` si session absente. |
| `/admin/dashboard` | Hub | Choix **Espace vendeurs** / **Espace clients** + lien **Transverse**. |
| `/admin/vendeurs` | Vendeurs | Sidebar : modules ci-dessous. |
| `/admin/clients` | Clients | Sidebar : modules ci-dessous. |
| `/admin/transverse` | Transverse | Litiges, recherche & audit. |

#### Matrice modules **Espace vendeurs**

| Module (id) | Fonctions UI à couvrir côté API | Persistance indicative |
|-------------|--------------------------------|-------------------------|
| `queue-kyc` | File KYC, filtres, **Valider** / **Refuser** dossier | `dossiers_conformite_kyc`, `documents_conformite_boutique`, audit |
| `onboarding-activation` | File boutiques, **jauge %**, étapes avec **aperçu données + pièces** (URLs signées), **Valider / Invalider étape**, **Activer la boutique** | `etapes_onboarding_boutique`, `boutiques.statut`, audit |
| `queue-products` | Modération produits (approuver / refuser) | `file_moderation_produits` + Mongo catalog |
| `queue-accounts-seller` | Revue comptes marchands | `dossiers_compte_suspect` / revues |
| `sellers` | Annuaire, recherche, statuts, santé, lien **fiche complète** | `vue_annuaire_boutique_admin`, `sante_compte_courant` |
| `profil-vendeur-verify` | Table e-mail / tél., **forcer vérif.** | `profils_vendeur` |
| `sante-vendeurs` | Pondérations globales, **recalcul** par boutique / masse | `parametres_plateforme`, `sante_compte_courant` |
| `vendor-detail` | Fiche riche (hors menu) : identité, docs, santé, actions | agrégation multi-tables |
| `vendor-returns` | Retours & reversements | retours / finance |
| `vendor-comms` | E-mails & notifications pro | logs communications |
| `vendor-tickets` | Demandes, litiges, technique | tickets |

#### Matrice modules **Espace clients**

| Module (id) | Fonctions | Persistance indicative |
|-------------|-----------|------------------------|
| `queue-accounts-client` | Comptes & signalements acheteurs | revues compte |
| `buyers` | Annuaire acheteurs, segment, risque | users + scoring |
| `client-orders` | Commandes & lignes détaillées | orders + SQL si miroir |
| `client-returns` | Retours SAV (étapes : approuver, colis reçu, rembourser…) | returns |
| `client-comms` | E-mails, SMS, messages site | logs |
| `client-insights` | CSAT, sessions | analytics |
| `client-tickets` | Support | tickets |

#### Matrice **Transverse**

| Module | Fonctions |
|--------|-----------|
| `disputes` | Litiges entre acheteur et vendeur, médiation, clôture |
| `transverse-ops` | **Recherche globale** (commandes, retours, boutiques, tickets), **journal d’audit** RGPD |

#### Chrome UI admin (transversal)

- **Barre de recherche** (header) : filtre la **file active** (KYC, produits, etc.) — API peut exposer `GET ...?q=` par module ou recherche unifiée `transverse-ops`.  
- **Cloche notifications** : centre de notifications opérateur — `GET /admin/notifications`, `PATCH .../read`.  
- Liens **Accueil choix d’espace**, **Site public**, **Déconnexion**.

---

## 3. API externe — périmètre initial (v1, synthétisé)

- **3.1 Auth** — `register`, `login`, `me`, `logout`.  
- **3.2 Users** — CRUD profil, rôle (admin), soft delete.  
- **3.3 Catalog** — produits, catégories, images.  
- **3.4 Cart** — panier.  
- **3.5 Orders** — commandes, annulation, statut (admin).  
- **3.6 Payments** — init, statut, confirm webhook.  
- **3.7 Addresses** — carnet d’adresses.

---

## 4. API externe — extensions **vendeur** (`/api/vendor/...`)

Voir v2.0 : onboarding, boutique, catalogue vendeur, stock, expéditions, commandes, prix, pub, rapports, performance, compte, **messagerie opérateur**.

**Précision v2.1** : exposer explicitement les ressources **multi-marché** (`?market=FR`) et **Growth Coach** (`/vendor/growth-coach/...`) alignées `progression_growth_coach_boutique`.

---

## 5. API externe — extensions **admin** (`/api/admin/...`)

Voir v2.0 : KYC, onboarding avec preuves, modération, annuaire, fiche boutique, vérif. contact, santé, clients, retours, coms, tickets, litiges, audit.

**Précision v2.1** :

- Endpoints **notifications** et **recherche globale** dédiés.  
- Toute action de validation / forçage / activation → **`journal_audit_operateur`** (+ `identifiant_operateur`, IP si disponible).

---

## 6. API interne (Gateway → microservices)

Headers : `X-User-Id`, `X-User-Role`, `X-Request-Id`.

- Miroirs `/internal/...` pour users, catalog, cart, orders, payments, addresses.  
- **Facades** optionnelles `vendor-facade` / `admin-facade` pour limiter les appels multi-services depuis le front.

---

## 7. Architecture des données (rappel)

| Script | Rôle |
|--------|------|
| `heligxiam_marketplace_core.sql` | Métier vendeur / boutique / catalogue relationnel / commandes boutique / finance / messagerie / santé / growth… |
| `heligxiam_marketplace_operateur.sql` | Opérateurs, audit, KYC, onboarding admin, paramètres plateforme, litiges, messagerie opé–vendeur… |
| `heligxiam_users_cdg_postgresql.sql` | `users` / `roles` / `user_roles` + lien `comptes_vendeur.id_utilisateur_plateforme`. |

**MongoDB** : `sellerId` / `ownerId` = **`users.id` (UUID)**.  
**Redis** : sessions, logout, rate limiting, files courtes.

---

## 8. Flux métier (exemples)

1. **Achat client** : login → catalogue → panier → adresses → commande → paiement → confirmation.  
2. **Ouverture boutique** : inscription vendeur → onboarding → KYC → **admin** consulte preuves → validation étapes → activation + audit.  
3. **Santé compte** : calcul / recalcul admin → mise à jour score + historique.  
4. **Litige transverse** : médiation opérateur jusqu’à clôture, trace dans audit.

---

## 9. Exigences non fonctionnelles (NFR)

| Domaine | Exigence |
|---------|----------|
| **Sécurité** | Voir **§1.2** (client / vendeur / admin → microservices sécurisés). JWT court + refresh ; secrets hors repo ; **PCI-DSS** : pas de PAN en clair en base ; webhooks signés. |
| **Séparation des pouvoirs** | Actions admin sensibles tracées ; principe du moindre privilège pour rôles opérateur. |
| **RGPD** | Journal d’audit accès données personnelles ; export / suppression compte (à spécifier par rôle). |
| **Disponibilité** | Idempotence sur création commande / paiement ; retry des jobs (imports CSV, recalculs). |
| **Observabilité** | `X-Request-Id` traversant ; corrélation logs Gateway ↔ services. |
| **Performance** | Pagination obligatoire sur listes admin et catalog ; index Mongo + SQL documentés. |

---

## 10. Conformité projet & dettes techniques

- UI Angular : **données de démonstration** — ce cahier sert de **backlog de couverture API**.  
- **OpenAPI** : héberger les schémas JSON et erreurs détaillées (successeur des § détaillés v1).  
- **Guards** : corriger routes de redirection post-login (`/seller`, `/admin/dashboard`).  
- **Auth admin** : formaliser le contrat (endpoints + modèle de token) pour éviter la dérive sécurité.  
- **Wishlist** : route publique `/wishlist` vs vue `profile` — **une seule source de vérité** côté API recommandée.

---

## Annexe A — Checklist de couverture **client**

- [ ] Accueil dynamique (ou statique documenté)  
- [ ] Recherche + filtres + tri  
- [ ] Fiche produit + avis  
- [ ] Panier + cohérence stock  
- [ ] Wishlist persistée + sync profil  
- [ ] Auth + refresh + logout  
- [ ] Toutes les **vues profil** (§2.1.1)  
- [ ] Moyens de paiement (tokens)  
- [ ] Conformité cookies / consentement (hors API mais release)

---

## Annexe B — Checklist de couverture **vendeur**

- [ ] Dashboard multi-marché  
- [ ] CRUD produits + modération  
- [ ] Stock / expéditions / retours  
- [ ] Prix / retarification / coupons  
- [ ] Commandes + à expédier + messagerie acheteur  
- [ ] Pub & deals  
- [ ] Growth coach & programmes  
- [ ] Rapports (ventes, trafic, termes)  
- [ ] Santé, avis, cas  
- [ ] Profil, messagerie opérateur, versements, factures, paramètres  
- [ ] **Onboarding 6 étapes** + états boutique

---

## Annexe C — Checklist de couverture **admin**

- [ ] KYC file + décisions  
- [ ] Onboarding + preuves + activation  
- [ ] Modération produits  
- [ ] Comptes vendeurs & clients suspects  
- [ ] Annuaire + **fiche détail**  
- [ ] Forçage vérif. e-mail / téléphone  
- [ ] Santé : poids + recalcul  
- [ ] Retours / reversements vendeur  
- [ ] Communications & tickets (V + C)  
- [ ] Commandes & retours **client**  
- [ ] Insights CSAT  
- [ ] Litiges transverse  
- [ ] Recherche globale + audit + **notifications**

---

*Document de référence évolutif — incrémenter la version mineure à chaque revue d’écran majeure (client / vendeur / admin).*

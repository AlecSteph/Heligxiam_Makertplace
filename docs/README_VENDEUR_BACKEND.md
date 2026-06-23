# Espace vendeur — backend, base de données et liens client / admin

Ce document décrit le **périmètre backend** de `http://localhost:4200/seller`, le **modèle de données** recommandé (tables, relations), et le choix **SQL vs NoSQL**.

---

## 1. SQL ou NoSQL ?

| Critère | Recommandation Heligxiam (marketplace) |
|--------|----------------------------------------|
| **Cœur métier** (utilisateurs, commandes, paiements, stock, facturation) | **SQL** — de préférence **PostgreSQL** |
| **Pourquoi SQL** | Relations fortes (commande → lignes → produit → vendeur → client), intégrité (ACID), jointures, rapports, conformité, historique. |
| **Quand ajouter du NoSQL** (optionnel, plus tard) | Recherche full-text (OpenSearch/Elastic), file d’événements, logs d’audit massifs, cache (Redis), documents marketing très libres. |

**Position pratique** : une **base SQL unique** (PostgreSQL) couvre 90 % des besoins vendeur + client + admin. On peut **compléter** par Redis (sessions, cache) ou un moteur de recherche sans remplacer le SQL pour les transactions.

---

## 2. Correspondance avec l’interface `/seller` (inventaire du code)

> **Source de vérité UI** : `src/app/pages/seller-dashboard/seller-dashboard.component.ts`  
> Propriétés : `navSections` (menu), `activeNav` (écran actif), `pageHeaders` (titres), et les tableaux mock (`orders`, `topProducts`, `returnsList`, `adCampaigns`, etc.).  
> Tout est encore **côté client** (données en dur) : le backend devra **couvrir au minimum** les mêmes notions métier.

### 2.1 Menu latéral — chaque entrée et ce qu’elle implique côté BDD / API

| Groupe (sidebar) | ID (`activeNav`) | Libellé | Tables / ressources backend typiques |
|------------------|-------------------|---------|--------------------------------------|
| **Accueil** | `dashboard` | Tableau de bord | Agrégations (ventes, commandes, vues, note, conversion, Buy Box) — vues SQL ou `seller_kpi_snapshots` + tâches asynchrones |
| **Catalogue** | `catalog` | Produits | `products`, `product_images`, `product_variants`, statut modération |
| | `add-product` | Ajouter un produit | Création `products` + upload médias (fichiers / URLs) |
| | `brand-registry` | Registre des marques | `brand_registrations` (marque, preuve, statut) — recoupement **admin** (validation) |
| | `bulk-upload` | Import en masse (CSV) | `import_jobs` (fichier, statut, lignes OK/KO, rapport d’erreurs) |
| **Stock & Expédition** | `inventory` | Gestion du stock | `inventory` / `stock_movements`, seuils d’alerte |
| | `fba-shipments` | Expéditions Logistique HX | `fulfillment_inbound_shipments` (vers entrepôt, statut, unités) |
| | `returns` | Retours & remboursements | `return_requests` → liées `orders` + **client** (`buyer_user_id`) |
| **Prix** | `pricing` | Tarification | Prix courants, concurrence (cache ou `competitor_price_snapshots`) |
| | `auto-pricing` | Retarification auto | `repricing_rules`, `repricing_runs` (règles, dernière exécution) |
| | `promotions` | Promotions & coupons | `coupons`, `promotions` (période, plafond, ciblage produits) |
| **Commandes** | `orders` | Gérer les commandes | `orders` + `order_items` (filtrage `shop_id`) |
| | `unshipped` | À expédier | Même table, requête `statut IN ('paid','unshipped',…)` |
| | `messages` | Messagerie acheteurs | `conversations` + `messages` (participants = acheteur + vendeur) |
| **Publicité** | `campaigns` | Campagnes | `ad_campaigns` (budget, spend, ACOS, impressions, clics) |
| | `sponsored-brands` | Sponsored Brands | `ad_creatives` / campagnes type brand |
| | `deals` | Ventes flash & Deals | `flash_deals` ou `promotional_events` (créneaux, frais plateforme) |
| **Croissance** | `coach` | Growth Coach | Recommandations (souvent **calculées** : règles + cache ; pas toujours une table dédiée au MVP) |
| | `programs` | Programmes HELIGXIAM | `program_enrollments` (Vine, Brand Registry, A+, etc.) |
| | `global-selling` | Vendre à l’international | `shop_marketplace_settings` (boutique × pays / TVA) |
| **Rapports** | `analytics` | Statistiques ventes | Agrégations `orders` + évent. `report_sales_daily(shop_id, date)` |
| | `traffic` | Trafic & conversion | `analytics_sessions` / import GA-like ou table d’événements |
| | `search-terms` | Termes de recherche | `search_term_performance` (terme, impressions, clics, ventes attribuées) |
| **Performance** | `account-health` | Santé du compte | Métriques (ODR, retards, retours) — **seuils** parfois fixés côté **admin** |
| | `feedback` | Évaluations & avis | `product_reviews`, agrégat note boutique |
| | `cases` | Cas & réclamations | `support_tickets` (peut impliquer la **même** équipe que l’admin ou escalade) |
| **Compte** | `payouts` | Paiements & versements | `payouts`, `seller_balance_ledger` |
| | `invoices` | Factures & fiscalité | `invoices` (commissions, logistique, publicité) |
| | `settings` | Paramètres boutique | `shops` (nom, SIRET, TVA, politique retours, collaborateurs) |

### 2.2 Éléments transverses (hors id de menu)

| Élément UI | Fichier / propriété | Côté données |
|------------|--------------------|--------------|
| Sélecteur **marché** (FR, DE, IT, ES, UK) | `selectedMarket`, `markets` | `market_id` sur commandes / stats, ou `shop` multi-marché |
| **Période** (7j, 30j, 90j, YTD) | `selectedPeriod` | Paramètre de requête sur API stats |
| **Activation** (onboarding) | `onboardingSteps` | `shop` + `shop_onboarding` ou colonnes d’étapes (docs KYC, RIB, etc.) — aligné **admin** KYC |
| **Cloche notifications** | `notifications` | `notifications` / file d’événements |
| Recherche globale (header) | `searchQuery` | Recherche unifiée (commande, SKU, client) — index SQL + évent. recherche full-text (NoSQL/Elastic) |

### 2.3 Ordre de mise en œuvre backend recommandé

1. **Socle** : `users` → `shops` → `products` → `inventory` → `orders` / `order_items`.  
2. **E-commerce réel** : `return_requests`, expédition / suivi, `messages` acheteur.  
3. **Argent** : `payouts`, `invoices`, commissions.  
4. **Marketing** : publicités, promos, deals (souvent après le cœur transactionnel).  
5. **Reporting** : vues matérialisées / jobs de nuit pour ne pas surcharger l’OLTP.

---

## 3. Rôles : vendeur, client, admin (comment ça s’articule)

| Rôle (appli) | Côté BDD | Idée |
|-------------|----------|------|
| **Client** (acheteur) | Ligne `users` + rôle `CLIENT` (ou table `user_roles`) | Passe des commandes sur le catalogue. |
| **Vendeur** | Même `users` (compte pro) + rôle `VENDEUR` + une **boutique** `shops` (1 user peut avoir 1+ boutiques selon règles) | Gère offres, stock, expédition sur **ses** commandes. |
| **Admin** | Rôle `ADMIN` (ou comptes dédiés `admin_users` si on sépare) | Ne “passe” pas de commande comme le client, mais agit sur **KYC, modération, litiges, audit**. |

- **Lien client ↔ vendeur** : surtout **indirect** via la **commande** (`orders`) : un client commande des lignes (`order_items`) attachées à des **produits** d’une `shop` (vendeur). Pas de table “amitié” client–vendeur ; la relation est **métier** (order, message support, avis).  
- **Lien admin ↔ vendeur** : tables de **conformité** (ex. `shop_kyc_reviews`, `product_moderation`, `admin_audit_logs`) : l’admin agit sur des enregistrements liés à `shops` / `users` (vendeur).

---

## 4. Schéma logique (tables principales)

Les noms sont indicatifs ; à adapter (snake_case = habituel en SQL).

### 4.1 Utilisateurs et accès

| Table | Rôle |
|-------|------|
| `users` | id, email, hash mot de passe, statut, dates… |
| `user_roles` | user_id, role enum (`CLIENT`, `VENDEUR`, `ADMIN`, …) — ou colonne de rôles si modèle simple |
| `refresh_tokens` | (souvent déjà côté auth) |

### 4.2 Vendeur (boutique)

| Table | Rôle |
|-------|------|
| `shops` | id, user_id (propriétaire / contact principal), raison sociale, pays, SIREN/TVA, statut (`draft`, `pending_kyc`, `active`, `suspended`), **slug** unique |
| `shop_shipping_profiles` | (optionnel) règles d’envoi, zones |
| `shop_kyc_documents` | (optionnel) liens vers pièces, statut de validation par **admin** |
| `shop_payout_settings` | (optionnel) IBAN masqué, compte de versement |

**Relation** : un **vendeur** (user avec rôle VENDEUR) est lié à **une ou plusieurs** `shops` (souvent **1 boutique = 1 ligne `shops` pour 1 user** en MVP).

### 4.3 Catalogue (côté vendeur)

| Table | Rôle |
|-------|------|
| `products` | id, shop_id, titre, description, statut modération, prix, etc. |
| `product_variants` | (optionnel) taille, couleur, SKU, prix |
| `product_images` | product_id, url, ordre |
| `inventory` | (optionnel séparé) product_id/variant_id, **quantité** réservée / dispo |

**Relation** : `products.shop_id` → `shops.id` (tout le catalogue d’un écran “mes produits” filtre sur ce `shop_id` du vendeur connecté).

### 4.4 Client ↔ Vendeur : la commande (cœur)

| Table | Rôle |
|-------|------|
| `orders` | id, **buyer_user_id** (client), statut, adresses, totaux, devise, dates |
| `order_items` | order_id, **product_id** (ou variant), quantité, prix appliqué, **shop_id** (dénormalisé pour perf / litiges) |
| `order_status_history` | (optionnel) order_id, statut, auteur (système / vendeur / admin), date |

- Le **client** apparaît via `orders.buyer_user_id`.  
- Le **vendeur** n’a accès qu’aux commandes (ou lignes) où `order_items.shop_id` = sa boutique (ou join via `products`).  
- **Admin** peut lire toutes les `orders` pour support / litige.

### 4.5 Paiements & commissions (souvent plus tard, mais utile)

| Table | Rôle |
|-------|------|
| `payment_intents` / `charges` | liées à `order_id`, prestataire (Stripe, etc.) |
| `seller_balances` / `payouts` | montants dus au vendeur, retenues, période |

### 4.6 Admin : modération et audit

| Table | Rôle |
|-------|------|
| `admin_audit_logs` | admin_user_id, action, cible (type + id : shop, product, order…), date, IP optionnelle |
| `product_moderation_queue` | product_id, statut, motif, traité par admin_id |
| `shop_kyc_reviews` | shop_id, décision, admin_id, date |

Ainsi le **même moteur SQL** sert l’espace **vendeur** (lecture/écriture scopée boutique), le **client** (ses commandes), l’**admin** (tout ce qui est conformité et litiges via jointures / droits d’API).

---

## 5. Diagramme de relations (résumé)

```
users ──┬── user_roles (CLIENT | VENDEUR | ADMIN)
        │
        ├──< orders (buyer = client)
        │       └──< order_items ──> products ──> shops
        │                                      └──> users (vendeur propriétaire)
        └──< shops (vendeur) ──< products
```

- **Client** : `users` + commandes en tant que `buyer_user_id`.  
- **Vendeur** : `users` + `shops` + `products` + accès `order_items` de sa boutique.  
- **Admin** : `users` avec rôle `ADMIN` + tables de **revue** et **`admin_audit_logs`**.

---

## 6. Côté application (rappel)

- **Route** : `/seller` — `SellerDashboardComponent` (données encore **mock** dans le code tant que les APIs ne sont pas branchées).  
- **Auth** : `AuthService` → en général `http://localhost:3001` (**auth-service**).  
- **Étapes de branchement** : définir contrat REST → implémenter requêtes filtrées `WHERE shop_id = :currentShop` → `SellerApiService` Angular.

---

## 7. NoSQL : cas d’usage secondaires (si besoin)

- **Redis** : sessions, cache de catalogue, rate limiting.  
- **Document store (Mongo, etc.)** : rarement le socle d’une marketplace ; possible pour **brouillons** de fiches ou **contenus** très flexibles, mais la **vérité** des commandes reste en SQL.  
- **Moteur de recherche** (Elastic/OpenSearch) : index produits, pas source de vérité transactionnelle.

---

**Script SQL PostgreSQL (vendeur uniquement, noms en français)** : `docs/sql/heligxiam_marketplace_core.sql` — compte vendeur, **`profils_vendeur`** (vérification courriel / téléphone, adresse, préférences, CGU), `historique_relectures_profil`, boutique, produits, commandes, retours, messagerie, finance, pub, etc. L’**acheteur** n’est référencé que par `identifiant_acheteur` (BIGINT), sans table client dans ce fichier.

*Document à affiner avec les migrations réelles (fichiers SQL ou outil type Prisma / TypeORM) une fois le schéma validé en équipe.*

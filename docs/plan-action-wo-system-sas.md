# Plan d’action — WO SYSTEM SAS (version enrichie)

**Projet :** site vitrine + boutique en ligne  
**Technique :** WordPress + WooCommerce + hébergement OVH  
**Durée :** 4 semaines  
**Objectif final :** site en ligne, sécurisé, avec 9 produits vendables + documentation interne.

---

## Socle plugins & outils (à ne pas refaire à zéro)

À installer et configurer tôt (préprod), puis vérifier en prod. **Un seul plugin par rôle** (éviter les doublons).

| Rôle | Plugin recommandé | Note |
|------|-------------------|------|
| **Sécurité** | **Wordfence Security** | Firewall, scan malware, limitation des tentatives de connexion, alertes. À activer dès que WordPress tourne en préprod. |
| **Sauvegardes** | **UpdraftPlus** | Sauvegardes planifiées (fichiers + base), stockage distant, **test de restauration** documenté. |
| **SEO** | **Rank Math SEO** ou **Yoast SEO** | Un seul des deux. Sitemap, titres/meta, schémas de base. |
| **Formulaires / contact** | **WPForms** (simple) ou **Contact Form 7** + **reCAPTCHA** | Contact fiable, moins de spam. |
| **Cookies / RGPD (bannière)** | **Complianz** ou **CookieYes** | Consentement avant scripts non essentiels (ex. analytics). |
| **Performance / images** | **Imagify** ou **ShortPixel** | Compression images (important pour les fiches produit). |
| **Cache** | **WP Rocket** (payant) ou cache fourni par l’hébergeur / **LiteSpeed Cache** si compatible | Un seul système de cache. Tester panier après activation. |
| **Redirections** | **Redirection** | Utile après changements d’URL (préprod → prod, renommages). |
| **Analytics (option)** | **Google Site Kit** | Search Console + Analytics sans tout recoder à la main. |

**Wordfence** : même si le cahier des charges le cite déjà, il est **explicitement** inclus ici comme **jalon obligatoire** semaine 2 (base) + renforcement semaine 4 (règles, scans, comptes).

---

## Plan SEO (intégré au projet)

À traiter **en parallèle** du design et du contenu, avec validation sponsor.

### 1) Mots-clés & intention
- Liste courte : **5–15 expressions** (marque + activité + produits phares + zone géographique si pertinent).
- Pour chaque : page cible (Accueil, Boutique, Fiche produit, page dédiée ou article).

### 2) Structure d’URL
- URLs **courtes, stables, lisibles** (ex. `/boutique/`, `/produit/nom-produit/`).
- **Un seul format** de permaliens (Réglages → Permaliens), validé avant d’indexer le site.
- Éviter les changements d’URL en boucle (sinon utiliser le plugin **Redirection**).

### 3) Titres & meta
- Modèle par type de page : **Accueil**, **catégorie**, **fiche produit**, **contact**.
- Titres uniques, meta descriptions uniques (Rank Math / Yoast aide à les contrôler).
- Pas de duplication massive entre les 9 fiches produits.

### 4) Contenu éditorial
- Textes **Accueil** et pages clés : bénéfices client, preuves, liens vers boutique/contact.
- Descriptions produits : **utiles pour l’acheteur** (pas seulement une liste de specs) — ça aide SEO + conversion.

### 5) Blog ou pas
- **Décision à trancher avec le sponsor** :
  - **Sans blog** : OK si peu de ressources ; le SEO repose sur pages vitrine + boutique + fiches produits.
  - **Avec blog** : utile pour **actualités**, guides, SEO longue traîne — mais il faut **rythme de publication** (sinon blog vide = mauvais signal).
- Livrable : une ligne dans le compte-rendu : *« Blog : oui / non — justification »*.

### 6) Technique SEO (après mise en ligne préprod / prod)
- **Google Search Console** : propriété domaine, soumission sitemap.
- Vérification **indexation** des pages clés (pas seulement l’accueil).

**Livrable SEO (fin semaine 3 ou 4 selon charge)**  
Petit document (2–4 pages) : liste mots-clés, structure URL, modèles titre/meta, décision blog, captures Search Console une fois le domaine prêt.

---

## Qui fait quoi

| Rôle | Rôle concret |
|------|----------------|
| **Chef d’entreprise (sponsor)** | Valide maquettes, SEO (blog oui/non), recette finale. |
| **Stagiaire développeur web** | Figma, WordPress, WooCommerce, plugins socle, SEO technique de base, tests. |
| **Référent réseau & sécurité** | OVH, SSL, sauvegardes, DNS, durcissement (dont Wordfence côté infra si besoin). |
| **Administrateur interne** | Contenus, produits, commandes après formation. |

**Règle d’or :** point hebdo 30–45 min (avancement, risques, décisions).

---

## Semaine 1 — Cadrage + maquettes (design) + **Plan SEO (amorce)**

### Objectif de la semaine  
Savoir **exactement** à quoi ressemblera le site avant de coder, et figer les **bases SEO** (mots-clés, structure d’URL, titres/meta, contenu éditorial, **blog ou pas**) pour ne pas tout refaire en semaine 3.

### Étapes détaillées

**Réunion de lancement (kick-off)**  
- Confirmer : pages prévues (Accueil, Boutique, Fiche produit, Contact…), nombre de produits (**9**), délais (**4 semaines**).  
- Noter ce qui est **inclus** et ce qui est **phase 2** (pour éviter les malentendus).  
- **Plugins (préparation)** : lister dans GitHub les issues « installer socle » (voir tableau en tête de document) — **sans installer** avant WordPress en semaine 2, sauf décision contraire.

**Collecte des contenus**  
- Logo, couleurs, textes, photos des 9 produits, prix, mentions légales si déjà rédigées.  
- Tout mettre dans un dossier partagé (Drive) : facile à retrouver.  
- **Contenu éditorial (SEO)** : rédiger ou brouillonner les textes **Accueil** et pages clés (bénéfices, preuves, liens vers boutique) — ce texte alimente maquettes + futurs titres/meta.

**Plan SEO — à faire explicitement cette semaine**  
- **Mots-clés** : liste courte (5–15 expressions : marque, activité, produits phares, zone si pertinent) + **quelle page** cible chaque intention (Accueil, Boutique, fiche produit, etc.).  
- **Structure d’URL** : principe retenu (URLs courtes, stables ; pas de changements en chaîne après coup — sinon prévoir plugin **Redirection** en S2).  
- **Titres & meta** : modèle type par page (accueil, boutique, fiche produit, contact) — même sur papier ou tableur.  
- **Blog ou pas** : **décision sponsor** documentée (*oui / non + justification*). Si oui : fréquence minimale réaliste ; si non : SEO porté par vitrine + boutique + fiches produits.  
- Livrable intermédiaire : **fiche « Plan SEO v1 »** (2 pages max) jointe au dossier projet.

**Maquettes Figma**  
- D’abord des **wireframes** (mise en page simple : où vont titre, image, boutons).  
- Puis **maquettes finales** (couleurs, typo, vraie présentation).  
- Pages minimum : Accueil, Boutique, Fiche produit, Contact — en cohérence avec le Plan SEO (titres H1 visibles sur maquettes).

**Validation par le sponsor**  
- Le chef d’entreprise dit **« OK on valide »** (mail ou commentaire Figma) — **maquettes + Plan SEO v1 (dont blog oui/non)**.  
- Sans ce OK, on ne commence pas la semaine 2 sur le design « final » ni sur les permaliens définitifs.

**GitHub**  
- Créer le dépôt + une liste de tâches (**issues**) : une tâche = une page ou une fonctionnalité + issues **SEO** + issues **plugins** (Wordfence, Rank Math/Yoast, UpdraftPlus, formulaire contact, cookies, images, cache, redirections).

### Livrable fin semaine 1  
Maquettes Figma validées + contenus rassemblés + **Plan SEO v1** (mots-clés, structure d’URL, modèles titres/meta, contenu éditorial prévu, **blog oui/non**) + dépôt GitHub prêt + backlog plugins/SEO tracé.

---

## Semaine 2 — Technique : hébergement + WordPress + structure du site + **plugins de base + Wordfence**

### Objectif de la semaine  
Avoir un site WordPress accessible (idéalement sur une **préproduction** : sous-domaine du type `preprod.tondomaine.fr`) avec les bonnes bases (**SSL**, pages créées, menu), **Wordfence** actif en mode prudent, et **plugins SEO / fondations** installés pour ne pas repartir de zéro en semaine 3.

### Étapes détaillées (dans l’ordre logique)

**Côté OVH (avec le référent réseau)**  
- Vérifier que l’hébergement est actif.  
- Créer une base de données MySQL (nom + utilisateur + mot de passe — à noter dans un fichier sécurisé).  
- Créer un accès FTP ou SFTP (pour envoyer les fichiers sur le serveur).  
- Créer le sous-domaine préprod (ex. `preprod.…`) qui pointe vers un dossier dédié (ex. `/preprod`).

**Installer WordPress**  
- Soit **module d’installation** proposé par l’hébergeur (si disponible),  
- Soit **manuel** : télécharger WordPress, envoyer les fichiers dans le dossier préprod (souvent avec **FileZilla**), puis ouvrir l’URL dans le navigateur et suivre l’assistant (connexion à la base MySQL + création du compte admin).

**Activer le HTTPS (cadenas) sur la préprod**  
- Demander / activer un certificat **Let’s Encrypt** (ou équivalent) pour `preprod.…`.  
- Vérifier que le site s’ouvre en `https://` sans erreur.

**Plugins — socle à installer dès WP stable (ne pas tout empiler d’un coup ; tester après chaque groupe)**  
- **Wordfence Security** : installation, scan initial, firewall en mode **prudent** / apprentissage, email d’alerte admin (jalon contractuel : sécurité dès la préprod).  
- **Rank Math SEO** *ou* **Yoast SEO** (un seul) : assistant, sitemap XML, pas d’autre plugin qui génère un second sitemap.  
- Appliquer le **Plan SEO semaine 1** : **Réglages → Permaliens** = structure d’URL validée avec le sponsor (évite les refontes d’URL).

**Installer WooCommerce**  
- Dans l’admin WordPress : Extensions → installer **WooCommerce** → activer → suivre l’assistant (pays, devise, etc.).

**Créer la structure du site**  
- Créer les pages : Accueil, Boutique, Contact, Mentions légales (+ autres pages légales si besoin).  
- Créer les menus (menu du haut + pied de page si prévu).  
- Choisir / activer le **thème** (ou thème enfant) et commencer à coller au design Figma.  
- Dans Rank Math / Yoast : **titre + meta** de l’Accueil et de la page Contact (première passe).

**Plugins — suite recommandée (si temps ; sinon début S3)**  
- **UpdraftPlus** : config minimale (même sauvegarde manuelle une fois pour tester).  
- **Redirection** : installé vide (prêt pour futurs changements d’URL).  
- **Imagify** ou **ShortPixel** : prêt pour les photos produits de la S3.

### Livrable fin semaine 2  
URL préprod qui marche en **HTTPS** + admin WordPress OK + **WooCommerce** installé + navigation de base + **Wordfence actif** + **SEO plugin** configuré (permaliens + sitemap + premières meta) + autres plugins socle entamés ou listés pour S3.

---

## Semaine 3 — Boutique : 9 produits + commande + contact + **SEO contenu & fiches produits**

### Objectif de la semaine  
Le site **vend vraiment** (parcours complet), le **contact** fonctionne, les **9 fiches produits** sont optimées **SEO** (titres/meta, textes), et les **plugins** utiles au quotidien sont en place (formulaire, images, cache léger si pertinent).

### Étapes détaillées

**Ajouter les 9 produits dans WooCommerce**  
- Pour chaque produit : titre, description, prix TTC, stock, images, catégorie.  
- **SEO par produit** : titre SEO + meta description **uniques** (Rank Math / Yoast) ; descriptions **rédactionnelles** (acheteur + mots-clés naturels, pas du duplicate).  
- Vérifier sur **mobile** que la fiche produit est lisible.

**Plugins — e-commerce & contenu**  
- **Imagify** ou **ShortPixel** : compresser / convertir les images produits avant ou après upload.  
- **Cache** (un seul : *WP Rocket*, *LiteSpeed Cache* si compatible, ou cache hébergeur) : activer **prudemment**, puis **retester panier + tunnel** (un cache mal réglé casse WooCommerce).

**Configurer la boutique (réglages WooCommerce)**  
- Livraison : au moins une méthode simple (ex. forfait France).  
- Taxes / affichage TTC : cohérent avec ce que veut l’entreprise (validation sponsor si doute).  
- Paiement : activer un moyen (Stripe / PayPal / autre) — en **mode test** si la banque n’est pas prête, puis passage en **réel** quand c’est validé.

**Tester le tunnel d’achat complet**  
- Ajouter au panier → panier → commande → paiement (test ou réel) → email de confirmation reçu.  
- Corriger tout blocage (erreur page, email qui part pas, prix faux…).

**Page Contact**  
- **WPForms** (simple) ou **Contact Form 7** + **reCAPTCHA** : formulaire nom, email, sujet, message + anti-spam.  
- Test : envoyer un message et vérifier la réception sur la boîte pro.

**Plan SEO — finalisation contenu**  
- Vérifier que chaque **mot-clé prioritaire** (S1) a une **page ou une fiche** qui répond à l’intention.  
- Si **blog = oui** : créer la catégorie / premier article planifié ou brouillon (sinon ne pas créer de blog vide).  
- Si **blog = non** : renforcer les **pages piliers** + textes catégories / accueil.

**Performance de base**  
- Images déjà traitées par Imagify/ShortPixel + Lighthouse.  
- Objectif : scores corrects (souvent visé ≥ 80 selon cahier des charges).

**Plugin optionnel**  
- **Google Site Kit** : lier Search Console / Analytics **après** bannière cookies (souvent **S4** avec Complianz) — sinon uniquement Search Console en manuel.

### Livrable fin semaine 3  
9 produits en ligne + commande testée + contact OK + **titres/meta produits remplis** + **Plan SEO aligné avec le site** + site utilisable « comme en vrai » + plugins images/formulaire/cache testés.

---

## Semaine 4 — Sécurité, sauvegardes, tests finaux, mise en ligne, formation + **SEO technique & conformité**

### Objectif de la semaine  
Mettre le site en **production** proprement, **resserrer Wordfence**, **prouver les sauvegardes**, finaliser **cookies / RGPD**, **Search Console / sitemap**, former l’admin interne, signer la recette.

### Étapes détaillées

**Sécurité WordPress — Wordfence (renforcement)**  
- **Wordfence** : firewall plus strict si tout fonctionne, limitation des tentatives de connexion, scan final, suppression des comptes inutiles.  
- Comptes admin : mots de passe forts, rôles au minimum nécessaire.  
- Planifier mises à jour **core + plugins + thème** (après recette).

**Sauvegardes automatiques — UpdraftPlus**  
- Sauvegardes **quotidiennes** : fichiers + base de données ; stockage **externe** ; conserver **plusieurs versions** (ex. 7 selon CDC).  
- **Test de restauration** : une fois, prouver qu’on peut restaurer + **procédure écrite**.

**Cookies / RGPD**  
- **Complianz** ou **CookieYes** : bannière + blocage scripts non essentiels ; ensuite seulement activer **Site Kit** / pixels si prévus.

**Plan SEO — technique post-mise en ligne**  
- **Google Search Console** : propriété domaine, soumission du **sitemap** généré par Rank Math / Yoast.  
- Vérifier indexation des URLs clés + corriger erreurs (couverture, sitemap).

**Recette finale (checklist)**  
- Toutes les pages prévues accessibles (pas de 404).  
- 9 produits visibles et achetables.  
- Responsive (mobile / tablette / ordi).  
- HTTPS OK partout, pas de contenu « mixte » (HTTP dans du HTTPS).  
- Emails commande OK.  
- **SEO** : spot-check mots-clés + titres/meta sur un échantillon de pages.

**Passage en production (domaine principal)**  
- Quand la préprod est validée : basculer vers `www` / domaine principal (migration ou duplication — **jamais** sans sauvegarde complète avant).  
- Plugin **Redirection** : règles si les URL changent entre préprod et prod.  
- Revérifier SSL + commande test + emails.

**Documentation + formation**  
- Guide : produits, commandes, sauvegardes, **Wordfence** (où voir les alertes), **Rank Math/Yoast** (où éditer titres/meta), **mises à jour**.  
- Session **1 h** avec l’administrateur interne + Q/R.

**Validation officielle**  
- Le sponsor signe une **recette** (« projet accepté ») ou liste les corrections mineures avec date.

### Livrable fin semaine 4  
Site en production + **Wordfence** opérationnel (niveau entreprise raisonnable) + **UpdraftPlus** + test restauration + **cookies RGPD** + **Search Console + sitemap** + guide + admin autonome + **recette signée**.

---

## Après le projet (rappel)

- J+7 / J+30 : ajustements contenus, SEO, réglages livraison.  
- Phase 2 : CRM/ERP, pub, multilingue, etc.

---

*Document prêt à intégrer dans Gamma ou en annexe au cahier des charges. Tu peux le compléter avec les noms exacts d’offre OVH et les captures d’écran de recette.*

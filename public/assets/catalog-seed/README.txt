HELIGXIAM — Assets catalogue seed (FICHIERS LOCAUX)
====================================================

Emplacement : public/assets/catalog-seed/

STRUCTURE
---------
  products/     47 fichiers JPG  (P001.jpg … P047.jpg)
  logos/        10 fichiers SVG  (V01-techstore-pro.svg … V10-samsung-premium.svg)
  manifest.json Index JSON (chemins + métadonnées)
  README.txt    Ce fichier

CHEMINS DANS L'APP (Angular — servis depuis public/)
---------------------------------------------------
  /assets/catalog-seed/products/P001.jpg
  /assets/catalog-seed/logos/V01-techstore-pro.svg

Exemple TypeScript :
  image: '/assets/catalog-seed/products/P003.jpg'

LOGOS VENDEUR (10)
------------------
  V01-techstore-pro.svg      TechStore Pro
  V02-electromarket.svg      ElectroMarket
  V03-fashion-hub.svg        Fashion Hub
  V04-nike-flagship.svg      Nike Flagship
  V05-heligxiam-official.svg HELIGXIAM Official
  V06-home-essentials.svg    Home Essentials
  V07-beaute-paris-select.svg Beauté Paris Select
  V08-sport-performance.svg  Sport Performance
  V09-auto-expert-france.svg Auto Expert France
  V10-samsung-premium.svg    Samsung Premium

  → Logos génériques (initiales + couleur). Remplacer par vrais logos en prod.

PRODUITS (47 SKU = spec complète P001–P047)
-------------------------------------------
  Correspondance détaillée : docs/SPEC_VENDEURS_CATALOGUE_CLIENT.txt section 4.

  Note images dérivées (copie locale, même visuel proche) :
    P017 ← copie P016 (webcam / accessoire tech)
    P019 ← copie P004 (écran / TV)
    P043 ← copie P042 (sport)
    P044 ← copie P045 (automobile)

LICENCE
-------
  Photos : téléchargées depuis Unsplash (licence Unsplash).
  Fichiers stockés EN LOCAL — plus de dépendance URL en runtime.
  Logos SVG : créés HELIGXIAM (libre d'utilisation).

REGÉNÉRER / COMPLÉTER
---------------------
  node scripts/download-catalog-seed-images.js

  Puis copier manuellement les 4 dérivés si besoin :
    P016→P017, P004→P019, P042→P043, P045→P044

SEED MySQL (prochaine étape)
----------------------------
  url_image = '/assets/catalog-seed/products/P001.jpg'
  ou copier vers auth-service/uploads/catalog/ pour servir via API.

/**
 * Seed catalogue : 10 vendeurs conformes + 47 produits (spec SPEC_VENDEURS_CATALOGUE_CLIENT.txt)
 *
 * Usage :
 *   node scripts/seed-catalog-vendors.js          # idempotent
 *   node scripts/seed-catalog-vendors.js --verify # contrôle uniquement
 *
 * Prérequis : MySQL configuré (.env), images dans public/assets/catalog-seed/
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { getMysqlPool, isMysqlEnabled } = require('../lib/mysqlPool');
const { PASSWORD, VENDORS, PRODUCTS } = require('./seed-data/catalog-vendors');
const { seedPromotions } = require('../lib/catalog/promotionsMysql');
const { seedVendorCoupons, seedVendorProductPromos } = require('../lib/sellerPromotionsMysql');

const ASSETS = '/assets/catalog-seed';
const SEED_DOCS = path.join(__dirname, '..', 'uploads', 'seed-docs');
const SELLER_DOCS = path.join(__dirname, '..', 'uploads', 'seller-docs');

const DOC_TYPES = [
  { type: 'kbis', template: 'template-kbis.txt', suffix: 'kbis' },
  { type: 'cni_passport', template: 'template-cni.txt', suffix: 'cni' },
  { type: 'rib', template: 'template-rib.txt', suffix: 'rib' }
];

function logoUrl(logoFile) {
  return `${ASSETS}/logos/${logoFile}`;
}

function productImageUrl(sku) {
  return `${ASSETS}/products/${sku}.jpg`;
}

function copyDoc(slug, suffix) {
  const tpl = DOC_TYPES.find((d) => d.suffix === suffix);
  const src = path.join(SEED_DOCS, tpl.template);
  const filename = `seed-${slug}-${suffix}.txt`;
  const dest = path.join(SELLER_DOCS, filename);
  if (!fs.existsSync(SELLER_DOCS)) fs.mkdirSync(SELLER_DOCS, { recursive: true });
  fs.copyFileSync(src, dest);
  return { filename, url: `/api/seller/files/${filename}` };
}

async function ensureMarcheFr(conn) {
  const [rows] = await conn.query(`SELECT identifiant FROM marches WHERE code_pays = 'FR' LIMIT 1`);
  if (rows.length) return rows[0].identifiant;
  const [ins] = await conn.query(
    `INSERT INTO marches (code_pays, libelle, devise, domaine_boutique) VALUES ('FR', 'France', 'EUR', 'heligxiam.fr')`
  );
  return ins.insertId;
}

async function findVendorByEmail(conn, email) {
  const [rows] = await conn.query(
    `SELECT c.identifiant AS vendeurId, b.identifiant AS boutiqueId, b.slug
     FROM comptes_vendeur c
     JOIN boutiques b ON b.identifiant_vendeur = c.identifiant
     WHERE LOWER(c.courriel) = LOWER(?)
     LIMIT 1`,
    [email]
  );
  return rows[0] || null;
}

async function seedVendor(conn, marcheId, passwordHash, vendor) {
  const logo = logoUrl(vendor.logoFile);
  let vendeurId;
  let boutiqueId;

  const existing = await findVendorByEmail(conn, vendor.email);
  if (existing) {
    vendeurId = existing.vendeurId;
    boutiqueId = existing.boutiqueId;
    console.log(`  ↻ ${vendor.displayName} — compte existant (#${vendeurId})`);
  } else {
    const [insCompte] = await conn.query(
      `INSERT INTO comptes_vendeur (courriel, mot_de_passe_hache, prenom, nom, telephone, actif)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [vendor.email, passwordHash, vendor.prenom, vendor.nom, vendor.phone]
    );
    vendeurId = insCompte.insertId;
    await conn.query(`INSERT INTO profils_vendeur (identifiant_vendeur) VALUES (?)`, [vendeurId]);
    const [insBoutique] = await conn.query(
      `INSERT INTO boutiques (identifiant_vendeur, slug, raison_sociale, nom_affichage, statut, siret, code_pays, identifiant_marche_defaut)
       VALUES (?, ?, ?, ?, 'active', ?, 'FR', ?)`,
      [vendeurId, vendor.slug, vendor.raisonSociale, vendor.displayName, vendor.siret, marcheId]
    );
    boutiqueId = insBoutique.insertId;
    await conn.query(`INSERT INTO etapes_onboarding_boutique (identifiant_boutique) VALUES (?)`, [boutiqueId]);
    console.log(`  ✓ ${vendor.displayName} — créé (#${vendeurId} / boutique #${boutiqueId})`);
  }

  const prefs = {
    plan_abonnement: 'professionnel',
    logoUrl: logo,
    catalog_seed: true,
    currency: 'EUR',
    onboarding_valide: { plan: true, docs: true, profile: true, shipping: true, payout: true }
  };

  await conn.query(
    `UPDATE boutiques SET slug = ?, raison_sociale = ?, nom_affichage = ?, siret = ?, code_pays = 'FR',
      identifiant_marche_defaut = ?, statut = 'active' WHERE identifiant = ?`,
    [vendor.slug, vendor.raisonSociale, vendor.displayName, vendor.siret, marcheId, boutiqueId]
  );

  await conn.query(
    `UPDATE profils_vendeur SET
      url_photo = ?, biographie = ?, poste_ou_fonction = ?, site_web = ?,
      courriel_verifie = 1, date_verification_courriel = NOW(6),
      telephone_verifie = 1, date_verification_telephone = NOW(6),
      adresse_ligne1 = ?, ville = ?, code_postal = ?, code_pays = 'FR',
      preferences_json = ?, profil_complet = 1,
      version_cgu_acceptee = '2026.1', date_acceptation_cgu = NOW(6),
      version_chartes_donnees = '2026.1', date_acceptation_charte_donnees = NOW(6)
     WHERE identifiant_vendeur = ?`,
    [
      logo,
      `Boutique officielle ${vendor.displayName} sur HELIGXIAM Marketplace.`,
      'Gérant',
      `https://heligxiam.com/boutique/${vendor.slug}`,
      '12 avenue de la Marketplace',
      'Paris',
      '75001',
      JSON.stringify(prefs),
      vendeurId
    ]
  );

  await conn.query(
    `UPDATE etapes_onboarding_boutique SET
      documents_kyc_ok = 1, profil_complet = 1, premier_produits_ok = 1,
      frais_livraison_ok = 1, compte_bancaire_ok = 1
     WHERE identifiant_boutique = ?`,
    [boutiqueId]
  );

  for (const doc of DOC_TYPES) {
    const { url } = copyDoc(vendor.slug, doc.suffix);
    await conn.query(`DELETE FROM documents_conformite_boutique WHERE identifiant_boutique = ? AND type_document = ?`, [
      boutiqueId,
      doc.type
    ]);
    await conn.query(
      `INSERT INTO documents_conformite_boutique (identifiant_boutique, type_document, url_fichier, statut)
       VALUES (?, ?, ?, 'valide')`,
      [boutiqueId, doc.type, url]
    );
  }

  await conn.query(
    `INSERT INTO parametres_versement (identifiant_boutique, dernier_chiffres_iban, titulaire_compte)
     VALUES (?, '1234', ?)
     ON DUPLICATE KEY UPDATE dernier_chiffres_iban = VALUES(dernier_chiffres_iban), titulaire_compte = VALUES(titulaire_compte)`,
    [boutiqueId, vendor.raisonSociale]
  );

  const [liv] = await conn.query(
    `SELECT identifiant FROM profils_livraison_boutique WHERE identifiant_boutique = ? LIMIT 1`,
    [boutiqueId]
  );
  if (!liv.length) {
    await conn.query(
      `INSERT INTO profils_livraison_boutique (identifiant_boutique, libelle, regles_json, est_defaut)
       VALUES (?, 'Standard France', ?, 1)`,
      [boutiqueId, JSON.stringify({ delaiJours: '2-4', frais: 4.99, gratuitSeuil: 49 })]
    );
  }

  try {
    await conn.query(
      `INSERT INTO sante_compte_courant
         (identifiant_boutique, score_global, niveau, delais_expedition, taux_reclamation, taux_reponse_messagerie, conformite_listings, avertissements_json)
       VALUES (?, 88, 'excellent', 95, 98, 92, 90, ?)
       ON DUPLICATE KEY UPDATE score_global = 88, niveau = 'excellent'`,
      [boutiqueId, JSON.stringify({ source: 'catalog_seed' })]
    );
  } catch (e) {
    if (e.code !== 'ER_NO_SUCH_TABLE') throw e;
  }

  await conn.query(
    `INSERT INTO reglages_marche_boutique (identifiant_boutique, identifiant_marche, actif, reglementation_tva)
     VALUES (?, ?, 1, 'standard')
     ON DUPLICATE KEY UPDATE actif = 1`,
    [boutiqueId, marcheId]
  );

  return { vendeurId, boutiqueId, slug: vendor.slug, code: vendor.code };
}

async function seedProduct(conn, boutiqueId, product) {
  const imageUrl = productImageUrl(product.sku);
  const desc = `Catégorie : ${product.category}.${product.flash ? ' Vente flash catalogue.' : ''}`;

  const [existing] = await conn.query(
    `SELECT identifiant FROM produits WHERE identifiant_boutique = ? AND reference_sku = ? LIMIT 1`,
    [boutiqueId, product.sku]
  );

  let productId;
  if (existing.length) {
    productId = existing[0].identifiant;
    await conn.query(
      `UPDATE produits SET titre = ?, description = ?, prix_de_base = ?, statut_moderation = 'publie', date_publication = NOW(6)
       WHERE identifiant = ?`,
      [product.title, desc, product.price, productId]
    );
  } else {
    const [ins] = await conn.query(
      `INSERT INTO produits (identifiant_boutique, reference_sku, titre, description, prix_de_base, statut_moderation, date_publication)
       VALUES (?, ?, ?, ?, ?, 'publie', NOW(6))`,
      [boutiqueId, product.sku, product.title, desc, product.price]
    );
    productId = ins.insertId;
  }

  const [img] = await conn.query(`SELECT identifiant FROM images_produit WHERE identifiant_produit = ? LIMIT 1`, [
    productId
  ]);
  if (img.length) {
    await conn.query(`UPDATE images_produit SET url_image = ?, ordre_affichage = 0 WHERE identifiant = ?`, [
      imageUrl,
      img[0].identifiant
    ]);
  } else {
    await conn.query(
      `INSERT INTO images_produit (identifiant_produit, url_image, ordre_affichage) VALUES (?, ?, 0)`,
      [productId, imageUrl]
    );
  }

  const [inv] = await conn.query(
    `SELECT identifiant FROM inventaire WHERE identifiant_produit = ? AND identifiant_variante IS NULL LIMIT 1`,
    [productId]
  );
  if (inv.length) {
    await conn.query(`UPDATE inventaire SET quantite_disponible = ?, seuil_alerte = 10 WHERE identifiant = ?`, [
      product.stock,
      inv[0].identifiant
    ]);
  } else {
    await conn.query(
      `INSERT INTO inventaire (identifiant_produit, identifiant_variante, quantite_disponible, quantite_reservee, seuil_alerte)
       VALUES (?, NULL, ?, 0, 10)`,
      [productId, product.stock]
    );
  }

  return productId;
}

async function verify(conn) {
  const [v] = await conn.query(
    `SELECT COUNT(*) AS c FROM comptes_vendeur WHERE courriel LIKE 'vendeur.%@heligxiam.com'`
  );
  const [b] = await conn.query(
    `SELECT COUNT(*) AS c FROM boutiques b
     JOIN comptes_vendeur c ON c.identifiant = b.identifiant_vendeur
     WHERE c.courriel LIKE 'vendeur.%@heligxiam.com' AND b.statut = 'active'`
  );
  const [kyc] = await conn.query(
    `SELECT COUNT(DISTINCT d.identifiant_boutique) AS c FROM documents_conformite_boutique d
     JOIN boutiques b ON b.identifiant = d.identifiant_boutique
     JOIN comptes_vendeur c ON c.identifiant = b.identifiant_vendeur
     WHERE c.courriel LIKE 'vendeur.%@heligxiam.com' AND d.statut = 'valide'`
  );
  const [onb] = await conn.query(
    `SELECT COUNT(*) AS c FROM etapes_onboarding_boutique e
     JOIN boutiques b ON b.identifiant = e.identifiant_boutique
     JOIN comptes_vendeur c ON c.identifiant = b.identifiant_vendeur
     WHERE c.courriel LIKE 'vendeur.%@heligxiam.com'
       AND e.documents_kyc_ok = 1 AND e.profil_complet = 1 AND e.premier_produits_ok = 1
       AND e.frais_livraison_ok = 1 AND e.compte_bancaire_ok = 1`
  );
  const [p] = await conn.query(
    `SELECT COUNT(*) AS c FROM produits pr
     JOIN boutiques b ON b.identifiant = pr.identifiant_boutique
     JOIN comptes_vendeur c ON c.identifiant = b.identifiant_vendeur
     WHERE c.courriel LIKE 'vendeur.%@heligxiam.com' AND pr.statut_moderation = 'publie'`
  );
  const [img] = await conn.query(
    `SELECT COUNT(*) AS c FROM images_produit i
     JOIN produits pr ON pr.identifiant = i.identifiant_produit
     JOIN boutiques b ON b.identifiant = pr.identifiant_boutique
     JOIN comptes_vendeur c ON c.identifiant = b.identifiant_vendeur
     WHERE c.courriel LIKE 'vendeur.%@heligxiam.com'`
  );
  const [cp] = await conn.query(
    `SELECT COUNT(*) AS c FROM bons_remise_boutique br
     JOIN boutiques b ON b.identifiant = br.identifiant_boutique
     JOIN comptes_vendeur c ON c.identifiant = b.identifiant_vendeur
     WHERE c.courriel LIKE 'vendeur.%@heligxiam.com'`
  );

  const ok =
    v[0].c >= 10 &&
    b[0].c >= 10 &&
    kyc[0].c >= 10 &&
    onb[0].c >= 10 &&
    p[0].c >= 47 &&
    img[0].c >= 47 &&
    cp[0].c >= 10;

  console.log('\n--- Vérification seed catalogue ---');
  console.log(`  Vendeurs seed     : ${v[0].c} / 10`);
  console.log(`  Boutiques actives : ${b[0].c} / 10`);
  console.log(`  KYC validés       : ${kyc[0].c} / 10 boutiques`);
  console.log(`  Onboarding 5/5    : ${onb[0].c} / 10`);
  console.log(`  Produits publiés  : ${p[0].c} / 47`);
  console.log(`  Images produit    : ${img[0].c} / 47`);
  console.log(`  Coupons boutique  : ${cp[0].c} / 10`);
  console.log(ok ? '\n✅ Seed catalogue OK' : '\n❌ Seed incomplet — relancer le script');
  return ok;
}

async function main() {
  if (!isMysqlEnabled()) {
    console.error('MySQL non configuré (MYSQL_HOST dans .env).');
    process.exit(1);
  }

  const verifyOnly = process.argv.includes('--verify');
  const pool = getMysqlPool();
  const conn = await pool.getConnection();

  try {
    if (verifyOnly) {
      const ok = await verify(conn);
      process.exit(ok ? 0 : 1);
    }

    console.log('Seed catalogue HELIGXIAM — 10 vendeurs + 47 produits\n');
    const passwordHash = await bcrypt.hash(PASSWORD, parseInt(process.env.BCRYPT_ROUNDS, 10) || 12);
    const marcheId = await ensureMarcheFr(conn);

    await conn.beginTransaction();

    const slugByCode = {};
    for (const vendor of VENDORS) {
      const row = await seedVendor(conn, marcheId, passwordHash, vendor);
      slugByCode[vendor.code] = row.boutiqueId;
    }

    let productCount = 0;
    for (const product of PRODUCTS) {
      const boutiqueId = slugByCode[product.vendor];
      if (!boutiqueId) {
        throw new Error(`Boutique introuvable pour ${product.vendor} (${product.sku})`);
      }
      await seedProduct(conn, boutiqueId, product);
      productCount++;
    }

    await seedVendorCoupons(conn);
    await seedVendorProductPromos(conn);
    await seedPromotions(conn);

    await conn.commit();
    console.log(`\nProduits traités : ${productCount}`);
    console.log(`Mot de passe commun : ${PASSWORD}`);
    console.log('Exemple connexion : vendeur.techstore-pro@heligxiam.com\n');

    await verify(conn);
  } catch (err) {
    await conn.rollback();
    console.error('Échec seed :', err.message);
    process.exit(1);
  } finally {
    conn.release();
    await pool.end();
  }
}

main();

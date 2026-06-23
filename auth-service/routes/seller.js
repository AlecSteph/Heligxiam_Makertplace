const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { getMysqlPool, isMysqlEnabled } = require('../lib/mysqlPool');
const { getMongoDb, isMongoEnabled } = require('../lib/mongoClient');
const { requireSellerAuth } = require('../middleware/requireSellerAuth');
const {
  getOnboardingState,
  submitOnboardingPlan,
  markDocsSubmitted,
  submitOnboardingProfile,
  submitOnboardingShipping,
  submitOnboardingPayout,
  purgeOnboardingPlaceholderProducts
} = require('../lib/onboardingMysql');
const {
  notifyAdminProductSubmitted,
  notifyAdminSellerMessage,
  listSellerNotifications,
  countUnreadSellerNotifications,
  markSellerNotificationRead,
  markAllSellerNotificationsRead
} = require('../lib/notificationsMysql');
const {
  getSellerProfile,
  updateSellerProfile,
  getStoreSettings,
  updateStoreSettings,
  getRelectureHistory,
  addRelectureDonnees,
  sendVerifyEmail,
  sendVerifyPhone,
  confirmVerifyEmail,
  confirmVerifyPhone
} = require('../lib/sellerAccountMysql');
const {
  toggleCampaignStatus,
  togglePricingRule,
  toggleProgramEnrollment,
  updateOrderStatus,
  markAllBuyerMessagesRead,
  updateProductStock,
  createPricingRule,
  requestPayout
} = require('../lib/sellerActionsMysql');
const {
  getPromotionsPageData,
  createCouponForBoutique,
  updateCouponForBoutique,
  deleteCouponForBoutique,
  createProductPromoForBoutique,
  updateProductPromoForBoutique,
  deleteProductPromoForBoutique,
  listProductPromotionsForBoutique,
  listEligibleProductsForPromo,
  buildPromotionsSummary,
  mapCouponRow
} = require('../lib/sellerPromotionsMysql');

const router = express.Router();

router.use(requireSellerAuth);

const uploadDir = path.join(__dirname, '..', 'uploads', 'seller-docs');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safe}`);
  }
});

const uploadSellerDocs = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});
const uploadSellerAssets = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }
});

const RUBRIQUE_LIGNE_OPERATEUR = 'ligne_operateur';

async function assertBoutiqueBelongsToVendeur(pool, boutiqueId, vendeurId) {
  const [rows] = await pool.execute(
    `SELECT identifiant FROM boutiques WHERE identifiant = ? AND identifiant_vendeur = ? LIMIT 1`,
    [boutiqueId, vendeurId]
  );
  return rows.length > 0;
}

async function getOrCreateOperatorTicketMysql(boutiqueId, vendeurId) {
  const pool = getMysqlPool();
  const ok = await assertBoutiqueBelongsToVendeur(pool, boutiqueId, vendeurId);
  if (!ok) {
    const err = new Error('BOUTIQUE_FORBIDDEN');
    err.code = 'BOUTIQUE_FORBIDDEN';
    throw err;
  }
  const [existing] = await pool.execute(
    `SELECT identifiant FROM tickets_support_vendeur
     WHERE identifiant_boutique = ? AND identifiant_vendeur = ? AND rubrique = ?
     ORDER BY date_creation DESC LIMIT 1`,
    [boutiqueId, vendeurId, RUBRIQUE_LIGNE_OPERATEUR]
  );
  if (existing.length) {
    return existing[0].identifiant;
  }
  const [insResult] = await pool.execute(
    `INSERT INTO tickets_support_vendeur
      (identifiant_boutique, identifiant_vendeur, sujet, rubrique, priorite, statut)
     VALUES (?, ?, ?, ?, 'normal', 'ouvert')`,
    [boutiqueId, vendeurId, 'Messagerie opérateur HELIGXIAM', RUBRIQUE_LIGNE_OPERATEUR]
  );
  return insResult.insertId;
}

async function listMessagesMysql(ticketId) {
  const pool = getMysqlPool();
  const [rows] = await pool.execute(
    `SELECT identifiant, expediteur, contenu, date_envoi
     FROM messages_ticket_support_vendeur
     WHERE identifiant_ticket = ?
     ORDER BY date_envoi ASC`,
    [ticketId]
  );
  return rows.map((r) => ({
    id: `msg-${r.identifiant}`,
    from: r.expediteur === 'operateur' || r.expediteur === 'systeme' ? r.expediteur : 'vendeur',
    body: r.contenu,
    at: new Date(r.date_envoi).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
  }));
}

async function insertMessageMysql(ticketId, expediteur, contenu) {
  const pool = getMysqlPool();
  await pool.execute(
    `INSERT INTO messages_ticket_support_vendeur (identifiant_ticket, expediteur, contenu) VALUES (?, ?, ?)`,
    [ticketId, expediteur, contenu]
  );
}

async function insertDocumentMysql(boutiqueId, typeDocument, urlFichier) {
  const pool = getMysqlPool();
  await pool.execute(
    `INSERT INTO documents_conformite_boutique (identifiant_boutique, type_document, url_fichier, statut)
     VALUES (?, ?, ?, 'en_attente')`,
    [boutiqueId, typeDocument, urlFichier]
  );
}

function toNum(v, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function pct(part, total) {
  if (!total) return 0;
  return Math.round((toNum(part) / toNum(total)) * 100);
}

function mapNotifIcon(type) {
  switch (type) {
    case 'action_requise':
      return 'alert';
    case 'kyc':
      return 'kyc';
    case 'moderation':
      return 'product';
    case 'onboarding':
      return 'onboarding';
    default:
      return 'info';
  }
}

async function getDashboardDataMysql(boutiqueId, vendeurId) {
  const pool = getMysqlPool();
  const q = async (sql, params = []) => {
    try {
      return await pool.execute(sql, params);
    } catch (e) {
      if (e.code === 'ER_NO_SUCH_TABLE' || e.code === 'ER_BAD_FIELD_ERROR') {
        return [[]];
      }
      throw e;
    }
  };
  const ok = await assertBoutiqueBelongsToVendeur(pool, boutiqueId, vendeurId);
  if (!ok) {
    const err = new Error('BOUTIQUE_FORBIDDEN');
    err.code = 'BOUTIQUE_FORBIDDEN';
    throw err;
  }
  try {
    await purgeOnboardingPlaceholderProducts(boutiqueId);
  } catch (e) {
    console.warn('purge onboarding placeholders:', e.message);
  }

  const [[vente30]] = await pool.execute(
    `SELECT COALESCE(SUM(chiffre_affaires), 0) AS ca,
            COALESCE(SUM(nombre_commandes), 0) AS commandes,
            COALESCE(SUM(unites_vendues), 0) AS unites
     FROM rapports_vente_journalier
     WHERE identifiant_boutique = ? AND jour >= (CURRENT_DATE - INTERVAL 30 DAY)`,
    [boutiqueId]
  );
  const [[ventePrev30]] = await pool.execute(
    `SELECT COALESCE(SUM(chiffre_affaires), 0) AS ca
     FROM rapports_vente_journalier
     WHERE identifiant_boutique = ?
       AND jour >= (CURRENT_DATE - INTERVAL 60 DAY)
       AND jour < (CURRENT_DATE - INTERVAL 30 DAY)`,
    [boutiqueId]
  );
  const [traffic30Rows] = await q(
    `SELECT COALESCE(SUM(pages_vues), 0) AS pages_vues,
            COALESCE(SUM(sessions), 0) AS sessions,
            COALESCE(AVG(taux_conversion), 0) AS conversion
     FROM metriques_trafic_boutique
     WHERE identifiant_boutique = ? AND jour >= (CURRENT_DATE - INTERVAL 30 DAY)`,
    [boutiqueId]
  );
  const [trafficPrev30Rows] = await q(
    `SELECT COALESCE(SUM(pages_vues), 0) AS pages_vues,
            COALESCE(AVG(taux_conversion), 0) AS conversion
     FROM metriques_trafic_boutique
     WHERE identifiant_boutique = ?
       AND jour >= (CURRENT_DATE - INTERVAL 60 DAY)
       AND jour < (CURRENT_DATE - INTERVAL 30 DAY)`,
    [boutiqueId]
  );
  const [[avgRating]] = await pool.execute(
    `SELECT COALESCE(AVG(a.note), 0) AS note, COUNT(*) AS total
     FROM avis_produits_boutique a
     JOIN produits p ON p.identifiant = a.identifiant_produit
     WHERE p.identifiant_boutique = ?`,
    [boutiqueId]
  );
  const [[buyBoxRaw]] = await pool.execute(
    `SELECT COALESCE(AVG(CASE WHEN rt.actif = 1 THEN 100 ELSE 0 END), 0) AS buybox
     FROM regles_tarification_boutique rt
     WHERE rt.identifiant_boutique = ?`,
    [boutiqueId]
  );

  const [[today]] = await pool.execute(
    `SELECT COALESCE(SUM(chiffre_affaires),0) AS sales,
            COALESCE(SUM(unites_vendues),0) AS units,
            COALESCE(SUM(nombre_commandes),0) AS orders
     FROM rapports_vente_journalier
     WHERE identifiant_boutique = ? AND jour = CURRENT_DATE`,
    [boutiqueId]
  );
  const [[yesterday]] = await pool.execute(
    `SELECT COALESCE(SUM(chiffre_affaires),0) AS sales,
            COALESCE(SUM(unites_vendues),0) AS units,
            COALESCE(SUM(nombre_commandes),0) AS orders
     FROM rapports_vente_journalier
     WHERE identifiant_boutique = ? AND jour = (CURRENT_DATE - INTERVAL 1 DAY)`,
    [boutiqueId]
  );
  const [[lastWeek]] = await pool.execute(
    `SELECT COALESCE(SUM(chiffre_affaires),0) AS sales,
            COALESCE(SUM(unites_vendues),0) AS units,
            COALESCE(SUM(nombre_commandes),0) AS orders
     FROM rapports_vente_journalier
     WHERE identifiant_boutique = ? AND jour = (CURRENT_DATE - INTERVAL 7 DAY)`,
    [boutiqueId]
  );

  const [ordersRows] = await pool.execute(
    `SELECT c.identifiant, c.reference_publique, c.total_ttc, c.statut, c.date_creation,
            COALESCE(SUM(l.quantite), 0) AS qty,
            MIN(p.titre) AS product,
            MIN(i.url_image) AS image
     FROM commandes_boutique c
     LEFT JOIN lignes_commande_boutique l ON l.identifiant_commande = c.identifiant
     LEFT JOIN produits p ON p.identifiant = l.identifiant_produit
     LEFT JOIN images_produit i ON i.identifiant_produit = p.identifiant AND i.ordre_affichage = 0
     WHERE c.identifiant_boutique = ?
     GROUP BY c.identifiant
     ORDER BY c.date_creation DESC
     LIMIT 20`,
    [boutiqueId]
  );

  const [topRows] = await pool.execute(
    `SELECT p.identifiant, p.titre, p.prix_de_base, p.statut_moderation,
            COALESCE(MAX(inv.quantite_disponible), 0) AS stock,
            COALESCE(SUM(l.quantite), 0) AS sales,
            COALESCE(AVG(a.note), 0) AS rating,
            MIN(i.url_image) AS image
     FROM produits p
     LEFT JOIN inventaire inv ON inv.identifiant_produit = p.identifiant
     LEFT JOIN lignes_commande_boutique l ON l.identifiant_produit = p.identifiant
     LEFT JOIN avis_produits_boutique a ON a.identifiant_produit = p.identifiant
     LEFT JOIN images_produit i ON i.identifiant_produit = p.identifiant AND i.ordre_affichage = 0
     WHERE p.identifiant_boutique = ?
     GROUP BY p.identifiant
     ORDER BY sales DESC, p.date_creation DESC
     LIMIT 20`,
    [boutiqueId]
  );

  const [[stockAgg]] = await pool.execute(
    `SELECT
      SUM(CASE WHEN p.statut_moderation = 'publie' THEN 1 ELSE 0 END) AS actifs,
      SUM(CASE WHEN COALESCE(inv.quantite_disponible,0) BETWEEN 1 AND 9 THEN 1 ELSE 0 END) AS faible,
      SUM(CASE WHEN COALESCE(inv.quantite_disponible,0) = 0 AND p.statut_moderation = 'publie' THEN 1 ELSE 0 END) AS ruptures,
      SUM(CASE WHEN p.statut_moderation = 'brouillon' THEN 1 ELSE 0 END) AS brouillons
     FROM produits p
     LEFT JOIN inventaire inv ON inv.identifiant_produit = p.identifiant
     WHERE p.identifiant_boutique = ?`,
    [boutiqueId]
  );

  const [activityRows] = await pool.execute(
    `SELECT type, titre, texte, date_creation
     FROM notifications_vendeur
     WHERE identifiant_boutique = ?
     ORDER BY date_creation DESC
     LIMIT 20`,
    [boutiqueId]
  );

  const [chartRows] = await pool.execute(
    `SELECT jour, COALESCE(chiffre_affaires,0) AS amount
     FROM rapports_vente_journalier
     WHERE identifiant_boutique = ? AND jour >= (CURRENT_DATE - INTERVAL 6 DAY)
     ORDER BY jour ASC`,
    [boutiqueId]
  );

  const [healthRows] = await q(
    `SELECT score_global, niveau, delais_expedition, taux_reclamation, taux_reponse_messagerie, conformite_listings
     FROM sante_compte_courant WHERE identifiant_boutique = ? LIMIT 1`,
    [boutiqueId]
  );

  const [casesRows] = await pool.execute(
    `SELECT identifiant, sujet, rubrique, priorite, statut, date_creation
     FROM tickets_support_vendeur
     WHERE identifiant_boutique = ? AND COALESCE(rubrique,'') <> ?
     ORDER BY date_creation DESC
     LIMIT 20`,
    [boutiqueId, RUBRIQUE_LIGNE_OPERATEUR]
  );

  const [coachRows] = await q(
    `SELECT c.code, c.titre, c.resume, c.type_conseil,
            COALESCE(pg.statut, 'a_faire') AS progression
     FROM contenus_growth_coach c
     LEFT JOIN progression_growth_coach_boutique pg
       ON pg.identifiant_conseil = c.identifiant AND pg.identifiant_boutique = ?
     WHERE c.actif = 1
     ORDER BY c.ordre_affichage ASC
     LIMIT 20`,
    [boutiqueId]
  );

  const [newsRows] = await pool.execute(
    `SELECT type, titre, texte, date_creation
     FROM notifications_vendeur
     WHERE identifiant_boutique = ? AND type IN ('actualite','important','formation','fiscalite')
     ORDER BY date_creation DESC
     LIMIT 20`,
    [boutiqueId]
  );

  const [shipmentsRows] = await pool.execute(
    `SELECT reference, code_destination, statut, date_reception_prevue, nombre_unites
     FROM expeditions_vers_entrepot
     WHERE identifiant_boutique = ?
     ORDER BY date_creation DESC
     LIMIT 20`,
    [boutiqueId]
  );

  const [returnsRows] = await pool.execute(
    `SELECT dr.reference_retour, c.reference_publique AS commande, p.titre AS produit, dr.motif, dr.montant_remboursement, dr.statut
     FROM demandes_retour_boutique dr
     LEFT JOIN commandes_boutique c ON c.identifiant = dr.identifiant_commande
     LEFT JOIN lignes_commande_boutique l ON l.identifiant = dr.identifiant_ligne
     LEFT JOIN produits p ON p.identifiant = l.identifiant_produit
     WHERE dr.identifiant_boutique = ?
     ORDER BY dr.date_creation DESC
     LIMIT 20`,
    [boutiqueId]
  );

  const [buyerMsgsRows] = await pool.execute(
    `SELECT cv.identifiant, cv.identifiant_acheteur, cv.date_dernier_message,
            m.contenu, m.lu
     FROM conversations_acheteur cv
     LEFT JOIN messages_conversation m ON m.identifiant = (
       SELECT m2.identifiant FROM messages_conversation m2
       WHERE m2.identifiant_conversation = cv.identifiant
       ORDER BY m2.date_envoi DESC LIMIT 1
     )
     WHERE cv.identifiant_boutique = ?
     ORDER BY cv.date_dernier_message DESC
     LIMIT 20`,
    [boutiqueId]
  );

  const [campaignRows] = await pool.execute(
    `SELECT identifiant, libelle, type_campagne, statut, budget_journalier, depense_totale, donnees_complement
     FROM campagnes_publicitaires_boutique
     WHERE identifiant_boutique = ?
     ORDER BY date_creation DESC
     LIMIT 20`,
    [boutiqueId]
  );

  const [creativeRows] = await pool.execute(
    `SELECT cc.identifiant, cc.titre, cc.format, cc.statut
     FROM contenus_creatifs_campagne cc
     JOIN campagnes_publicitaires_boutique cp ON cp.identifiant = cc.identifiant_campagne
     WHERE cp.identifiant_boutique = ?
     ORDER BY cc.identifiant DESC
     LIMIT 20`,
    [boutiqueId]
  );

  const [dealsRows] = await pool.execute(
    `SELECT o.identifiant, p.titre, o.remise_pourcent, o.date_debut, o.statut
     FROM offres_flash_boutique o
     JOIN produits p ON p.identifiant = o.identifiant_produit
     WHERE o.identifiant_boutique = ?
     ORDER BY o.date_creation DESC
     LIMIT 20`,
    [boutiqueId]
  );

  const [intlRows] = await pool.execute(
    `SELECT m.code_pays, m.libelle, rb.actif,
            COALESCE(SUM(rvj.chiffre_affaires), 0) AS sales
     FROM marches m
     JOIN reglages_marche_boutique rb ON rb.identifiant_marche = m.identifiant
     LEFT JOIN rapports_vente_journalier rvj
       ON rvj.identifiant_boutique = rb.identifiant_boutique
      AND rvj.identifiant_marche = m.identifiant
      AND rvj.jour >= (CURRENT_DATE - INTERVAL 30 DAY)
     WHERE rb.identifiant_boutique = ?
     GROUP BY m.identifiant, rb.actif
     ORDER BY m.code_pays`,
    [boutiqueId]
  );

  const [searchRows] = await q(
    `SELECT terme,
            SUM(impressions) AS impressions,
            SUM(clics) AS clicks,
            SUM(ventes_attribuees) AS sales
     FROM performance_termes_recherche
     WHERE identifiant_boutique = ? AND jour >= (CURRENT_DATE - INTERVAL 30 DAY)
     GROUP BY terme
     ORDER BY sales DESC, impressions DESC
     LIMIT 20`,
    [boutiqueId]
  );

  const [feedbackRows] = await pool.execute(
    `SELECT a.identifiant, a.note, a.commentaire, a.date_avis, p.titre
     FROM avis_produits_boutique a
     JOIN produits p ON p.identifiant = a.identifiant_produit
     WHERE p.identifiant_boutique = ?
     ORDER BY a.date_avis DESC
     LIMIT 50`,
    [boutiqueId]
  );

  const [payoutRows] = await pool.execute(
    `SELECT identifiant, montant, statut, reference_bancaire, date_versement, date_creation
     FROM versements_boutique
     WHERE identifiant_boutique = ?
     ORDER BY date_creation DESC
     LIMIT 20`,
    [boutiqueId]
  );

  const [[ledgerAgg]] = await pool.execute(
    `SELECT COALESCE(SUM(CASE WHEN montant > 0 THEN montant ELSE 0 END), 0) AS available
     FROM grand_livre_solde_boutique
     WHERE identifiant_boutique = ?`,
    [boutiqueId]
  );

  const [invoiceRows] = await pool.execute(
    `SELECT identifiant, type_facture, libelle_periode, montant, statut, date_emission, url_piece_jointe
     FROM factures_vendeur
     WHERE identifiant_boutique = ?
     ORDER BY date_emission DESC
     LIMIT 20`,
    [boutiqueId]
  );

  const [couponRows] = await pool.execute(
    `SELECT identifiant, code, type_remise, valeur, nombre_utilisations, plafond_utilisation,
            date_fin, actif, libelle, statut_moderation
     FROM bons_remise_boutique
     WHERE identifiant_boutique = ?
     ORDER BY identifiant DESC
     LIMIT 20`,
    [boutiqueId]
  );

  const sellerCoupons = couponRows.map((c) => {
    const mapped = mapCouponRow(c);
    return {
      id: mapped.id,
      dbId: mapped.dbId,
      code: mapped.code,
      label: mapped.label,
      discount: mapped.discount,
      scope: mapped.scope,
      used: mapped.used,
      max: mapped.max,
      expires: mapped.expires,
      status: mapped.status,
      moderationStatus: mapped.moderationStatus,
      editable: mapped.editable
    };
  });
  const sellerProductPromos = await listProductPromotionsForBoutique(boutiqueId);
  const promotionsSummary = buildPromotionsSummary(sellerCoupons, sellerProductPromos);

  const [pricingRuleRows] = await pool.execute(
    `SELECT identifiant, libelle, active, date_creation
     FROM regles_retarification
     WHERE identifiant_boutique = ?
     ORDER BY identifiant DESC
     LIMIT 20`,
    [boutiqueId]
  );

  const [trafficOverviewRows] = await q(
    `SELECT COALESCE(SUM(sessions),0) AS sessions,
            COALESCE(SUM(pages_vues),0) AS pages_vues,
            COALESCE(AVG(taux_conversion),0) AS conversion
     FROM metriques_trafic_boutique
     WHERE identifiant_boutique = ? AND jour >= (CURRENT_DATE - INTERVAL 30 DAY)`,
    [boutiqueId]
  );
  const [trafficSourceRows] = await q(
    `SELECT segment, SUM(sessions) AS sessions
     FROM metriques_trafic_boutique
     WHERE identifiant_boutique = ? AND jour >= (CURRENT_DATE - INTERVAL 30 DAY)
     GROUP BY segment
     ORDER BY sessions DESC
     LIMIT 10`,
    [boutiqueId]
  );

  const traffic30 = traffic30Rows?.[0] || {};
  const trafficPrev30 = trafficPrev30Rows?.[0] || {};
  const healthRow = healthRows?.[0] || {};
  const trafficOverview = trafficOverviewRows?.[0] || {};
  const [bulkRows] = await q(
    `SELECT identifiant, nom_fichier, nombre_lignes, nombre_succes, nombre_erreurs, statut, date_creation
     FROM imports_catalogue
     WHERE identifiant_boutique = ?
     ORDER BY date_creation DESC
     LIMIT 30`,
    [boutiqueId]
  );

  const [programRows] = await q(
    `SELECT pp.code, pp.libelle, ip.statut
     FROM programmes_plateforme pp
     LEFT JOIN inscriptions_programme_boutique ip
       ON ip.identifiant_programme = pp.identifiant AND ip.identifiant_boutique = ?
     ORDER BY pp.identifiant ASC`,
    [boutiqueId]
  );

  const [notifRows] = await q(
    `SELECT identifiant, type, titre, texte, date_lecture, date_creation
     FROM notifications_vendeur
     WHERE identifiant_boutique = ?
     ORDER BY date_creation DESC
     LIMIT 30`,
    [boutiqueId]
  );

  const PROGRAM_META = {
    vine: { name: 'Programme Vine', desc: 'Obtenez des avis authentiques auprès de clients vérifiés.', badge: 'Boostez vos avis' },
    brand: { name: 'Marque enregistrée (Brand)', desc: 'Protégez votre marque et débloquez le contenu A+.', badge: 'Protection' },
    aplus: { name: 'Contenu A+', desc: 'Enrichissez vos fiches avec des visuels premium (+20% conv.).', badge: '+20% de conversion' },
    climate: { name: 'Climate Pledge Friendly', desc: 'Affichez un label écologique vérifié sur vos fiches.', badge: 'Éco-responsable' },
    subs: { name: 'Abonnez et économisez', desc: 'Fidélisez avec des abonnements récurrents (-5% à -15%).', badge: 'Fidélisation' },
    hxprime: { name: 'HELIGXIAM Prime', desc: 'Accédez aux clients Prime — livraison 1j et badge Prime.', badge: 'Clients premium' }
  };

  const feedbackCounts = [5, 4, 3, 2, 1].map((s) => ({
    stars: s,
    count: feedbackRows.filter((r) => toNum(r.note) === s).length
  }));
  const feedbackTotal = feedbackCounts.reduce((a, b) => a + b.count, 0);
  const invTotal =
    toNum(stockAgg.actifs) + toNum(stockAgg.faible) + toNum(stockAgg.ruptures) + toNum(stockAgg.brouillons) || 1;
  const chartAmounts = chartRows.map((d) => toNum(d.amount));
  const chartMax = Math.max(...chartAmounts, 1);
  const trafficSessionsTotal =
    trafficSourceRows.reduce((a, t) => a + toNum(t.sessions), 0) || 1;
  const buyerMessagesUnread = buyerMsgsRows.filter((m) => !toNum(m.lu)).length;

  return {
    kpis: [
      { label: 'Ventes (30j)', value: `${toNum(vente30.ca).toFixed(2)} €`, trend: pct(toNum(vente30.ca) - toNum(ventePrev30.ca), toNum(ventePrev30.ca)), trendLabel: 'vs mois dernier', sparkline: chartRows.map(() => 0) },
      { label: 'Commandes', value: `${toNum(vente30.commandes)}`, trend: 0, trendLabel: `${ordersRows.filter((o) => o.statut === 'a_expedier').length} à traiter`, sparkline: chartRows.map(() => 0) },
      { label: 'Pages vues', value: `${toNum(traffic30.pages_vues)}`, trend: pct(toNum(traffic30.pages_vues) - toNum(trafficPrev30.pages_vues), toNum(trafficPrev30.pages_vues)), trendLabel: 'vs mois dernier', sparkline: chartRows.map(() => 0) },
      { label: 'Note boutique', value: feedbackTotal ? `${toNum(avgRating.note).toFixed(1)} ★` : '—', trend: 0, trendLabel: `${feedbackTotal} avis`, sparkline: chartRows.map(() => 0) },
      { label: 'Taux de conversion', value: `${(toNum(traffic30.conversion) * 100).toFixed(2)} %`, trend: pct(toNum(traffic30.conversion) - toNum(trafficPrev30.conversion), toNum(trafficPrev30.conversion)), trendLabel: 'vs mois dernier', sparkline: chartRows.map(() => 0) },
      { label: 'Buy Box', value: `${toNum(buyBoxRaw.buybox).toFixed(0)} %`, trend: 0, trendLabel: 'moyenne catalogue', sparkline: chartRows.map(() => 0) }
    ],
    todaySnapshot: {
      today: { sales: toNum(today.sales), units: toNum(today.units), orders: toNum(today.orders), pageViews: 0, sessions: 0 },
      yesterday: { sales: toNum(yesterday.sales), units: toNum(yesterday.units), orders: toNum(yesterday.orders), pageViews: 0, sessions: 0 },
      lastWeek: { sales: toNum(lastWeek.sales), units: toNum(lastWeek.units), orders: toNum(lastWeek.orders), pageViews: 0, sessions: 0 }
    },
    orders: ordersRows.map((o) => ({
      id: `#${o.reference_publique || o.identifiant}`,
      ref: String(o.reference_publique || o.identifiant),
      customer: `Client #${o.identifiant}`,
      product: o.product || 'Produit',
      image: o.image || '',
      qty: toNum(o.qty),
      total: toNum(o.total_ttc),
      status: o.statut === 'a_expedier' ? 'pending' : o.statut === 'expediee' ? 'shipped' : o.statut === 'livree' ? 'delivered' : o.statut === 'remboursee' ? 'returned' : 'pending',
      date: new Date(o.date_creation).toLocaleString('fr-FR')
    })),
    topProducts: topRows.map((p) => ({
      id: `p-${p.identifiant}`,
      productId: Number(p.identifiant),
      name: p.titre,
      image: p.image || '',
      price: toNum(p.prix_de_base),
      stock: toNum(p.stock),
      sales: toNum(p.sales),
      rating: Number(toNum(p.rating).toFixed(1)),
      status: p.statut_moderation === 'publie' ? 'active' : p.statut_moderation === 'brouillon' ? 'draft' : 'out-of-stock',
      buyBox: Math.round(toNum(buyBoxRaw.buybox))
    })),
    inventoryBreakdown: [
      { label: 'Produits actifs', value: toNum(stockAgg.actifs), percent: Math.round((toNum(stockAgg.actifs) / invTotal) * 100), color: 'bg-emerald-500' },
      { label: 'Stock faible (<10)', value: toNum(stockAgg.faible), percent: Math.round((toNum(stockAgg.faible) / invTotal) * 100), color: 'bg-amber-500' },
      { label: 'Ruptures', value: toNum(stockAgg.ruptures), percent: Math.round((toNum(stockAgg.ruptures) / invTotal) * 100), color: 'bg-red-500' },
      { label: 'Brouillons', value: toNum(stockAgg.brouillons), percent: Math.round((toNum(stockAgg.brouillons) / invTotal) * 100), color: 'bg-gray-400' }
    ],
    payoutSummary: {
      available: toNum(ledgerAgg.available),
      pending: payoutRows.filter((p) => String(p.statut).toLowerCase().includes('pending')).reduce((a, b) => a + toNum(b.montant), 0),
      lastPayout: payoutRows.length ? toNum(payoutRows[0].montant) : 0,
      nextPayoutDate: payoutRows[0]?.date_versement ? new Date(payoutRows[0].date_versement).toLocaleDateString('fr-FR') : '—',
      currency: 'EUR'
    },
    activity: activityRows.map((a) => ({ icon: 'info', color: 'bg-slate-100 text-slate-700', title: a.titre, time: new Date(a.date_creation).toLocaleString('fr-FR') })),
    chartData: chartRows.map((d) => ({
      day: new Date(d.jour).toLocaleDateString('fr-FR', { weekday: 'short' }),
      value: Math.round((toNum(d.amount) / chartMax) * 100),
      amount: toNum(d.amount)
    })),
    healthScore: toNum(healthRow?.score_global),
    feedbackSummary: {
      average: feedbackTotal ? Number(toNum(avgRating.note).toFixed(1)) : 0,
      total: feedbackTotal
    },
    buyerMessagesUnread,
    healthMetrics: [
      { key: 'score', label: 'Score global', value: `${toNum(healthRow?.score_global)}`, target: '100', status: toNum(healthRow?.score_global) >= 80 ? 'good' : 'warning' },
      { key: 'delais', label: 'Délais expédition', value: `${toNum(healthRow?.delais_expedition)} %`, target: '< 4%', status: 'good' },
      { key: 'reclamation', label: 'Taux de réclamation', value: `${toNum(healthRow?.taux_reclamation)} %`, target: '< 1%', status: 'good' },
      { key: 'reponse', label: 'Réponse messagerie', value: `${toNum(healthRow?.taux_reponse_messagerie)} %`, target: '> 95%', status: 'good' },
      { key: 'conformite', label: 'Conformité listings', value: `${toNum(healthRow?.conformite_listings)} %`, target: '100%', status: 'good' }
    ],
    cases: casesRows.map((c) => ({ id: `CASE-${c.identifiant}`, subject: c.sujet, type: c.rubrique || 'support', priority: c.priorite || 'normal', updated: new Date(c.date_creation).toLocaleString('fr-FR'), status: c.statut || 'open' })),
    coachTips: coachRows.map((c) => ({ id: c.code, title: c.titre, text: c.resume || '', impact: 'medium', ctaLabel: 'Ouvrir', color: 'from-indigo-500 to-purple-600' })),
    news: newsRows.map((n) => ({ id: `n-${Math.random()}`, category: n.type || 'Info', title: n.titre, excerpt: n.texte || '', date: new Date(n.date_creation).toLocaleString('fr-FR') })),
    shipments: shipmentsRows.map((s) => ({ id: s.reference, destination: s.code_destination || '—', units: toNum(s.nombre_unites), status: s.statut || 'pending', expected: s.date_reception_prevue ? new Date(s.date_reception_prevue).toLocaleDateString('fr-FR') : '—' })),
    returnsList: returnsRows.map((r) => ({ id: r.reference_retour, order: `#${r.commande || '—'}`, product: r.produit || '—', reason: r.motif || '—', refund: toNum(r.montant_remboursement), status: r.statut || 'demande', created: '' })),
    buyerMessages: buyerMsgsRows.map((m) => ({ id: `msg-${m.identifiant}`, buyer: `Acheteur #${m.identifiant_acheteur}`, subject: 'Conversation acheteur', preview: m.contenu || '', time: m.date_dernier_message ? new Date(m.date_dernier_message).toLocaleString('fr-FR') : '—', unread: !toNum(m.lu), sla: '—' })),
    adCampaigns: campaignRows.map((c) => {
      const ext = c.donnees_complement || {};
      return {
        id: `c-${c.identifiant}`,
        name: c.libelle,
        type: c.type_campagne,
        status: c.statut,
        budget: toNum(c.budget_journalier),
        spent: toNum(c.depense_totale),
        impressions: toNum(ext.impressions),
        clicks: toNum(ext.clicks),
        acos: toNum(ext.acos),
        sales: toNum(ext.sales)
      };
    }),
    sbCreatives: creativeRows.map((c) => ({ id: `sb-${c.identifiant}`, headline: c.titre || 'Créativité', format: c.format || '—', status: c.statut || 'brouillon', ctr: 0, acos: 0, reach: '0' })),
    sellerDeals: dealsRows.map((d) => ({ id: `d-${d.identifiant}`, product: d.titre, discount: toNum(d.remise_pourcent), startsIn: d.date_debut ? new Date(d.date_debut).toLocaleDateString('fr-FR') : '—', units: 0, sold: 0, status: d.statut || 'draft', fee: 0 })),
    internationalMarkets: intlRows.map((m) => ({ code: m.code_pays, label: m.libelle, flag: '🌍', status: toNum(m.actif) ? 'active' : 'eligible', sales: toNum(m.sales), growth: 0 })),
    searchTerms: searchRows.map((s) => ({ term: s.terme, impressions: toNum(s.impressions), clicks: toNum(s.clicks), conv: pct(toNum(s.clicks), toNum(s.impressions)), sales: toNum(s.sales) })),
    sellerFeedback: feedbackRows.map((f) => ({ id: `f-${f.identifiant}`, rating: toNum(f.note), author: 'Acheteur', comment: f.commentaire || '', date: new Date(f.date_avis).toLocaleDateString('fr-FR'), product: f.titre || 'Produit' })),
    feedbackDistribution: feedbackCounts.map((x) => ({ stars: x.stars, count: x.count, percent: pct(x.count, feedbackTotal) })),
    payoutsHistory: payoutRows.map((p) => ({ id: `pay-${p.identifiant}`, date: p.date_versement ? new Date(p.date_versement).toLocaleDateString('fr-FR') : new Date(p.date_creation).toLocaleDateString('fr-FR'), amount: toNum(p.montant), status: p.statut || 'pending', method: 'Virement', ref: p.reference_bancaire || '—' })),
    invoices: invoiceRows.map((i) => ({
      id: `INV-${i.identifiant}`,
      type: i.type_facture,
      period: i.libelle_periode || '—',
      amount: toNum(i.montant),
      status: i.statut || 'pending',
      download: !!i.url_piece_jointe,
      downloadUrl: i.url_piece_jointe || null
    })),
    sellerCoupons,
    sellerProductPromos,
    promotionsSummary,
    pricingRules: pricingRuleRows.map((r) => ({ id: `r-${r.identifiant}`, name: r.libelle, scope: 'Boutique', minMargin: 0, active: !!toNum(r.active), last: new Date(r.date_creation).toLocaleString('fr-FR') })),
    bulkHistory: bulkRows.map((r) => ({
      id: `imp-${r.identifiant}`,
      file: r.nom_fichier,
      items: toNum(r.nombre_lignes),
      success: toNum(r.nombre_succes),
      errors: toNum(r.nombre_erreurs),
      date: r.date_creation ? new Date(r.date_creation).toLocaleString('fr-FR') : '—',
      status: String(r.statut || '').toLowerCase().includes('termine') ? 'completed' : 'warning'
    })),
    trafficOverview: {
      sessions: toNum(trafficOverview.sessions),
      pages_vues: toNum(trafficOverview.pages_vues),
      conversion: toNum(trafficOverview.conversion)
    },
    trafficSources: trafficSourceRows.map((t) => ({
      name: t.segment || 'segment',
      value: Math.round((toNum(t.sessions) / trafficSessionsTotal) * 100),
      sessions: toNum(t.sessions),
      color: 'bg-indigo-500'
    })),
    programs: programRows.map((p) => {
      const meta = PROGRAM_META[p.code] || { name: p.libelle, desc: '', badge: 'Programme' };
      return {
        id: p.code,
        name: meta.name,
        desc: meta.desc,
        badge: meta.badge,
        eligible: true,
        enrolled: String(p.statut || '').toLowerCase() === 'inscrit'
      };
    }),
    notifications: notifRows.map((n) => ({
      id: Number(n.identifiant),
      icon: mapNotifIcon(n.type),
      title: n.titre || 'Notification',
      text: n.texte || '',
      time: new Date(n.date_creation).toLocaleString('fr-FR'),
      type: n.type || 'info',
      read: Boolean(n.date_lecture)
    })),
    notificationsUnreadCount: notifRows.filter((n) => !n.date_lecture).length
  };
}

async function saveDashboardSnapshotMongo({ boutiqueId, vendeurId, data }) {
  if (!isMongoEnabled()) return false;
  try {
    const db = await getMongoDb();
    const col = db.collection('seller_dashboard_snapshots');
    await col.insertOne({
      boutiqueId,
      vendeurId,
      createdAt: new Date(),
      kpis: data.kpis || [],
      counts: {
        orders: Array.isArray(data.orders) ? data.orders.length : 0,
        products: Array.isArray(data.topProducts) ? data.topProducts.length : 0,
        campaigns: Array.isArray(data.adCampaigns) ? data.adCampaigns.length : 0,
        notifications: Array.isArray(data.news) ? data.news.length : 0
      },
      data
    });
    return true;
  } catch (e) {
    console.warn('dashboard snapshot mongo:', e.message);
    return false;
  }
}

async function writeMongoCollection(collection, doc) {
  if (!isMongoEnabled()) return false;
  try {
    const db = await getMongoDb();
    await db.collection(collection).insertOne({
      ...doc,
      createdAt: new Date()
    });
    return true;
  } catch (e) {
    console.warn(`mongo ${collection}:`, e.message);
    return false;
  }
}

async function getDashboardSnapshotsMongo({ boutiqueId, vendeurId, limit = 20 }) {
  if (!isMongoEnabled()) {
    const err = new Error('MONGO_NOT_CONFIGURED');
    err.code = 'MONGO_NOT_CONFIGURED';
    throw err;
  }
  const db = await getMongoDb();
  const col = db.collection('seller_dashboard_snapshots');
  const rows = await col
    .find({ boutiqueId, vendeurId })
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(Number(limit) || 20, 1), 100))
    .toArray();
  return rows.map((r) => ({
    id: String(r._id),
    createdAt: r.createdAt,
    counts: r.counts || {},
    kpis: r.kpis || [],
    data: r.data || {}
  }));
}

/**
 * GET /api/seller/promotions — coupons + promos produits de la boutique
 */
router.get('/promotions', async (req, res) => {
  try {
    const { boutiqueId } = req.seller;
    const data = await getPromotionsPageData(boutiqueId);
    return res.json({ success: true, data });
  } catch (e) {
    console.error('seller promotions list:', e.message);
    return res.status(503).json({ success: false, message: 'Impossible de charger les promotions.' });
  }
});

/**
 * POST /api/seller/promotions/coupons
 * body: { code, typeRemise: 'pourcentage'|'montant', valeur, plafond?, label?, validDays? }
 */
router.post('/promotions/coupons', express.json(), async (req, res) => {
  try {
    const { boutiqueId } = req.seller;
    const row = await createCouponForBoutique(boutiqueId, req.body || {});
    return res.status(201).json({
      success: true,
      message: `Coupon « ${row.code} » soumis — en attente de validation par l'équipe HELIGXIAM.`,
      data: { coupon: row }
    });
  } catch (e) {
    if (e.code === 'CODE_EXISTS') {
      return res.status(409).json({ success: false, message: 'Ce code promo existe déjà pour votre boutique.' });
    }
    if (e.code === 'CODE_INVALID') {
      return res.status(400).json({ success: false, message: 'Code invalide (3 caractères minimum, lettres/chiffres).' });
    }
    if (e.code === 'VALUE_INVALID' || e.code === 'VALUE_TOO_HIGH') {
      return res.status(400).json({ success: false, message: 'Montant ou pourcentage de remise invalide.' });
    }
    console.error('seller coupon create:', e.message);
    return res.status(503).json({ success: false, message: 'Création du coupon impossible.' });
  }
});

/**
 * PATCH /api/seller/promotions/coupons/:couponId
 */
router.patch('/promotions/coupons/:couponId', express.json(), async (req, res) => {
  try {
    const { boutiqueId } = req.seller;
    const couponId = Number(req.params.couponId);
    if (!Number.isFinite(couponId) || couponId < 1) {
      return res.status(400).json({ success: false, message: 'Coupon invalide.' });
    }
    const row = await updateCouponForBoutique(boutiqueId, couponId, req.body || {});
    return res.json({
      success: true,
      message: `Coupon « ${row.code} » mis à jour — nouvelle validation admin requise.`,
      data: { coupon: row }
    });
  } catch (e) {
    if (e.code === 'NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Coupon introuvable.' });
    }
    if (e.code === 'CODE_EXISTS') {
      return res.status(409).json({ success: false, message: 'Ce code promo existe déjà.' });
    }
    if (e.code === 'CODE_INVALID' || e.code === 'VALUE_INVALID' || e.code === 'VALUE_TOO_HIGH') {
      return res.status(400).json({ success: false, message: 'Données du coupon invalides.' });
    }
    console.error('seller coupon update:', e.message);
    return res.status(503).json({ success: false, message: 'Mise à jour impossible.' });
  }
});

/**
 * DELETE /api/seller/promotions/coupons/:couponId
 */
router.delete('/promotions/coupons/:couponId', async (req, res) => {
  try {
    const { boutiqueId } = req.seller;
    const couponId = Number(req.params.couponId);
    if (!Number.isFinite(couponId) || couponId < 1) {
      return res.status(400).json({ success: false, message: 'Coupon invalide.' });
    }
    await deleteCouponForBoutique(boutiqueId, couponId);
    return res.json({ success: true, message: 'Coupon supprimé.' });
  } catch (e) {
    if (e.code === 'NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Coupon introuvable.' });
    }
    console.error('seller coupon delete:', e.message);
    return res.status(503).json({ success: false, message: 'Suppression impossible.' });
  }
});

/**
 * GET /api/seller/promotions/product-options — produits éligibles à une promo
 */
router.get('/promotions/product-options', async (req, res) => {
  try {
    const { boutiqueId } = req.seller;
    const rows = await listEligibleProductsForPromo(boutiqueId);
    return res.json({ success: true, data: { products: rows } });
  } catch (e) {
    console.error('seller promo product options:', e.message);
    return res.status(503).json({ success: false, message: 'Impossible de charger les produits.' });
  }
});

/**
 * POST /api/seller/promotions/products
 * body: { productId, promoPrice, originalPrice?, typePromo?, label?, validDays? }
 */
router.post('/promotions/products', express.json(), async (req, res) => {
  try {
    const { boutiqueId } = req.seller;
    const row = await createProductPromoForBoutique(boutiqueId, req.body || {});
    return res.status(201).json({
      success: true,
      message: 'Promotion produit soumise — en attente de validation admin.',
      data: { productPromo: row }
    });
  } catch (e) {
    if (e.code === 'PRODUCT_NOT_FOUND' || e.code === 'PRODUCT_INVALID') {
      return res.status(400).json({ success: false, message: 'Produit invalide ou non publié.' });
    }
    if (e.code === 'PRICE_INVALID') {
      return res.status(400).json({ success: false, message: 'Prix promo invalide.' });
    }
    console.error('seller product promo create:', e.message);
    return res.status(503).json({ success: false, message: 'Création de la promotion impossible.' });
  }
});

/**
 * PATCH /api/seller/promotions/products/:promoId
 */
router.patch('/promotions/products/:promoId', express.json(), async (req, res) => {
  try {
    const { boutiqueId } = req.seller;
    const promoId = Number(req.params.promoId);
    if (!Number.isFinite(promoId) || promoId < 1) {
      return res.status(400).json({ success: false, message: 'Promotion invalide.' });
    }
    const row = await updateProductPromoForBoutique(boutiqueId, promoId, req.body || {});
    return res.json({
      success: true,
      message: 'Promotion mise à jour — nouvelle validation admin requise.',
      data: { productPromo: row }
    });
  } catch (e) {
    if (e.code === 'NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Promotion introuvable.' });
    }
    if (e.code === 'PRICE_INVALID') {
      return res.status(400).json({ success: false, message: 'Prix promo invalide.' });
    }
    console.error('seller product promo update:', e.message);
    return res.status(503).json({ success: false, message: 'Mise à jour impossible.' });
  }
});

/**
 * DELETE /api/seller/promotions/products/:promoId
 */
router.delete('/promotions/products/:promoId', async (req, res) => {
  try {
    const { boutiqueId } = req.seller;
    const promoId = Number(req.params.promoId);
    if (!Number.isFinite(promoId) || promoId < 1) {
      return res.status(400).json({ success: false, message: 'Promotion invalide.' });
    }
    await deleteProductPromoForBoutique(boutiqueId, promoId);
    return res.json({ success: true, message: 'Promotion supprimée.' });
  } catch (e) {
    if (e.code === 'NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Promotion introuvable.' });
    }
    console.error('seller product promo delete:', e.message);
    return res.status(503).json({ success: false, message: 'Suppression impossible.' });
  }
});

/**
 * GET /api/seller/dashboard
 */
router.get('/dashboard', async (req, res) => {
  try {
    const { boutiqueId, vendeurId } = req.seller;
    if (!isMysqlEnabled()) {
      return res.status(503).json({ success: false, message: 'MySQL requis.' });
    }
    const data = await getDashboardDataMysql(boutiqueId, vendeurId);
    const persistedMongo = await saveDashboardSnapshotMongo({ boutiqueId, vendeurId, data });
    return res.json({ success: true, data, persistedMongo });
  } catch (e) {
    if (e.code === 'BOUTIQUE_FORBIDDEN') {
      return res.status(403).json({ success: false, message: 'Accès refusé à cette boutique.' });
    }
    console.error('dashboard mysql:', e.message);
    return res.status(503).json({
      success: false,
      message: 'Impossible de charger le dashboard vendeur depuis MySQL.'
    });
  }
});

/**
 * GET /api/seller/dashboard-nosql?limit=20
 */
router.get('/dashboard-nosql', async (req, res) => {
  try {
    const { boutiqueId, vendeurId } = req.seller;
    const pool = getMysqlPool();
    const ok = await assertBoutiqueBelongsToVendeur(pool, boutiqueId, vendeurId);
    if (!ok) {
      return res.status(403).json({ success: false, message: 'Accès refusé à cette boutique.' });
    }
    const snapshots = await getDashboardSnapshotsMongo({
      boutiqueId,
      vendeurId,
      limit: req.query?.limit
    });
    return res.json({
      success: true,
      source: 'mongodb',
      data: {
        count: snapshots.length,
        snapshots
      }
    });
  } catch (e) {
    if (e.code === 'MONGO_NOT_CONFIGURED') {
      return res.status(503).json({
        success: false,
        message: 'MongoDB non configuré. Définissez MONGO_URI pour activer la vue NoSQL.'
      });
    }
    console.error('dashboard-nosql:', e.message);
    return res.status(503).json({
      success: false,
      message: 'Impossible de lire les snapshots dashboard dans MongoDB.'
    });
  }
});

/**
 * POST /api/seller/products
 */
router.post('/products', express.json(), async (req, res) => {
  try {
    const { boutiqueId, vendeurId } = req.seller;
    const pool = getMysqlPool();
    const ok = await assertBoutiqueBelongsToVendeur(pool, boutiqueId, vendeurId);
    if (!ok) {
      return res.status(403).json({ success: false, message: 'Accès refusé à cette boutique.' });
    }

    const name = String(req.body?.name || '').trim();
    const description = String(req.body?.description || '').trim();
    const sku = String(req.body?.sku || '').trim() || `SKU-${Date.now()}`;
    const status = String(req.body?.status || 'brouillon');
    const price = Number(req.body?.price || 0);
    const stock = Number(req.body?.stock || 0);

    if (!name) return res.status(400).json({ success: false, message: 'Nom produit requis.' });
    if (!Number.isFinite(price) || price <= 0) return res.status(400).json({ success: false, message: 'Prix invalide.' });
    if (!Number.isFinite(stock) || stock < 0) return res.status(400).json({ success: false, message: 'Stock invalide.' });

    const [ins] = await pool.execute(
      `INSERT INTO produits (identifiant_boutique, reference_sku, titre, description, prix_de_base, statut_moderation, date_publication)
       VALUES (?, ?, ?, ?, ?, ?, NULL)`,
      [
        boutiqueId,
        sku.slice(0, 64),
        name.slice(0, 500),
        description || null,
        price,
        status === 'publie' ? 'en_attente_moderation' : 'brouillon'
      ]
    );
    const productId = ins.insertId;
    if (status === 'publie') {
      await pool.execute(
        `INSERT INTO file_moderation_produits (identifiant_produit, statut, motif)
         VALUES (?, 'ouvert', 'Nouvelle fiche — revue opérateur')`,
        [productId]
      );
      try {
        await notifyAdminProductSubmitted(boutiqueId, productId, name);
      } catch (e) {
        console.warn('notify product moderation:', e.message);
      }
    }
    await pool.execute(
      `INSERT INTO inventaire (identifiant_produit, identifiant_variante, quantite_disponible, quantite_reservee, seuil_alerte)
       VALUES (?, NULL, ?, 0, 10)`,
      [productId, stock]
    );
    await writeMongoCollection('seller_product_events', {
      boutiqueId,
      vendeurId,
      type: 'product_created',
      productId,
      payload: { name, sku, price, stock, status }
    });

    return res.status(201).json({
      success: true,
      data: {
        productId,
        sku: sku.slice(0, 64),
        status: status === 'publie' ? 'pending_moderation' : 'draft'
      }
    });
  } catch (e) {
    console.error('products create:', e.message);
    return res.status(503).json({ success: false, message: 'Impossible de créer le produit.' });
  }
});

/**
 * POST /api/seller/products/:productId/images
 */
router.post('/products/:productId/images', uploadSellerAssets.single('image'), async (req, res) => {
  try {
    const { boutiqueId, vendeurId } = req.seller;
    const productId = Number(req.params.productId);
    const file = req.file;
    if (!Number.isFinite(productId) || productId < 1) {
      return res.status(400).json({ success: false, message: 'Produit invalide.' });
    }
    if (!file) {
      return res.status(400).json({ success: false, message: 'Image manquante.' });
    }
    const pool = getMysqlPool();
    const ok = await assertBoutiqueBelongsToVendeur(pool, boutiqueId, vendeurId);
    if (!ok) {
      return res.status(403).json({ success: false, message: 'Accès refusé à cette boutique.' });
    }
    const [productRows] = await pool.execute(
      `SELECT identifiant FROM produits WHERE identifiant = ? AND identifiant_boutique = ? LIMIT 1`,
      [productId, boutiqueId]
    );
    if (!productRows.length) {
      return res.status(404).json({ success: false, message: 'Produit introuvable pour cette boutique.' });
    }
    const [maxRows] = await pool.execute(
      `SELECT COALESCE(MAX(ordre_affichage), -1) AS ord FROM images_produit WHERE identifiant_produit = ?`,
      [productId]
    );
    const order = Number(maxRows?.[0]?.ord || -1) + 1;
    const url = `/api/seller/files/${file.filename}`;
    await pool.execute(
      `INSERT INTO images_produit (identifiant_produit, url_image, ordre_affichage) VALUES (?, ?, ?)`,
      [productId, url, order]
    );
    await writeMongoCollection('seller_media_events', {
      boutiqueId,
      vendeurId,
      type: 'product_image_uploaded',
      productId,
      payload: { filename: file.originalname, storedFilename: file.filename, url }
    });
    return res.status(201).json({ success: true, data: { productId, url, order } });
  } catch (e) {
    console.error('products images:', e.message);
    return res.status(503).json({ success: false, message: 'Impossible d’enregistrer l’image du produit.' });
  }
});

/**
 * POST /api/seller/imports-catalogue
 */
router.post('/imports-catalogue', uploadSellerAssets.single('file'), async (req, res) => {
  try {
    const { boutiqueId, vendeurId } = req.seller;
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: 'Fichier CSV manquant.' });
    }
    const isCsv = file.mimetype.includes('csv') || file.originalname.toLowerCase().endsWith('.csv');
    if (!isCsv) {
      return res.status(400).json({ success: false, message: 'Format invalide, CSV attendu.' });
    }
    const pool = getMysqlPool();
    const ok = await assertBoutiqueBelongsToVendeur(pool, boutiqueId, vendeurId);
    if (!ok) {
      return res.status(403).json({ success: false, message: 'Accès refusé à cette boutique.' });
    }
    const raw = fs.readFileSync(file.path, 'utf8');
    const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      return res.status(400).json({ success: false, message: 'CSV vide ou sans données.' });
    }
    const header = lines[0].split(/[,;]/).map((h) => h.trim().toLowerCase().replace(/^\ufeff/, ''));
    const col = (names) => header.findIndex((h) => names.some((n) => h.includes(n)));
    const iSku = col(['sku', 'reference']);
    const iTitle = col(['titre', 'title', 'nom', 'name']);
    const iPrice = col(['prix', 'price']);
    const iStock = col(['stock', 'qty', 'quantite']);
    const iDesc = col(['description', 'desc']);
    if (iTitle < 0 || iPrice < 0) {
      return res.status(400).json({
        success: false,
        message: 'Colonnes requises : titre (ou name) et prix (ou price).'
      });
    }

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let li = 1; li < lines.length; li++) {
      const cells = lines[li].split(/[,;]/).map((c) => c.trim().replace(/^"|"$/g, ''));
      const titre = cells[iTitle] || '';
      const prix = Number(String(cells[iPrice] || '').replace(',', '.'));
      const sku =
        (iSku >= 0 ? cells[iSku] : '') || `CSV-${Date.now()}-${li}`;
      const stock = iStock >= 0 ? Number(cells[iStock] || 0) : 0;
      const description = iDesc >= 0 ? cells[iDesc] : null;

      if (!titre || !Number.isFinite(prix) || prix <= 0) {
        errorCount++;
        errors.push(`Ligne ${li + 1}: titre ou prix invalide`);
        continue;
      }
      try {
        const [ins] = await pool.execute(
          `INSERT INTO produits (identifiant_boutique, reference_sku, titre, description, prix_de_base, statut_moderation)
           VALUES (?, ?, ?, ?, ?, 'brouillon')`,
          [boutiqueId, sku.slice(0, 64), titre.slice(0, 500), description || null, prix]
        );
        const productId = ins.insertId;
        await pool.execute(
          `INSERT INTO inventaire (identifiant_produit, identifiant_variante, quantite_disponible, quantite_reservee, seuil_alerte)
           VALUES (?, NULL, ?, 0, 10)`,
          [productId, Number.isFinite(stock) && stock >= 0 ? stock : 0]
        );
        successCount++;
      } catch (rowErr) {
        errorCount++;
        errors.push(`Ligne ${li + 1}: ${rowErr.message}`);
      }
    }

    const itemCount = lines.length - 1;
    const rapport = errors.length ? errors.slice(0, 20).join('\n') : null;
    const [ins] = await pool.execute(
      `INSERT INTO imports_catalogue
       (identifiant_boutique, nom_fichier, statut, nombre_lignes, nombre_succes, nombre_erreurs, rapport_erreurs, date_fin)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(6))`,
      [
        boutiqueId,
        file.originalname.slice(0, 255),
        errorCount > 0 && successCount === 0 ? 'erreur' : 'termine',
        itemCount,
        successCount,
        errorCount,
        rapport
      ]
    );
    const importId = ins.insertId;
    await writeMongoCollection('seller_import_jobs', {
      boutiqueId,
      vendeurId,
      importId,
      payload: {
        filename: file.originalname,
        storedFilename: file.filename,
        url: `/api/seller/files/${file.filename}`,
        itemCount,
        successCount,
        errorCount
      }
    });
    return res.status(201).json({
      success: true,
      data: {
        importId,
        file: file.originalname,
        items: itemCount,
        successCount,
        errorCount,
        status: 'completed'
      }
    });
  } catch (e) {
    console.error('imports catalogue:', e.message);
    return res.status(503).json({ success: false, message: 'Impossible de traiter l’import CSV.' });
  }
});

/**
 * GET /api/seller/operator-thread — boutique & vendeur issus du JWT uniquement.
 */
router.get('/operator-thread', async (req, res) => {
  try {
    const { boutiqueId, vendeurId } = req.seller;
    if (!isMysqlEnabled()) {
      return res.status(503).json({ success: false, message: 'MySQL requis.' });
    }
    const ticketId = await getOrCreateOperatorTicketMysql(boutiqueId, vendeurId);
    const messages = await listMessagesMysql(ticketId);
    return res.json({
      success: true,
      data: { ticketId, source: 'mysql', messages }
    });
  } catch (e) {
    if (e.code === 'BOUTIQUE_FORBIDDEN') {
      return res.status(403).json({ success: false, message: 'Accès refusé à cette boutique.' });
    }
    console.error('operator-thread mysql:', e.message);
    return res.status(503).json({
      success: false,
      message: 'Base MySQL indisponible ou schéma incomplet. Vérifiez MYSQL_* et les migrations.'
    });
  }
});

/**
 * POST /api/seller/operator-thread/messages — body : { body }
 */
router.post('/operator-thread/messages', express.json(), async (req, res) => {
  try {
    const { boutiqueId, vendeurId } = req.seller;
    const body = String(req.body?.body || '').trim();
    if (!body) {
      return res.status(400).json({ success: false, message: 'Message vide.' });
    }
    if (!isMysqlEnabled()) {
      return res.status(503).json({ success: false, message: 'MySQL requis.' });
    }
    const ticketId = await getOrCreateOperatorTicketMysql(boutiqueId, vendeurId);
    await insertMessageMysql(ticketId, 'vendeur', body);
    try {
      await notifyAdminSellerMessage(boutiqueId, ticketId);
    } catch (e) {
      console.warn('notify operator message:', e.message);
    }
    const messages = await listMessagesMysql(ticketId);
    return res.status(201).json({ success: true, data: { ticketId, messages } });
  } catch (e) {
    if (e.code === 'BOUTIQUE_FORBIDDEN') {
      return res.status(403).json({ success: false, message: 'Accès refusé à cette boutique.' });
    }
    console.error('operator-thread message mysql:', e.message);
    return res.status(503).json({
      success: false,
      message: 'Base MySQL indisponible ou schéma incomplet.'
    });
  }
});

/**
 * GET /api/seller/onboarding — état des étapes d’activation boutique.
 */
router.get('/onboarding', async (req, res) => {
  try {
    const { boutiqueId, vendeurId } = req.seller;
    if (!isMysqlEnabled()) {
      return res.status(503).json({ success: false, message: 'MySQL requis.' });
    }
    const pool = getMysqlPool();
    const ok = await assertBoutiqueBelongsToVendeur(pool, boutiqueId, vendeurId);
    if (!ok) {
      return res.status(403).json({ success: false, message: 'Accès refusé à cette boutique.' });
    }
    const data = await getOnboardingState(boutiqueId, vendeurId);
    return res.json({ success: true, data });
  } catch (e) {
    console.error('onboarding get:', e.message);
    return res.status(503).json({
      success: false,
      message: 'Impossible de charger l’onboarding vendeur.'
    });
  }
});

/**
 * POST /api/seller/onboarding/plan — body : { tier: 'particulier' | 'professionnel' }
 */
router.post('/onboarding/plan', express.json(), async (req, res) => {
  try {
    const { boutiqueId, vendeurId } = req.seller;
    if (!isMysqlEnabled()) {
      return res.status(503).json({ success: false, message: 'MySQL requis.' });
    }
    const pool = getMysqlPool();
    const ok = await assertBoutiqueBelongsToVendeur(pool, boutiqueId, vendeurId);
    if (!ok) {
      return res.status(403).json({ success: false, message: 'Accès refusé à cette boutique.' });
    }
    const tier = String(req.body?.tier || '').trim().toLowerCase();
    const data = await submitOnboardingPlan(boutiqueId, vendeurId, tier);
    return res.status(201).json({ success: true, message: 'Formule soumise pour validation.', data });
  } catch (e) {
    if (e.code === 'INVALID_TIER') {
      return res.status(400).json({ success: false, message: 'Formule invalide (particulier ou professionnel).' });
    }
    console.error('onboarding plan:', e.message);
    return res.status(503).json({ success: false, message: 'Impossible d’enregistrer la formule.' });
  }
});

router.post('/onboarding/profile', express.json(), async (req, res) => {
  try {
    const { boutiqueId, vendeurId } = req.seller;
    if (!isMysqlEnabled()) return res.status(503).json({ success: false, message: 'MySQL requis.' });
    const pool = getMysqlPool();
    if (!(await assertBoutiqueBelongsToVendeur(pool, boutiqueId, vendeurId))) {
      return res.status(403).json({ success: false, message: 'Accès refusé à cette boutique.' });
    }
    const data = await submitOnboardingProfile(boutiqueId, vendeurId, req.body || {});
    return res.status(201).json({ success: true, message: 'Profil boutique soumis pour validation.', data });
  } catch (e) {
    if (e.code === 'RAISON_SOCIALE_REQUIRED') {
      return res.status(400).json({ success: false, message: 'La raison sociale est obligatoire.' });
    }
    console.error('onboarding profile:', e.message);
    return res.status(503).json({ success: false, message: 'Impossible d’enregistrer le profil boutique.' });
  }
});

router.post('/onboarding/shipping', express.json(), async (req, res) => {
  try {
    const { boutiqueId, vendeurId } = req.seller;
    if (!isMysqlEnabled()) return res.status(503).json({ success: false, message: 'MySQL requis.' });
    const pool = getMysqlPool();
    if (!(await assertBoutiqueBelongsToVendeur(pool, boutiqueId, vendeurId))) {
      return res.status(403).json({ success: false, message: 'Accès refusé à cette boutique.' });
    }
    const data = await submitOnboardingShipping(boutiqueId, vendeurId, req.body || {});
    return res.status(201).json({ success: true, message: 'Livraison configurée et soumise pour validation.', data });
  } catch (e) {
    console.error('onboarding shipping:', e.message);
    return res.status(503).json({ success: false, message: 'Impossible d’enregistrer la livraison.' });
  }
});

router.post('/onboarding/payout', express.json(), async (req, res) => {
  try {
    const { boutiqueId, vendeurId } = req.seller;
    if (!isMysqlEnabled()) return res.status(503).json({ success: false, message: 'MySQL requis.' });
    const pool = getMysqlPool();
    if (!(await assertBoutiqueBelongsToVendeur(pool, boutiqueId, vendeurId))) {
      return res.status(403).json({ success: false, message: 'Accès refusé à cette boutique.' });
    }
    const data = await submitOnboardingPayout(boutiqueId, vendeurId, req.body || {});
    return res.status(201).json({ success: true, message: 'Compte bancaire soumis pour validation.', data });
  } catch (e) {
    if (e.code === 'PAYOUT_REQUIRED') {
      return res.status(400).json({ success: false, message: 'Titulaire et IBAN sont requis.' });
    }
    console.error('onboarding payout:', e.message);
    return res.status(503).json({ success: false, message: 'Impossible d’enregistrer le compte bancaire.' });
  }
});

/**
 * POST /api/seller/documents — multipart kbis, cni, rib (identifiant boutique = JWT).
 */
router.post(
  '/documents',
  uploadSellerDocs.fields([
    { name: 'kbis', maxCount: 1 },
    { name: 'cni', maxCount: 1 },
    { name: 'rib', maxCount: 1 }
  ]),
  async (req, res) => {
    const boutiqueId = req.seller.boutiqueId;
    const vendeurId = req.seller.vendeurId;

    const files = req.files || {};
    const kbis = files.kbis?.[0];
    const cni = files.cni?.[0];
    const rib = files.rib?.[0];

    if (!kbis || !cni || !rib) {
      return res.status(400).json({
        success: false,
        message: 'Les 3 documents sont obligatoires : Kbis, CNI/passeport et RIB.'
      });
    }

    const publicPath = (filename) => `/api/seller/files/${filename}`;

    const payload = {
      kbis: {
        originalName: kbis.originalname,
        fileName: kbis.filename,
        size: kbis.size,
        url: publicPath(kbis.filename)
      },
      cni: {
        originalName: cni.originalname,
        fileName: cni.filename,
        size: cni.size,
        url: publicPath(cni.filename)
      },
      rib: {
        originalName: rib.originalname,
        fileName: rib.filename,
        size: rib.size,
        url: publicPath(rib.filename)
      }
    };

    if (!isMysqlEnabled()) {
      return res.status(503).json({ success: false, message: 'MySQL requis pour enregistrer les documents.' });
    }

    try {
      const pool = getMysqlPool();
      const ok = await assertBoutiqueBelongsToVendeur(pool, boutiqueId, vendeurId);
      if (!ok) {
        return res.status(403).json({ success: false, message: 'Accès refusé à cette boutique.' });
      }
      await insertDocumentMysql(boutiqueId, 'kbis', payload.kbis.url);
      await insertDocumentMysql(boutiqueId, 'cni_passport', payload.cni.url);
      await insertDocumentMysql(boutiqueId, 'rib', payload.rib.url);
      const commentaire = String(req.body?.commentaire || '').trim();
      await markDocsSubmitted(boutiqueId, vendeurId, commentaire || null);
    } catch (e) {
      console.error('documents mysql:', e.message);
      return res.status(503).json({
        success: false,
        message:
          'Échec enregistrement SQL (boutique ou table absente ?). Vérifiez MYSQL_* et la base.'
      });
    }

    let onboarding = null;
    try {
      onboarding = await getOnboardingState(boutiqueId, vendeurId);
    } catch (e) {
      console.warn('onboarding after docs:', e.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Documents téléversés et enregistrés en base.',
      data: {
        identifiant_boutique: boutiqueId,
        persistedMysql: true,
        kbis: payload.kbis,
        cni: payload.cni,
        rib: payload.rib,
        onboarding
      }
    });
  }
);

/**
 * GET /api/seller/profile
 */
router.get('/profile', async (req, res) => {
  try {
    const { boutiqueId, vendeurId } = req.seller;
    const [profile, relectures] = await Promise.all([
      getSellerProfile(boutiqueId, vendeurId),
      getRelectureHistory(vendeurId)
    ]);
    return res.json({ success: true, data: { profile, relectures } });
  } catch (e) {
    console.error('profile get:', e.message);
    return res.status(503).json({ success: false, message: 'Impossible de charger le profil vendeur.' });
  }
});

router.put('/profile', express.json(), async (req, res) => {
  try {
    const { vendeurId } = req.seller;
    const profile = await updateSellerProfile(vendeurId, req.body || {});
    return res.json({ success: true, message: 'Profil enregistré.', data: { profile } });
  } catch (e) {
    console.error('profile put:', e.message);
    return res.status(503).json({ success: false, message: 'Impossible d’enregistrer le profil.' });
  }
});

router.get('/settings', async (req, res) => {
  try {
    const { boutiqueId, vendeurId } = req.seller;
    const settings = await getStoreSettings(boutiqueId, vendeurId);
    return res.json({ success: true, data: { settings } });
  } catch (e) {
    console.error('settings get:', e.message);
    return res.status(503).json({ success: false, message: 'Impossible de charger les paramètres.' });
  }
});

router.put('/settings', express.json(), async (req, res) => {
  try {
    const { boutiqueId, vendeurId } = req.seller;
    const settings = await updateStoreSettings(boutiqueId, vendeurId, req.body || {});
    return res.json({ success: true, message: 'Paramètres enregistrés.', data: { settings } });
  } catch (e) {
    console.error('settings put:', e.message);
    return res.status(503).json({ success: false, message: 'Impossible d’enregistrer les paramètres.' });
  }
});

router.post('/profile/verify-email', async (req, res) => {
  try {
    const { vendeurId } = req.seller;
    const result = await sendVerifyEmail(vendeurId);
    return res.json({ success: true, ...result });
  } catch (e) {
    return res.status(503).json({ success: false, message: 'Envoi impossible.' });
  }
});

router.post('/profile/verify-phone', async (req, res) => {
  try {
    const { vendeurId } = req.seller;
    const result = await sendVerifyPhone(vendeurId);
    return res.json({ success: true, ...result });
  } catch (e) {
    return res.status(503).json({ success: false, message: 'Envoi impossible.' });
  }
});

router.post('/profile/relecture-donnees', async (req, res) => {
  try {
    const { vendeurId } = req.seller;
    const relectures = await addRelectureDonnees(vendeurId);
    return res.json({ success: true, message: 'Confirmation enregistrée.', data: { relectures } });
  } catch (e) {
    return res.status(503).json({ success: false, message: 'Enregistrement impossible.' });
  }
});

/**
 * GET /api/seller/brand-registrations
 */
router.get('/brand-registrations', async (req, res) => {
  try {
    const { boutiqueId } = req.seller;
    const pool = getMysqlPool();
    const [rows] = await pool.execute(
      `SELECT identifiant, libelle_marque, url_preuve, statut_dossier, date_soumission
       FROM enregistrements_marque WHERE identifiant_boutique = ? ORDER BY date_soumission DESC`,
      [boutiqueId]
    );
    return res.json({ success: true, data: { rows } });
  } catch (e) {
    return res.status(503).json({ success: false, message: 'Impossible de charger les marques.' });
  }
});

/**
 * POST /api/seller/brand-registrations — body : { libelleMarque, urlPreuve? }
 */
router.post('/brand-registrations', express.json(), async (req, res) => {
  try {
    const { boutiqueId } = req.seller;
    const libelle = String(req.body?.libelleMarque || '').trim();
    if (!libelle) {
      return res.status(400).json({ success: false, message: 'Nom de marque requis.' });
    }
    const pool = getMysqlPool();
    const [ins] = await pool.execute(
      `INSERT INTO enregistrements_marque (identifiant_boutique, libelle_marque, url_preuve, statut_dossier)
       VALUES (?, ?, ?, 'en_attente')`,
      [boutiqueId, libelle.slice(0, 255), String(req.body?.urlPreuve || '').trim() || null]
    );
    return res.status(201).json({
      success: true,
      message: 'Demande d’enregistrement de marque soumise.',
      data: { id: ins.insertId, libelleMarque: libelle, statut: 'en_attente' }
    });
  } catch (e) {
    return res.status(503).json({ success: false, message: 'Enregistrement marque impossible.' });
  }
});

router.patch('/campaigns/:id', express.json(), async (req, res) => {
  try {
    const { boutiqueId } = req.seller;
    const data = await toggleCampaignStatus(boutiqueId, req.params.id, req.body?.status);
    return res.json({ success: true, data });
  } catch (e) {
    if (e.code === 'NOT_FOUND') return res.status(404).json({ success: false, message: 'Campagne introuvable.' });
    return res.status(503).json({ success: false, message: 'Mise à jour impossible.' });
  }
});

router.patch('/pricing-rules/:id', express.json(), async (req, res) => {
  try {
    const { boutiqueId } = req.seller;
    const data = await togglePricingRule(boutiqueId, req.params.id, req.body?.active);
    return res.json({ success: true, data });
  } catch (e) {
    if (e.code === 'NOT_FOUND') return res.status(404).json({ success: false, message: 'Règle introuvable.' });
    return res.status(503).json({ success: false, message: 'Mise à jour impossible.' });
  }
});

router.post('/pricing-rules', express.json(), async (req, res) => {
  try {
    const { boutiqueId } = req.seller;
    const data = await createPricingRule(boutiqueId, req.body?.name);
    return res.status(201).json({ success: true, message: 'Règle créée (inactive par défaut).', data });
  } catch (e) {
    return res.status(503).json({ success: false, message: 'Création de la règle impossible.' });
  }
});

router.post('/payouts/request', express.json(), async (req, res) => {
  try {
    const { boutiqueId } = req.seller;
    const data = await requestPayout(boutiqueId, req.body?.amount, Boolean(req.body?.early));
    return res.status(201).json({
      success: true,
      message: `Demande de versement de ${data.amount.toFixed(2)} € enregistrée.`,
      data
    });
  } catch (e) {
    if (e.code === 'MIN_AMOUNT') {
      return res.status(400).json({ success: false, message: 'Montant invalide.' });
    }
    return res.status(503).json({ success: false, message: 'Demande de versement impossible.' });
  }
});

router.patch('/programs/:code', express.json(), async (req, res) => {
  try {
    const { boutiqueId } = req.seller;
    const data = await toggleProgramEnrollment(boutiqueId, req.params.code, req.body?.enrolled);
    return res.json({ success: true, data });
  } catch (e) {
    if (e.code === 'NOT_FOUND') return res.status(404).json({ success: false, message: 'Programme introuvable.' });
    return res.status(503).json({ success: false, message: 'Mise à jour impossible.' });
  }
});

router.patch('/orders/:ref/status', express.json(), async (req, res) => {
  try {
    const { boutiqueId } = req.seller;
    const data = await updateOrderStatus(boutiqueId, req.params.ref, req.body?.status);
    return res.json({ success: true, data });
  } catch (e) {
    if (e.code === 'NOT_FOUND') return res.status(404).json({ success: false, message: 'Commande introuvable.' });
    return res.status(503).json({ success: false, message: 'Mise à jour impossible.' });
  }
});

router.patch('/buyer-messages/read-all', async (req, res) => {
  try {
    const { boutiqueId } = req.seller;
    await markAllBuyerMessagesRead(boutiqueId);
    return res.json({ success: true, message: 'Messages marqués comme lus.' });
  } catch (e) {
    return res.status(503).json({ success: false, message: 'Mise à jour impossible.' });
  }
});

router.patch('/products/:id/stock', express.json(), async (req, res) => {
  try {
    const { boutiqueId } = req.seller;
    const data = await updateProductStock(boutiqueId, req.params.id, req.body?.stock);
    return res.json({ success: true, data });
  } catch (e) {
    if (e.code === 'NOT_FOUND') return res.status(404).json({ success: false, message: 'Produit introuvable.' });
    return res.status(503).json({ success: false, message: 'Mise à jour impossible.' });
  }
});

/**
 * GET /api/seller/notifications
 */
router.get('/notifications', async (req, res) => {
  try {
    const { boutiqueId } = req.seller;
    if (!isMysqlEnabled()) {
      return res.status(503).json({ success: false, message: 'MySQL requis.' });
    }
    const [rows, unreadCount] = await Promise.all([
      listSellerNotifications(boutiqueId, 30),
      countUnreadSellerNotifications(boutiqueId)
    ]);
    return res.json({ success: true, data: { rows, unreadCount } });
  } catch (e) {
    return res.status(503).json({ success: false, message: 'Impossible de charger les notifications.' });
  }
});

router.patch('/notifications/read-all', async (req, res) => {
  try {
    const { boutiqueId } = req.seller;
    if (!isMysqlEnabled()) {
      return res.status(503).json({ success: false, message: 'MySQL requis.' });
    }
    const count = await markAllSellerNotificationsRead(boutiqueId);
    return res.json({ success: true, message: `${count} notification(s) lue(s).`, data: { count } });
  } catch (e) {
    return res.status(503).json({ success: false, message: 'Mise à jour impossible.' });
  }
});

router.patch('/notifications/:id/read', async (req, res) => {
  try {
    const { boutiqueId } = req.seller;
    if (!isMysqlEnabled()) {
      return res.status(503).json({ success: false, message: 'MySQL requis.' });
    }
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id < 1) {
      return res.status(400).json({ success: false, message: 'Notification invalide.' });
    }
    await markSellerNotificationRead(boutiqueId, id);
    const unreadCount = await countUnreadSellerNotifications(boutiqueId);
    return res.json({ success: true, data: { unreadCount } });
  } catch (e) {
    return res.status(503).json({ success: false, message: 'Mise à jour impossible.' });
  }
});

module.exports = { router, uploadDir };

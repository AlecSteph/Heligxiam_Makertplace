const { getMysqlPool } = require('./mysqlPool');
const {
  notifySellerKycResult,
  notifySellerProductModeration
} = require('./notificationsMysql');

async function safeNotify(fn) {
  try {
    await fn();
  } catch (e) {
    console.warn('notification:', e.message);
  }
}

function parseJson(val) {
  if (!val) return {};
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return {};
  }
}

function formatDt(d) {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

function formatFrShort(d) {
  if (!d) return '—';
  const dt = d instanceof Date ? d : new Date(d);
  return dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function mapBoutiqueStatut(statut) {
  switch (statut) {
    case 'active':
      return 'actif';
    case 'suspendue':
      return 'suspendu';
    case 'kyc_en_attente':
      return 'kyc_en_cours';
    case 'fermee':
      return 'suspendu';
    default:
      return 'brouillon';
  }
}

function mapKycDocStatus(statuts) {
  if (!statuts.length) return 'pending';
  if (statuts.some((s) => s === 'en_attente')) return 'pending';
  if (statuts.every((s) => s === 'valide')) return 'approved';
  if (statuts.some((s) => s === 'refuse')) return 'rejected';
  return 'pending';
}

async function listKycQueue() {
  const pool = getMysqlPool();
  const [rows] = await pool.execute(
    `SELECT b.identifiant AS boutiqueId,
            b.raison_sociale, b.nom_affichage, b.code_pays, b.statut AS statutBoutique,
            c.prenom, c.nom, c.courriel,
            MIN(d.date_deposit) AS firstDeposit,
            GROUP_CONCAT(CONCAT(d.type_document, ':', d.statut) ORDER BY d.type_document SEPARATOR ', ') AS docsDetail,
            GROUP_CONCAT(DISTINCT d.statut) AS docStatuts
     FROM boutiques b
     JOIN comptes_vendeur c ON c.identifiant = b.identifiant_vendeur
     LEFT JOIN documents_conformite_boutique d ON d.identifiant_boutique = b.identifiant
     WHERE b.statut = 'kyc_en_attente'
        OR EXISTS (
          SELECT 1 FROM documents_conformite_boutique dx
          WHERE dx.identifiant_boutique = b.identifiant AND dx.statut = 'en_attente'
        )
     GROUP BY b.identifiant, b.raison_sociale, b.nom_affichage, b.code_pays, b.statut, c.prenom, c.nom, c.courriel
     ORDER BY firstDeposit DESC, b.identifiant DESC`
  );

  return rows.map((r) => {
    const statuts = String(r.docStatuts || '')
      .split(',')
      .filter(Boolean);
    const owner = [r.prenom, r.nom].filter(Boolean).join(' ') || r.courriel || '—';
    const docs = r.docsDetail
      ? r.docsDetail
          .split(', ')
          .map((x) => x.split(':')[0])
          .join(', ')
      : '—';
    return {
      id: `KYC-${r.boutiqueId}`,
      boutiqueId: Number(r.boutiqueId),
      shopName: r.nom_affichage || r.raison_sociale,
      owner,
      country: r.code_pays || '—',
      submittedAt: formatDt(r.firstDeposit),
      docs,
      status: mapKycDocStatus(statuts)
    };
  });
}

async function approveKyc(boutiqueId) {
  const pool = getMysqlPool();
  const [boutiqueRows] = await pool.execute(
    `SELECT identifiant FROM boutiques WHERE identifiant = ? LIMIT 1`,
    [boutiqueId]
  );
  if (!boutiqueRows.length) {
    const err = new Error('Boutique introuvable.');
    err.code = 'BOUTIQUE_NOT_FOUND';
    throw err;
  }

  await pool.execute(
    `UPDATE documents_conformite_boutique SET statut = 'valide'
     WHERE identifiant_boutique = ? AND statut = 'en_attente'`,
    [boutiqueId]
  );
  await pool.execute(
    `INSERT INTO etapes_onboarding_boutique (identifiant_boutique, documents_kyc_ok)
     VALUES (?, 1)
     ON DUPLICATE KEY UPDATE documents_kyc_ok = 1`,
    [boutiqueId]
  );
  await pool.execute(
    `UPDATE boutiques SET statut = 'brouillon' WHERE identifiant = ? AND statut = 'kyc_en_attente'`,
    [boutiqueId]
  );

  await safeNotify(() => notifySellerKycResult(boutiqueId, true));
  return { boutiqueId, status: 'approved' };
}

async function rejectKyc(boutiqueId) {
  const pool = getMysqlPool();
  const [boutiqueRows] = await pool.execute(
    `SELECT identifiant FROM boutiques WHERE identifiant = ? LIMIT 1`,
    [boutiqueId]
  );
  if (!boutiqueRows.length) {
    const err = new Error('Boutique introuvable.');
    err.code = 'BOUTIQUE_NOT_FOUND';
    throw err;
  }

  await pool.execute(
    `UPDATE documents_conformite_boutique SET statut = 'refuse'
     WHERE identifiant_boutique = ? AND statut = 'en_attente'`,
    [boutiqueId]
  );

  await safeNotify(() => notifySellerKycResult(boutiqueId, false));
  return { boutiqueId, status: 'rejected' };
}

async function listSellersDirectory() {
  const pool = getMysqlPool();
  const [rows] = await pool.execute(
    `SELECT b.identifiant AS boutiqueId,
            b.identifiant_vendeur AS vendeurId,
            COALESCE(b.nom_affichage, b.raison_sociale) AS name,
            b.statut, b.raison_sociale, b.siret, b.code_pays, b.date_mise_a_jour,
            c.courriel, c.telephone, c.prenom, c.nom,
            p.courriel_verifie, p.telephone_verifie, p.preferences_json,
            (SELECT COUNT(*) FROM produits pr WHERE pr.identifiant_boutique = b.identifiant) AS listings,
            (SELECT GROUP_CONCAT(CONCAT(d.type_document, ' (', d.statut, ')') SEPARATOR ', ')
             FROM documents_conformite_boutique d WHERE d.identifiant_boutique = b.identifiant) AS docsRecus
     FROM boutiques b
     JOIN comptes_vendeur c ON c.identifiant = b.identifiant_vendeur
     LEFT JOIN profils_vendeur p ON p.identifiant_vendeur = b.identifiant_vendeur
     ORDER BY b.date_mise_a_jour DESC`
  );

  return rows.map((r) => {
    const prefs = parseJson(r.preferences_json);
    const planRaw = prefs.plan_abonnement || prefs.onboarding_soumissions?.plan?.tier;
    const plan =
      planRaw === 'professionnel' ? 'professionnel' : planRaw === 'particulier' ? 'particulier' : '—';
    const health = computeDefaultHealth(r);

    return {
      id: `V-${r.vendeurId}`,
      vendeurId: Number(r.vendeurId),
      boutiqueId: Number(r.boutiqueId),
      name: r.name,
      status: mapBoutiqueStatut(r.statut),
      listings: Number(r.listings || 0),
      health,
      lastSync: formatDt(r.date_mise_a_jour).slice(0, 10),
      email: r.courriel || '—',
      phone: r.telephone || '—',
      emailVerif: Boolean(r.courriel_verifie),
      telVerif: Boolean(r.telephone_verifie),
      plan,
      raisonSociale: r.raison_sociale || '—',
      siret: r.siret || '—',
      dernierVersement: '—',
      docsRecus: r.docsRecus || 'Aucun document'
    };
  });
}

function computeDefaultHealth(row) {
  let score = 50;
  if (row.courriel_verifie) score += 15;
  if (row.telephone_verifie) score += 10;
  score += Math.min(20, Number(row.listings || 0) * 2);
  if (row.statut === 'active') score += 10;
  if (row.statut === 'suspendue') score -= 20;
  return Math.max(0, Math.min(100, score));
}

async function adminVerifyEmail(vendeurId) {
  const pool = getMysqlPool();
  const [rows] = await pool.execute(
    `SELECT identifiant_vendeur FROM profils_vendeur WHERE identifiant_vendeur = ? LIMIT 1`,
    [vendeurId]
  );
  if (!rows.length) {
    const err = new Error('Vendeur introuvable.');
    err.code = 'VENDEUR_NOT_FOUND';
    throw err;
  }
  await pool.execute(
    `UPDATE profils_vendeur SET courriel_verifie = 1, date_verification_courriel = NOW(6) WHERE identifiant_vendeur = ?`,
    [vendeurId]
  );
  return { vendeurId, emailVerif: true };
}

async function adminVerifyPhone(vendeurId) {
  const pool = getMysqlPool();
  const [rows] = await pool.execute(
    `SELECT identifiant_vendeur FROM profils_vendeur WHERE identifiant_vendeur = ? LIMIT 1`,
    [vendeurId]
  );
  if (!rows.length) {
    const err = new Error('Vendeur introuvable.');
    err.code = 'VENDEUR_NOT_FOUND';
    throw err;
  }
  await pool.execute(
    `UPDATE profils_vendeur SET telephone_verifie = 1, date_verification_telephone = NOW(6) WHERE identifiant_vendeur = ?`,
    [vendeurId]
  );
  return { vendeurId, telVerif: true };
}

async function listProductsModeration() {
  const pool = getMysqlPool();
  const [rows] = await pool.execute(
    `SELECT fm.identifiant AS moderationId,
            p.identifiant AS productId,
            p.titre, p.reference_sku, p.statut_moderation,
            COALESCE(b.nom_affichage, b.raison_sociale) AS seller,
            fm.motif, fm.statut AS fileStatut, fm.date_creation
     FROM produits p
     JOIN boutiques b ON b.identifiant = p.identifiant_boutique
     LEFT JOIN file_moderation_produits fm ON fm.identifiant_produit = p.identifiant
     WHERE p.statut_moderation IN ('en_attente_moderation', 'refuse')
        OR (fm.statut IS NOT NULL AND fm.statut IN ('ouvert', 'en_attente'))
     ORDER BY COALESCE(fm.date_creation, p.date_creation) DESC`
  );

  return rows.map((r) => {
    let status = 'pending';
    if (r.statut_moderation === 'publie') status = 'approved';
    else if (r.statut_moderation === 'refuse') status = 'rejected';
    else if (r.fileStatut === 'approuve') status = 'approved';
    else if (r.fileStatut === 'refuse') status = 'rejected';

    return {
      id: `PM-${r.moderationId || r.productId}`,
      moderationId: r.moderationId ? Number(r.moderationId) : null,
      productId: Number(r.productId),
      title: r.titre,
      seller: r.seller,
      category: r.reference_sku || '—',
      flagReason: r.motif || 'Publication — revue requise',
      submittedAt: formatDt(r.date_creation),
      status
    };
  });
}

async function approveProductModeration(productId) {
  const pool = getMysqlPool();
  const [rows] = await pool.execute(
    `SELECT identifiant, identifiant_boutique, titre FROM produits WHERE identifiant = ? LIMIT 1`,
    [productId]
  );
  if (!rows.length) {
    const err = new Error('Produit introuvable.');
    err.code = 'PRODUCT_NOT_FOUND';
    throw err;
  }

  await pool.execute(
    `UPDATE produits SET statut_moderation = 'publie', date_publication = NOW(6) WHERE identifiant = ?`,
    [productId]
  );
  await pool.execute(
    `UPDATE file_moderation_produits SET statut = 'approuve' WHERE identifiant_produit = ? AND statut IN ('ouvert', 'en_attente')`,
    [productId]
  );

  await safeNotify(() =>
    notifySellerProductModeration(
      rows[0].identifiant_boutique,
      productId,
      rows[0].titre,
      true,
      null
    )
  );
  return { productId, status: 'approved' };
}

async function rejectProductModeration(productId, motif) {
  const pool = getMysqlPool();
  const [rows] = await pool.execute(
    `SELECT identifiant, identifiant_boutique, titre FROM produits WHERE identifiant = ? LIMIT 1`,
    [productId]
  );
  if (!rows.length) {
    const err = new Error('Produit introuvable.');
    err.code = 'PRODUCT_NOT_FOUND';
    throw err;
  }

  await pool.execute(`UPDATE produits SET statut_moderation = 'refuse' WHERE identifiant = ?`, [productId]);
  await pool.execute(
    `UPDATE file_moderation_produits SET statut = 'refuse' WHERE identifiant_produit = ? AND statut IN ('ouvert', 'en_attente')`,
    [productId]
  );

  await safeNotify(() =>
    notifySellerProductModeration(
      rows[0].identifiant_boutique,
      productId,
      rows[0].titre,
      false,
      motif || null
    )
  );
  return { productId, status: 'rejected' };
}

async function listVendorReturns() {
  const pool = getMysqlPool();
  const [rows] = await pool.execute(
    `SELECT r.identifiant, r.reference_retour, r.statut, r.montant_remboursement, r.date_mise_a_jour,
            c.reference_publique AS orderRef,
            COALESCE(b.nom_affichage, b.raison_sociale) AS shopName
     FROM demandes_retour_boutique r
     JOIN commandes_boutique c ON c.identifiant = r.identifiant_commande
     JOIN boutiques b ON b.identifiant = r.identifiant_boutique
     ORDER BY r.date_mise_a_jour DESC
     LIMIT 200`
  );

  return rows.map((r) => ({
    id: `VR-${r.identifiant}`,
    returnRef: r.reference_retour,
    orderRef: r.orderRef,
    shopName: r.shopName,
    buyer: `Acheteur #${r.identifiant}`,
    amount: r.montant_remboursement != null ? `${Number(r.montant_remboursement).toFixed(2)} €` : '—',
    charge: 'vendeur',
    status: r.statut,
    updatedAt: formatDt(r.date_mise_a_jour)
  }));
}

async function listVendorTickets() {
  const pool = getMysqlPool();
  const [rows] = await pool.execute(
    `SELECT t.identifiant, t.sujet, t.priorite, t.statut, t.date_creation, t.rubrique,
            COALESCE(b.nom_affichage, b.raison_sociale, CONCAT('V-', t.identifiant_vendeur)) AS fromLabel
     FROM tickets_support_vendeur t
     LEFT JOIN boutiques b ON b.identifiant = t.identifiant_boutique
     ORDER BY t.date_creation DESC
     LIMIT 200`
  );

  return rows.map((r) => ({
    id: `TK-${r.identifiant}`,
    audience: 'vendeur',
    from: r.fromLabel,
    topic: r.sujet,
    priority: r.priorite === 'haut' ? 'haut' : r.priorite === 'bas' ? 'bas' : 'moyen',
    status: r.statut === 'ferme' || r.statut === 'fermé' ? 'fermé' : r.statut === 'en_cours' ? 'en_cours' : 'ouvert',
    updatedAt: formatDt(r.date_creation)
  }));
}

async function recalculateAllSante(poids = {}) {
  const pool = getMysqlPool();
  const sellers = await listSellersDirectory();
  const w = {
    delaisExpedition: Number(poids.delaisExpedition ?? 0.25),
    odr: Number(poids.odr ?? 0.2),
    retours: Number(poids.retours ?? 0.2),
    reponseMessage: Number(poids.reponseMessage ?? 0.2),
    annulations: Number(poids.annulations ?? 0.15)
  };

  for (const s of sellers) {
    const base = 40;
    const e = s.emailVerif ? 15 : 0;
    const t = s.telVerif ? 10 : 0;
    const l = Math.min(25, Math.floor(s.listings / 40));
    const st = s.status === 'actif' ? 10 : s.status === 'surveillé' ? 0 : -15;
    const score = Math.max(0, Math.min(100, base + e + t + l + st));
    const niveau =
      score >= 90 ? 'excellent' : score >= 75 ? 'bon' : score >= 50 ? 'a_surveiller' : 'critique';

    try {
      await pool.execute(
        `INSERT INTO sante_compte_courant
           (identifiant_boutique, score_global, niveau, delais_expedition, taux_reclamation, taux_reponse_messagerie, conformite_listings, avertissements_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           score_global = VALUES(score_global),
           niveau = VALUES(niveau),
           delais_expedition = VALUES(delais_expedition),
           taux_reclamation = VALUES(taux_reclamation),
           taux_reponse_messagerie = VALUES(taux_reponse_messagerie),
           conformite_listings = VALUES(conformite_listings),
           avertissements_json = VALUES(avertissements_json)`,
        [
          s.boutiqueId,
          score,
          niveau,
          w.delaisExpedition * 100,
          w.odr * 100,
          w.reponseMessage * 100,
          w.retours * 100,
          JSON.stringify({ poids: w, recalcAt: new Date().toISOString() })
        ]
      );
    } catch (persistErr) {
      if (persistErr.code !== 'ER_NO_SUCH_TABLE') {
        throw persistErr;
      }
    }
    s.health = score;
  }

  return sellers;
}

module.exports = {
  listKycQueue,
  approveKyc,
  rejectKyc,
  listSellersDirectory,
  adminVerifyEmail,
  adminVerifyPhone,
  listProductsModeration,
  approveProductModeration,
  rejectProductModeration,
  listVendorReturns,
  listVendorTickets,
  recalculateAllSante
};

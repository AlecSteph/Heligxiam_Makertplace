const { getMysqlPool } = require('./mysqlPool');

function parseCampaignId(id) {
  const m = String(id || '').match(/^c-(\d+)$/);
  return m ? Number(m[1]) : NaN;
}

function parseRuleId(id) {
  const m = String(id || '').match(/^r-(\d+)$/);
  return m ? Number(m[1]) : NaN;
}

function parseOrderRef(ref) {
  return String(ref || '').replace(/^#/, '').trim();
}

async function toggleCampaignStatus(boutiqueId, campaignId, status) {
  const pool = getMysqlPool();
  const id = parseCampaignId(campaignId);
  if (!Number.isFinite(id)) {
    const err = new Error('INVALID_ID');
    err.code = 'INVALID_ID';
    throw err;
  }
  const next = status === 'active' ? 'active' : 'pause';
  const [res] = await pool.execute(
    `UPDATE campagnes_publicitaires_boutique SET statut = ?
     WHERE identifiant = ? AND identifiant_boutique = ?`,
    [next, id, boutiqueId]
  );
  if (!res.affectedRows) {
    const err = new Error('NOT_FOUND');
    err.code = 'NOT_FOUND';
    throw err;
  }
  return { id: campaignId, status: next };
}

async function togglePricingRule(boutiqueId, ruleId, active) {
  const pool = getMysqlPool();
  const id = parseRuleId(ruleId);
  if (!Number.isFinite(id)) {
    const err = new Error('INVALID_ID');
    err.code = 'INVALID_ID';
    throw err;
  }
  const [res] = await pool.execute(
    `UPDATE regles_retarification SET active = ? WHERE identifiant = ? AND identifiant_boutique = ?`,
    [active ? 1 : 0, id, boutiqueId]
  );
  if (!res.affectedRows) {
    const err = new Error('NOT_FOUND');
    err.code = 'NOT_FOUND';
    throw err;
  }
  return { id: ruleId, active: Boolean(active) };
}

async function toggleProgramEnrollment(boutiqueId, programCode, enrolled) {
  const pool = getMysqlPool();
  const code = String(programCode || '').trim();
  const [progRows] = await pool.execute(
    `SELECT identifiant FROM programmes_plateforme WHERE code = ? LIMIT 1`,
    [code]
  );
  if (!progRows.length) {
    const err = new Error('NOT_FOUND');
    err.code = 'NOT_FOUND';
    throw err;
  }
  const programId = progRows[0].identifiant;
  const statut = enrolled ? 'inscrit' : 'desinscrit';
  await pool.execute(
    `INSERT INTO inscriptions_programme_boutique (identifiant_boutique, identifiant_programme, statut)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE statut = VALUES(statut)`,
    [boutiqueId, programId, statut]
  );
  return { id: code, enrolled: Boolean(enrolled) };
}

async function updateOrderStatus(boutiqueId, orderRef, status) {
  const pool = getMysqlPool();
  const ref = parseOrderRef(orderRef);
  const statusMap = {
    pending: 'a_expedier',
    shipped: 'expediee',
    delivered: 'livree',
    returned: 'remboursee',
    cancelled: 'annulee'
  };
  const sqlStatut = statusMap[status] || status;
  const [res] = await pool.execute(
    `UPDATE commandes_boutique SET statut = ?
     WHERE identifiant_boutique = ? AND (reference_publique = ? OR identifiant = ?)`,
    [sqlStatut, boutiqueId, ref, Number.isFinite(Number(ref)) ? Number(ref) : -1]
  );
  if (!res.affectedRows) {
    const err = new Error('NOT_FOUND');
    err.code = 'NOT_FOUND';
    throw err;
  }
  return { orderRef, status };
}

async function markAllBuyerMessagesRead(boutiqueId) {
  const pool = getMysqlPool();
  await pool.execute(
    `UPDATE messages_conversation m
     JOIN conversations_acheteur c ON c.identifiant = m.identifiant_conversation
     SET m.lu = 1
     WHERE c.identifiant_boutique = ? AND m.type_expediteur = 'acheteur'`,
    [boutiqueId]
  );
  return { ok: true };
}

async function updateProductStock(boutiqueId, productId, stock) {
  const pool = getMysqlPool();
  const pid = Number(String(productId).replace(/^p-/, ''));
  const qty = Math.max(0, Number(stock) || 0);
  const [check] = await pool.execute(
    `SELECT identifiant FROM produits WHERE identifiant = ? AND identifiant_boutique = ? LIMIT 1`,
    [pid, boutiqueId]
  );
  if (!check.length) {
    const err = new Error('NOT_FOUND');
    err.code = 'NOT_FOUND';
    throw err;
  }
  await pool.execute(
    `UPDATE inventaire SET quantite_disponible = ?
     WHERE identifiant_produit = ? AND identifiant_variante IS NULL`,
    [qty, pid]
  );
  return { productId: `p-${pid}`, stock: qty };
}

async function createPricingRule(boutiqueId, name) {
  const pool = getMysqlPool();
  const libelle = String(name || 'Règle automatique').trim().slice(0, 255) || 'Règle automatique';
  const [result] = await pool.execute(
    `INSERT INTO regles_retarification (identifiant_boutique, libelle, configuration_json, active)
     VALUES (?, ?, '{}', 0)`,
    [boutiqueId, libelle]
  );
  return { id: `r-${result.insertId}`, name: libelle, active: false };
}

async function requestPayout(boutiqueId, amount, early = false) {
  const pool = getMysqlPool();
  const montant = Math.round((Number(amount) || 0) * 100) / 100;
  if (montant < 1) {
    const err = new Error('MIN_AMOUNT');
    err.code = 'MIN_AMOUNT';
    throw err;
  }
  const ref = early ? `EARLY-${Date.now()}` : `REQ-${Date.now()}`;
  const [result] = await pool.execute(
    `INSERT INTO versements_boutique (identifiant_boutique, montant, statut, reference_bancaire)
     VALUES (?, ?, 'pending', ?)`,
    [boutiqueId, montant, ref]
  );
  return { id: `pay-${result.insertId}`, amount: montant, status: 'pending', reference: ref };
}

module.exports = {
  toggleCampaignStatus,
  togglePricingRule,
  toggleProgramEnrollment,
  updateOrderStatus,
  markAllBuyerMessagesRead,
  updateProductStock,
  createPricingRule,
  requestPayout
};

const crypto = require('crypto');

function getPool() {
  return require('../config/database').pool;
}

const STATUS_TO_BUYER = {
  en_attente_paiement: 'processing',
  payee: 'processing',
  a_expedier: 'preparing',
  expediee: 'shipped',
  livree: 'delivered',
  annulee: 'cancelled',
  remboursee: 'cancelled'
};

const BUYER_TO_STATUS = {
  pending: 'a_expedier',
  shipped: 'expediee',
  delivered: 'livree',
  returned: 'remboursee',
  cancelled: 'annulee'
};

async function ensureOrdersSchema() {
  const pool = getPool();
  await getPool().query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS hx_commandes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reference_publique VARCHAR(32) NOT NULL UNIQUE,
      id_user UUID NOT NULL,
      statut VARCHAR(32) NOT NULL DEFAULT 'a_expedier',
      total_ht NUMERIC(12,2) NOT NULL DEFAULT 0,
      total_frais_livraison NUMERIC(12,2) NOT NULL DEFAULT 0,
      total_ttc NUMERIC(12,2) NOT NULL DEFAULT 0,
      promo_code VARCHAR(32),
      promo_discount NUMERIC(12,2) NOT NULL DEFAULT 0,
      delivery_mode VARCHAR(32),
      adresse_livraison JSONB,
      tracking_code VARCHAR(64),
      qr_token VARCHAR(64) NOT NULL UNIQUE,
      date_creation TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      date_mise_a_jour TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS hx_lignes_commande (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      id_commande UUID NOT NULL REFERENCES hx_commandes(id) ON DELETE CASCADE,
      id_produit VARCHAR(64),
      nom_produit VARCHAR(255) NOT NULL,
      image_produit VARCHAR(500),
      vendeur_nom VARCHAR(191),
      quantite INTEGER NOT NULL CHECK (quantite > 0),
      prix_unitaire NUMERIC(10,2) NOT NULL
    )
  `);
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS hx_retours (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reference_retour VARCHAR(32) NOT NULL UNIQUE,
      id_commande UUID NOT NULL REFERENCES hx_commandes(id) ON DELETE CASCADE,
      id_ligne UUID REFERENCES hx_lignes_commande(id) ON DELETE SET NULL,
      id_user UUID NOT NULL,
      motif TEXT NOT NULL,
      statut VARCHAR(32) NOT NULL DEFAULT 'demande',
      montant_remboursement NUMERIC(12,2),
      date_creation TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      date_mise_a_jour TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await getPool().query(`CREATE INDEX IF NOT EXISTS idx_hx_cmd_user ON hx_commandes(id_user)`);
  await getPool().query(`CREATE INDEX IF NOT EXISTS idx_hx_cmd_ref ON hx_commandes(reference_publique)`);
  await getPool().query(`CREATE INDEX IF NOT EXISTS idx_hx_ret_user ON hx_retours(id_user)`);
}

function generateReference() {
  const n = Math.floor(10000 + Math.random() * 89999);
  return `HX-${new Date().getFullYear()}-${n}`;
}

function generateReturnRef() {
  return `RET-${Date.now().toString(36).toUpperCase()}`;
}

function generateQrToken() {
  return crypto.randomBytes(24).toString('hex');
}

function generateTrackingCode(ref) {
  return `TRK${ref.replace(/[^A-Z0-9]/gi, '').slice(-10).toUpperCase()}FR`;
}

function mapOrderRow(order, lines) {
  const status = STATUS_TO_BUYER[order.statut] || 'processing';
  const progress =
    status === 'delivered' ? 100 : status === 'shipped' ? 70 : status === 'preparing' ? 40 : 25;
  const seller =
    lines.find((l) => l.vendeur_nom)?.vendeur_nom || 'Vendeur partenaire HELIGXIAM';
  return {
    id: order.reference_publique,
    orderId: order.id,
    date: order.date_creation,
    status,
    total: Number(order.total_ttc),
    items: lines.length,
    seller,
    tracking: order.tracking_code || undefined,
    eta: status === 'shipped' ? '2-3 jours ouvrés' : undefined,
    progress,
    qrToken: order.qr_token,
    products: lines.map((l) => ({
      lineId: l.id,
      name: l.nom_produit,
      image: l.image_produit || '',
      qty: l.quantite,
      price: Number(l.prix_unitaire)
    }))
  };
}

async function createCheckoutOrder(userId, payload) {
  const items = Array.isArray(payload.items) ? payload.items : [];
  if (!items.length) {
    const err = new Error('EMPTY_CART');
    err.code = 'EMPTY_CART';
    throw err;
  }

  const shipping = Math.max(0, Number(payload.shipping) || 0);
  const promoDiscount = Math.max(0, Number(payload.promoDiscount) || 0);
  const subtotal = items.reduce(
    (sum, i) => sum + Number(i.price) * Number(i.quantity || 1),
    0
  );
  const totalTtc = Math.max(0, subtotal - promoDiscount + shipping);

  const reference = generateReference();
  const qrToken = generateQrToken();
  const trackingCode = generateTrackingCode(reference);
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');
    const orderRes = await client.query(
      `INSERT INTO hx_commandes (
         reference_publique, id_user, statut, total_ht, total_frais_livraison, total_ttc,
         promo_code, promo_discount, delivery_mode, adresse_livraison, tracking_code, qr_token
       ) VALUES ($1,$2,'a_expedier',$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        reference,
        userId,
        subtotal,
        shipping,
        totalTtc,
        payload.promoCode || null,
        promoDiscount,
        payload.delivery || 'standard',
        JSON.stringify(payload.address || {}),
        trackingCode,
        qrToken
      ]
    );
    const order = orderRes.rows[0];

    for (const item of items) {
      await client.query(
        `INSERT INTO hx_lignes_commande (
           id_commande, id_produit, nom_produit, image_produit, vendeur_nom, quantite, prix_unitaire
         ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          order.id,
          String(item.id || ''),
          String(item.name || 'Produit').slice(0, 255),
          item.image || null,
          item.sellerName || item.seller || null,
          Math.max(1, Number(item.quantity) || 1),
          Number(item.price) || 0
        ]
      );
    }

    await client.query('COMMIT');
    const lines = await listLinesForOrder(order.id);
    return mapOrderRow(order, lines);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function listLinesForOrder(orderId) {
  const { rows } = await getPool().query(
    `SELECT * FROM hx_lignes_commande WHERE id_commande = $1 ORDER BY nom_produit`,
    [orderId]
  );
  return rows;
}

async function getOrderByRef(userId, ref) {
  const { rows } = await getPool().query(
    `SELECT * FROM hx_commandes WHERE reference_publique = $1 AND id_user = $2 LIMIT 1`,
    [ref, userId]
  );
  if (!rows.length) return null;
  const lines = await listLinesForOrder(rows[0].id);
  return { order: rows[0], lines, mapped: mapOrderRow(rows[0], lines) };
}

async function listOrdersForBuyer(userId) {
  const { rows } = await getPool().query(
    `SELECT * FROM hx_commandes WHERE id_user = $1 ORDER BY date_creation DESC LIMIT 50`,
    [userId]
  );
  const orders = [];
  for (const order of rows) {
    const lines = await listLinesForOrder(order.id);
    orders.push(mapOrderRow(order, lines));
  }
  return orders;
}

async function cancelOrder(userId, ref) {
  const found = await getOrderByRef(userId, ref);
  if (!found) {
    const err = new Error('NOT_FOUND');
    err.code = 'NOT_FOUND';
    throw err;
  }
  if (!['a_expedier', 'payee', 'en_attente_paiement'].includes(found.order.statut)) {
    const err = new Error('NOT_CANCELLABLE');
    err.code = 'NOT_CANCELLABLE';
    throw err;
  }
  await getPool().query(
    `UPDATE hx_commandes SET statut = 'annulee', date_mise_a_jour = NOW() WHERE id = $1`,
    [found.order.id]
  );
  return { id: ref, status: 'cancelled' };
}

async function createReturnRequest(userId, { orderRef, lineId, motif }) {
  const found = await getOrderByRef(userId, orderRef);
  if (!found) {
    const err = new Error('NOT_FOUND');
    err.code = 'NOT_FOUND';
    throw err;
  }
  if (!['livree', 'expediee', 'a_expedier'].includes(found.order.statut)) {
    const err = new Error('NOT_RETURNABLE');
    err.code = 'NOT_RETURNABLE';
    throw err;
  }

  const line = lineId
    ? found.lines.find((l) => l.id === lineId)
    : found.lines[0];
  if (!line) {
    const err = new Error('LINE_NOT_FOUND');
    err.code = 'LINE_NOT_FOUND';
    throw err;
  }

  const existing = await getPool().query(
    `SELECT id FROM hx_retours
     WHERE id_commande = $1 AND id_ligne = $2 AND statut NOT IN ('refuse', 'annule') LIMIT 1`,
    [found.order.id, line.id]
  );
  if (existing.rows.length) {
    const err = new Error('RETURN_EXISTS');
    err.code = 'RETURN_EXISTS';
    throw err;
  }

  const refund = Number(line.prix_unitaire) * Number(line.quantite);
  const reference = generateReturnRef();
  const { rows } = await getPool().query(
    `INSERT INTO hx_retours (
       reference_retour, id_commande, id_ligne, id_user, motif, statut, montant_remboursement
     ) VALUES ($1,$2,$3,$4,$5,'demande',$6)
     RETURNING *`,
    [reference, found.order.id, line.id, userId, String(motif || 'Retour client').slice(0, 500), refund]
  );

  return {
    id: rows[0].reference_retour,
    order: orderRef,
    product: line.nom_produit,
    reason: rows[0].motif,
    status: rows[0].statut,
    refund: Number(rows[0].montant_remboursement),
    created: rows[0].date_creation
  };
}

async function listReturnsForBuyer(userId) {
  const { rows } = await getPool().query(
    `SELECT r.*, c.reference_publique, l.nom_produit
     FROM hx_retours r
     JOIN hx_commandes c ON c.id = r.id_commande
     LEFT JOIN hx_lignes_commande l ON l.id = r.id_ligne
     WHERE r.id_user = $1
     ORDER BY r.date_creation DESC
     LIMIT 50`,
    [userId]
  );
  return rows.map((r) => ({
    id: r.reference_retour,
    order: r.reference_publique,
    product: r.nom_produit || '—',
    reason: r.motif,
    status: r.statut,
    refund: Number(r.montant_remboursement || 0),
    created: r.date_creation
  }));
}

async function updateOrderStatusPg(ref, status) {
  const sqlStatut = BUYER_TO_STATUS[status] || status;
  const { rows } = await getPool().query(
    `UPDATE hx_commandes SET statut = $1, date_mise_a_jour = NOW()
     WHERE reference_publique = $2
     RETURNING reference_publique, statut`,
    [sqlStatut, ref.replace(/^#/, '')]
  );
  if (!rows.length) {
    const err = new Error('NOT_FOUND');
    err.code = 'NOT_FOUND';
    throw err;
  }
  return { orderRef: rows[0].reference_publique, status: STATUS_TO_BUYER[rows[0].statut] };
}

module.exports = {
  ensureOrdersSchema,
  createCheckoutOrder,
  listOrdersForBuyer,
  getOrderByRef,
  cancelOrder,
  createReturnRequest,
  listReturnsForBuyer,
  updateOrderStatusPg,
  mapOrderRow,
  STATUS_TO_BUYER
};

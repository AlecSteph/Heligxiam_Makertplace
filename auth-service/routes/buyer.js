const express = require('express');
const { isMysqlEnabled, getMysqlPool } = require('../lib/mysqlPool');
const { requireBuyerAuth } = require('../middleware/requireBuyerAuth');
const { listPromoCodes } = require('../lib/catalog/promotionsMysql');

const router = express.Router();

router.use(requireBuyerAuth);

/** GET /api/buyer/orders — commandes de l'acheteur connecté */
router.get('/orders', async (req, res) => {
  try {
    if (!isMysqlEnabled()) {
      return res.json({ success: true, data: { rows: [] } });
    }
    const pool = getMysqlPool();
    const buyerKey = String(req.buyer.idUser || '');
    const numericId = Number(buyerKey.replace(/\D/g, '').slice(0, 15)) || 0;
    if (!numericId) {
      return res.json({ success: true, data: { rows: [] } });
    }
    const [rows] = await pool.execute(
      `SELECT c.reference_publique AS id, c.date_creation AS date, c.statut AS status,
              c.total_ttc AS total, COALESCE(b.nom_affichage, b.raison_sociale) AS seller
       FROM commandes_boutique c
       JOIN boutiques b ON b.identifiant = c.identifiant_boutique
       WHERE c.identifiant_acheteur = ?
       ORDER BY c.date_creation DESC
       LIMIT 50`,
      [numericId]
    );
    const orders = [];
    for (const r of rows) {
      const [items] = await pool.execute(
        `SELECT p.titre AS name, img.url_image AS image, l.quantite AS qty
         FROM lignes_commande_boutique l
         JOIN produits p ON p.identifiant = l.identifiant_produit
         LEFT JOIN images_produit img ON img.identifiant_produit = p.identifiant AND img.ordre_affichage = 0
         WHERE l.identifiant_commande = (
           SELECT identifiant FROM commandes_boutique WHERE reference_publique = ? LIMIT 1
         )`,
        [r.id]
      );
      orders.push({
        id: r.id,
        date: r.date,
        status: mapOrderStatus(r.status),
        total: Number(r.total),
        items: items.length,
        seller: r.seller,
        products: items.map((i) => ({ name: i.name, image: i.image || '', qty: i.qty }))
      });
    }
    return res.json({ success: true, data: { rows: orders } });
  } catch (e) {
    console.error('buyer orders:', e.message);
    return res.status(500).json({ success: false, message: 'Erreur commandes acheteur.' });
  }
});

function mapOrderStatus(s) {
  const map = {
    en_attente_paiement: 'processing',
    payee: 'processing',
    a_expedier: 'preparing',
    expediee: 'shipped',
    livree: 'delivered',
    annulee: 'cancelled',
    remboursee: 'cancelled'
  };
  return map[s] || 'processing';
}

/** GET /api/buyer/coupons — codes promo disponibles pour l'acheteur */
router.get('/coupons', async (_req, res) => {
  try {
    if (!isMysqlEnabled()) {
      return res.json({ success: true, data: { rows: [] } });
    }
    const rows = await listPromoCodes();
    return res.json({ success: true, data: { rows } });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Erreur coupons acheteur.' });
  }
});

module.exports = { router };

const express = require('express');
const { isMysqlEnabled, getMysqlPool } = require('../lib/mysqlPool');
const { requireBuyerAuth } = require('../middleware/requireBuyerAuth');
const { listPromoCodes } = require('../lib/catalog/promotionsMysql');

const router = express.Router();

router.use(requireBuyerAuth);

/** GET /api/buyer/coupons — codes promo (commandes → order-service :3004) */
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

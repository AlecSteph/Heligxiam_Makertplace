const express = require('express');
const { requireSellerAuth } = require('../middlewares/auth');
const { updateOrderStatusPg } = require('../lib/ordersRepository');

const router = express.Router();

router.patch('/orders/:ref/status', express.json(), requireSellerAuth, async (req, res) => {
  try {
    const data = await updateOrderStatusPg(req.params.ref, req.body?.status);
    return res.json({ success: true, data });
  } catch (e) {
    if (e.code === 'NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Commande introuvable.' });
    }
    return res.status(503).json({ success: false, message: 'Mise à jour impossible.' });
  }
});

module.exports = router;

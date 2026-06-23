const express = require('express');
const { body, validationResult } = require('express-validator');
const { requireBuyerAuth } = require('../middlewares/auth');
const {
  createCheckoutOrder,
  listOrdersForBuyer,
  getOrderByRef,
  cancelOrder,
  createReturnRequest,
  listReturnsForBuyer
} = require('../lib/ordersRepository');
const { buildReceiptPdf, buildQrPng } = require('../lib/receiptPdf');

const router = express.Router();

router.use(requireBuyerAuth);

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Données invalides', errors: errors.array() });
  }
  next();
};

router.get('/orders', async (req, res) => {
  try {
    const rows = await listOrdersForBuyer(req.buyer.idUser);
    return res.json({ success: true, data: { rows } });
  } catch (e) {
    console.error('buyer orders:', e.message);
    return res.status(500).json({ success: false, message: 'Erreur commandes acheteur.' });
  }
});

router.post(
  '/orders/checkout',
  [
    body('items').isArray({ min: 1 }).withMessage('Panier vide'),
    body('items.*.name').trim().notEmpty(),
    body('items.*.price').isFloat({ min: 0 }),
    body('items.*.quantity').isInt({ min: 1 })
  ],
  handleValidation,
  async (req, res) => {
    try {
      const order = await createCheckoutOrder(req.buyer.idUser, req.body);
      return res.status(201).json({
        success: true,
        message: 'Commande confirmée.',
        data: { order }
      });
    } catch (e) {
      if (e.code === 'EMPTY_CART') {
        return res.status(400).json({ success: false, message: 'Votre panier est vide.' });
      }
      console.error('checkout:', e.message);
      return res.status(500).json({ success: false, message: 'Impossible de finaliser la commande.' });
    }
  }
);

router.get('/orders/:ref/receipt', async (req, res) => {
  try {
    const found = await getOrderByRef(req.buyer.idUser, req.params.ref);
    if (!found) {
      return res.status(404).json({ success: false, message: 'Commande introuvable.' });
    }
    const pdf = await buildReceiptPdf(found.order, found.lines, req.buyer.email);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="recu-${found.order.reference_publique}.pdf"`
    );
    return res.send(pdf);
  } catch (e) {
    console.error('receipt pdf:', e.message);
    return res.status(500).json({ success: false, message: 'Génération du reçu impossible.' });
  }
});

router.get('/orders/:ref/qrcode', async (req, res) => {
  try {
    const found = await getOrderByRef(req.buyer.idUser, req.params.ref);
    if (!found) {
      return res.status(404).json({ success: false, message: 'Commande introuvable.' });
    }
    const png = await buildQrPng(found.order);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    return res.send(png);
  } catch (e) {
    console.error('qrcode:', e.message);
    return res.status(500).json({ success: false, message: 'Génération QR impossible.' });
  }
});

router.patch('/orders/:ref/cancel', async (req, res) => {
  try {
    const data = await cancelOrder(req.buyer.idUser, req.params.ref);
    return res.json({ success: true, data });
  } catch (e) {
    if (e.code === 'NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Commande introuvable.' });
    }
    if (e.code === 'NOT_CANCELLABLE') {
      return res.status(400).json({ success: false, message: 'Cette commande ne peut plus être annulée.' });
    }
    return res.status(500).json({ success: false, message: 'Annulation impossible.' });
  }
});

router.get('/orders/:ref', async (req, res) => {
  try {
    const found = await getOrderByRef(req.buyer.idUser, req.params.ref);
    if (!found) {
      return res.status(404).json({ success: false, message: 'Commande introuvable.' });
    }
    return res.json({ success: true, data: { order: found.mapped } });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Erreur lecture commande.' });
  }
});

router.get('/returns', async (req, res) => {
  try {
    const rows = await listReturnsForBuyer(req.buyer.idUser);
    return res.json({ success: true, data: { rows } });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Erreur chargement retours.' });
  }
});

router.post(
  '/returns',
  [
    body('orderRef').trim().notEmpty().withMessage('Référence commande requise'),
    body('motif').trim().isLength({ min: 3, max: 500 }).withMessage('Motif requis (3-500 car.)'),
    body('lineId').optional().isUUID()
  ],
  handleValidation,
  async (req, res) => {
    try {
      const row = await createReturnRequest(req.buyer.idUser, req.body);
      return res.status(201).json({
        success: true,
        message: 'Demande de retour enregistrée. Bordereau prépayé envoyé par email.',
        data: { return: row }
      });
    } catch (e) {
      if (e.code === 'NOT_FOUND') {
        return res.status(404).json({ success: false, message: 'Commande introuvable.' });
      }
      if (e.code === 'NOT_RETURNABLE') {
        return res.status(400).json({
          success: false,
          message: 'Cette commande ne peut pas être retournée dans son état actuel.'
        });
      }
      if (e.code === 'RETURN_EXISTS') {
        return res.status(409).json({ success: false, message: 'Un retour existe déjà pour cet article.' });
      }
      console.error('return create:', e.message);
      return res.status(500).json({ success: false, message: 'Demande de retour impossible.' });
    }
  }
);

module.exports = router;

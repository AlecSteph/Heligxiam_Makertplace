const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const { isMysqlEnabled } = require('../lib/mysqlPool');
const { requireAdminAuth } = require('../middleware/requireAdminAuth');
const {
  listAdminNotifications,
  countUnreadAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead
} = require('../lib/notificationsMysql');
const {
  listOnboardingBoutiquesSummaryForAdmin,
  getOnboardingBoutiqueDetailForAdmin,
  setAdminStepValidation,
  activateBoutiqueAdmin
} = require('../lib/onboardingMysql');
const {
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
} = require('../lib/adminVendeurMysql');
const {
  listOperatorThreadsForAdmin,
  getOperatorThreadForAdmin,
  postOperatorReply
} = require('../lib/operatorMessagingMysql');
const {
  listPromotionsModeration,
  approveCouponModeration,
  rejectCouponModeration,
  approveProductPromoModeration,
  rejectProductPromoModeration
} = require('../lib/adminPromotionsMysql');

const sellerUploadDir = path.join(__dirname, '..', 'uploads', 'seller-docs');

const router = express.Router();

function adminCredentialsOk(email, password) {
  const expectedEmail = (process.env.ADMIN_EMAIL || 'admin@heligxiam.com').trim().toLowerCase();
  const expectedPassword = process.env.ADMIN_PASSWORD || 'Heligxiam2026!';
  return String(email).trim().toLowerCase() === expectedEmail && String(password) === expectedPassword;
}

function signAdminToken(email) {
  return jwt.sign(
    { sub: 'admin', email, role: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
}

/**
 * POST /api/admin/login — body : { email, password }
 */
router.post('/login', express.json(), (req, res) => {
  const email = String(req.body?.email || '').trim();
  const password = String(req.body?.password || '');
  if (!adminCredentialsOk(email, password)) {
    return res.status(401).json({
      success: false,
      message: 'Identifiant ou mot de passe administrateur incorrect.'
    });
  }
  const token = signAdminToken(email);
  return res.json({
    success: true,
    message: 'Connexion administrateur réussie.',
    data: { token, email }
  });
});

router.use(requireAdminAuth);

/**
 * GET /api/admin/onboarding-boutiques
 */
router.get('/onboarding-boutiques', async (req, res) => {
  try {
    if (!isMysqlEnabled()) {
      return res.status(503).json({ success: false, message: 'MySQL requis.' });
    }
    const rows = await listOnboardingBoutiquesSummaryForAdmin();
    return res.json({ success: true, data: { rows, count: rows.length } });
  } catch (e) {
    console.error('admin onboarding list:', e.message);
    return res.status(503).json({
      success: false,
      message: 'Impossible de charger la file onboarding.'
    });
  }
});

/**
 * GET /api/admin/onboarding-boutiques/:boutiqueId — détail dossier (étapes complètes)
 */
router.get('/onboarding-boutiques/:boutiqueId', async (req, res) => {
  try {
    if (!isMysqlEnabled()) {
      return res.status(503).json({ success: false, message: 'MySQL requis.' });
    }
    const boutiqueId = Number(req.params.boutiqueId);
    if (!Number.isFinite(boutiqueId) || boutiqueId < 1) {
      return res.status(400).json({ success: false, message: 'Boutique invalide.' });
    }
    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.get('host') || 'localhost:3001';
    const apiBase = `${proto}://${host}`;
    const row = await getOnboardingBoutiqueDetailForAdmin(boutiqueId, apiBase);
    return res.json({ success: true, data: { row } });
  } catch (e) {
    if (e.code === 'BOUTIQUE_NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Boutique introuvable.' });
    }
    if (e.code === 'BOUTIQUE_ALREADY_ACTIVE') {
      return res.status(410).json({ success: false, message: 'Boutique déjà activée.' });
    }
    console.error('admin onboarding detail:', e.message);
    return res.status(503).json({
      success: false,
      message: 'Impossible de charger le dossier onboarding.'
    });
  }
});

/**
 * PATCH /api/admin/onboarding/:boutiqueId/steps/:stepId — body : { valide: boolean }
 */
router.patch('/onboarding/:boutiqueId/steps/:stepId', express.json(), async (req, res) => {
  try {
    if (!isMysqlEnabled()) {
      return res.status(503).json({ success: false, message: 'MySQL requis.' });
    }
    const boutiqueId = Number(req.params.boutiqueId);
    const stepId = String(req.params.stepId || '').trim();
    const valide = Boolean(req.body?.valide);
    if (!Number.isFinite(boutiqueId) || boutiqueId < 1) {
      return res.status(400).json({ success: false, message: 'Boutique invalide.' });
    }
    const row = await setAdminStepValidation(boutiqueId, stepId, valide);
    if (!row) {
      return res.status(404).json({ success: false, message: 'Boutique introuvable.' });
    }
    return res.json({
      success: true,
      message: valide ? 'Étape validée.' : 'Étape invalidée.',
      data: row
    });
  } catch (e) {
    if (e.code === 'INVALID_STEP') {
      return res.status(400).json({ success: false, message: 'Étape onboarding inconnue.' });
    }
    if (e.code === 'BOUTIQUE_NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Boutique introuvable.' });
    }
    console.error('admin onboarding step:', e.message);
    return res.status(503).json({ success: false, message: 'Impossible de mettre à jour l’étape.' });
  }
});

/**
 * POST /api/admin/onboarding/:boutiqueId/activate
 */
router.post('/onboarding/:boutiqueId/activate', async (req, res) => {
  try {
    if (!isMysqlEnabled()) {
      return res.status(503).json({ success: false, message: 'MySQL requis.' });
    }
    const boutiqueId = Number(req.params.boutiqueId);
    if (!Number.isFinite(boutiqueId) || boutiqueId < 1) {
      return res.status(400).json({ success: false, message: 'Boutique invalide.' });
    }
    const row = await activateBoutiqueAdmin(boutiqueId);
    return res.json({
      success: true,
      message: 'Boutique activée (statut SQL : active).',
      data: row
    });
  } catch (e) {
    if (e.code === 'STEPS_INCOMPLETE') {
      return res.status(400).json({
        success: false,
        message: 'Toutes les étapes doivent être validées avant activation.'
      });
    }
    if (e.code === 'BOUTIQUE_NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Boutique introuvable.' });
    }
    console.error('admin activate boutique:', e.message);
    return res.status(503).json({ success: false, message: 'Impossible d’activer la boutique.' });
  }
});

/**
 * GET /api/admin/notifications
 */
router.get('/notifications', async (req, res) => {
  try {
    if (!isMysqlEnabled()) {
      return res.status(503).json({ success: false, message: 'MySQL requis.' });
    }
    const [rows, unreadCount] = await Promise.all([
      listAdminNotifications(40),
      countUnreadAdminNotifications()
    ]);
    return res.json({ success: true, data: { rows, unreadCount } });
  } catch (e) {
    console.error('admin notifications list:', e.message);
    return res.status(503).json({ success: false, message: 'Impossible de charger les notifications.' });
  }
});

router.patch('/notifications/read-all', async (_req, res) => {
  try {
    if (!isMysqlEnabled()) {
      return res.status(503).json({ success: false, message: 'MySQL requis.' });
    }
    const count = await markAllAdminNotificationsRead();
    return res.json({ success: true, message: `${count} notification(s) lue(s).`, data: { count } });
  } catch (e) {
    return res.status(503).json({ success: false, message: 'Mise à jour impossible.' });
  }
});

router.patch('/notifications/:id/read', async (req, res) => {
  try {
    if (!isMysqlEnabled()) {
      return res.status(503).json({ success: false, message: 'MySQL requis.' });
    }
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id < 1) {
      return res.status(400).json({ success: false, message: 'Notification invalide.' });
    }
    await markAdminNotificationRead(id);
    const unreadCount = await countUnreadAdminNotifications();
    return res.json({ success: true, data: { unreadCount } });
  } catch (e) {
    return res.status(503).json({ success: false, message: 'Mise à jour impossible.' });
  }
});

/**
 * GET /api/admin/kyc-queue
 */
router.get('/kyc-queue', async (req, res) => {
  try {
    if (!isMysqlEnabled()) {
      return res.status(503).json({ success: false, message: 'MySQL requis.' });
    }
    const rows = await listKycQueue();
    return res.json({ success: true, data: { rows, count: rows.length } });
  } catch (e) {
    console.error('admin kyc queue:', e.message);
    return res.status(503).json({ success: false, message: 'Impossible de charger la file KYC.' });
  }
});

/**
 * PATCH /api/admin/kyc/:boutiqueId — body : { action: 'approve' | 'reject' }
 */
router.patch('/kyc/:boutiqueId', express.json(), async (req, res) => {
  try {
    if (!isMysqlEnabled()) {
      return res.status(503).json({ success: false, message: 'MySQL requis.' });
    }
    const boutiqueId = Number(req.params.boutiqueId);
    const action = String(req.body?.action || '').trim();
    if (!Number.isFinite(boutiqueId) || boutiqueId < 1) {
      return res.status(400).json({ success: false, message: 'Boutique invalide.' });
    }
    if (action === 'approve') {
      const data = await approveKyc(boutiqueId);
      return res.json({ success: true, message: 'KYC approuvé.', data });
    }
    if (action === 'reject') {
      const data = await rejectKyc(boutiqueId);
      return res.json({ success: true, message: 'KYC refusé.', data });
    }
    return res.status(400).json({ success: false, message: 'Action invalide (approve | reject).' });
  } catch (e) {
    if (e.code === 'BOUTIQUE_NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Boutique introuvable.' });
    }
    console.error('admin kyc patch:', e.message);
    return res.status(503).json({ success: false, message: 'Impossible de traiter le KYC.' });
  }
});

/**
 * GET /api/admin/sellers
 */
router.get('/sellers', async (req, res) => {
  try {
    if (!isMysqlEnabled()) {
      return res.status(503).json({ success: false, message: 'MySQL requis.' });
    }
    const rows = await listSellersDirectory();
    return res.json({ success: true, data: { rows, count: rows.length } });
  } catch (e) {
    console.error('admin sellers:', e.message);
    return res.status(503).json({ success: false, message: 'Impossible de charger l’annuaire vendeurs.' });
  }
});

/**
 * PATCH /api/admin/sellers/:vendeurId/verify-email
 */
router.patch('/sellers/:vendeurId/verify-email', async (req, res) => {
  try {
    if (!isMysqlEnabled()) {
      return res.status(503).json({ success: false, message: 'MySQL requis.' });
    }
    const vendeurId = Number(req.params.vendeurId);
    if (!Number.isFinite(vendeurId) || vendeurId < 1) {
      return res.status(400).json({ success: false, message: 'Vendeur invalide.' });
    }
    const data = await adminVerifyEmail(vendeurId);
    return res.json({ success: true, message: 'E-mail marqué vérifié.', data });
  } catch (e) {
    if (e.code === 'VENDEUR_NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Vendeur introuvable.' });
    }
    console.error('admin verify email:', e.message);
    return res.status(503).json({ success: false, message: 'Impossible de valider l’e-mail.' });
  }
});

/**
 * PATCH /api/admin/sellers/:vendeurId/verify-phone
 */
router.patch('/sellers/:vendeurId/verify-phone', async (req, res) => {
  try {
    if (!isMysqlEnabled()) {
      return res.status(503).json({ success: false, message: 'MySQL requis.' });
    }
    const vendeurId = Number(req.params.vendeurId);
    if (!Number.isFinite(vendeurId) || vendeurId < 1) {
      return res.status(400).json({ success: false, message: 'Vendeur invalide.' });
    }
    const data = await adminVerifyPhone(vendeurId);
    return res.json({ success: true, message: 'Téléphone marqué vérifié.', data });
  } catch (e) {
    if (e.code === 'VENDEUR_NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Vendeur introuvable.' });
    }
    console.error('admin verify phone:', e.message);
    return res.status(503).json({ success: false, message: 'Impossible de valider le téléphone.' });
  }
});

/**
 * GET /api/admin/products-moderation
 */
router.get('/products-moderation', async (req, res) => {
  try {
    if (!isMysqlEnabled()) {
      return res.status(503).json({ success: false, message: 'MySQL requis.' });
    }
    const rows = await listProductsModeration();
    return res.json({ success: true, data: { rows, count: rows.length } });
  } catch (e) {
    console.error('admin products moderation:', e.message);
    return res.status(503).json({ success: false, message: 'Impossible de charger la modération produits.' });
  }
});

/**
 * PATCH /api/admin/products-moderation/:productId — body : { action: 'approve' | 'reject' }
 */
router.patch('/products-moderation/:productId', express.json(), async (req, res) => {
  try {
    if (!isMysqlEnabled()) {
      return res.status(503).json({ success: false, message: 'MySQL requis.' });
    }
    const productId = Number(req.params.productId);
    const action = String(req.body?.action || '').trim();
    if (!Number.isFinite(productId) || productId < 1) {
      return res.status(400).json({ success: false, message: 'Produit invalide.' });
    }
    if (action === 'approve') {
      const data = await approveProductModeration(productId);
      return res.json({ success: true, message: 'Produit publié.', data });
    }
    if (action === 'reject') {
      const motif = String(req.body?.motif || req.body?.reason || '').trim();
      const data = await rejectProductModeration(productId, motif);
      return res.json({ success: true, message: 'Produit retiré.', data });
    }
    return res.status(400).json({ success: false, message: 'Action invalide (approve | reject).' });
  } catch (e) {
    if (e.code === 'PRODUCT_NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Produit introuvable.' });
    }
    console.error('admin product moderation patch:', e.message);
    return res.status(503).json({ success: false, message: 'Impossible de modérer le produit.' });
  }
});

/**
 * GET /api/admin/promotions-moderation — coupons & promos produits en attente
 */
router.get('/promotions-moderation', async (req, res) => {
  try {
    if (!isMysqlEnabled()) {
      return res.status(503).json({ success: false, message: 'MySQL requis.' });
    }
    const rows = await listPromotionsModeration();
    return res.json({ success: true, data: { rows, count: rows.length } });
  } catch (e) {
    console.error('admin promotions moderation:', e.message);
    return res.status(503).json({ success: false, message: 'Impossible de charger les promotions à valider.' });
  }
});

/**
 * PATCH /api/admin/promotions-moderation/coupons/:couponId — { action: approve|reject, motif? }
 */
router.patch('/promotions-moderation/coupons/:couponId', express.json(), async (req, res) => {
  try {
    if (!isMysqlEnabled()) {
      return res.status(503).json({ success: false, message: 'MySQL requis.' });
    }
    const couponId = Number(req.params.couponId);
    const action = String(req.body?.action || '').trim();
    const motif = String(req.body?.motif || req.body?.reason || '').trim();
    if (!Number.isFinite(couponId) || couponId < 1) {
      return res.status(400).json({ success: false, message: 'Coupon invalide.' });
    }
    if (action === 'approve') {
      const data = await approveCouponModeration(couponId);
      return res.json({ success: true, message: `Coupon « ${data.code} » approuvé.`, data });
    }
    if (action === 'reject') {
      const data = await rejectCouponModeration(couponId, motif);
      return res.json({ success: true, message: 'Coupon refusé.', data });
    }
    return res.status(400).json({ success: false, message: 'Action invalide (approve | reject).' });
  } catch (e) {
    if (e.code === 'NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Coupon introuvable ou déjà traité.' });
    }
    console.error('admin coupon moderation:', e.message);
    return res.status(503).json({ success: false, message: 'Impossible de modérer le coupon.' });
  }
});

/**
 * PATCH /api/admin/promotions-moderation/products/:promoId — { action: approve|reject, motif? }
 */
router.patch('/promotions-moderation/products/:promoId', express.json(), async (req, res) => {
  try {
    if (!isMysqlEnabled()) {
      return res.status(503).json({ success: false, message: 'MySQL requis.' });
    }
    const promoId = Number(req.params.promoId);
    const action = String(req.body?.action || '').trim();
    const motif = String(req.body?.motif || req.body?.reason || '').trim();
    if (!Number.isFinite(promoId) || promoId < 1) {
      return res.status(400).json({ success: false, message: 'Promotion invalide.' });
    }
    if (action === 'approve') {
      const data = await approveProductPromoModeration(promoId);
      return res.json({ success: true, message: 'Promotion produit approuvée.', data });
    }
    if (action === 'reject') {
      const data = await rejectProductPromoModeration(promoId, motif);
      return res.json({ success: true, message: 'Promotion refusée.', data });
    }
    return res.status(400).json({ success: false, message: 'Action invalide (approve | reject).' });
  } catch (e) {
    if (e.code === 'NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Promotion introuvable ou déjà traitée.' });
    }
    console.error('admin product promo moderation:', e.message);
    return res.status(503).json({ success: false, message: 'Impossible de modérer la promotion.' });
  }
});

/**
 * GET /api/admin/operator-threads — fils messagerie vendeur ↔ opérateur
 */
router.get('/operator-threads', async (req, res) => {
  try {
    if (!isMysqlEnabled()) {
      return res.status(503).json({ success: false, message: 'MySQL requis.' });
    }
    const rows = await listOperatorThreadsForAdmin();
    const needsReplyCount = rows.filter((r) => r.needsReply).length;
    return res.json({ success: true, data: { rows, count: rows.length, needsReplyCount } });
  } catch (e) {
    console.error('admin operator threads:', e.message);
    return res.status(503).json({ success: false, message: 'Impossible de charger la messagerie vendeur.' });
  }
});

router.get('/operator-threads/:ticketId', async (req, res) => {
  try {
    if (!isMysqlEnabled()) {
      return res.status(503).json({ success: false, message: 'MySQL requis.' });
    }
    const ticketId = Number(req.params.ticketId);
    if (!Number.isFinite(ticketId) || ticketId < 1) {
      return res.status(400).json({ success: false, message: 'Ticket invalide.' });
    }
    const thread = await getOperatorThreadForAdmin(ticketId);
    return res.json({ success: true, data: { thread } });
  } catch (e) {
    if (e.code === 'TICKET_NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Conversation introuvable.' });
    }
    console.error('admin operator thread:', e.message);
    return res.status(503).json({ success: false, message: 'Impossible de charger la conversation.' });
  }
});

router.post('/operator-threads/:ticketId/messages', express.json(), async (req, res) => {
  try {
    if (!isMysqlEnabled()) {
      return res.status(503).json({ success: false, message: 'MySQL requis.' });
    }
    const ticketId = Number(req.params.ticketId);
    const body = String(req.body?.body || '').trim();
    if (!Number.isFinite(ticketId) || ticketId < 1) {
      return res.status(400).json({ success: false, message: 'Ticket invalide.' });
    }
    if (!body) {
      return res.status(400).json({ success: false, message: 'Message vide.' });
    }
    const thread = await postOperatorReply(ticketId, body);
    return res.status(201).json({ success: true, message: 'Réponse envoyée au vendeur.', data: { thread } });
  } catch (e) {
    if (e.code === 'TICKET_NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Conversation introuvable.' });
    }
    console.error('admin operator reply:', e.message);
    return res.status(503).json({ success: false, message: 'Impossible d’envoyer la réponse.' });
  }
});

/**
 * GET /api/admin/vendor-returns
 */
router.get('/vendor-returns', async (req, res) => {
  try {
    if (!isMysqlEnabled()) {
      return res.status(503).json({ success: false, message: 'MySQL requis.' });
    }
    const rows = await listVendorReturns();
    return res.json({ success: true, data: { rows, count: rows.length } });
  } catch (e) {
    console.error('admin vendor returns:', e.message);
    return res.status(503).json({ success: false, message: 'Impossible de charger les retours vendeur.' });
  }
});

/**
 * GET /api/admin/vendor-tickets
 */
router.get('/vendor-tickets', async (req, res) => {
  try {
    if (!isMysqlEnabled()) {
      return res.status(503).json({ success: false, message: 'MySQL requis.' });
    }
    const rows = await listVendorTickets();
    return res.json({ success: true, data: { rows, count: rows.length } });
  } catch (e) {
    console.error('admin vendor tickets:', e.message);
    return res.status(503).json({ success: false, message: 'Impossible de charger les tickets vendeur.' });
  }
});

/**
 * POST /api/admin/sellers/recalculate-health — body : critères de pondération (optionnel)
 */
router.post('/sellers/recalculate-health', express.json(), async (req, res) => {
  try {
    if (!isMysqlEnabled()) {
      return res.status(503).json({ success: false, message: 'MySQL requis.' });
    }
    const rows = await recalculateAllSante(req.body || {});
    return res.json({
      success: true,
      message: 'Scores santé recalculés et enregistrés.',
      data: { rows, count: rows.length }
    });
  } catch (e) {
    console.error('admin recalculate health:', e.message);
    return res.status(503).json({ success: false, message: 'Impossible de recalculer la santé compte.' });
  }
});

/**
 * GET /api/admin/files/:filename — accès KYC pour opérateur
 */
router.get('/files/:filename', (req, res) => {
  const filename = path.basename(String(req.params.filename || ''));
  if (!filename || filename.includes('..')) {
    return res.status(400).json({ success: false, message: 'Fichier invalide.' });
  }
  const filePath = path.join(sellerUploadDir, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'Fichier introuvable.' });
  }
  return res.sendFile(filePath);
});

module.exports = { router };

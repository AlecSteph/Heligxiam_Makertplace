const { getMysqlPool } = require('./mysqlPool');

const ONBOARDING_STEP_LABELS = {
  plan: "Plan d'abonnement",
  docs: 'Documents KYC',
  profile: 'Profil boutique',
  shipping: 'Frais de livraison',
  payout: 'Compte bancaire'
};

let tablesEnsured = false;

async function ensureNotificationTables(pool) {
  if (tablesEnsured) return;
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS notifications_operateur (
        identifiant BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        identifiant_operateur BIGINT UNSIGNED NULL,
        type VARCHAR(32) NOT NULL,
        titre VARCHAR(255) NOT NULL,
        texte TEXT NULL,
        type_reference VARCHAR(32) NULL,
        identifiant_reference BIGINT NULL,
        lue TINYINT(1) NOT NULL DEFAULT 0,
        date_creation DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (identifiant),
        KEY idx_notif_op_lue (identifiant_operateur, lue, date_creation)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    tablesEnsured = true;
  } catch (e) {
    console.warn('ensureNotificationTables:', e.message);
  }
}

async function getBoutiqueLabel(pool, boutiqueId) {
  const [rows] = await pool.execute(
    `SELECT COALESCE(nom_affichage, raison_sociale) AS name
     FROM boutiques WHERE identifiant = ? LIMIT 1`,
    [boutiqueId]
  );
  return rows[0]?.name || `Boutique #${boutiqueId}`;
}

async function notifySeller(boutiqueId, { type, titre, texte, refType = null, refId = null }) {
  const pool = getMysqlPool();
  await pool.execute(
    `INSERT INTO notifications_vendeur
       (identifiant_boutique, type, titre, texte, type_reference, identifiant_reference)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [boutiqueId, type, String(titre).slice(0, 255), texte || null, refType, refId]
  );
}

async function notifyAdmin({ type, titre, texte, refType = null, refId = null, operateurId = null }) {
  const pool = getMysqlPool();
  await ensureNotificationTables(pool);
  await pool.execute(
    `INSERT INTO notifications_operateur
       (identifiant_operateur, type, titre, texte, type_reference, identifiant_reference)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [operateurId, type, String(titre).slice(0, 255), texte || null, refType, refId]
  );
}

async function notifyAdminOnboardingStepSubmitted(boutiqueId, stepId) {
  const pool = getMysqlPool();
  const shop = await getBoutiqueLabel(pool, boutiqueId);
  const label = ONBOARDING_STEP_LABELS[stepId] || stepId;
  await notifyAdmin({
    type: 'onboarding',
    titre: `Onboarding — ${shop}`,
    texte: `Le vendeur a soumis l'étape « ${label} ». Votre validation est requise.`,
    refType: 'onboarding',
    refId: boutiqueId
  });
}

async function notifySellerOnboardingStepReviewed(boutiqueId, stepId, valide) {
  const label = ONBOARDING_STEP_LABELS[stepId] || stepId;
  if (valide) {
    await notifySeller(boutiqueId, {
      type: 'onboarding',
      titre: 'Étape validée',
      texte: `Votre étape « ${label} » a été validée par l'équipe HELIGXIAM.`,
      refType: 'onboarding',
      refId: null
    });
  } else {
    await notifySeller(boutiqueId, {
      type: 'action_requise',
      titre: 'Correction requise — onboarding',
      texte: `L'étape « ${label} » doit être corrigée ou resoumise depuis votre espace vendeur.`,
      refType: 'onboarding',
      refId: null
    });
  }
}

async function notifyAdminKycSubmitted(boutiqueId) {
  const pool = getMysqlPool();
  const shop = await getBoutiqueLabel(pool, boutiqueId);
  await notifyAdmin({
    type: 'kyc',
    titre: `KYC — ${shop}`,
    texte: 'Nouveaux documents KYC déposés (Kbis, CNI, RIB). Contrôle requis.',
    refType: 'kyc',
    refId: boutiqueId
  });
}

async function notifySellerKycResult(boutiqueId, approved) {
  if (approved) {
    await notifySeller(boutiqueId, {
      type: 'kyc',
      titre: 'Documents KYC validés',
      texte: 'Vos documents ont été approuvés. Poursuivez l’activation de votre boutique.',
      refType: 'kyc',
      refId: null
    });
  } else {
    await notifySeller(boutiqueId, {
      type: 'action_requise',
      titre: 'Documents KYC refusés',
      texte: 'Un ou plusieurs documents ont été refusés. Téléversez de nouvelles pièces conformes.',
      refType: 'kyc',
      refId: null
    });
  }
}

async function notifyAdminProductSubmitted(boutiqueId, productId, productTitle) {
  const pool = getMysqlPool();
  const shop = await getBoutiqueLabel(pool, boutiqueId);
  await notifyAdmin({
    type: 'moderation',
    titre: `Modération produit — ${shop}`,
    texte: `« ${productTitle} » est en attente de modération.`,
    refType: 'product',
    refId: productId
  });
}

async function notifyAdminPromotionSubmitted(boutiqueId, kind, refId, label) {
  const pool = getMysqlPool();
  const shop = await getBoutiqueLabel(pool, boutiqueId);
  const isCoupon = kind === 'coupon';
  await notifyAdmin({
    type: 'promotion',
    titre: isCoupon ? `Coupon à valider — ${shop}` : `Promotion produit — ${shop}`,
    texte: isCoupon
      ? `Le vendeur a soumis le coupon « ${label} ». Validation requise avant mise en ligne.`
      : `Le vendeur a soumis une promotion sur « ${label} ». Validation requise.`,
    refType: isCoupon ? 'coupon' : 'product_promo',
    refId
  });
}

async function notifySellerPromotionReviewed(boutiqueId, kind, refId, label, approved, motif) {
  const isCoupon = kind === 'coupon';
  if (approved) {
    await notifySeller(boutiqueId, {
      type: 'promotion',
      titre: isCoupon ? 'Coupon approuvé' : 'Promotion approuvée',
      texte: isCoupon
        ? `Votre coupon « ${label} » est actif et utilisable par vos clients.`
        : `Votre promotion sur « ${label} » est en ligne sur la marketplace.`,
      refType: isCoupon ? 'coupon' : 'product_promo',
      refId
    });
  } else {
    await notifySeller(boutiqueId, {
      type: 'action_requise',
      titre: isCoupon ? 'Coupon refusé' : 'Promotion refusée',
      texte: isCoupon
        ? `Le coupon « ${label} » a été refusé${motif ? ` : ${motif}` : ''}. Modifiez-le ou créez-en un nouveau.`
        : `La promotion sur « ${label} » a été refusée${motif ? ` : ${motif}` : ''}.`,
      refType: isCoupon ? 'coupon' : 'product_promo',
      refId
    });
  }
}

async function notifySellerProductModeration(boutiqueId, productId, productTitle, approved, motif) {
  if (approved) {
    await notifySeller(boutiqueId, {
      type: 'moderation',
      titre: 'Produit publié',
      texte: `« ${productTitle} » a été approuvé et est visible sur la marketplace.`,
      refType: 'product',
      refId: productId
    });
  } else {
    await notifySeller(boutiqueId, {
      type: 'action_requise',
      titre: 'Produit refusé',
      texte: `« ${productTitle} » a été refusé${motif ? ` : ${motif}` : ''}. Corrigez la fiche et republiez.`,
      refType: 'product',
      refId: productId
    });
  }
}

async function notifyAdminSellerMessage(boutiqueId, ticketId) {
  const pool = getMysqlPool();
  const shop = await getBoutiqueLabel(pool, boutiqueId);
  await notifyAdmin({
    type: 'message',
    titre: `Message vendeur — ${shop}`,
    texte: 'Un vendeur a envoyé un message sur le fil opérateur. Réponse attendue.',
    refType: 'ticket',
    refId: ticketId
  });
}

async function notifySellerOperatorReply(boutiqueId, ticketId, preview) {
  const text = String(preview || '').trim();
  await notifySeller(boutiqueId, {
    type: 'message',
    titre: 'Réponse HELIGXIAM',
    texte: text.length > 180 ? `${text.slice(0, 177)}…` : text || 'L’équipe opérateur vous a répondu.',
    refType: 'ticket',
    refId: ticketId
  });
}

async function notifySellerBoutiqueActivated(boutiqueId) {
  await notifySeller(boutiqueId, {
    type: 'onboarding',
    titre: 'Boutique activée',
    texte: 'Félicitations ! Votre boutique est active. Vous pouvez vendre sur HELIGXIAM.',
    refType: 'onboarding',
    refId: null
  });
}

function formatFrDateTime(d) {
  if (!d) return '—';
  const dt = d instanceof Date ? d : new Date(d);
  return dt.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

async function listSellerNotifications(boutiqueId, limit = 30) {
  const pool = getMysqlPool();
  const lim = Math.min(Math.max(Number(limit) || 30, 1), 100);
  const [rows] = await pool.execute(
    `SELECT identifiant, type, titre, texte, date_lecture, type_reference, identifiant_reference, date_creation
     FROM notifications_vendeur
     WHERE identifiant_boutique = ?
     ORDER BY date_creation DESC
     LIMIT ${lim}`,
    [boutiqueId]
  );
  return rows.map((n) => ({
    id: Number(n.identifiant),
    type: n.type,
    title: n.titre,
    text: n.texte || '',
    read: Boolean(n.date_lecture),
    refType: n.type_reference,
    refId: n.identifiant_reference ? Number(n.identifiant_reference) : null,
    time: formatFrDateTime(n.date_creation)
  }));
}

async function countUnreadSellerNotifications(boutiqueId) {
  const pool = getMysqlPool();
  const [[row]] = await pool.execute(
    `SELECT COUNT(*) AS n FROM notifications_vendeur
     WHERE identifiant_boutique = ? AND date_lecture IS NULL`,
    [boutiqueId]
  );
  return Number(row?.n || 0);
}

async function markSellerNotificationRead(boutiqueId, notificationId) {
  const pool = getMysqlPool();
  await pool.execute(
    `UPDATE notifications_vendeur SET date_lecture = NOW(6)
     WHERE identifiant = ? AND identifiant_boutique = ? AND date_lecture IS NULL`,
    [notificationId, boutiqueId]
  );
}

async function markAllSellerNotificationsRead(boutiqueId) {
  const pool = getMysqlPool();
  const [result] = await pool.execute(
    `UPDATE notifications_vendeur SET date_lecture = NOW(6)
     WHERE identifiant_boutique = ? AND date_lecture IS NULL`,
    [boutiqueId]
  );
  return result.affectedRows || 0;
}

async function listAdminNotifications(limit = 40) {
  const pool = getMysqlPool();
  await ensureNotificationTables(pool);
  const lim = Math.min(Math.max(Number(limit) || 40, 1), 100);
  const [rows] = await pool.execute(
    `SELECT identifiant, type, titre, texte, lue, type_reference, identifiant_reference, date_creation
     FROM notifications_operateur
     WHERE identifiant_operateur IS NULL
     ORDER BY date_creation DESC
     LIMIT ${lim}`
  );
  return rows.map((n) => ({
    id: Number(n.identifiant),
    type: n.type,
    title: n.titre,
    text: n.texte || '',
    read: Boolean(n.lue),
    refType: n.type_reference,
    refId: n.identifiant_reference ? Number(n.identifiant_reference) : null,
    time: formatFrDateTime(n.date_creation)
  }));
}

async function countUnreadAdminNotifications() {
  const pool = getMysqlPool();
  await ensureNotificationTables(pool);
  const [[row]] = await pool.execute(
    `SELECT COUNT(*) AS n FROM notifications_operateur
     WHERE identifiant_operateur IS NULL AND lue = 0`
  );
  return Number(row?.n || 0);
}

async function markAdminNotificationRead(notificationId) {
  const pool = getMysqlPool();
  await ensureNotificationTables(pool);
  await pool.execute(
    `UPDATE notifications_operateur SET lue = 1
     WHERE identifiant = ? AND identifiant_operateur IS NULL`,
    [notificationId]
  );
}

async function markAllAdminNotificationsRead() {
  const pool = getMysqlPool();
  await ensureNotificationTables(pool);
  const [result] = await pool.execute(
    `UPDATE notifications_operateur SET lue = 1
     WHERE identifiant_operateur IS NULL AND lue = 0`
  );
  return result.affectedRows || 0;
}

module.exports = {
  notifySeller,
  notifyAdmin,
  notifyAdminOnboardingStepSubmitted,
  notifySellerOnboardingStepReviewed,
  notifyAdminKycSubmitted,
  notifySellerKycResult,
  notifyAdminProductSubmitted,
  notifyAdminPromotionSubmitted,
  notifySellerPromotionReviewed,
  notifySellerProductModeration,
  notifyAdminSellerMessage,
  notifySellerOperatorReply,
  notifySellerBoutiqueActivated,
  listSellerNotifications,
  countUnreadSellerNotifications,
  markSellerNotificationRead,
  markAllSellerNotificationsRead,
  listAdminNotifications,
  countUnreadAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead
};

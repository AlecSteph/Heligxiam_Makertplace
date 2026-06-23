const { getMysqlPool } = require('./mysqlPool');
const { notifySellerOperatorReply } = require('./notificationsMysql');

const RUBRIQUE_LIGNE_OPERATEUR = 'ligne_operateur';

function formatDt(d) {
  if (!d) return '—';
  const dt = d instanceof Date ? d : new Date(d);
  return dt.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

function mapMessageRow(r) {
  return {
    id: `msg-${r.identifiant}`,
    from: r.expediteur === 'operateur' || r.expediteur === 'systeme' ? r.expediteur : 'vendeur',
    body: r.contenu,
    at: formatDt(r.date_envoi)
  };
}

async function listMessagesForTicket(ticketId) {
  const pool = getMysqlPool();
  const [rows] = await pool.execute(
    `SELECT identifiant, expediteur, contenu, date_envoi
     FROM messages_ticket_support_vendeur
     WHERE identifiant_ticket = ?
     ORDER BY date_envoi ASC`,
    [ticketId]
  );
  return rows.map(mapMessageRow);
}

async function listOperatorThreadsForAdmin() {
  const pool = getMysqlPool();
  const [rows] = await pool.execute(
    `SELECT t.identifiant AS ticketId,
            t.identifiant_boutique AS boutiqueId,
            t.identifiant_vendeur AS vendeurId,
            t.sujet, t.statut, t.date_creation,
            COALESCE(b.nom_affichage, b.raison_sociale, CONCAT('Boutique #', t.identifiant_boutique)) AS shopName,
            c.courriel AS sellerEmail
     FROM tickets_support_vendeur t
     LEFT JOIN boutiques b ON b.identifiant = t.identifiant_boutique
     LEFT JOIN comptes_vendeur c ON c.identifiant = t.identifiant_vendeur
     WHERE t.rubrique = ?
     ORDER BY t.date_creation DESC
     LIMIT 100`,
    [RUBRIQUE_LIGNE_OPERATEUR]
  );

  const out = [];
  for (const r of rows) {
    const ticketId = Number(r.ticketId);
    const [lastRows] = await pool.execute(
      `SELECT expediteur, contenu, date_envoi FROM messages_ticket_support_vendeur
       WHERE identifiant_ticket = ? ORDER BY date_envoi DESC LIMIT 1`,
      [ticketId]
    );
    const lm = lastRows[0];
    out.push({
      ticketId,
      boutiqueId: r.boutiqueId ? Number(r.boutiqueId) : null,
      vendeurId: Number(r.vendeurId),
      shopName: r.shopName,
      sellerEmail: r.sellerEmail || '—',
      subject: r.sujet,
      status: r.statut,
      needsReply: lm ? lm.expediteur === 'vendeur' : false,
      lastMessage: lm?.contenu ? String(lm.contenu).slice(0, 120) : '',
      lastFrom: lm?.expediteur || null,
      lastAt: lm ? formatDt(lm.date_envoi) : formatDt(r.date_creation)
    });
  }

  out.sort((a, b) => {
    if (a.needsReply !== b.needsReply) return a.needsReply ? -1 : 1;
    return 0;
  });

  return out;
}

async function getOperatorThreadForAdmin(ticketId) {
  const pool = getMysqlPool();
  const [rows] = await pool.execute(
    `SELECT t.identifiant, t.identifiant_boutique, t.identifiant_vendeur, t.sujet, t.statut, t.date_creation,
            COALESCE(b.nom_affichage, b.raison_sociale) AS shopName,
            c.courriel AS sellerEmail
     FROM tickets_support_vendeur t
     LEFT JOIN boutiques b ON b.identifiant = t.identifiant_boutique
     LEFT JOIN comptes_vendeur c ON c.identifiant = t.identifiant_vendeur
     WHERE t.identifiant = ? AND t.rubrique = ?
     LIMIT 1`,
    [ticketId, RUBRIQUE_LIGNE_OPERATEUR]
  );
  const row = rows[0];
  if (!row) {
    const err = new Error('TICKET_NOT_FOUND');
    err.code = 'TICKET_NOT_FOUND';
    throw err;
  }

  const messages = await listMessagesForTicket(ticketId);
  const last = messages[messages.length - 1];

  return {
    ticketId: Number(row.identifiant),
    boutiqueId: row.identifiant_boutique ? Number(row.identifiant_boutique) : null,
    vendeurId: Number(row.identifiant_vendeur),
    shopName: row.shopName || `Boutique #${row.identifiant_boutique || '?'}`,
    sellerEmail: row.sellerEmail || '—',
    subject: row.sujet,
    status: row.statut,
    needsReply: last ? last.from === 'vendeur' : false,
    messages
  };
}

async function postOperatorReply(ticketId, body) {
  const contenu = String(body || '').trim();
  if (!contenu) {
    const err = new Error('MESSAGE_EMPTY');
    err.code = 'MESSAGE_EMPTY';
    throw err;
  }

  const pool = getMysqlPool();
  const thread = await getOperatorThreadForAdmin(ticketId);

  await pool.execute(
    `INSERT INTO messages_ticket_support_vendeur (identifiant_ticket, expediteur, contenu)
     VALUES (?, 'operateur', ?)`,
    [ticketId, contenu]
  );

  await pool.execute(
    `UPDATE tickets_support_vendeur SET statut = 'en_cours' WHERE identifiant = ?`,
    [ticketId]
  );

  if (thread.boutiqueId) {
    try {
      await notifySellerOperatorReply(thread.boutiqueId, ticketId, contenu);
    } catch (e) {
      console.warn('notify seller operator reply:', e.message);
    }
  }

  return getOperatorThreadForAdmin(ticketId);
}

module.exports = {
  RUBRIQUE_LIGNE_OPERATEUR,
  listOperatorThreadsForAdmin,
  getOperatorThreadForAdmin,
  postOperatorReply
};

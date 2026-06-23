const { getMysqlPool } = require('./mysqlPool');

function parseJson(val) {
  if (!val) return {};
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return {};
  }
}

function formatFrDate(d) {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  return dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

async function getSellerProfile(boutiqueId, vendeurId) {
  const pool = getMysqlPool();
  const [rows] = await pool.execute(
    `SELECT p.url_photo, p.biographie, p.poste_ou_fonction, p.site_web, p.langue_interface, p.fuseau_horaire,
            p.courriel_verifie, p.telephone_verifie, p.adresse_ligne1, p.adresse_ligne2, p.ville, p.code_postal, p.code_pays,
            p.preferences_json, p.version_cgu_acceptee, p.date_acceptation_cgu, p.version_chartes_donnees,
            p.date_acceptation_charte_donnees, p.profil_complet, c.courriel, c.telephone
     FROM profils_vendeur p
     JOIN comptes_vendeur c ON c.identifiant = p.identifiant_vendeur
     WHERE p.identifiant_vendeur = ? LIMIT 1`,
    [vendeurId]
  );
  const row = rows[0];
  if (!row) return null;
  const prefs = parseJson(row.preferences_json);
  return {
    urlPhoto: row.url_photo || '',
    biographie: row.biographie || '',
    posteOuFonction: row.poste_ou_fonction || '',
    siteWeb: row.site_web || '',
    langueInterface: row.langue_interface || 'fr',
    fuseauHoraire: row.fuseau_horaire || 'Europe/Paris',
    courrielVerifie: Boolean(row.courriel_verifie),
    telephoneVerifie: Boolean(row.telephone_verifie),
    adresseLigne1: row.adresse_ligne1 || '',
    adresseLigne2: row.adresse_ligne2 || '',
    ville: row.ville || '',
    codePostal: row.code_postal || '',
    codePays: row.code_pays || 'FR',
    notifCommande: prefs.notifCommande !== false,
    notifPromo: Boolean(prefs.notifPromo),
    notifSmsUrgent: prefs.notifSmsUrgent !== false,
    accepteCgu: Boolean(row.date_acceptation_cgu),
    dateAcceptationCgu: row.date_acceptation_cgu ? formatFrDate(row.date_acceptation_cgu) : '',
    accepteDonnees: Boolean(row.date_acceptation_charte_donnees),
    dateAcceptationDonnees: row.date_acceptation_charte_donnees ? formatFrDate(row.date_acceptation_charte_donnees) : '',
    profilComplet: Boolean(row.profil_complet),
    email: row.courriel || '',
    telephone: row.telephone || ''
  };
}

async function updateSellerProfile(vendeurId, body) {
  const pool = getMysqlPool();
  const [existing] = await pool.execute(
    `SELECT preferences_json FROM profils_vendeur WHERE identifiant_vendeur = ? LIMIT 1`,
    [vendeurId]
  );
  const prefs = parseJson(existing[0]?.preferences_json);
  prefs.notifCommande = body.notifCommande !== false;
  prefs.notifPromo = Boolean(body.notifPromo);
  prefs.notifSmsUrgent = body.notifSmsUrgent !== false;

  const profilComplet = Boolean(
    String(body.adresseLigne1 || '').trim() &&
      String(body.ville || '').trim() &&
      String(body.codePostal || '').trim() &&
      String(body.biographie || '').trim()
  );

  await pool.execute(
    `UPDATE profils_vendeur SET
      url_photo = ?, biographie = ?, poste_ou_fonction = ?, site_web = ?,
      langue_interface = ?, fuseau_horaire = ?,
      adresse_ligne1 = ?, adresse_ligne2 = ?, ville = ?, code_postal = ?, code_pays = ?,
      preferences_json = ?, profil_complet = ?
     WHERE identifiant_vendeur = ?`,
    [
      String(body.urlPhoto || '').trim() || null,
      String(body.biographie || '').trim() || null,
      String(body.posteOuFonction || '').trim() || null,
      String(body.siteWeb || '').trim() || null,
      String(body.langueInterface || 'fr').slice(0, 8),
      String(body.fuseauHoraire || 'Europe/Paris').slice(0, 64),
      String(body.adresseLigne1 || '').trim() || null,
      String(body.adresseLigne2 || '').trim() || null,
      String(body.ville || '').trim() || null,
      String(body.codePostal || '').trim() || null,
      String(body.codePays || 'FR').slice(0, 2),
      JSON.stringify(prefs),
      profilComplet ? 1 : 0,
      vendeurId
    ]
  );

  if (body.telephone != null) {
    await pool.execute(`UPDATE comptes_vendeur SET telephone = ? WHERE identifiant = ?`, [
      String(body.telephone).trim().slice(0, 32) || null,
      vendeurId
    ]);
  }

  return getSellerProfile(null, vendeurId);
}

async function getStoreSettings(boutiqueId, vendeurId) {
  const pool = getMysqlPool();
  const [rows] = await pool.execute(
    `SELECT b.raison_sociale, b.nom_affichage, b.siret, b.numero_tva, b.retours_auto_acceptes,
            c.courriel, c.telephone, p.langue_interface, p.preferences_json
     FROM boutiques b
     JOIN comptes_vendeur c ON c.identifiant = b.identifiant_vendeur
     LEFT JOIN profils_vendeur p ON p.identifiant_vendeur = c.identifiant
     WHERE b.identifiant = ? AND b.identifiant_vendeur = ? LIMIT 1`,
    [boutiqueId, vendeurId]
  );
  const row = rows[0];
  if (!row) return null;
  const prefs = parseJson(row.preferences_json);
  return {
    name: row.raison_sociale || '',
    displayName: row.nom_affichage || '',
    language: row.langue_interface || 'fr',
    currency: prefs.currency || 'EUR',
    vat: row.numero_tva || '',
    siret: row.siret || '',
    email: row.courriel || '',
    phone: row.telephone || '',
    autoAcceptReturns: Boolean(row.retours_auto_acceptes),
    lowStockAlerts: prefs.lowStockAlerts !== false,
    weeklyReport: Boolean(prefs.weeklyReport),
    smsNotifications: Boolean(prefs.smsNotifications)
  };
}

async function updateStoreSettings(boutiqueId, vendeurId, body) {
  const pool = getMysqlPool();
  const [existing] = await pool.execute(
    `SELECT p.preferences_json FROM profils_vendeur p WHERE p.identifiant_vendeur = ? LIMIT 1`,
    [vendeurId]
  );
  const prefs = parseJson(existing[0]?.preferences_json);
  prefs.lowStockAlerts = body.lowStockAlerts !== false;
  prefs.weeklyReport = Boolean(body.weeklyReport);
  prefs.smsNotifications = Boolean(body.smsNotifications);
  if (body.currency) prefs.currency = String(body.currency).slice(0, 3);

  await pool.execute(
    `UPDATE boutiques SET raison_sociale = ?, nom_affichage = ?, siret = ?, numero_tva = ?, retours_auto_acceptes = ?
     WHERE identifiant = ? AND identifiant_vendeur = ?`,
    [
      String(body.name || '').trim().slice(0, 255),
      String(body.displayName || '').trim().slice(0, 255) || null,
      String(body.siret || '').trim().slice(0, 32) || null,
      String(body.vat || '').trim().slice(0, 32) || null,
      body.autoAcceptReturns ? 1 : 0,
      boutiqueId,
      vendeurId
    ]
  );

  await pool.execute(
    `UPDATE comptes_vendeur SET courriel = ?, telephone = ? WHERE identifiant = ?`,
    [
      String(body.email || '').trim().slice(0, 255),
      String(body.phone || '').trim().slice(0, 32) || null,
      vendeurId
    ]
  );

  if (body.language) {
    await pool.execute(`UPDATE profils_vendeur SET langue_interface = ?, preferences_json = ? WHERE identifiant_vendeur = ?`, [
      String(body.language).slice(0, 8),
      JSON.stringify(prefs),
      vendeurId
    ]);
  } else {
    await pool.execute(`UPDATE profils_vendeur SET preferences_json = ? WHERE identifiant_vendeur = ?`, [
      JSON.stringify(prefs),
      vendeurId
    ]);
  }

  return getStoreSettings(boutiqueId, vendeurId);
}

async function getRelectureHistory(vendeurId) {
  const pool = getMysqlPool();
  const [rows] = await pool.execute(
    `SELECT type_relecture, date_action FROM historique_relectures_profil
     WHERE identifiant_vendeur = ? ORDER BY date_action DESC LIMIT 20`,
    [vendeurId]
  );
  return rows.map((r) => ({
    type: r.type_relecture,
    date: formatFrDate(r.date_action)
  }));
}

async function addRelectureDonnees(vendeurId, type = 'Confirmation de relecture (RGPD)') {
  const pool = getMysqlPool();
  await pool.execute(
    `INSERT INTO historique_relectures_profil (identifiant_vendeur, type_relecture) VALUES (?, ?)`,
    [vendeurId, type.slice(0, 64)]
  );
  return getRelectureHistory(vendeurId);
}

async function sendVerifyEmail(vendeurId) {
  const pool = getMysqlPool();
  await pool.execute(
    `UPDATE profils_vendeur SET
      jeton_verification_courriel_expiration = DATE_ADD(NOW(6), INTERVAL 24 HOUR)
     WHERE identifiant_vendeur = ?`,
    [vendeurId]
  );
  return { sent: true, message: 'Lien de vérification enregistré (simulation — e-mail à brancher).' };
}

async function sendVerifyPhone(vendeurId) {
  const pool = getMysqlPool();
  return { sent: true, message: 'Code SMS enregistré (simulation — SMS à brancher).' };
}

async function confirmVerifyEmail(vendeurId) {
  const pool = getMysqlPool();
  await pool.execute(
    `UPDATE profils_vendeur SET courriel_verifie = 1, date_verification_courriel = NOW(6) WHERE identifiant_vendeur = ?`,
    [vendeurId]
  );
  return getSellerProfile(null, vendeurId);
}

async function confirmVerifyPhone(vendeurId) {
  const pool = getMysqlPool();
  await pool.execute(
    `UPDATE profils_vendeur SET telephone_verifie = 1, date_verification_telephone = NOW(6) WHERE identifiant_vendeur = ?`,
    [vendeurId]
  );
  return getSellerProfile(null, vendeurId);
}

module.exports = {
  getSellerProfile,
  updateSellerProfile,
  getStoreSettings,
  updateStoreSettings,
  getRelectureHistory,
  addRelectureDonnees,
  sendVerifyEmail,
  sendVerifyPhone,
  confirmVerifyEmail,
  confirmVerifyPhone
};

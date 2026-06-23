const crypto = require('crypto');
const { getMysqlPool } = require('./mysqlPool');
const {
  notifyAdminOnboardingStepSubmitted,
  notifySellerOnboardingStepReviewed,
  notifyAdminKycSubmitted,
  notifySellerBoutiqueActivated
} = require('./notificationsMysql');

async function safeNotify(fn) {
  try {
    await fn();
  } catch (e) {
    console.warn('notification:', e.message);
  }
}

const DOC_TYPES = ['kbis', 'cni_passport', 'rib'];
const STEP_IDS = ['plan', 'docs', 'profile', 'shipping', 'payout'];

function refDossier(prefix) {
  const t = Date.now().toString(36).toUpperCase();
  return `${prefix}-${t.slice(-6)}`;
}

function formatFrDate(d) {
  if (!d) return undefined;
  const dt = d instanceof Date ? d : new Date(d);
  return dt.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

function ibanLast4(iban) {
  const digits = String(iban || '').replace(/\s/g, '');
  return digits.slice(-4) || null;
}

function ibanMask(iban) {
  const last = ibanLast4(iban);
  return last ? `****${last}` : '****';
}

function parseJson(val) {
  if (!val) return {};
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return {};
  }
}

async function readPreferences(pool, vendeurId) {
  const [rows] = await pool.execute(
    `SELECT preferences_json FROM profils_vendeur WHERE identifiant_vendeur = ? LIMIT 1`,
    [vendeurId]
  );
  return parseJson(rows[0]?.preferences_json);
}

async function writePreferences(pool, vendeurId, prefs) {
  const json = JSON.stringify(prefs);
  const [result] = await pool.execute(
    `UPDATE profils_vendeur SET preferences_json = ? WHERE identifiant_vendeur = ?`,
    [json, vendeurId]
  );
  if (result.affectedRows === 0) {
    await pool.execute(
      `INSERT INTO profils_vendeur (identifiant_vendeur, preferences_json) VALUES (?, ?)`,
      [vendeurId, json]
    );
  }
}

async function getEtapes(pool, boutiqueId) {
  const [rows] = await pool.execute(
    `SELECT documents_kyc_ok, profil_complet, premier_produits_ok, frais_livraison_ok, compte_bancaire_ok
     FROM etapes_onboarding_boutique WHERE identifiant_boutique = ? LIMIT 1`,
    [boutiqueId]
  );
  return rows[0] || null;
}

async function getDocumentsState(pool, boutiqueId) {
  const [rows] = await pool.execute(
    `SELECT type_document, statut, date_deposit
     FROM documents_conformite_boutique
     WHERE identifiant_boutique = ?
     ORDER BY date_deposit DESC`,
    [boutiqueId]
  );
  const latest = {};
  for (const r of rows) {
    if (!latest[r.type_document]) {
      latest[r.type_document] = r;
    }
  }
  const hasAll = DOC_TYPES.every((t) => latest[t]);
  const allPending = hasAll && DOC_TYPES.every((t) => latest[t].statut === 'en_attente');
  const allValid = hasAll && DOC_TYPES.every((t) => latest[t].statut === 'valide');
  const latestDeposit = hasAll
    ? DOC_TYPES.reduce((max, t) => {
        const d = new Date(latest[t].date_deposit).getTime();
        return d > max ? d : max;
      }, 0)
    : null;
  return { hasAll, allPending, allValid, latestDeposit: latestDeposit ? new Date(latestDeposit) : null };
}

async function hasShippingProfile(pool, boutiqueId) {
  const [rows] = await pool.execute(
    `SELECT identifiant FROM profils_livraison_boutique WHERE identifiant_boutique = ? LIMIT 1`,
    [boutiqueId]
  );
  return rows.length > 0;
}

/** Brouillons auto-créés par l’ancienne étape onboarding « produits » (SKU ONB-*). */
async function purgeOnboardingPlaceholderProducts(boutiqueId) {
  const pool = getMysqlPool();
  const [result] = await pool.execute(
    `DELETE FROM produits
     WHERE identifiant_boutique = ?
       AND statut_moderation = 'brouillon'
       AND (reference_sku LIKE 'ONB-%' OR titre LIKE 'Brouillon onboarding%')`,
    [boutiqueId]
  );
  return result.affectedRows || 0;
}

async function getShippingRules(pool, boutiqueId) {
  const [rows] = await pool.execute(
    `SELECT regles_json FROM profils_livraison_boutique
     WHERE identifiant_boutique = ? ORDER BY est_defaut DESC, identifiant ASC LIMIT 1`,
    [boutiqueId]
  );
  return parseJson(rows[0]?.regles_json);
}

async function getPayoutParams(pool, boutiqueId) {
  const [rows] = await pool.execute(
    `SELECT titulaire_compte, dernier_chiffres_iban FROM parametres_versement
     WHERE identifiant_boutique = ? LIMIT 1`,
    [boutiqueId]
  );
  return rows[0] || null;
}

async function getBoutiqueRow(pool, boutiqueId) {
  const [rows] = await pool.execute(
    `SELECT identifiant, raison_sociale, nom_affichage, siret, numero_tva, statut
     FROM boutiques WHERE identifiant = ? LIMIT 1`,
    [boutiqueId]
  );
  return rows[0] || null;
}

async function getVendeurContact(pool, vendeurId) {
  const [rows] = await pool.execute(
    `SELECT courriel, telephone FROM comptes_vendeur WHERE identifiant = ? LIMIT 1`,
    [vendeurId]
  );
  const [profilRows] = await pool.execute(
    `SELECT adresse_ligne1, ville, code_postal FROM profils_vendeur WHERE identifiant_vendeur = ? LIMIT 1`,
    [vendeurId]
  );
  return { ...(rows[0] || {}), ...(profilRows[0] || {}) };
}

function stepWeight(status) {
  if (status === 'valide') return 1;
  if (status === 'en_attente_validation') return 0.5;
  return 0;
}

function buildStepStatus(id, ctx) {
  const { etapes, prefs, docs, hasShipping, payout, valideFlags } = ctx;
  const soumissions = prefs.onboarding_soumissions || {};
  const valide = valideFlags || prefs.onboarding_valide || {};

  if (id === 'plan') {
    if (valide.plan) {
      return { status: 'valide', fileReference: soumissions.plan?.reference, submittedAt: formatFrDate(soumissions.plan?.submittedAt) };
    }
    if (soumissions.plan) {
      return {
        status: 'en_attente_validation',
        fileReference: soumissions.plan.reference,
        submittedAt: formatFrDate(soumissions.plan.submittedAt)
      };
    }
    return { status: 'a_faire' };
  }

  if (id === 'docs') {
    if (etapes?.documents_kyc_ok || valide.docs) {
      return { status: 'valide', fileReference: soumissions.docs?.reference, submittedAt: formatFrDate(soumissions.docs?.submittedAt || docs.latestDeposit) };
    }
    if (docs.hasAll && docs.allPending) {
      return {
        status: 'en_attente_validation',
        fileReference: soumissions.docs?.reference || refDossier('DOC'),
        submittedAt: formatFrDate(soumissions.docs?.submittedAt || docs.latestDeposit)
      };
    }
    return { status: 'a_faire' };
  }

  if (id === 'profile') {
    if (etapes?.profil_complet || valide.profile) {
      return { status: 'valide', fileReference: soumissions.profile?.reference, submittedAt: formatFrDate(soumissions.profile?.submittedAt) };
    }
    if (soumissions.profile) {
      return {
        status: 'en_attente_validation',
        fileReference: soumissions.profile.reference,
        submittedAt: formatFrDate(soumissions.profile.submittedAt)
      };
    }
    return { status: 'a_faire' };
  }

  if (id === 'shipping') {
    if (etapes?.frais_livraison_ok || valide.shipping) {
      return { status: 'valide', fileReference: soumissions.shipping?.reference, submittedAt: formatFrDate(soumissions.shipping?.submittedAt) };
    }
    if (soumissions.shipping || hasShipping) {
      return {
        status: 'en_attente_validation',
        fileReference: soumissions.shipping?.reference || refDossier('SHP'),
        submittedAt: formatFrDate(soumissions.shipping?.submittedAt)
      };
    }
    return { status: 'a_faire' };
  }

  if (id === 'payout') {
    if (etapes?.compte_bancaire_ok || valide.payout) {
      return { status: 'valide', fileReference: soumissions.payout?.reference, submittedAt: formatFrDate(soumissions.payout?.submittedAt) };
    }
    if (soumissions.payout || payout?.titulaire_compte) {
      return {
        status: 'en_attente_validation',
        fileReference: soumissions.payout?.reference || refDossier('RIB'),
        submittedAt: formatFrDate(soumissions.payout?.submittedAt)
      };
    }
    return { status: 'a_faire' };
  }

  return { status: 'a_faire' };
}

const STEP_LABELS = {
  plan: "Choisir votre plan d'abonnement (Particulier ou Professionnel)",
  docs: 'Téléverser vos documents (Kbis, RIB, CNI)',
  profile: 'Compléter votre profil boutique',
  shipping: 'Configurer les frais de livraison',
  payout: 'Valider votre compte bancaire'
};

/**
 * État complet onboarding pour le dashboard vendeur.
 */
async function getOnboardingState(boutiqueId, vendeurId) {
  const pool = getMysqlPool();
  const [etapes, prefs, docs, hasShipping, payout, boutique, contact, shippingRules] =
    await Promise.all([
      getEtapes(pool, boutiqueId),
      readPreferences(pool, vendeurId),
      getDocumentsState(pool, boutiqueId),
      hasShippingProfile(pool, boutiqueId),
      getPayoutParams(pool, boutiqueId),
      getBoutiqueRow(pool, boutiqueId),
      getVendeurContact(pool, vendeurId),
      getShippingRules(pool, boutiqueId)
    ]);

  const ctx = { etapes, prefs, docs, hasShipping, payout };
  const steps = STEP_IDS.map((id) => ({
    id,
    label: STEP_LABELS[id],
    ...buildStepStatus(id, ctx)
  }));

  const progress = Math.round(
    (steps.reduce((acc, s) => acc + stepWeight(s.status), 0) / steps.length) * 100
  );
  const activationTerminee = steps.every((s) => s.status === 'valide');
  const soumissions = prefs.onboarding_soumissions || {};

  return {
    progress,
    activationTerminee,
    sellerPlan: soumissions.plan?.tier || prefs.plan_abonnement || null,
    boutiqueStatut: boutique?.statut || 'brouillon',
    steps,
    forms: {
      docs: {
        commentaire: soumissions.docs?.commentaire || ''
      },
      profile: {
        raisonSociale: boutique?.raison_sociale || '',
        nomAffichage: boutique?.nom_affichage || '',
        siret: boutique?.siret || '',
        tva: boutique?.numero_tva || '',
        emailPro: contact?.courriel || '',
        telephone: contact?.telephone || '',
        adresse: contact?.adresse_ligne1 || ''
      },
      shipping: {
        colissimo: shippingRules.colissimo || '',
        chronopost: shippingRules.chronopost || '',
        relais: shippingRules.relais || '',
        hxLogistics: shippingRules.hxLogistics !== false,
        remarque: shippingRules.remarque || ''
      },
      payout: {
        titulaire: payout?.titulaire_compte || soumissions.payout?.titulaire || '',
        iban: soumissions.payout?.ibanMask || '',
        bic: soumissions.payout?.bic || '',
        referenceInterne: soumissions.payout?.referenceInterne || ''
      }
    }
  };
}

async function submitOnboardingPlan(boutiqueId, vendeurId, tier) {
  const allowed = ['particulier', 'professionnel'];
  if (!allowed.includes(tier)) {
    const err = new Error('INVALID_TIER');
    err.code = 'INVALID_TIER';
    throw err;
  }
  const pool = getMysqlPool();
  const prefs = await readPreferences(pool, vendeurId);
  const reference = refDossier('PLN');
  const submittedAt = new Date().toISOString();
  prefs.onboarding_soumissions = prefs.onboarding_soumissions || {};
  prefs.onboarding_soumissions.plan = { tier, reference, submittedAt };
  prefs.plan_abonnement = tier;
  await writePreferences(pool, vendeurId, prefs);
  await safeNotify(() => notifyAdminOnboardingStepSubmitted(boutiqueId, 'plan'));
  return getOnboardingState(boutiqueId, vendeurId);
}

async function markDocsSubmitted(boutiqueId, vendeurId, commentaire) {
  const pool = getMysqlPool();
  const prefs = await readPreferences(pool, vendeurId);
  const reference = refDossier('DOC');
  const submittedAt = new Date().toISOString();
  prefs.onboarding_soumissions = prefs.onboarding_soumissions || {};
  prefs.onboarding_soumissions.docs = { reference, submittedAt, commentaire: commentaire || null };
  await writePreferences(pool, vendeurId, prefs);
  await pool.execute(
    `UPDATE boutiques SET statut = 'kyc_en_attente'
     WHERE identifiant = ? AND statut IN ('brouillon', 'kyc_en_attente')`,
    [boutiqueId]
  );
  await safeNotify(async () => {
    await notifyAdminKycSubmitted(boutiqueId);
    await notifyAdminOnboardingStepSubmitted(boutiqueId, 'docs');
  });
}

async function submitOnboardingProfile(boutiqueId, vendeurId, body) {
  const raisonSociale = String(body?.raisonSociale || '').trim();
  if (!raisonSociale) {
    const err = new Error('RAISON_SOCIALE_REQUIRED');
    err.code = 'RAISON_SOCIALE_REQUIRED';
    throw err;
  }
  const pool = getMysqlPool();
  const nomAffichage = String(body?.nomAffichage || '').trim() || null;
  const siret = String(body?.siret || '').trim() || null;
  const tva = String(body?.tva || '').trim() || null;
  const telephone = String(body?.telephone || '').trim() || null;
  const adresse = String(body?.adresse || '').trim() || null;

  await pool.execute(
    `UPDATE boutiques SET raison_sociale = ?, nom_affichage = ?, siret = ?, numero_tva = ?
     WHERE identifiant = ? AND identifiant_vendeur = ?`,
    [raisonSociale.slice(0, 255), nomAffichage?.slice(0, 255) || null, siret?.slice(0, 32) || null, tva?.slice(0, 32) || null, boutiqueId, vendeurId]
  );
  if (telephone) {
    await pool.execute(`UPDATE comptes_vendeur SET telephone = ? WHERE identifiant = ?`, [
      telephone.slice(0, 32),
      vendeurId
    ]);
  }
  if (adresse) {
    await pool.execute(
      `UPDATE profils_vendeur SET adresse_ligne1 = ? WHERE identifiant_vendeur = ?`,
      [adresse.slice(0, 255), vendeurId]
    );
  }

  const prefs = await readPreferences(pool, vendeurId);
  const reference = refDossier('PRO');
  const submittedAt = new Date().toISOString();
  prefs.onboarding_soumissions = prefs.onboarding_soumissions || {};
  prefs.onboarding_soumissions.profile = {
    reference,
    submittedAt,
    raisonSociale,
    nomAffichage,
    siret,
    tva,
    telephone,
    adresse
  };
  await writePreferences(pool, vendeurId, prefs);
  await safeNotify(() => notifyAdminOnboardingStepSubmitted(boutiqueId, 'profile'));
  return getOnboardingState(boutiqueId, vendeurId);
}

async function submitOnboardingShipping(boutiqueId, vendeurId, body) {
  const pool = getMysqlPool();
  const regles = {
    colissimo: String(body?.colissimo || '').trim(),
    chronopost: String(body?.chronopost || '').trim(),
    relais: String(body?.relais || '').trim(),
    hxLogistics: Boolean(body?.hxLogistics),
    remarque: String(body?.remarque || '').trim()
  };

  const [existing] = await pool.execute(
    `SELECT identifiant FROM profils_livraison_boutique WHERE identifiant_boutique = ? AND libelle = 'Onboarding' LIMIT 1`,
    [boutiqueId]
  );
  if (existing.length) {
    await pool.execute(
      `UPDATE profils_livraison_boutique SET regles_json = ?, est_defaut = 1 WHERE identifiant = ?`,
      [JSON.stringify(regles), existing[0].identifiant]
    );
  } else {
    await pool.execute(
      `INSERT INTO profils_livraison_boutique (identifiant_boutique, libelle, regles_json, est_defaut)
       VALUES (?, 'Onboarding', ?, 1)`,
      [boutiqueId, JSON.stringify(regles)]
    );
  }

  const prefs = await readPreferences(pool, vendeurId);
  const reference = refDossier('SHP');
  const submittedAt = new Date().toISOString();
  prefs.onboarding_soumissions = prefs.onboarding_soumissions || {};
  prefs.onboarding_soumissions.shipping = { reference, submittedAt, ...regles };
  await writePreferences(pool, vendeurId, prefs);
  await safeNotify(() => notifyAdminOnboardingStepSubmitted(boutiqueId, 'shipping'));
  return getOnboardingState(boutiqueId, vendeurId);
}

async function submitOnboardingPayout(boutiqueId, vendeurId, body) {
  const titulaire = String(body?.titulaire || '').trim();
  const iban = String(body?.iban || '').trim();
  if (!titulaire || !iban) {
    const err = new Error('PAYOUT_REQUIRED');
    err.code = 'PAYOUT_REQUIRED';
    throw err;
  }
  const pool = getMysqlPool();
  const last4 = ibanLast4(iban);
  await pool.execute(
    `INSERT INTO parametres_versement (identifiant_boutique, titulaire_compte, dernier_chiffres_iban)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE titulaire_compte = VALUES(titulaire_compte), dernier_chiffres_iban = VALUES(dernier_chiffres_iban)`,
    [boutiqueId, titulaire.slice(0, 255), last4]
  );

  const prefs = await readPreferences(pool, vendeurId);
  const reference = refDossier('RIB');
  const submittedAt = new Date().toISOString();
  prefs.onboarding_soumissions = prefs.onboarding_soumissions || {};
  prefs.onboarding_soumissions.payout = {
    reference,
    submittedAt,
    titulaire,
    ibanMask: ibanMask(iban),
    bic: String(body?.bic || '').trim() || null,
    referenceInterne: String(body?.referenceInterne || '').trim() || null
  };
  await writePreferences(pool, vendeurId, prefs);
  await safeNotify(() => notifyAdminOnboardingStepSubmitted(boutiqueId, 'payout'));
  return getOnboardingState(boutiqueId, vendeurId);
}

const STEP_TO_ETAPES_COLUMN = {
  docs: 'documents_kyc_ok',
  profile: 'profil_complet',
  shipping: 'frais_livraison_ok',
  payout: 'compte_bancaire_ok'
};

const ADMIN_STEP_LABELS = {
  plan: 'Plan d’abonnement',
  docs: 'Documents (Kbis, CNI, RIB)',
  profile: 'Profil boutique',
  shipping: 'Frais de livraison',
  payout: 'Compte bancaire'
};

function mapStatutBoutiqueAdmin(statutSql, validatedCount) {
  if (statutSql === 'active') return 'active';
  if (statutSql === 'kyc_en_attente') return 'kyc_en_cours';
  if (validatedCount >= STEP_IDS.length - 1) return 'en_attente_activation';
  return 'brouillon';
}

function preuveEtatFromDocStatut(statut) {
  if (statut === 'valide') return 'validé';
  if (statut === 'refuse') return 'refusé';
  return 'déposé';
}

async function getVendeurIdForBoutique(pool, boutiqueId) {
  const [rows] = await pool.execute(
    `SELECT identifiant_vendeur FROM boutiques WHERE identifiant = ? LIMIT 1`,
    [boutiqueId]
  );
  return rows[0]?.identifiant_vendeur ?? null;
}

async function isPlanValidated(prefs) {
  return Boolean(prefs?.onboarding_valide?.plan);
}

async function buildAdminStepItems(boutiqueId, vendeurId, apiBase) {
  const pool = getMysqlPool();
  const [etapes, prefs, docsState, hasShipping, payout, shippingRules, onboarding] =
    await Promise.all([
      getEtapes(pool, boutiqueId),
      readPreferences(pool, vendeurId),
      getDocumentsState(pool, boutiqueId),
      hasShippingProfile(pool, boutiqueId),
      getPayoutParams(pool, boutiqueId),
      getShippingRules(pool, boutiqueId),
      getOnboardingState(boutiqueId, vendeurId)
    ]);

  const soumissions = prefs.onboarding_soumissions || {};
  const planValide = await isPlanValidated(prefs);

  const [docRows] = await pool.execute(
    `SELECT type_document, url_fichier, statut, date_deposit
     FROM documents_conformite_boutique
     WHERE identifiant_boutique = ?
     ORDER BY date_deposit DESC`,
    [boutiqueId]
  );
  const docByType = {};
  for (const d of docRows) {
    if (!docByType[d.type_document]) docByType[d.type_document] = d;
  }

  const docLabels = {
    kbis: 'Kbis (≤ 3 mois)',
    cni_passport: 'CNI / passeport',
    rib: 'RIB entreprise'
  };

  const buildPreuveUrl = (urlPath) => {
    if (!urlPath) return undefined;
    if (urlPath.startsWith('http')) return urlPath;
    const adminPath = String(urlPath).replace('/api/seller/files/', '/api/admin/files/');
    return `${apiBase.replace(/\/$/, '')}${adminPath.startsWith('/') ? adminPath : `/${adminPath}`}`;
  };

  return STEP_IDS.map((id) => {
    const sellerStep = onboarding.steps.find((s) => s.id === id);
    let valide = false;
    if (id === 'plan') {
      valide = planValide;
    } else {
      const col = STEP_TO_ETAPES_COLUMN[id];
      valide = Boolean(etapes?.[col]);
    }

    let apercu = '';
    let preuves = [];

    if (id === 'plan') {
      const tier = soumissions.plan?.tier || prefs.plan_abonnement || '—';
      apercu = soumissions.plan
        ? `Formule « ${tier} » soumise (${soumissions.plan.reference || '—'}) le ${formatFrDate(soumissions.plan.submittedAt) || '—'}.`
        : 'Aucune formule soumise par le vendeur.';
      if (soumissions.plan) {
        preuves = [{ libelle: 'Choix formule', etat: valide ? 'validé' : 'déposé' }];
      }
    } else if (id === 'docs') {
      apercu = docsState.hasAll
        ? `3 pièces déposées — statut global : ${valide ? 'validé admin' : 'en attente de contrôle'}.`
        : 'Documents KYC incomplets (Kbis, CNI, RIB requis).';
      preuves = ['kbis', 'cni_passport', 'rib'].map((t) => {
        const d = docByType[t];
        return {
          libelle: docLabels[t] || t,
          etat: d ? preuveEtatFromDocStatut(d.statut) : 'manquant',
          ref: d ? buildPreuveUrl(d.url_fichier) : undefined
        };
      });
    } else if (id === 'profile') {
      const f = onboarding.forms.profile || {};
      apercu = soumissions.profile || f.raisonSociale
        ? `Raison sociale : ${f.raisonSociale || '—'} · Nom affichage : ${f.nomAffichage || '—'} · SIRET : ${f.siret || '—'}`
        : 'Profil boutique non renseigné.';
    } else if (id === 'shipping') {
      apercu = hasShipping
        ? `Colissimo : ${shippingRules.colissimo || '—'} · Chronopost : ${shippingRules.chronopost || '—'} · Relais : ${shippingRules.relais || '—'}`
        : 'Aucun profil livraison enregistré.';
    } else if (id === 'payout') {
      apercu = payout?.titulaire_compte
        ? `Titulaire : ${payout.titulaire_compte} · IBAN (masqué) : ****${payout.dernier_chiffres_iban || '????'}`
        : soumissions.payout
          ? `Soumission RIB (${soumissions.payout.reference || '—'}) en attente.`
          : 'Compte bancaire non renseigné.';
    }

    if (sellerStep?.status === 'en_attente_validation' && !valide) {
      apercu += `\nSoumis le ${sellerStep.submittedAt || '—'} (${sellerStep.fileReference || '—'}).`;
    }

    return {
      id,
      label: ADMIN_STEP_LABELS[id] || id,
      valide,
      apercu,
      preuves: preuves.length ? preuves : undefined
    };
  });
}

function countAdminValidatedSteps(etapes, planValide) {
  let n = planValide ? 1 : 0;
  if (etapes?.documents_kyc_ok) n++;
  if (etapes?.profil_complet) n++;
  if (etapes?.frais_livraison_ok) n++;
  if (etapes?.compte_bancaire_ok) n++;
  return n;
}

function buildOnboardingSummaryRow(row, etapes, planValide) {
  const boutiqueId = row.boutique_id;
  const vendeurId = row.vendeur_id;
  const prefs = parseJson(row.preferences_json);
  const plan = prefs.plan_abonnement || prefs.onboarding_soumissions?.plan?.tier || 'particulier';
  const validatedCount = countAdminValidatedSteps(etapes, planValide);
  const totalSteps = STEP_IDS.length;

  if (row.statut === 'active' && validatedCount === totalSteps) {
    return null;
  }

  return {
    boutiqueId,
    vendorId: `V-${vendeurId}`,
    shopName: row.nom_affichage || row.raison_sociale || `Boutique #${boutiqueId}`,
    plan: plan === 'professionnel' ? 'professionnel' : 'particulier',
    progressPercent: Math.round((validatedCount / totalSteps) * 100),
    statutBoutique: mapStatutBoutiqueAdmin(row.statut, validatedCount),
    stepsValides: validatedCount,
    stepsTotal: totalSteps,
    notes:
      validatedCount === 0
        ? 'Aucune étape validée — le vendeur doit soumettre son dossier.'
        : `${validatedCount}/${totalSteps} étapes validées par l’opérateur.`
  };
}

/** Liste légère pour l’écran admin (sans détail des étapes). */
async function listOnboardingBoutiquesSummaryForAdmin() {
  const pool = getMysqlPool();
  const [rows] = await pool.execute(
    `SELECT b.identifiant AS boutique_id, b.nom_affichage, b.raison_sociale, b.statut,
            v.identifiant AS vendeur_id, p.preferences_json
     FROM boutiques b
     INNER JOIN comptes_vendeur v ON v.identifiant = b.identifiant_vendeur
     LEFT JOIN profils_vendeur p ON p.identifiant_vendeur = v.identifiant
     WHERE b.statut IN ('brouillon', 'kyc_en_attente', 'active')
     ORDER BY b.date_mise_a_jour DESC
     LIMIT 100`
  );

  const summaries = [];
  for (const row of rows) {
    try {
      const [etapes, prefs] = await Promise.all([
        getEtapes(pool, row.boutique_id),
        readPreferences(pool, row.vendeur_id)
      ]);
      const planValide = await isPlanValidated(prefs);
      const summary = buildOnboardingSummaryRow(row, etapes, planValide);
      if (summary) summaries.push(summary);
    } catch (e) {
      console.warn(`onboarding summary boutique #${row.boutique_id}:`, e.message);
    }
  }

  return summaries;
}

async function getOnboardingBoutiqueDetailForAdmin(boutiqueId, apiBase = 'http://localhost:3001') {
  const pool = getMysqlPool();
  const [rows] = await pool.execute(
    `SELECT b.identifiant AS boutique_id, b.nom_affichage, b.raison_sociale, b.statut,
            v.identifiant AS vendeur_id, p.preferences_json
     FROM boutiques b
     INNER JOIN comptes_vendeur v ON v.identifiant = b.identifiant_vendeur
     LEFT JOIN profils_vendeur p ON p.identifiant_vendeur = v.identifiant
     WHERE b.identifiant = ?
     LIMIT 1`,
    [boutiqueId]
  );
  const row = rows[0];
  if (!row) {
    const err = new Error('BOUTIQUE_NOT_FOUND');
    err.code = 'BOUTIQUE_NOT_FOUND';
    throw err;
  }

  const vendeurId = row.vendeur_id;
  const [etapes, prefs, steps] = await Promise.all([
    getEtapes(pool, boutiqueId),
    readPreferences(pool, vendeurId),
    buildAdminStepItems(boutiqueId, vendeurId, apiBase)
  ]);
  const planValide = await isPlanValidated(prefs);
  const summary = buildOnboardingSummaryRow(row, etapes, planValide);
  if (!summary) {
    const err = new Error('BOUTIQUE_ALREADY_ACTIVE');
    err.code = 'BOUTIQUE_ALREADY_ACTIVE';
    throw err;
  }

  return { ...summary, steps };
}

async function listOnboardingBoutiquesForAdmin(apiBase = 'http://localhost:3001') {
  const summaries = await listOnboardingBoutiquesSummaryForAdmin();
  const out = await Promise.all(
    summaries.map(async (summary) => {
      const vendeurId = Number(String(summary.vendorId).replace(/^V-/, ''));
      const steps = await buildAdminStepItems(summary.boutiqueId, vendeurId, apiBase);
      return { ...summary, steps };
    })
  );
  return out;
}

async function setAdminStepValidation(boutiqueId, stepId, valide) {
  if (!STEP_IDS.includes(stepId)) {
    const err = new Error('INVALID_STEP');
    err.code = 'INVALID_STEP';
    throw err;
  }
  const pool = getMysqlPool();
  const vendeurId = await getVendeurIdForBoutique(pool, boutiqueId);
  if (!vendeurId) {
    const err = new Error('BOUTIQUE_NOT_FOUND');
    err.code = 'BOUTIQUE_NOT_FOUND';
    throw err;
  }

  if (stepId === 'plan') {
    const prefs = await readPreferences(pool, vendeurId);
    prefs.onboarding_valide = prefs.onboarding_valide || {};
    prefs.onboarding_valide.plan = Boolean(valide);
    await writePreferences(pool, vendeurId, prefs);
    await safeNotify(() => notifySellerOnboardingStepReviewed(boutiqueId, stepId, valide));
    return getOnboardingBoutiqueDetailForAdmin(boutiqueId);
  }

  const col = STEP_TO_ETAPES_COLUMN[stepId];
  await pool.execute(
    `UPDATE etapes_onboarding_boutique SET ${col} = ? WHERE identifiant_boutique = ?`,
    [valide ? 1 : 0, boutiqueId]
  );

  if (stepId === 'docs') {
    await pool.execute(
      `UPDATE documents_conformite_boutique SET statut = ?
       WHERE identifiant_boutique = ? AND type_document IN ('kbis', 'cni_passport', 'rib')`,
      [valide ? 'valide' : 'en_attente', boutiqueId]
    );
  }

  await safeNotify(() => notifySellerOnboardingStepReviewed(boutiqueId, stepId, valide));
  return getOnboardingBoutiqueDetailForAdmin(boutiqueId);
}

async function activateBoutiqueAdmin(boutiqueId) {
  const pool = getMysqlPool();
  const vendeurId = await getVendeurIdForBoutique(pool, boutiqueId);
  if (!vendeurId) {
    const err = new Error('BOUTIQUE_NOT_FOUND');
    err.code = 'BOUTIQUE_NOT_FOUND';
    throw err;
  }

  const steps = await buildAdminStepItems(boutiqueId, vendeurId, 'http://localhost:3001');
  if (!steps.every((s) => s.valide)) {
    const err = new Error('STEPS_INCOMPLETE');
    err.code = 'STEPS_INCOMPLETE';
    throw err;
  }

  await pool.execute(`UPDATE boutiques SET statut = 'active' WHERE identifiant = ?`, [boutiqueId]);
  await safeNotify(() => notifySellerBoutiqueActivated(boutiqueId));
  try {
    return await getOnboardingBoutiqueDetailForAdmin(boutiqueId);
  } catch {
    return { boutiqueId, statutBoutique: 'active' };
  }
}

module.exports = {
  getOnboardingState,
  submitOnboardingPlan,
  markDocsSubmitted,
  submitOnboardingProfile,
  submitOnboardingShipping,
  submitOnboardingPayout,
  purgeOnboardingPlaceholderProducts,
  listOnboardingBoutiquesSummaryForAdmin,
  getOnboardingBoutiqueDetailForAdmin,
  listOnboardingBoutiquesForAdmin,
  setAdminStepValidation,
  activateBoutiqueAdmin,
  STEP_IDS
};

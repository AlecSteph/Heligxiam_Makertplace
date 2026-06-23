/**
 * Vérification Google reCAPTCHA v2 (siteverify).
 * Clés de test Google (dev) : voir RECAPTCHA_* dans .env.example
 */

function isRecaptchaEnabled() {
  return Boolean(process.env.RECAPTCHA_SECRET_KEY?.trim());
}

/** Clés de test officielles Google (toujours valides en local). */
const GOOGLE_TEST_SECRET = '6LeIxAcTAAAAAGG-vFI1TnRWxM07dQ98LWgjn';

function isGoogleTestSecret(secret) {
  return secret === GOOGLE_TEST_SECRET;
}

async function verifyRecaptcha(token, remoteIp) {
  const secret = process.env.RECAPTCHA_SECRET_KEY?.trim();

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      return { ok: false, message: 'reCAPTCHA non configuré sur le serveur.' };
    }
    console.warn('[recaptcha] RECAPTCHA_SECRET_KEY absent — vérification ignorée (dev)');
    return { ok: true, skipped: true };
  }

  if (!token || typeof token !== 'string') {
    if (process.env.NODE_ENV !== 'production' && isGoogleTestSecret(secret)) {
      console.warn('[recaptcha] dev + clés test Google — token absent, vérification ignorée');
      return { ok: true, skipped: true };
    }
    return { ok: false, message: 'Veuillez valider le reCAPTCHA.' };
  }

  const params = new URLSearchParams({
    secret,
    response: token
  });
  if (remoteIp) {
    params.set('remoteip', remoteIp);
  }

  const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  const data = await response.json();
  if (!data.success) {
    const codes = data['error-codes'] || [];
    if (process.env.NODE_ENV !== 'production' && isGoogleTestSecret(secret)) {
      console.warn('[recaptcha] dev + clés test Google — siteverify ignoré:', codes.join(', ') || 'unknown');
      return { ok: true, skipped: true };
    }
    console.warn('[recaptcha] siteverify échoué:', codes.join(', ') || 'unknown');
    return { ok: false, message: 'Validation reCAPTCHA échouée. Réessayez.' };
  }

  return { ok: true };
}

function getPublicConfig() {
  const siteKey = process.env.RECAPTCHA_SITE_KEY?.trim() || '';
  const secretConfigured = isRecaptchaEnabled();
  return {
    enabled: Boolean(siteKey && secretConfigured),
    siteKey: siteKey && secretConfigured ? siteKey : ''
  };
}

module.exports = {
  isRecaptchaEnabled,
  verifyRecaptcha,
  getPublicConfig
};

const nodemailer = require('nodemailer');

function getFrontendUrl() {
  return (process.env.FRONTEND_URL || 'http://localhost:4200').replace(/\/$/, '');
}

function isSmtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

let transporter = null;

function getTransporter() {
  if (!isSmtpConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  return transporter;
}

async function sendPasswordResetEmail({ to, firstName, token }) {
  const resetUrl = `${getFrontendUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  const subject = 'Réinitialisation de votre mot de passe — Heligxiam';
  const greeting = firstName ? `Bonjour ${firstName},` : 'Bonjour,';
  const text = `${greeting}

Cliquez sur le lien suivant pour réinitialiser votre mot de passe (valide 1 heure) :
${resetUrl}

Si vous n'avez pas demandé cette réinitialisation, ignorez cet e-mail.

— L'équipe Heligxiam`;

  const html = `
    <p>${greeting}</p>
    <p>Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe (lien valide 1 heure) :</p>
    <p><a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold">Réinitialiser mon mot de passe</a></p>
    <p style="color:#64748b;font-size:13px">Ou copiez ce lien : ${resetUrl}</p>
    <p style="color:#64748b;font-size:13px">Si vous n'avez pas demandé cette réinitialisation, ignorez cet e-mail.</p>
  `;

  const transport = getTransporter();
  if (transport) {
    await transport.sendMail({
      from: process.env.SMTP_FROM || `"Heligxiam" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html
    });
    console.log(`[mail] E-mail de réinitialisation envoyé à ${to}`);
    return;
  }

  console.log('\n========== RÉINITIALISATION MOT DE PASSE (dev — SMTP non configuré) ==========');
  console.log(`Destinataire : ${to}`);
  console.log(`Lien         : ${resetUrl}`);
  console.log('============================================================================\n');
}

module.exports = { sendPasswordResetEmail, isSmtpConfigured, getFrontendUrl };

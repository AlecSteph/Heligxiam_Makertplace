const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

function formatMoney(n) {
  return `${Number(n).toFixed(2).replace('.', ',')} €`;
}

function formatDate(d) {
  return new Date(d).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

async function buildReceiptPdf(order, lines, buyerEmail) {
  const trackUrl = `https://heligxiam.com/suivi/${order.reference_publique}?t=${order.qr_token}`;
  const qrBuffer = await QRCode.toBuffer(trackUrl, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 180,
    color: { dark: '#312e81', light: '#ffffff' }
  });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const w = doc.page.width - 100;

    // Header band
    doc.save();
    doc.rect(50, 40, w, 72).fill('#312e81');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(22)
      .text('HELIGXIAM', 62, 58);
    doc.font('Helvetica').fontSize(10)
      .text('Marketplace premium — Reçu de commande', 62, 84);
    doc.restore();

    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(16)
      .text(`Commande ${order.reference_publique}`, 50, 130);
    doc.font('Helvetica').fontSize(10).fillColor('#4b5563')
      .text(`Date : ${formatDate(order.date_creation)}`, 50, 152)
      .text(`Client : ${buyerEmail || '—'}`, 50, 166)
      .text(`Suivi colis : ${order.tracking_code || '—'}`, 50, 180);

    if (order.adresse_livraison && typeof order.adresse_livraison === 'object') {
      const a = order.adresse_livraison;
      const addr = [a.line1, a.postalCode, a.city, a.country].filter(Boolean).join(', ');
      if (addr) doc.text(`Livraison : ${addr}`, 50, 194);
    }

    // QR block
    doc.image(qrBuffer, w - 80, 125, { width: 100, height: 100 });
    doc.fontSize(8).fillColor('#6366f1')
      .text('Scannez pour suivre', w - 72, 228, { width: 90, align: 'center' });

    // Table header
    let y = 250;
    doc.moveTo(50, y).lineTo(50 + w, y).strokeColor('#e5e7eb').stroke();
    y += 12;
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#374151')
      .text('Produit', 50, y)
      .text('Qté', 320, y)
      .text('P.U.', 370, y)
      .text('Total', 450, y, { width: 80, align: 'right' });
    y += 18;
    doc.moveTo(50, y).lineTo(50 + w, y).strokeColor('#e5e7eb').stroke();
    y += 10;

    doc.font('Helvetica').fontSize(9).fillColor('#111827');
    for (const line of lines) {
      const lineTotal = Number(line.prix_unitaire) * Number(line.quantite);
      doc.text(String(line.nom_produit).slice(0, 45), 50, y, { width: 260 });
      doc.text(String(line.quantite), 320, y);
      doc.text(formatMoney(line.prix_unitaire), 370, y);
      doc.text(formatMoney(lineTotal), 450, y, { width: 80, align: 'right' });
      y += 22;
      if (y > 620) {
        doc.addPage();
        y = 50;
      }
    }

    y += 8;
    doc.moveTo(300, y).lineTo(50 + w, y).strokeColor('#e5e7eb').stroke();
    y += 14;

    const subtotal = lines.reduce(
      (s, l) => s + Number(l.prix_unitaire) * Number(l.quantite),
      0
    );
    doc.font('Helvetica').fontSize(10).fillColor('#374151')
      .text('Sous-total', 350, y)
      .text(formatMoney(subtotal), 450, y, { width: 80, align: 'right' });
    y += 16;
    if (Number(order.promo_discount) > 0) {
      doc.fillColor('#059669')
        .text(`Remise${order.promo_code ? ` (${order.promo_code})` : ''}`, 350, y)
        .text(`-${formatMoney(order.promo_discount)}`, 450, y, { width: 80, align: 'right' });
      y += 16;
    }
    doc.fillColor('#374151')
      .text('Livraison', 350, y)
      .text(formatMoney(order.total_frais_livraison), 450, y, { width: 80, align: 'right' });
    y += 20;
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#312e81')
      .text('Total TTC', 350, y)
      .text(formatMoney(order.total_ttc), 450, y, { width: 80, align: 'right' });

    y += 40;
    doc.roundedRect(50, y, w, 56, 6).fillAndStroke('#eef2ff', '#c7d2fe');
    doc.fillColor('#312e81').font('Helvetica-Bold').fontSize(10)
      .text('Merci pour votre confiance !', 62, y + 14);
    doc.font('Helvetica').fontSize(9).fillColor('#4338ca')
      .text('Retours gratuits sous 60 jours — Support : support@heligxiam.com', 62, y + 32);

    doc.end();
  });
}

async function buildQrPng(order) {
  const trackUrl = `https://heligxiam.com/suivi/${order.reference_publique}?t=${order.qr_token}`;
  return QRCode.toBuffer(trackUrl, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
    color: { dark: '#312e81', light: '#ffffff' }
  });
}

module.exports = { buildReceiptPdf, buildQrPng };

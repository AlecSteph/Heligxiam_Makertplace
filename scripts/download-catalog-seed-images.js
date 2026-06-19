/**
 * Télécharge les images catalogue (Unsplash — licence libre) en local
 * et génère les logos vendeur SVG (initiales, sans marque déposée).
 *
 * Sortie : public/assets/catalog-seed/
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..', 'public', 'assets', 'catalog-seed');
const PRODUCTS_DIR = path.join(ROOT, 'products');
const LOGOS_DIR = path.join(ROOT, 'logos');

/** @type {{ sku: string, title: string, url: string, copyFrom?: string }[]} */
const PRODUCTS = [
  { sku: 'P001', title: 'MacBook Pro 16 M3 Max', url: 'https://images.unsplash.com/photo-1642943038577-eb4a59549766?w=800&auto=format&fit=crop&q=80' },
  { sku: 'P002', title: 'AirPods Max Silver', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80' },
  { sku: 'P003', title: 'iPhone 15 Pro Max', url: 'https://images.unsplash.com/photo-1741061963569-9d0ef54d10d2?w=800&auto=format&fit=crop&q=80' },
  { sku: 'P004', title: 'iPad Pro 12.9 M2', url: 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=800&auto=format&fit=crop&q=80' },
  { sku: 'P005', title: 'Casque Audio Aurora', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80' },
  { sku: 'P006', title: 'Montre Pulse X2', url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80' },
  { sku: 'P007', title: 'AirPods Pro 2 USB-C', url: 'https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=800&auto=format&fit=crop&q=80' },
  { sku: 'P008', title: 'iPad Air M2', url: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&auto=format&fit=crop&q=80' },
  { sku: 'P009', title: 'Sony A7R V', url: 'https://images.unsplash.com/photo-1764557359097-f15dd0c0a17b?w=800&auto=format&fit=crop&q=80' },
  { sku: 'P010', title: 'PlayStation 5 Pro', url: 'https://images.unsplash.com/photo-1695028644151-1ec92bae9fb0?w=800&auto=format&fit=crop&q=80' },
  { sku: 'P011', title: 'Bose SoundLink Revolve+ II', url: 'https://images.unsplash.com/photo-1645020089313-b501d12f4525?w=800&auto=format&fit=crop&q=80' },
  { sku: 'P012', title: 'Sony WH-1000XM5', url: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=800&auto=format&fit=crop&q=80' },
  { sku: 'P013', title: 'Chargeur sans fil 15W', url: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=800&auto=format&fit=crop&q=80' },
  { sku: 'P014', title: 'Câble USB-C', url: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800&auto=format&fit=crop&q=80' },
  { sku: 'P015', title: 'Enceinte Waveform', url: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&auto=format&fit=crop&q=80' },
  { sku: 'P016', title: 'Clavier mécanique RGB', url: 'https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=800&auto=format&fit=crop&q=80' },
  { sku: 'P017', title: 'Webcam 4K', url: 'https://images.unsplash.com/photo-1628359355620-dbc984694706?w=800&auto=format&fit=crop&q=80' },
  { sku: 'P018', title: 'Galaxy S24 Ultra', url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop&q=80' },
  { sku: 'P019', title: 'TV Samsung QLED 55', url: 'https://images.unsplash.com/photo-1593784991095-a205069470f6?w=800&auto=format&fit=crop&q=80' },
  { sku: 'P020', title: 'Galaxy Buds3', url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80' },
  { sku: 'P021', title: 'Apple Watch Ultra 2', url: 'https://images.unsplash.com/photo-1723328254549-24bb3deb4a83?w=800&auto=format&fit=crop&q=80' },
  { sku: 'P022', title: 'Sac Kelly Premium', url: 'https://images.unsplash.com/photo-1758171692659-024183c2c272?w=800&auto=format&fit=crop&q=80' },
  { sku: 'P023', title: 'Nike Air Jordan 1', url: 'https://images.unsplash.com/photo-1710317959021-36dfca8a9abd?w=800&auto=format&fit=crop&q=80' },
  { sku: 'P024', title: 'Ray-Ban Aviator', url: 'https://images.unsplash.com/photo-1722842529941-825976fc14f1?w=800&auto=format&fit=crop&q=80' },
  { sku: 'P025', title: 'Tenue Mode Luxe', url: 'https://images.unsplash.com/photo-1769981271695-bb3d766ee419?w=800&auto=format&fit=crop&q=80' },
  { sku: 'P026', title: 'Sac à dos minimaliste', url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80' },
  { sku: 'P027', title: 'T-shirt premium', url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&auto=format&fit=crop&q=80' },
  { sku: 'P028', title: 'MacBook Air M2', url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80' },
  { sku: 'P029', title: 'Nike Air Max 2026', url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80' },
  { sku: 'P030', title: 'Vase minimaliste', url: 'https://images.unsplash.com/photo-1707376519357-b53e370384fe?w=800&auto=format&fit=crop&q=80' },
  { sku: 'P031', title: 'DeLonghi Dinamica', url: 'https://images.unsplash.com/photo-1595259601701-ccc4aa91c073?w=800&auto=format&fit=crop&q=80' },
  { sku: 'P032', title: 'Cafetière Delonghi Auto', url: 'https://images.unsplash.com/photo-1587080266227-677cc2a4e76e?w=800&auto=format&fit=crop&q=80' },
  { sku: 'P033', title: 'Robot aspirateur iLife', url: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=800&auto=format&fit=crop&q=80' },
  { sku: 'P034', title: 'Diffuseur huiles', url: 'https://images.unsplash.com/photo-1598300056393-4aac492f4344?w=800&auto=format&fit=crop&q=80' },
  { sku: 'P035', title: 'Aspirateur Dyson V15', url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&auto=format&fit=crop&q=80' },
  { sku: 'P036', title: 'Tom Ford Black Orchid', url: 'https://images.unsplash.com/photo-1719175936556-dbd05e415913?w=800&auto=format&fit=crop&q=80' },
  { sku: 'P037', title: 'Coffret parfum premium', url: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&auto=format&fit=crop&q=80' },
  { sku: 'P038', title: 'Coffret Sephora', url: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&auto=format&fit=crop&q=80' },
  { sku: 'P039', title: 'Crème L Occitane', url: 'https://images.unsplash.com/photo-1571875257727-256c39da42af?w=800&auto=format&fit=crop&q=80' },
  { sku: 'P040', title: 'Garmin Fenix 8', url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&auto=format&fit=crop&q=80' },
  { sku: 'P041', title: 'Adidas Ultraboost', url: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&auto=format&fit=crop&q=80' },
  { sku: 'P042', title: 'Haltères 20 kg', url: 'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=800&auto=format&fit=crop&q=80' },
  { sku: 'P043', title: 'Tapis yoga 6mm', url: 'https://images.unsplash.com/photo-1592432678018-e910c54737ea?w=800&auto=format&fit=crop&q=80' },
  { sku: 'P044', title: 'Kit entretien hiver auto', url: 'https://images.unsplash.com/photo-1493238799360-48aae3798efb?w=800&auto=format&fit=crop&q=80' },
  { sku: 'P045', title: 'Balai essuie-glace', url: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&auto=format&fit=crop&q=80' },
  { sku: 'P046', title: 'Dashcam Garmin Mini', url: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=800&auto=format&fit=crop&q=80' },
  { sku: 'P047', title: 'Compresseur 12V', url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&auto=format&fit=crop&q=80' }
];

/** @type {{ id: string, name: string, initials: string, color: string }[]} */
const LOGOS = [
  { id: 'V01-techstore-pro', name: 'TechStore Pro', initials: 'TP', color: '#1e3a8a' },
  { id: 'V02-electromarket', name: 'ElectroMarket', initials: 'EM', color: '#0f766e' },
  { id: 'V03-fashion-hub', name: 'Fashion Hub', initials: 'FH', color: '#be185d' },
  { id: 'V04-nike-flagship', name: 'Nike Flagship', initials: 'NF', color: '#171717' },
  { id: 'V05-heligxiam-official', name: 'HELIGXIAM Official', initials: 'HX', color: '#ea580c' },
  { id: 'V06-home-essentials', name: 'Home Essentials', initials: 'HE', color: '#7c3aed' },
  { id: 'V07-beaute-paris-select', name: 'Beauté Paris Select', initials: 'BP', color: '#db2777' },
  { id: 'V08-sport-performance', name: 'Sport Performance', initials: 'SP', color: '#16a34a' },
  { id: 'V09-auto-expert-france', name: 'Auto Expert France', initials: 'AF', color: '#475569' },
  { id: 'V10-samsung-premium', name: 'Samsung Premium', initials: 'SM', color: '#1d4ed8' }
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const req = https.get(url, { headers: { 'User-Agent': 'HeligxiamSeed/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlink(dest, () => {});
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlink(dest, () => {});
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    });
    req.on('error', (e) => {
      file.close();
      fs.unlink(dest, () => {});
      reject(e);
    });
  });
}

function logoSvg({ name, initials, color }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256" role="img" aria-label="${name}">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${color}"/>
      <stop offset="100%" style="stop-color:#0f172a"/>
    </linearGradient>
  </defs>
  <rect width="256" height="256" rx="48" fill="url(#g)"/>
  <text x="128" y="142" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="72" font-weight="700" fill="#ffffff">${initials}</text>
</svg>`;
}

async function main() {
  fs.mkdirSync(PRODUCTS_DIR, { recursive: true });
  fs.mkdirSync(LOGOS_DIR, { recursive: true });

  const manifest = {
    generatedAt: new Date().toISOString(),
    basePath: '/assets/catalog-seed',
    license: 'Photos Unsplash (https://unsplash.com/license) — usage libre avec attribution recommandée. Logos SVG génériques HELIGXIAM.',
    products: [],
    logos: []
  };

  console.log('Téléchargement produits…');
  for (const p of PRODUCTS) {
    const filename = `${p.sku}.jpg`;
    const dest = path.join(PRODUCTS_DIR, filename);
    process.stdout.write(`  ${p.sku}… `);
    try {
      await download(p.url, dest);
      const stat = fs.statSync(dest);
      console.log(`OK (${Math.round(stat.size / 1024)} Ko)`);
      manifest.products.push({
        sku: p.sku,
        title: p.title,
        localPath: `products/${filename}`,
        publicUrl: `/assets/catalog-seed/products/${filename}`,
        sourceUrl: p.url
      });
    } catch (e) {
      console.log(`ERREUR: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log('Génération logos SVG…');
  for (const l of LOGOS) {
    const filename = `${l.id}.svg`;
    const dest = path.join(LOGOS_DIR, filename);
    fs.writeFileSync(dest, logoSvg(l), 'utf8');
    manifest.logos.push({
      vendorId: l.id,
      name: l.name,
      localPath: `logos/${filename}`,
      publicUrl: `/assets/catalog-seed/logos/${filename}`
    });
    console.log(`  ${filename} OK`);
  }

  fs.writeFileSync(path.join(ROOT, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

  const readme = `HELIGXIAM — Assets catalogue seed (LOCAL)
==========================================

Dossier : public/assets/catalog-seed/

Contenu :
  products/   ${manifest.products.length} images JPG (P001.jpg … P047.jpg)
  logos/      ${manifest.logos.length} logos SVG vendeur (V01 … V10)
  manifest.json — chemins locaux pour seed SQL / API

Usage Angular (fichiers servis statiquement) :
  /assets/catalog-seed/products/P001.jpg
  /assets/catalog-seed/logos/V01-techstore-pro.svg

Usage auth-service (uploads ou copie) :
  Copier vers auth-service/uploads/catalog-seed/ si besoin côté API.

Licence images : Unsplash License (gratuit, pas de hotlink en prod long terme).
Logos : génériques initiales — remplacer par vrais logos vendeur en production.

Regénérer :
  node scripts/download-catalog-seed-images.js
`;
  fs.writeFileSync(path.join(ROOT, 'README.txt'), readme, 'utf8');

  console.log(`\nTerminé : ${manifest.products.length} produits, ${manifest.logos.length} logos`);
  console.log(`→ ${ROOT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

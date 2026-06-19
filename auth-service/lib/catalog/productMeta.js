/** Métadonnées catalogue client (spec §4) — enrichissement au-delà de MySQL */
const CATEGORIES = [
  { slug: 'electronique', name: 'Électronique', productCountTarget: 8 },
  { slug: 'mode', name: 'Mode & Accessoires', productCountTarget: 8 },
  { slug: 'maison', name: 'Maison & Décoration', productCountTarget: 6 },
  { slug: 'beaute', name: 'Beauté & Santé', productCountTarget: 4 },
  { slug: 'sport', name: 'Sport & Fitness', productCountTarget: 4 },
  { slug: 'auto', name: 'Automobile', productCountTarget: 4 }
];

const SLUG_TO_CATEGORY = Object.fromEntries(CATEGORIES.map((c) => [c.slug, c.name]));
const NAME_TO_SLUG = Object.fromEntries(CATEGORIES.map((c) => [c.name, c.slug]));

/** Noms courts issus du seed / descriptions produits → libellés catalogue client */
const CATEGORY_ALIASES = {
  Mode: 'Mode & Accessoires',
  Maison: 'Maison & Décoration',
  Beauté: 'Beauté & Santé',
  Sport: 'Sport & Fitness'
};

function normalizeCategoryName(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return 'Électronique';
  return CATEGORY_ALIASES[trimmed] || trimmed;
}

/** @type {Record<string, object>} */
const META_BY_SKU = {
  P001: { brand: 'Apple', badge: 'Premium', rating: 4.9, reviews: 1247, originalPrice: 3299 },
  P002: { brand: 'Apple', badge: 'Bestseller', rating: 4.8, reviews: 892 },
  P003: { brand: 'Apple', badge: 'Nouveau', rating: 4.9, reviews: 2156, originalPrice: 1599 },
  P004: { brand: 'Apple', rating: 4.8, reviews: 967 },
  P005: { brand: 'Aurora', badge: 'Bestseller', rating: 4.7, reviews: 534 },
  P006: { brand: 'Pulse', rating: 4.6, reviews: 412 },
  P007: { brand: 'Apple', badge: 'Flash', rating: 4.8, reviews: 2103, originalPrice: 279, flash: true },
  P008: { brand: 'Apple', rating: 4.8, reviews: 756 },
  P009: { brand: 'Sony', badge: 'Pro', rating: 5.0, reviews: 423 },
  P010: { brand: 'Sony', badge: 'Stock limité', rating: 4.8, reviews: 3421 },
  P011: { brand: 'Bose', badge: 'Promotion', rating: 4.7, reviews: 1523, originalPrice: 379 },
  P012: { brand: 'Sony', rating: 4.8, reviews: 321, originalPrice: 399 },
  P013: { brand: 'ElectroMarket', rating: 4.5, reviews: 890 },
  P014: { brand: 'ElectroMarket', rating: 4.6, reviews: 1204 },
  P015: { brand: 'Waveform', badge: 'Bestseller', rating: 4.5, reviews: 678 },
  P016: { brand: 'ElectroMarket', rating: 4.7, reviews: 445 },
  P017: { brand: 'StreamPro', rating: 4.6, reviews: 312 },
  P018: { brand: 'Samsung', badge: 'Nouveau', rating: 4.8, reviews: 987, originalPrice: 1299 },
  P019: { brand: 'Samsung', badge: 'Premium', rating: 4.7, reviews: 654, originalPrice: 1099 },
  P020: { brand: 'Samsung', badge: 'Promo', rating: 4.6, reviews: 432, originalPrice: 179 },
  P021: { brand: 'Apple', badge: 'Premium', rating: 4.9, reviews: 734 },
  P022: { brand: 'HELIGXIAM', badge: 'Exclusif', rating: 4.5, reviews: 189, originalPrice: 449 },
  P023: { brand: 'Nike', badge: 'Bestseller', rating: 4.8, reviews: 1567 },
  P024: { brand: 'Ray-Ban', badge: 'Promo', rating: 4.7, reviews: 923, originalPrice: 219 },
  P025: { brand: 'HELIGXIAM', badge: 'Exclusif', rating: 4.6, reviews: 267, originalPrice: 799 },
  P026: { brand: 'Fashion Hub', rating: 4.5, reviews: 445 },
  P027: { brand: 'Fashion Hub', rating: 4.4, reviews: 678 },
  P028: { brand: 'Apple', rating: 4.8, reviews: 1123 },
  P029: { brand: 'Nike', badge: 'Flash', rating: 4.7, reviews: 2341, originalPrice: 199, flash: true },
  P030: { brand: 'HELIGXIAM Home', rating: 4.6, reviews: 234 },
  P031: { brand: 'DeLonghi', badge: 'Premium', rating: 4.8, reviews: 567 },
  P032: { brand: 'DeLonghi', badge: 'Flash', rating: 4.7, reviews: 891, originalPrice: 499, flash: true },
  P033: { brand: 'iLife', badge: 'Flash', rating: 4.6, reviews: 1234, originalPrice: 399, flash: true },
  P034: { brand: 'Home Essentials', rating: 4.5, reviews: 345 },
  P035: { brand: 'Dyson', badge: 'Premium', rating: 4.9, reviews: 789, originalPrice: 749 },
  P036: { brand: 'Tom Ford', rating: 4.8, reviews: 456 },
  P037: { brand: 'Beauté Paris', badge: 'Flash', rating: 4.6, reviews: 2345, originalPrice: 139, flash: true },
  P038: { brand: 'Sephora', badge: 'Promo', rating: 4.7, reviews: 876, originalPrice: 89 },
  P039: { brand: "L'Occitane", rating: 4.8, reviews: 654 },
  P040: { brand: 'Garmin', badge: 'Flash', rating: 4.8, reviews: 567, originalPrice: 899, flash: true },
  P041: { brand: 'Adidas', badge: 'Bestseller', rating: 4.7, reviews: 1234, originalPrice: 199 },
  P042: { brand: 'Sport Performance', rating: 4.6, reviews: 345 },
  P043: { brand: 'Sport Performance', rating: 4.5, reviews: 567 },
  P044: { brand: 'Auto Expert', badge: 'Promo', rating: 4.4, reviews: 890, originalPrice: 41.5 },
  P045: { brand: 'Bosch', rating: 4.6, reviews: 456 },
  P046: { brand: 'Garmin', badge: 'Nouveau', rating: 4.7, reviews: 234, originalPrice: 149 },
  P047: { brand: 'Auto Expert', rating: 4.5, reviews: 178 }
};

function normalizeImageUrl(url) {
  if (!url) return null;
  const s = String(url).trim();
  if (!s) return null;
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  if (s.startsWith('/api/seller/files/')) {
    const base = process.env.PUBLIC_API_URL || 'http://localhost:3001';
    return `${base}${s}`;
  }
  return s;
}

function enrichProduct(row, promoOverlay = null) {
  const meta = META_BY_SKU[row.sku] || {};
  const category = normalizeCategoryName(row.category || 'Électronique');
  const basePrice = Number(row.price);
  let price = basePrice;
  let originalPrice;
  let isFlash = false;
  let badge = meta.badge;
  let promoEndsAt;

  if (promoOverlay) {
    price = Number(promoOverlay.prix_promo);
    const barre =
      promoOverlay.prix_barre != null ? Number(promoOverlay.prix_barre) : basePrice;
    if (barre > price) originalPrice = barre;
    isFlash = String(promoOverlay.type_promo || '').toLowerCase() === 'flash';
    badge = promoOverlay.libelle || (isFlash ? 'Flash' : 'Promotion');
    promoEndsAt = promoOverlay.date_fin || null;
  }

  return {
    id: String(row.id),
    sku: row.sku,
    name: row.title,
    description: row.description || '',
    price,
    originalPrice,
    image: normalizeImageUrl(row.image) || '/assets/catalog-seed/products/placeholder.jpg',
    category,
    categorySlug: NAME_TO_SLUG[category] || 'electronique',
    rating: meta.rating ?? 4.5,
    reviews: meta.reviews ?? 100,
    inStock: Number(row.stock) > 0,
    badge: isFlash || originalPrice ? badge : meta.badge,
    brand: meta.brand,
    isFlash,
    promoEndsAt,
    sellerId: String(row.vendeurId),
    sellerName: row.sellerName,
    sellerSlug: row.sellerSlug,
    boutiqueId: Number(row.boutiqueId),
    sellerLogo: row.sellerLogo || null
  };
}

module.exports = {
  CATEGORIES,
  SLUG_TO_CATEGORY,
  NAME_TO_SLUG,
  META_BY_SKU,
  normalizeCategoryName,
  enrichProduct
};

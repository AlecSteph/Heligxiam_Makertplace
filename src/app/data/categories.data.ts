export interface SubcategoryChip {
  label: string;
  icon?: string;
  query?: string;
}

export interface VideoReview {
  title: string;
  author: string;
  avatar: string;
  duration: string;
  thumbnail: string;
  videoUrl: string;
  views: string;
}

export interface PriceRange {
  label: string;
  min?: number;
  max?: number;
}

export interface CategoryBanner {
  title: string;
  subtitle: string;
  cta: string;
  image: string;
  accent: string;
}

export interface CategoryConfig {
  slug: string;
  name: string;
  matchCategory: string;
  tagline: string;
  description: string;
  heroImage: string;
  heroVideo?: string;
  gradient: string;
  accentColor: string;
  icon: string;
  subcategories: SubcategoryChip[];
  featuredSubcategories: { label: string; image: string }[];
  brands: string[];
  videoReviews: VideoReview[];
  banners: CategoryBanner[];
  priceRanges: PriceRange[];
}

const commonPriceRanges: PriceRange[] = [
  { label: 'Jusqu\'à 50€', max: 50 },
  { label: '50 à 100€', min: 50, max: 100 },
  { label: '100 à 300€', min: 100, max: 300 },
  { label: '300 à 1000€', min: 300, max: 1000 },
  { label: '1000€ et plus', min: 1000 }
];

export const CATEGORY_CONFIGS: Record<string, CategoryConfig> = {
  electronique: {
    slug: 'electronique',
    name: 'Électronique',
    matchCategory: 'Électronique',
    tagline: 'La high-tech nouvelle génération',
    description: 'Smartphones, laptops, audio, gaming, objets connectés — les dernières innovations pour équiper votre quotidien.',
    heroImage: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=1600&q=80',
    gradient: 'from-blue-600 via-indigo-600 to-purple-700',
    accentColor: 'indigo',
    icon: 'Cpu',
    subcategories: [
      { label: 'Tous les produits' },
      { label: 'Smartphones', query: 'iphone' },
      { label: 'Ordinateurs portables', query: 'macbook' },
      { label: 'Tablettes', query: 'ipad' },
      { label: 'Casques audio', query: 'airpods' },
      { label: 'Enceintes', query: 'bose' },
      { label: 'Consoles & Gaming', query: 'playstation' },
      { label: 'Photo & Vidéo', query: 'sony' },
      { label: 'Objets connectés', query: 'watch' },
      { label: 'Accessoires' },
      { label: 'Stockage & Mémoire' },
      { label: 'Périphériques PC' },
      { label: 'Réseau & WiFi' },
      { label: 'Drones' },
      { label: 'Réalité virtuelle' }
    ],
    featuredSubcategories: [
      { label: 'Smartphones', image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&q=80' },
      { label: 'Laptops', image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&q=80' },
      { label: 'Audio', image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400&q=80' },
      { label: 'Gaming', image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&q=80' },
      { label: 'Tablettes', image: 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=400&q=80' },
      { label: 'Photo', image: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400&q=80' },
      { label: 'Connecté', image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=400&q=80' },
      { label: 'Accessoires', image: 'https://images.unsplash.com/photo-1625948515291-69613efd103f?w=400&q=80' }
    ],
    brands: ['Apple', 'Sony', 'Bose', 'Samsung', 'Microsoft', 'Dell', 'HP', 'Lenovo', 'Xiaomi', 'Logitech'],
    videoReviews: [
      {
        title: 'iPhone 15 Pro Max — Test complet après 1 mois',
        author: 'TechReview FR',
        avatar: 'https://i.pravatar.cc/100?img=12',
        duration: '12:34',
        thumbnail: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&q=80',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        views: '284K vues'
      },
      {
        title: 'MacBook Pro M3 Max vs M2 Max — Le match',
        author: 'Apple Insider',
        avatar: 'https://i.pravatar.cc/100?img=33',
        duration: '8:52',
        thumbnail: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&q=80',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        views: '156K vues'
      },
      {
        title: 'AirPods Max : Unboxing & premières impressions',
        author: 'Audio&Co',
        avatar: 'https://i.pravatar.cc/100?img=5',
        duration: '6:17',
        thumbnail: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        views: '89K vues'
      },
      {
        title: 'PS5 Pro : 5 jeux testés en 4K 60fps',
        author: 'GamingPro',
        avatar: 'https://i.pravatar.cc/100?img=21',
        duration: '15:03',
        thumbnail: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=600&q=80',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        views: '512K vues'
      },
      {
        title: 'Sony A7R V : Notre test photo & vidéo pro',
        author: 'PhotoExpert',
        avatar: 'https://i.pravatar.cc/100?img=8',
        duration: '10:44',
        thumbnail: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=600&q=80',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
        views: '67K vues'
      },
      {
        title: 'iPad Pro M2 : Remplace-t-il un MacBook ?',
        author: 'ProductiviTech',
        avatar: 'https://i.pravatar.cc/100?img=14',
        duration: '9:28',
        thumbnail: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&q=80',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
        views: '124K vues'
      }
    ],
    banners: [
      {
        title: '-20% sur toute la gamme Apple',
        subtitle: 'Code : APPLE20 — jusqu\'à dimanche',
        cta: 'Découvrir',
        image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80',
        accent: 'from-gray-900/80 to-indigo-900/60'
      },
      {
        title: 'Garantie Premium 3 ans',
        subtitle: 'Offerte sur tout le high-tech',
        cta: 'En savoir plus',
        image: 'https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?w=800&q=80',
        accent: 'from-blue-900/80 to-purple-900/60'
      },
      {
        title: 'Reprise de votre ancien appareil',
        subtitle: 'Jusqu\'à 800€ de crédit boutique',
        cta: 'Estimer',
        image: 'https://images.unsplash.com/photo-1605170439002-90845e8c0137?w=800&q=80',
        accent: 'from-emerald-900/80 to-teal-900/60'
      }
    ],
    priceRanges: commonPriceRanges
  },

  mode: {
    slug: 'mode',
    name: 'Mode & Accessoires',
    matchCategory: 'Mode & Accessoires',
    tagline: 'L\'élégance dans chaque détail',
    description: 'Sacs, chaussures, lunettes, bijoux, prêt-à-porter — les plus grandes maisons et les pépites exclusives.',
    heroImage: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=1600&q=80',
    gradient: 'from-pink-600 via-rose-600 to-fuchsia-700',
    accentColor: 'rose',
    icon: 'Shirt',
    subcategories: [
      { label: 'Tous les articles' },
      { label: 'Sacs à main', query: 'sac' },
      { label: 'Sneakers', query: 'sneakers' },
      { label: 'Chaussures de ville' },
      { label: 'Lunettes de soleil', query: 'lunettes' },
      { label: 'Montres', query: 'watch' },
      { label: 'Bijoux' },
      { label: 'Ceintures' },
      { label: 'Prêt-à-porter femme' },
      { label: 'Prêt-à-porter homme' },
      { label: 'Maroquinerie' },
      { label: 'Écharpes & Foulards' },
      { label: 'Chapeaux' },
      { label: 'Collection exclusive' }
    ],
    featuredSubcategories: [
      { label: 'Sacs', image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&q=80' },
      { label: 'Sneakers', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80' },
      { label: 'Lunettes', image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&q=80' },
      { label: 'Montres', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80' },
      { label: 'Femme', image: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400&q=80' },
      { label: 'Homme', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80' },
      { label: 'Bijoux', image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&q=80' },
      { label: 'Accessoires', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&q=80' }
    ],
    brands: ['Nike', 'Adidas', 'Ray-Ban', 'Hermès', 'HELIGXIAM Collection', 'HELIGXIAM Couture', 'Gucci', 'Dior', 'Chanel', 'Louis Vuitton'],
    videoReviews: [
      {
        title: 'Sac Hermès Kelly — Comparatif authentique vs replica',
        author: 'Luxury Guide',
        avatar: 'https://i.pravatar.cc/100?img=20',
        duration: '11:22',
        thumbnail: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&q=80',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        views: '198K vues'
      },
      {
        title: 'Nike Air Jordan 1 — Ma collection de 50 paires',
        author: 'SneakerHead',
        avatar: 'https://i.pravatar.cc/100?img=31',
        duration: '14:56',
        thumbnail: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        views: '1.2M vues'
      },
      {
        title: 'Ray-Ban Aviator : Le test vérité après 5 ans',
        author: 'Style Masculin',
        avatar: 'https://i.pravatar.cc/100?img=52',
        duration: '7:11',
        thumbnail: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&q=80',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        views: '342K vues'
      },
      {
        title: 'Haute Couture : Essayage et mise en situation',
        author: 'Mode & Elle',
        avatar: 'https://i.pravatar.cc/100?img=45',
        duration: '9:40',
        thumbnail: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&q=80',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        views: '78K vues'
      },
      {
        title: 'Apple Watch Ultra 2 — Style au quotidien',
        author: 'Watch Review',
        avatar: 'https://i.pravatar.cc/100?img=18',
        duration: '8:33',
        thumbnail: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
        views: '203K vues'
      }
    ],
    banners: [
      {
        title: 'Collection Printemps 2026',
        subtitle: 'Les nouvelles tendances sont là',
        cta: 'Voir la collection',
        image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80',
        accent: 'from-pink-900/80 to-rose-900/60'
      },
      {
        title: '2ème article à -50%',
        subtitle: 'Sur toute la mode homme & femme',
        cta: 'En profiter',
        image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80',
        accent: 'from-fuchsia-900/80 to-purple-900/60'
      },
      {
        title: 'Retours gratuits 60 jours',
        subtitle: 'Essayez, gardez ce qui vous plaît',
        cta: 'Comment ça marche',
        image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80',
        accent: 'from-rose-900/80 to-orange-900/60'
      }
    ],
    priceRanges: commonPriceRanges
  },

  maison: {
    slug: 'maison',
    name: 'Maison & Décoration',
    matchCategory: 'Maison & Décoration',
    tagline: 'Créez le foyer de vos rêves',
    description: 'Mobilier, décoration, arts de la table, électroménager premium — tout pour sublimer votre intérieur.',
    heroImage: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1600&q=80',
    gradient: 'from-amber-600 via-orange-600 to-red-700',
    accentColor: 'amber',
    icon: 'Home',
    subcategories: [
      { label: 'Tout le rayon' },
      { label: 'Mobilier salon' },
      { label: 'Mobilier chambre' },
      { label: 'Décoration murale' },
      { label: 'Luminaires' },
      { label: 'Vases & Objets déco', query: 'vase' },
      { label: 'Linge de maison' },
      { label: 'Arts de la table' },
      { label: 'Électroménager', query: 'machine' },
      { label: 'Rangement' },
      { label: 'Cuisine équipée' },
      { label: 'Salle de bain' },
      { label: 'Jardin & Terrasse' },
      { label: 'Tapis' }
    ],
    featuredSubcategories: [
      { label: 'Salon', image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80' },
      { label: 'Chambre', image: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=400&q=80' },
      { label: 'Cuisine', image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&q=80' },
      { label: 'Luminaires', image: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=400&q=80' },
      { label: 'Déco', image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=400&q=80' },
      { label: 'Textile', image: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=400&q=80' },
      { label: 'Rangement', image: 'https://images.unsplash.com/photo-1558211583-d26f610c1eb1?w=400&q=80' },
      { label: 'Jardin', image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&q=80' }
    ],
    brands: ['HELIGXIAM Home', 'DeLonghi', 'IKEA', 'Kartell', 'Maisons du Monde', 'Habitat', 'Le Creuset', 'Philips', 'Dyson'],
    videoReviews: [
      {
        title: 'Machine DeLonghi Dinamica — 1 mois d\'utilisation',
        author: 'Café Passion',
        avatar: 'https://i.pravatar.cc/100?img=23',
        duration: '10:12',
        thumbnail: 'https://images.unsplash.com/photo-1595259601701-ccc4aa91c073?w=600&q=80',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        views: '92K vues'
      },
      {
        title: 'Salon minimaliste : le guide déco 2026',
        author: 'Déco Inspiration',
        avatar: 'https://i.pravatar.cc/100?img=47',
        duration: '13:45',
        thumbnail: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        views: '234K vues'
      },
      {
        title: 'Vase design : 10 façons de le mettre en valeur',
        author: 'Home Tour',
        avatar: 'https://i.pravatar.cc/100?img=29',
        duration: '6:22',
        thumbnail: 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?w=600&q=80',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        views: '45K vues'
      },
      {
        title: 'Cuisine scandinave : budget 5000€',
        author: 'Ma Maison',
        avatar: 'https://i.pravatar.cc/100?img=11',
        duration: '18:03',
        thumbnail: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        views: '512K vues'
      }
    ],
    banners: [
      {
        title: 'Livraison & montage offerts',
        subtitle: 'Sur tout le mobilier de plus de 499€',
        cta: 'En profiter',
        image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80',
        accent: 'from-amber-900/80 to-orange-900/60'
      },
      {
        title: 'Pack Cuisine -30%',
        subtitle: 'Machine + moulin + accessoires',
        cta: 'Découvrir',
        image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80',
        accent: 'from-red-900/80 to-rose-900/60'
      },
      {
        title: 'Éco-responsable',
        subtitle: 'Mobilier en matériaux recyclés',
        cta: 'Nos engagements',
        image: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=800&q=80',
        accent: 'from-green-900/80 to-teal-900/60'
      }
    ],
    priceRanges: commonPriceRanges
  },

  beaute: {
    slug: 'beaute',
    name: 'Beauté & Santé',
    matchCategory: 'Beauté & Santé',
    tagline: 'Révélez votre beauté naturelle',
    description: 'Parfums, soins, maquillage, bien-être — une sélection des marques les plus exigeantes.',
    heroImage: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1600&q=80',
    gradient: 'from-fuchsia-600 via-pink-600 to-rose-600',
    accentColor: 'pink',
    icon: 'Sparkles',
    subcategories: [
      { label: 'Tout voir' },
      { label: 'Parfums femme', query: 'parfum' },
      { label: 'Parfums homme' },
      { label: 'Maquillage' },
      { label: 'Soin visage' },
      { label: 'Soin corps' },
      { label: 'Cheveux' },
      { label: 'Bien-être' },
      { label: 'Compléments alimentaires' },
      { label: 'Hygiène dentaire' },
      { label: 'Rasage & épilation' },
      { label: 'Bio & naturel' },
      { label: 'Coffrets cadeaux' }
    ],
    featuredSubcategories: [
      { label: 'Parfums', image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&q=80' },
      { label: 'Maquillage', image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&q=80' },
      { label: 'Soin visage', image: 'https://images.unsplash.com/photo-1570194065650-d99fb4bedf0a?w=400&q=80' },
      { label: 'Soin corps', image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&q=80' },
      { label: 'Cheveux', image: 'https://images.unsplash.com/photo-1560869713-da86a9ec0744?w=400&q=80' },
      { label: 'Bien-être', image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&q=80' },
      { label: 'Bio', image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&q=80' },
      { label: 'Coffrets', image: 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=400&q=80' }
    ],
    brands: ['Tom Ford', 'Chanel', 'Dior', 'Yves Saint Laurent', 'Estée Lauder', 'La Roche-Posay', 'Vichy', 'Oral-B', 'L\'Occitane'],
    videoReviews: [
      {
        title: 'Tom Ford Black Orchid — Le parfum culte décrypté',
        author: 'Parfum Review',
        avatar: 'https://i.pravatar.cc/100?img=41',
        duration: '7:48',
        thumbnail: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=600&q=80',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        views: '167K vues'
      },
      {
        title: 'Ma routine soin de 30 ans avant / après',
        author: 'SkinCare Daily',
        avatar: 'https://i.pravatar.cc/100?img=44',
        duration: '11:32',
        thumbnail: 'https://images.unsplash.com/photo-1570194065650-d99fb4bedf0a?w=600&q=80',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        views: '892K vues'
      },
      {
        title: 'Oral-B iO Serie 9 vs Philips Sonicare',
        author: 'Health Expert',
        avatar: 'https://i.pravatar.cc/100?img=17',
        duration: '9:15',
        thumbnail: 'https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=600&q=80',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        views: '54K vues'
      },
      {
        title: 'Top 10 parfums 2026 par un nez pro',
        author: 'Fragrances',
        avatar: 'https://i.pravatar.cc/100?img=38',
        duration: '16:21',
        thumbnail: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600&q=80',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        views: '345K vues'
      }
    ],
    banners: [
      {
        title: 'Échantillon offert',
        subtitle: 'Dès 49€ d\'achat en parfumerie',
        cta: 'Voir les parfums',
        image: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800&q=80',
        accent: 'from-fuchsia-900/80 to-pink-900/60'
      },
      {
        title: 'Bio & Clean Beauty',
        subtitle: 'Ingrédients 100% naturels certifiés',
        cta: 'Découvrir',
        image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800&q=80',
        accent: 'from-emerald-900/80 to-green-900/60'
      },
      {
        title: 'Diagnostic beauté offert',
        subtitle: 'Par nos expertes certifiées',
        cta: 'Prendre RDV',
        image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=80',
        accent: 'from-rose-900/80 to-pink-900/60'
      }
    ],
    priceRanges: commonPriceRanges
  },

  sport: {
    slug: 'sport',
    name: 'Sport & Fitness',
    matchCategory: 'Sport & Fitness',
    tagline: 'Dépassez vos limites',
    description: 'Équipement fitness, outdoor, vélo, running, yoga — tout pour atteindre vos objectifs.',
    heroImage: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1600&q=80',
    gradient: 'from-emerald-600 via-teal-600 to-cyan-700',
    accentColor: 'emerald',
    icon: 'Dumbbell',
    subcategories: [
      { label: 'Tout le rayon' },
      { label: 'Fitness maison' },
      { label: 'Musculation' },
      { label: 'Yoga & Pilates' },
      { label: 'Running' },
      { label: 'Vélo' },
      { label: 'Randonnée' },
      { label: 'Sports collectifs' },
      { label: 'Natation' },
      { label: 'Sports de combat' },
      { label: 'Montagne & Ski' },
      { label: 'Tennis & Raquettes' },
      { label: 'Connectés' },
      { label: 'Nutrition sportive' }
    ],
    featuredSubcategories: [
      { label: 'Fitness', image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80' },
      { label: 'Running', image: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=400&q=80' },
      { label: 'Yoga', image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=80' },
      { label: 'Vélo', image: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=400&q=80' },
      { label: 'Rando', image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&q=80' },
      { label: 'Ski', image: 'https://images.unsplash.com/photo-1551524559-8af4e6624178?w=400&q=80' },
      { label: 'Natation', image: 'https://images.unsplash.com/photo-1560089000-7433a4ebbd64?w=400&q=80' },
      { label: 'Connecté', image: 'https://images.unsplash.com/photo-1557166983-5939644443ed?w=400&q=80' }
    ],
    brands: ['Nike', 'Adidas', 'Under Armour', 'Decathlon', 'Salomon', 'Garmin', 'Fitbit', 'Wilson', 'Babolat'],
    videoReviews: [
      {
        title: 'Home gym à 1000€ : notre setup complet',
        author: 'Fitness Pro',
        avatar: 'https://i.pravatar.cc/100?img=9',
        duration: '14:21',
        thumbnail: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        views: '421K vues'
      },
      {
        title: 'Tapis yoga premium : le comparatif',
        author: 'Yoga Life',
        avatar: 'https://i.pravatar.cc/100?img=48',
        duration: '8:33',
        thumbnail: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&q=80',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        views: '156K vues'
      },
      {
        title: 'Marathon Paris : équipement testé',
        author: 'Run Expert',
        avatar: 'https://i.pravatar.cc/100?img=24',
        duration: '12:08',
        thumbnail: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=600&q=80',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        views: '89K vues'
      }
    ],
    banners: [
      {
        title: 'Pack rentrée sportive',
        subtitle: '3 articles achetés = -30%',
        cta: 'Composer mon pack',
        image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80',
        accent: 'from-emerald-900/80 to-teal-900/60'
      },
      {
        title: 'Coach en ligne offert',
        subtitle: '1 mois d\'abonnement fitness digital',
        cta: 'En profiter',
        image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
        accent: 'from-cyan-900/80 to-blue-900/60'
      },
      {
        title: 'Livraison express 24h',
        subtitle: 'Sur tout le matériel en stock',
        cta: 'Commander',
        image: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80',
        accent: 'from-lime-900/80 to-green-900/60'
      }
    ],
    priceRanges: commonPriceRanges
  },

  auto: {
    slug: 'auto',
    name: 'Automobile',
    matchCategory: 'Automobile',
    tagline: 'L\'équipement au service de votre route',
    description: 'Entretien, accessoires, high-tech embarqué, pièces détachées — tout pour votre véhicule.',
    heroImage: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1600&q=80',
    gradient: 'from-slate-700 via-gray-700 to-zinc-800',
    accentColor: 'slate',
    icon: 'Car',
    subcategories: [
      { label: 'Tout l\'univers auto' },
      { label: 'Entretien & Nettoyage' },
      { label: 'Pneus & Jantes' },
      { label: 'GPS & Multimédia' },
      { label: 'Dashcam & Radars' },
      { label: 'Accessoires intérieur' },
      { label: 'Sièges bébé' },
      { label: 'Coffres de toit' },
      { label: 'Batteries & Démarrage' },
      { label: 'Éclairage' },
      { label: 'Huiles & Fluides' },
      { label: 'Outillage auto' },
      { label: 'Moto & Scooter' },
      { label: 'Sécurité routière' }
    ],
    featuredSubcategories: [
      { label: 'Entretien', image: 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?w=400&q=80' },
      { label: 'GPS', image: 'https://images.unsplash.com/photo-1543351611-58f69d7c1781?w=400&q=80' },
      { label: 'Pneus', image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&q=80' },
      { label: 'Dashcam', image: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400&q=80' },
      { label: 'Sièges bébé', image: 'https://images.unsplash.com/photo-1590765379810-08d1e7d8ce49?w=400&q=80' },
      { label: 'Intérieur', image: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400&q=80' },
      { label: 'Moto', image: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=400&q=80' },
      { label: 'Outillage', image: 'https://images.unsplash.com/photo-1530435460869-d13625c69bbf?w=400&q=80' }
    ],
    brands: ['Bosch', 'Michelin', 'Pirelli', 'Garmin', 'TomTom', 'Castrol', 'Norauto', 'Meguiar\'s'],
    videoReviews: [
      {
        title: 'Dashcam 4K : notre top 5 testé sur route',
        author: 'Auto Journal',
        avatar: 'https://i.pravatar.cc/100?img=15',
        duration: '11:47',
        thumbnail: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=600&q=80',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        views: '92K vues'
      },
      {
        title: 'Kit détailing complet : démo sur voiture noire',
        author: 'DetailingPro',
        avatar: 'https://i.pravatar.cc/100?img=27',
        duration: '20:14',
        thumbnail: 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?w=600&q=80',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        views: '284K vues'
      },
      {
        title: 'GPS Garmin vs TomTom : le duel 2026',
        author: 'Tech Auto',
        avatar: 'https://i.pravatar.cc/100?img=36',
        duration: '9:52',
        thumbnail: 'https://images.unsplash.com/photo-1543351611-58f69d7c1781?w=600&q=80',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        views: '48K vues'
      }
    ],
    banners: [
      {
        title: 'Montage offert',
        subtitle: 'En centre auto partenaire',
        cta: 'Trouver un centre',
        image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80',
        accent: 'from-slate-900/80 to-gray-900/60'
      },
      {
        title: '-40% entretien hiver',
        subtitle: 'Antigel, lave-glace, pneus',
        cta: 'En profiter',
        image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&q=80',
        accent: 'from-blue-900/80 to-indigo-900/60'
      },
      {
        title: 'Garantie pièces 5 ans',
        subtitle: 'Sur toute la gamme premium',
        cta: 'En savoir plus',
        image: 'https://images.unsplash.com/photo-1493238792000-8113da705763?w=800&q=80',
        accent: 'from-zinc-900/80 to-neutral-900/60'
      }
    ],
    priceRanges: commonPriceRanges
  }
};

// Accept multiple slug aliases pointing to same config
export const CATEGORY_SLUG_ALIASES: Record<string, string> = {
  'electronique': 'electronique',
  'électronique': 'electronique',
  'high-tech': 'electronique',
  'mode': 'mode',
  'mode-&-accessoires': 'mode',
  'mode-accessoires': 'mode',
  'maison': 'maison',
  'maison-&-décoration': 'maison',
  'maison-deco': 'maison',
  'beaute': 'beaute',
  'beauté-&-santé': 'beaute',
  'beaute-sante': 'beaute',
  'sport': 'sport',
  'sport-fitness': 'sport',
  'auto': 'auto',
  'automobile': 'auto'
};

export function resolveCategoryConfig(rawSlug: string | null): CategoryConfig | null {
  if (!rawSlug) return null;
  const normalized = decodeURIComponent(rawSlug).toLowerCase().trim();
  const key = CATEGORY_SLUG_ALIASES[normalized] || normalized;
  return CATEGORY_CONFIGS[key] || null;
}

import { Component, ElementRef, OnDestroy, OnInit, QueryList, ViewChildren, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  LucideAngularModule,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  TrendingUp,
  Award,
  Package,
  Shield,
  Zap,
  Crown,
  Flame,
  Clock,
  Tag,
  Gift,
  Truck,
  Headphones,
  ShieldCheck,
  Star
} from 'lucide-angular';
import { ProductCardComponent } from '../../components/product-card/product-card.component';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { CatalogService } from '../../services/catalog.service';
import { Product } from '../../models/product.model';

interface UniverseTile {
  label: string;
  image: string;
  query: string;
}

interface Universe {
  title: string;
  accentColor: string;
  categoryRoute: string;
  tiles: UniverseTile[];
}

interface PromoCard {
  title: string;
  subtitle: string;
  cta: string;
  gradient: string;
  accent: string;
  route: any[];
  queryParams?: any;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule, ProductCardComponent, TranslatePipe],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {
  @ViewChildren('carousel') carousels!: QueryList<ElementRef<HTMLElement>>;

  featuredProducts: Product[] = [];
  bestSellers: Product[] = [];
  promoProducts: Product[] = [];
  premiumProducts: Product[] = [];
  allProducts: Product[] = [];
  budgetProducts: Product[] = [];

  // Hero carousel
  heroSlides: Array<{
    badge: string;
    title: string;
    subtitle: string;
    image: string;
    cta: string;
    route: any[];
    queryParams?: any;
    accent: string;
  }> = [];
  currentSlide = 0;
  private slideInterval?: ReturnType<typeof setInterval>;

  // Lucide icons
  readonly ChevronRight = ChevronRight;
  readonly ChevronLeft = ChevronLeft;
  readonly Sparkles = Sparkles;
  readonly TrendingUp = TrendingUp;
  readonly Award = Award;
  readonly Package = Package;
  readonly Shield = Shield;
  readonly Zap = Zap;
  readonly Crown = Crown;
  readonly Flame = Flame;
  readonly Clock = Clock;
  readonly Tag = Tag;
  readonly Gift = Gift;
  readonly Truck = Truck;
  readonly Headphones = Headphones;
  readonly ShieldCheck = ShieldCheck;
  readonly Star = Star;

  // Cartes "Univers" (4 tuiles 2x2) - style Amazon
  universesTop: Universe[] = [
    {
      title: 'High-Tech',
      accentColor: 'from-indigo-500 to-blue-500',
      categoryRoute: '/category/électronique',
      tiles: [
        { label: 'Ordinateurs', image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&q=80', query: 'ordinateur' },
        { label: 'Smartphones', image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&q=80', query: 'iphone' },
        { label: 'Audio', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80', query: 'airpods' },
        { label: 'Photo', image: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400&q=80', query: 'sony' }
      ]
    },
    {
      title: 'Mode & Luxe',
      accentColor: 'from-pink-500 to-rose-500',
      categoryRoute: '/category/mode-&-accessoires',
      tiles: [
        { label: 'Sacs à main', image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&q=80', query: 'sac' },
        { label: 'Sneakers', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80', query: 'nike' },
        { label: 'Lunettes', image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&q=80', query: 'ray-ban' },
        { label: 'Montres', image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400&q=80', query: 'watch' }
      ]
    },
    {
      title: 'Maison & Déco',
      accentColor: 'from-amber-500 to-orange-500',
      categoryRoute: '/category/maison-&-décoration',
      tiles: [
        { label: 'Cuisine', image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&q=80', query: 'café' },
        { label: 'Décoration', image: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=400&q=80', query: 'vase' },
        { label: 'Luminaires', image: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=400&q=80', query: 'lampe' },
        { label: 'Textile', image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80', query: 'textile' }
      ]
    },
    {
      title: 'Beauté & Bien-être',
      accentColor: 'from-purple-500 to-fuchsia-500',
      categoryRoute: '/category/beauté-&-santé',
      tiles: [
        { label: 'Parfums', image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&q=80', query: 'parfum' },
        { label: 'Maquillage', image: 'https://images.unsplash.com/photo-1522335789203-aaa5a29b1d79?w=400&q=80', query: 'maquillage' },
        { label: 'Soins', image: 'https://images.unsplash.com/photo-1570194065650-d99fb4bedf0a?w=400&q=80', query: 'soin' },
        { label: 'Cheveux', image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&q=80', query: 'cheveux' }
      ]
    }
  ];

  universesBottom: Universe[] = [
    {
      title: 'Gaming',
      accentColor: 'from-violet-500 to-purple-500',
      categoryRoute: '/search',
      tiles: [
        { label: 'Consoles', image: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=400&q=80', query: 'playstation' },
        { label: 'Manettes', image: 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=400&q=80', query: 'manette' },
        { label: 'Casques', image: 'https://images.unsplash.com/photo-1599669454699-248893623440?w=400&q=80', query: 'casque gaming' },
        { label: 'Accessoires', image: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=400&q=80', query: 'accessoire gaming' }
      ]
    },
    {
      title: 'Sport & Fitness',
      accentColor: 'from-emerald-500 to-green-500',
      categoryRoute: '/category/sport-&-fitness',
      tiles: [
        { label: 'Musculation', image: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&q=80', query: 'musculation' },
        { label: 'Running', image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&q=80', query: 'running' },
        { label: 'Yoga', image: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=400&q=80', query: 'yoga' },
        { label: 'Vélo', image: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=400&q=80', query: 'vélo' }
      ]
    },
    {
      title: 'Jardin & Bricolage',
      accentColor: 'from-lime-500 to-green-600',
      categoryRoute: '/search',
      tiles: [
        { label: 'Outils', image: 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=400&q=80', query: 'outils' },
        { label: 'Jardin', image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&q=80', query: 'jardin' },
        { label: 'Électricité', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80', query: 'électricité' },
        { label: 'Barbecue', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&q=80', query: 'barbecue' }
      ]
    },
    {
      title: 'Auto & Moto',
      accentColor: 'from-slate-500 to-gray-700',
      categoryRoute: '/category/automobile',
      tiles: [
        { label: 'Accessoires auto', image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&q=80', query: 'auto' },
        { label: 'GPS', image: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=400&q=80', query: 'gps' },
        { label: 'Casques moto', image: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=400&q=80', query: 'casque moto' },
        { label: 'Entretien', image: 'https://images.unsplash.com/photo-1630328296063-ef06adc73814?w=400&q=80', query: 'entretien' }
      ]
    }
  ];

  // Bandeaux promo compacts
  promoCardsTop: PromoCard[] = [
    {
      title: 'Soldes Printemps',
      subtitle: 'Jusqu\'à -40% sur 1000+ articles',
      cta: 'Découvrir',
      gradient: 'from-pink-500 via-rose-500 to-red-500',
      accent: 'bg-white/20',
      route: ['/search'],
      queryParams: { promo: 'true' }
    },
    {
      title: 'Collection Premium',
      subtitle: 'Sélection exclusive haut de gamme',
      cta: 'Explorer',
      gradient: 'from-slate-800 via-gray-900 to-black',
      accent: 'bg-yellow-400/20',
      route: ['/search'],
      queryParams: { badge: 'Premium' }
    },
    {
      title: 'App mobile',
      subtitle: '-10€ offerts sur votre 1ère commande',
      cta: 'Profiter',
      gradient: 'from-amber-500 via-orange-500 to-yellow-500',
      accent: 'bg-white/20',
      route: ['/account']
    }
  ];

  promoCardsBottom: PromoCard[] = [
    {
      title: 'Livraison Gratuite',
      subtitle: 'Dès 49€ d\'achat, partout en France',
      cta: 'En savoir plus',
      gradient: 'from-indigo-500 via-blue-500 to-cyan-500',
      accent: 'bg-white/20',
      route: ['/']
    },
    {
      title: 'Parrainage',
      subtitle: '20€ offerts par ami parrainé',
      cta: 'Parrainer',
      gradient: 'from-emerald-500 via-green-500 to-teal-500',
      accent: 'bg-white/20',
      route: ['/profile']
    },
    {
      title: 'Cartes cadeaux',
      subtitle: 'À partir de 25€ • E-cartes instantanées',
      cta: 'Offrir',
      gradient: 'from-purple-500 via-violet-500 to-fuchsia-500',
      accent: 'bg-white/20',
      route: ['/search'],
      queryParams: { badge: 'Exclusif' }
    }
  ];

  // Médias showcase (images animées — fiables, sans iframe YouTube ni hotlink vidéo)
  readonly showcaseVideo1Poster =
    'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1600&q=80';
  readonly showcaseVideo2Poster =
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1600&q=80';

  constructor(
    private catalogService: CatalogService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.catalogService.loadProducts().then((products) => {
      this.allProducts = products;
      this.featuredProducts = products.slice(0, 6);
      this.bestSellers = products.filter((p) => p.badge === 'Bestseller' || p.rating >= 4.8);
      this.promoProducts = products.filter((p) => p.originalPrice);
      this.premiumProducts = products.filter(
        (p) => p.badge === 'Premium' || p.badge === 'Exclusif' || p.badge === 'Pro'
      );
      this.budgetProducts = [...products].sort((a, b) => a.price - b.price).slice(0, 4);
      this.buildHeroSlides();
      this.cdr.markForCheck();
    });
    this.startAutoPlay();
  }

  ngOnDestroy(): void {
    this.stopAutoPlay();
  }


  private buildHeroSlides(): void {
    const heroProducts = this.allProducts.slice(0, 4);
    this.heroSlides = [
      {
        badge: 'Nouveauté',
        title: 'Collection Printemps 2026',
        subtitle: 'Découvrez les pièces exclusives de la saison',
        image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80',
        cta: 'Explorer la collection',
        route: ['/search'],
        queryParams: { badge: 'Nouveau' },
        accent: 'from-indigo-500/80 to-purple-600/80'
      },
      ...heroProducts.map(p => ({
        badge: p.badge || 'Sélection',
        title: p.name,
        subtitle: p.brand ? `${p.brand} • ${p.price.toFixed(2)}€` : `${p.price.toFixed(2)}€`,
        image: p.image,
        cta: 'Voir le produit',
        route: ['/product', p.id],
        accent: 'from-purple-600/60 to-pink-600/60'
      })),
      {
        badge: 'Offre limitée',
        title: 'Ventes Flash -70%',
        subtitle: 'Plus que 24h pour profiter des meilleures remises',
        image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&q=80',
        cta: 'Profiter maintenant',
        route: ['/search'],
        queryParams: { promo: 'true' },
        accent: 'from-red-600/80 to-orange-500/80'
      }
    ];
  }

  private startAutoPlay(): void {
    this.stopAutoPlay();
    this.slideInterval = setInterval(() => this.nextSlide(), 5000);
  }

  private stopAutoPlay(): void {
    if (this.slideInterval) {
      clearInterval(this.slideInterval);
      this.slideInterval = undefined;
    }
  }

  goToSlide(index: number): void {
    this.currentSlide = index;
    this.startAutoPlay();
  }

  nextSlide(): void {
    this.currentSlide = (this.currentSlide + 1) % this.heroSlides.length;
  }

  prevSlide(): void {
    this.currentSlide = (this.currentSlide - 1 + this.heroSlides.length) % this.heroSlides.length;
    this.startAutoPlay();
  }

  pauseAutoPlay(): void {
    this.stopAutoPlay();
  }

  resumeAutoPlay(): void {
    this.startAutoPlay();
  }

  scrollCarousel(carouselId: string, direction: 'left' | 'right'): void {
    const el = document.getElementById(carouselId);
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.8;
    el.scrollBy({
      left: direction === 'right' ? scrollAmount : -scrollAmount,
      behavior: 'smooth'
    });
  }
}

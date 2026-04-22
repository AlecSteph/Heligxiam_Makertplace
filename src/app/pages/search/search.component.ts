import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  Trophy,
  Sparkles,
  Award,
  Crown,
  Flame,
  Zap,
  Tag,
  Search,
  SlidersHorizontal,
  Star,
  TrendingUp,
  Clock,
  Package,
  ChevronRight,
  Filter,
  X,
  Check,
  Percent,
  ShieldCheck,
  Truck,
  Heart,
  ArrowUpDown,
  Grid2x2,
  List as ListIcon,
  Flag,
  Users,
  ThumbsUp
} from 'lucide-angular';
import { ProductCardComponent } from '../../components/product-card/product-card.component';
import { PRODUCTS, CATEGORIES } from '../../data/products.data';
import { Product } from '../../models/product.model';

export type CollectionType =
  | 'default'
  | 'bestsellers'
  | 'new'
  | 'brands'
  | 'premium'
  | 'promotions'
  | 'flash'
  | 'deals';

interface CollectionConfig {
  type: CollectionType;
  eyebrow: string;
  title: string;
  subtitle: string;
  description: string;
  icon: any;
  gradient: string;
  accentHex: string;
  darkText?: boolean;
  tagline?: string;
  heroImage?: string;
  heroStats: { label: string; value: string; icon: any }[];
  perks: { icon: any; title: string; desc: string }[];
  showCountdown?: boolean;
  showPodium?: boolean;
  showBrands?: boolean;
  showLuxuryBand?: boolean;
  showSavings?: boolean;
  badgeFilter?: string;
  brandFilter?: string;
  promoOnly?: boolean;
  flashOnly?: boolean;
  defaultSort?: string;
}

interface BrandEntry {
  name: string;
  count: number;
  avgRating: number;
  logo: string;
  hero?: Product;
}

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule, ProductCardComponent],
  templateUrl: './search.component.html',
  styleUrl: './search.component.css'
})
export class SearchComponent implements OnInit, OnDestroy {
  // Icons
  readonly Search = Search;
  readonly SlidersHorizontal = SlidersHorizontal;
  readonly Star = Star;
  readonly TrendingUp = TrendingUp;
  readonly Clock = Clock;
  readonly Package = Package;
  readonly ChevronRight = ChevronRight;
  readonly Filter = Filter;
  readonly X = X;
  readonly Check = Check;
  readonly Percent = Percent;
  readonly ShieldCheck = ShieldCheck;
  readonly Truck = Truck;
  readonly Heart = Heart;
  readonly ArrowUpDown = ArrowUpDown;
  readonly Grid2x2 = Grid2x2;
  readonly ListIcon = ListIcon;
  readonly Flag = Flag;
  readonly Users = Users;
  readonly ThumbsUp = ThumbsUp;
  readonly Trophy = Trophy;
  readonly Sparkles = Sparkles;
  readonly Award = Award;
  readonly Crown = Crown;
  readonly Flame = Flame;
  readonly Zap = Zap;
  readonly Tag = Tag;

  // Query / filters
  queryParam = '';
  selectedCategory = '';
  selectedBrand = '';
  priceRange: [number, number] = [0, 4000];
  minRating = 0;
  sortBy = 'relevance';
  showFilters = false;
  showInStockOnly = false;

  // Data
  products = PRODUCTS;
  categories = CATEGORIES;
  filteredProducts: Product[] = [];
  collectionProducts: Product[] = []; // before user filters

  // Collection context
  collection: CollectionConfig = this.buildConfig('default');

  // Cached derived data (computed once per collection change, NOT per CD)
  podium: Product[] = [];
  brands: BrandEntry[] = [];
  bestDiscountPct = 0;
  totalSavingsAmount = 0;

  // Countdown (flash sales)
  countdown = { hours: '00', minutes: '00', seconds: '00' };
  private countdownTimer?: ReturnType<typeof setInterval>;
  private flashEnd: Date = new Date();

  // View mode
  viewMode: 'grid' | 'list' = 'grid';

  // Catalog tiles (Amazon-like browse-by-category grid for default view)
  readonly catalogTiles: Array<{
    label: string;
    image: string;
    route: any[];
    queryParams?: any;
    tone?: 'deal' | 'new' | 'hot' | 'premium';
  }> = [
    {
      label: 'Prix cassés',
      image: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=600&q=80',
      route: ['/search'],
      queryParams: { collection: 'promotions' },
      tone: 'deal'
    },
    {
      label: 'Électronique',
      image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80',
      route: ['/category', 'electronique']
    },
    {
      label: 'Livres & Médias',
      image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&q=80',
      route: ['/search'],
      queryParams: { q: 'livre' }
    },
    {
      label: 'Mode',
      image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80',
      route: ['/category', 'mode']
    },
    {
      label: 'Animalerie',
      image: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=600&q=80',
      route: ['/search'],
      queryParams: { q: 'animal' }
    },
    {
      label: 'Beauté & Parfum',
      image: 'https://images.unsplash.com/photo-1522335789203-aaa686ef3fb4?w=600&q=80',
      route: ['/category', 'beaute']
    },
    {
      label: 'Auto & Moto',
      image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&q=80',
      route: ['/category', 'auto']
    },
    {
      label: 'Cuisine & Maison',
      image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80',
      route: ['/category', 'maison']
    },
    {
      label: 'Bricolage',
      image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&q=80',
      route: ['/search'],
      queryParams: { q: 'outil' }
    },
    {
      label: 'Informatique',
      image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&q=80',
      route: ['/search'],
      queryParams: { q: 'ordinateur' }
    },
    {
      label: 'Sport & Fitness',
      image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80',
      route: ['/category', 'sport']
    },
    {
      label: 'Meilleures ventes',
      image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80',
      route: ['/search'],
      queryParams: { collection: 'bestsellers' },
      tone: 'hot'
    },
    {
      label: 'Nouveautés',
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80',
      route: ['/search'],
      queryParams: { collection: 'new' },
      tone: 'new'
    },
    {
      label: 'Marques Premium',
      image: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=600&q=80',
      route: ['/search'],
      queryParams: { collection: 'premium' },
      tone: 'premium'
    },
    {
      label: 'Ventes Flash',
      image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&q=80',
      route: ['/search'],
      queryParams: { collection: 'flash' },
      tone: 'deal'
    }
  ];

  get showCatalogTiles(): boolean {
    return this.collection.type === 'default'
      && !this.queryParam
      && !this.selectedCategory
      && !this.selectedBrand
      && this.minRating === 0
      && !this.showInStockOnly
      && this.priceRange[0] === 0
      && this.priceRange[1] === 4000;
  }

  constructor(
    private route: ActivatedRoute,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // End of flash sale: next midnight
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    this.flashEnd = end;
    this.tickCountdown();

    // Brands are global (depend only on PRODUCTS) → compute once
    this.brands = this.computeBrands();

    this.route.queryParams.subscribe(params => {
      this.queryParam = params['q'] || '';
      this.collection = this.resolveCollection(params);
      this.sortBy = this.collection.defaultSort || 'relevance';
      this.buildCollectionSet();
      this.filterProducts();
      this.startCountdownIfNeeded();
    });
  }

  private startCountdownIfNeeded(): void {
    // Only run the ticker when the flash page is active
    if (this.collection.showCountdown) {
      if (this.countdownTimer) return;
      this.zone.runOutsideAngular(() => {
        this.countdownTimer = setInterval(() => {
          this.tickCountdown();
          // trigger a single targeted change detection instead of global
          this.zone.run(() => this.cdr.markForCheck());
        }, 1000);
      });
    } else if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = undefined;
    }
  }

  ngOnDestroy(): void {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
  }

  // ====== Collection resolver ======
  private resolveCollection(params: any): CollectionConfig {
    if (params['promo'] === 'flash') return this.buildConfig('flash');
    if (params['promo'] === 'deals') return this.buildConfig('deals');
    if (params['promo'] === 'true') return this.buildConfig('promotions');
    if (params['badge'] === 'Premium') return this.buildConfig('premium');
    if (params['badge'] === 'Nouveau') return this.buildConfig('new');
    if (params['tab'] === 'brands') return this.buildConfig('brands');
    if (params['sort'] === 'rating') return this.buildConfig('bestsellers');
    return this.buildConfig('default');
  }

  private buildConfig(type: CollectionType): CollectionConfig {
    switch (type) {
      case 'bestsellers':
        return {
          type,
          eyebrow: 'Top produits',
          title: 'Meilleures ventes',
          subtitle: 'Les coups de cœur de notre communauté',
          description: 'Découvrez les produits les plus appréciés des acheteurs HELIGXIAM ce mois-ci. Notes vérifiées, avis réels, satisfaction garantie.',
          tagline: '#1 à #50 — mis à jour chaque jour',
          icon: Trophy,
          gradient: 'from-amber-500 via-orange-500 to-red-600',
          accentHex: '#f59e0b',
          heroStats: [
            { label: 'Produits notés 4★+', value: '12 847', icon: Star },
            { label: 'Avis vérifiés', value: '420 K', icon: Check },
            { label: 'Note moyenne', value: '4,7/5', icon: ThumbsUp }
          ],
          perks: [
            { icon: ShieldCheck, title: 'Achats vérifiés', desc: '100% des avis proviennent de clients ayant acheté le produit' },
            { icon: Truck, title: 'Livraison express', desc: 'Gratuite dès 99€, 24h en zones éligibles' },
            { icon: ThumbsUp, title: 'Retour 60 jours', desc: 'Satisfait ou remboursé sans condition' }
          ],
          showPodium: true,
          defaultSort: 'rating'
        };

      case 'new':
        return {
          type,
          eyebrow: 'Cette semaine',
          title: 'Nouveautés',
          subtitle: 'Les dernières pépites fraîchement référencées',
          description: 'Chaque semaine, nos acheteurs sélectionnent les meilleures nouveautés du marché. Soyez parmi les premiers à en profiter.',
          tagline: 'Nouveaux produits ajoutés dans les 30 derniers jours',
          icon: Sparkles,
          gradient: 'from-cyan-500 via-blue-600 to-indigo-700',
          accentHex: '#06b6d4',
          heroStats: [
            { label: 'Nouveautés cette semaine', value: '86', icon: Sparkles },
            { label: 'Nouvelles marques', value: '12', icon: Flag },
            { label: 'Pré-commandes ouvertes', value: '24', icon: Clock }
          ],
          perks: [
            { icon: Sparkles, title: 'Ajouts hebdomadaires', desc: 'De nouveaux produits tous les lundis à 8h' },
            { icon: Zap, title: 'Accès anticipé Premium', desc: 'Les membres Premium découvrent les nouveautés 48h avant' },
            { icon: ShieldCheck, title: 'Qualité validée', desc: 'Tests internes avant mise en ligne' }
          ],
          badgeFilter: 'Nouveau',
          defaultSort: 'relevance'
        };

      case 'brands':
        return {
          type,
          eyebrow: 'Enseignes partenaires',
          title: 'Marques Premium',
          subtitle: 'Les griffes les plus désirées, réunies ici',
          description: 'De Apple à Tom Ford en passant par nos collections maison, explorez l\'univers de nos marques partenaires rigoureusement sélectionnées.',
          tagline: 'Plus de 200 marques référencées',
          icon: Award,
          gradient: 'from-slate-800 via-zinc-900 to-stone-800',
          accentHex: '#eab308',
          heroStats: [
            { label: 'Marques partenaires', value: '200+', icon: Award },
            { label: 'Collections exclusives', value: '48', icon: Crown },
            { label: 'Boutiques officielles', value: '76', icon: ShieldCheck }
          ],
          perks: [
            { icon: ShieldCheck, title: '100% authentique', desc: 'Garantie d\'authenticité sur chaque produit' },
            { icon: Award, title: 'Boutiques officielles', desc: 'Vendeurs agréés par les marques' },
            { icon: Crown, title: 'Collections exclusives', desc: 'Éditions limitées et pré-lancements' }
          ],
          showBrands: true
        };

      case 'premium':
        return {
          type,
          eyebrow: 'L\'excellence HELIGXIAM',
          title: 'Collection Premium',
          subtitle: 'L\'exception, accessible.',
          description: 'Une sélection d\'exception : matières nobles, savoir-faire d\'artisans, pièces rares. Profitez d\'un service premium avec livraison privée et conciergerie.',
          tagline: 'Service Premium inclus',
          icon: Crown,
          gradient: 'from-stone-900 via-amber-900 to-yellow-700',
          accentHex: '#fbbf24',
          heroStats: [
            { label: 'Pièces d\'exception', value: '2 400+', icon: Crown },
            { label: 'Artisans partenaires', value: '180', icon: Award },
            { label: 'Satisfaction Premium', value: '98%', icon: ThumbsUp }
          ],
          perks: [
            { icon: Crown, title: 'Conciergerie 7j/7', desc: 'Un interlocuteur dédié pour chaque commande' },
            { icon: Truck, title: 'Livraison blanche', desc: 'Livraison sur rendez-vous avec installation possible' },
            { icon: ShieldCheck, title: 'Garantie étendue 3 ans', desc: 'Réparation et remplacement sans frais' }
          ],
          showLuxuryBand: true,
          badgeFilter: 'Premium'
        };

      case 'promotions':
        return {
          type,
          eyebrow: 'En ce moment',
          title: 'Promotions',
          subtitle: 'Jusqu\'à -70% sur des milliers d\'articles',
          description: 'Des promos renouvelées chaque semaine sur toutes les catégories. Des réductions réelles sur des produits sélectionnés.',
          tagline: 'Offres valables jusqu\'à épuisement des stocks',
          icon: Flame,
          gradient: 'from-pink-500 via-rose-500 to-red-600',
          accentHex: '#ec4899',
          heroStats: [
            { label: 'Articles en promo', value: '3 240', icon: Flame },
            { label: 'Réduction max.', value: '-70%', icon: Percent },
            { label: 'Économies moyennes', value: '127€', icon: Tag }
          ],
          perks: [
            { icon: Percent, title: 'Vraies promotions', desc: 'Prix barrés sur le prix de vente constaté, pas gonflé' },
            { icon: Flame, title: 'Renouvelées chaque semaine', desc: 'Nouvelles offres tous les vendredis à 10h' },
            { icon: ShieldCheck, title: 'Garantie prix bas', desc: 'On s\'aligne si vous trouvez moins cher' }
          ],
          showSavings: true,
          promoOnly: true,
          defaultSort: 'price-asc'
        };

      case 'flash':
        return {
          type,
          eyebrow: 'Stock très limité',
          title: 'Ventes Flash',
          subtitle: 'Des offres choc à durée ultra-limitée',
          description: 'Nouveaux lots toutes les 6 heures. Les stocks partent vite — certaines offres s\'épuisent en quelques minutes.',
          tagline: 'Prochaine vague dans quelques heures',
          icon: Zap,
          gradient: 'from-red-600 via-orange-600 to-amber-500',
          accentHex: '#dc2626',
          heroStats: [
            { label: 'Deals actifs', value: '148', icon: Zap },
            { label: 'Remises jusqu\'à', value: '-80%', icon: Flame },
            { label: 'Expire dans', value: '< 24h', icon: Clock }
          ],
          perks: [
            { icon: Zap, title: 'Stocks très limités', desc: 'Moins de 50 exemplaires par deal' },
            { icon: Clock, title: 'Expire à minuit', desc: 'Compte à rebours live, ne tardez pas' },
            { icon: Truck, title: 'Livraison rapide', desc: 'Expédition sous 24h ouvrées' }
          ],
          showCountdown: true,
          showSavings: true,
          flashOnly: true,
          defaultSort: 'price-asc'
        };

      case 'deals':
        return {
          type,
          eyebrow: 'Les meilleures affaires',
          title: 'Bons Plans',
          subtitle: 'Le meilleur rapport qualité-prix du moment',
          description: 'Les deals dénichés par notre équipe : produits très bien notés, à des prix vraiment compétitifs. Vérifiés, comparés, validés.',
          tagline: 'Sélection manuelle mise à jour chaque jour',
          icon: Tag,
          gradient: 'from-emerald-500 via-teal-600 to-cyan-700',
          accentHex: '#10b981',
          heroStats: [
            { label: 'Bons plans actifs', value: '512', icon: Tag },
            { label: 'Note minimum', value: '4,3/5', icon: Star },
            { label: 'Économie moyenne', value: '34%', icon: TrendingUp }
          ],
          perks: [
            { icon: ThumbsUp, title: 'Sélection experts', desc: 'Chaque deal est validé par notre équipe shopping' },
            { icon: ShieldCheck, title: 'Prix comparé', desc: 'On vérifie le prix sur 20+ sites concurrents' },
            { icon: Star, title: 'Notes élevées uniquement', desc: 'Minimum 4,3/5 pour être sélectionné' }
          ],
          showSavings: true,
          defaultSort: 'rating'
        };

      default:
        return {
          type: 'default',
          eyebrow: 'Catalogue complet',
          title: 'Tous les produits',
          subtitle: 'Explorez notre sélection',
          description: 'Des millions de produits soigneusement sélectionnés, livrés partout.',
          icon: Search,
          gradient: 'from-indigo-600 via-purple-600 to-pink-600',
          accentHex: '#6366f1',
          heroStats: [
            { label: 'Produits disponibles', value: '50 000+', icon: Package },
            { label: 'Vendeurs vérifiés', value: '3 200', icon: ShieldCheck },
            { label: 'Livraison offerte', value: 'Dès 99€', icon: Truck }
          ],
          perks: []
        };
    }
  }

  // ====== Countdown ======
  private tickCountdown() {
    const now = new Date().getTime();
    const diff = Math.max(0, this.flashEnd.getTime() - now);
    const totalSec = Math.floor(diff / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    this.countdown = {
      hours: String(h).padStart(2, '0'),
      minutes: String(m).padStart(2, '0'),
      seconds: String(s).padStart(2, '0')
    };
  }

  // ====== Collection dataset (pre-user-filters) ======
  private buildCollectionSet() {
    let set = [...this.products];

    if (this.collection.badgeFilter) {
      set = set.filter(p => p.badge === this.collection.badgeFilter);
    }
    if (this.collection.promoOnly) {
      set = set.filter(p => p.originalPrice && p.originalPrice > p.price);
    }
    if (this.collection.flashOnly) {
      set = set.filter(p => p.originalPrice && p.originalPrice > p.price);
    }
    if (this.collection.type === 'deals') {
      set = set.filter(p => p.rating >= 4.3 && p.originalPrice && p.originalPrice > p.price);
    }

    this.collectionProducts = set;

    // Derived data cached once per collection change (no more template getters)
    this.podium = this.computePodium(set);
    this.bestDiscountPct = this.computeBestDiscount(set);
    this.totalSavingsAmount = this.computeTotalSavings(set);
  }

  private computePodium(set: Product[]): Product[] {
    return [...set]
      .sort((a, b) => b.rating * b.reviews - a.rating * a.reviews)
      .slice(0, 3);
  }

  private computeBrands(): BrandEntry[] {
    const map = new Map<string, BrandEntry>();
    this.products.forEach(p => {
      if (!p.brand) return;
      const e = map.get(p.brand);
      if (e) {
        e.count++;
        e.avgRating += p.rating;
        if ((p.rating * p.reviews) > (e.hero!.rating * e.hero!.reviews)) e.hero = p;
      } else {
        map.set(p.brand, {
          name: p.brand,
          count: 1,
          avgRating: p.rating,
          logo: this.brandInitial(p.brand),
          hero: p
        });
      }
    });
    const list: BrandEntry[] = Array.from(map.values()).map(b => ({
      ...b,
      avgRating: +(b.avgRating / b.count).toFixed(1)
    }));
    return list.sort((a, b) => b.count - a.count);
  }

  private computeBestDiscount(set: Product[]): number {
    let best = 0;
    for (const p of set) {
      if (p.originalPrice) {
        const d = Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100);
        if (d > best) best = d;
      }
    }
    return best;
  }

  private computeTotalSavings(set: Product[]): number {
    let total = 0;
    for (const p of set) {
      if (p.originalPrice) total += (p.originalPrice - p.price);
    }
    return total;
  }

  brandInitial(name: string): string {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  selectBrand(name: string) {
    this.selectedBrand = this.selectedBrand === name ? '' : name;
    this.filterProducts();
  }

  // Still used inside product overlays (per-product, cheap)
  discountPct(p: Product): number {
    if (!p.originalPrice) return 0;
    return Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100);
  }

  // ====== Filtering (user level) ======
  filterProducts() {
    let filtered = [...this.collectionProducts];

    if (this.queryParam) {
      const q = this.queryParam.toLowerCase();
      filtered = filtered.filter(
        p => p.name.toLowerCase().includes(q) ||
             p.description.toLowerCase().includes(q) ||
             p.category.toLowerCase().includes(q) ||
             (p.brand ?? '').toLowerCase().includes(q)
      );
    }

    if (this.selectedCategory) {
      filtered = filtered.filter(p => p.category === this.selectedCategory);
    }

    if (this.selectedBrand) {
      filtered = filtered.filter(p => p.brand === this.selectedBrand);
    }

    filtered = filtered.filter(
      p => p.price >= this.priceRange[0] && p.price <= this.priceRange[1]
    );

    filtered = filtered.filter(p => p.rating >= this.minRating);

    if (this.showInStockOnly) {
      filtered = filtered.filter(p => p.inStock);
    }

    switch (this.sortBy) {
      case 'price-asc': filtered.sort((a, b) => a.price - b.price); break;
      case 'price-desc': filtered.sort((a, b) => b.price - a.price); break;
      case 'rating': filtered.sort((a, b) => b.rating - a.rating); break;
      case 'name': filtered.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'discount':
        filtered.sort((a, b) => this.discountPct(b) - this.discountPct(a));
        break;
      default: break;
    }

    this.filteredProducts = filtered;
  }

  onCategoryChange() { this.filterProducts(); }
  onPriceRangeChange() { this.filterProducts(); }
  onRatingChange() { this.filterProducts(); }
  onSortChange() { this.filterProducts(); }
  onStockChange() { this.filterProducts(); }

  resetFilters() {
    this.selectedCategory = '';
    this.selectedBrand = '';
    this.priceRange = [0, 4000];
    this.minRating = 0;
    this.showInStockOnly = false;
    this.filterProducts();
  }

  toggleFilters() { this.showFilters = !this.showFilters; }
}

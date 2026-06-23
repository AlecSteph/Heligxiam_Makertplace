import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  ChevronLeft,
  ChevronRight,
  Play,
  Star,
  Filter,
  X,
  Flame,
  Clock,
  TrendingUp,
  Sparkles,
  Award,
  Tag,
  Package,
  Heart,
  ShoppingCart,
  Eye,
  Zap
} from 'lucide-angular';
import { Subscription } from 'rxjs';
import { ProductCardComponent } from '../../components/product-card/product-card.component';
import { CatalogService } from '../../services/catalog.service';
import { Product } from '../../models/product.model';
import {
  CategoryConfig,
  resolveCategoryConfig,
  VideoReview
} from '../../data/categories.data';

@Component({
  selector: 'app-category',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule, ProductCardComponent],
  templateUrl: './category.component.html',
  styleUrl: './category.component.css'
})
export class CategoryComponent implements OnInit, OnDestroy {
  // Lucide icons
  readonly ChevronLeft = ChevronLeft;
  readonly ChevronRight = ChevronRight;
  readonly Play = Play;
  readonly Star = Star;
  readonly Filter = Filter;
  readonly X = X;
  readonly Flame = Flame;
  readonly Clock = Clock;
  readonly TrendingUp = TrendingUp;
  readonly Sparkles = Sparkles;
  readonly Award = Award;
  readonly Tag = Tag;
  readonly Package = Package;
  readonly Heart = Heart;
  readonly ShoppingCart = ShoppingCart;
  readonly Eye = Eye;
  readonly Zap = Zap;

  config: CategoryConfig | null = null;
  categoryProducts: Product[] = [];
  filteredProducts: Product[] = [];

  // Filter state
  selectedSubcategory = 'Tout voir';
  selectedBrands: Set<string> = new Set();
  selectedPriceRange: number | null = null;
  minRating = 0;
  onlyInStock = false;
  onlyPromo = false;
  sortBy: 'featured' | 'priceAsc' | 'priceDesc' | 'rating' | 'newest' = 'featured';
  mobileFiltersOpen = false;

  // Sections
  topRated: Product[] = [];
  newArrivals: Product[] = [];
  deals: Product[] = [];
  bestSellers: Product[] = [];
  recommendations: Product[] = [];

  // Video modal
  activeVideo: VideoReview | null = null;

  // Countdown for flash deals (demo)
  countdownHours = 12;
  countdownMinutes = 42;
  countdownSeconds = 18;
  private countdownInterval?: ReturnType<typeof setInterval>;

  private routeSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private catalogService: CatalogService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.routeSub = this.route.paramMap.subscribe(params => {
      const slug = params.get('category');
      this.loadCategory(slug);
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    });
    this.startCountdown();
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    document.body.style.overflow = '';
  }

  private loadCategory(slug: string | null): void {
    this.config = resolveCategoryConfig(slug);
    if (!this.config) {
      this.categoryProducts = [];
      this.filteredProducts = [];
      return;
    }

    this.catalogService.loadByCategorySlug(this.config.slug).then((products) => {
      this.categoryProducts = products;
      this.buildSections();
      this.resetFilters();
      this.applyFilters();
      this.cdr.markForCheck();
    });
  }

  private buildSections(): void {
    const products = this.categoryProducts;
    this.topRated = [...products].sort((a, b) => b.rating - a.rating).slice(0, 10);
    this.newArrivals = [...products]
      .filter(p => p.badge === 'Nouveau' || p.badge === 'Exclusif')
      .concat([...products].sort((a, b) => parseInt(b.id, 10) - parseInt(a.id, 10)))
      .filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i)
      .slice(0, 10);
    this.deals = [...products].filter(p => p.originalPrice).slice(0, 10);
    if (this.deals.length < 4) {
      this.deals = this.deals.concat([...products].slice(0, 8 - this.deals.length));
    }
    this.bestSellers = [...products]
      .sort((a, b) => b.reviews - a.reviews)
      .slice(0, 10);
    this.recommendations = [...products].sort(() => Math.random() - 0.5).slice(0, 12);
  }

  resetFilters(): void {
    this.selectedSubcategory = this.config?.subcategories[0]?.label || 'Tout voir';
    this.selectedBrands = new Set();
    this.selectedPriceRange = null;
    this.minRating = 0;
    this.onlyInStock = false;
    this.onlyPromo = false;
    this.sortBy = 'featured';
  }

  toggleBrand(brand: string): void {
    if (this.selectedBrands.has(brand)) {
      this.selectedBrands.delete(brand);
    } else {
      this.selectedBrands.add(brand);
    }
    this.applyFilters();
  }

  isBrandSelected(brand: string): boolean {
    return this.selectedBrands.has(brand);
  }

  setPriceRange(index: number | null): void {
    this.selectedPriceRange = this.selectedPriceRange === index ? null : index;
    this.applyFilters();
  }

  setMinRating(rating: number): void {
    this.minRating = this.minRating === rating ? 0 : rating;
    this.applyFilters();
  }

  setSort(sort: typeof this.sortBy): void {
    this.sortBy = sort;
    this.applyFilters();
  }

  applyFilters(): void {
    if (!this.config) return;
    let result = [...this.categoryProducts];

    if (this.selectedBrands.size > 0) {
      result = result.filter(p => p.brand && this.selectedBrands.has(p.brand));
    }

    if (this.selectedPriceRange !== null && this.config.priceRanges[this.selectedPriceRange]) {
      const range = this.config.priceRanges[this.selectedPriceRange];
      if (range.min !== undefined) result = result.filter(p => p.price >= range.min!);
      if (range.max !== undefined) result = result.filter(p => p.price <= range.max!);
    }

    if (this.minRating > 0) {
      result = result.filter(p => p.rating >= this.minRating);
    }

    if (this.onlyInStock) {
      result = result.filter(p => p.inStock);
    }

    if (this.onlyPromo) {
      result = result.filter(p => p.originalPrice);
    }

    switch (this.sortBy) {
      case 'priceAsc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'priceDesc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
        result.sort((a, b) => parseInt(b.id, 10) - parseInt(a.id, 10));
        break;
    }

    this.filteredProducts = result;
  }

  activeFilterCount(): number {
    let count = 0;
    count += this.selectedBrands.size;
    if (this.selectedPriceRange !== null) count++;
    if (this.minRating > 0) count++;
    if (this.onlyInStock) count++;
    if (this.onlyPromo) count++;
    return count;
  }

  clearAllFilters(): void {
    this.resetFilters();
    this.applyFilters();
  }

  toggleMobileFilters(): void {
    this.mobileFiltersOpen = !this.mobileFiltersOpen;
  }

  // Video modal
  openVideo(video: VideoReview): void {
    this.activeVideo = video;
    document.body.style.overflow = 'hidden';
  }

  closeVideo(): void {
    this.activeVideo = null;
    document.body.style.overflow = '';
  }

  // Carousel helper
  scrollCarousel(carouselId: string, direction: 'left' | 'right'): void {
    const el = document.getElementById(carouselId);
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.8;
    el.scrollBy({
      left: direction === 'right' ? scrollAmount : -scrollAmount,
      behavior: 'smooth'
    });
  }

  computeDiscount(p: Product): number {
    if (!p.originalPrice) return 0;
    return Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100);
  }

  private startCountdown(): void {
    this.countdownInterval = setInterval(() => {
      if (this.countdownSeconds > 0) {
        this.countdownSeconds--;
      } else {
        this.countdownSeconds = 59;
        if (this.countdownMinutes > 0) {
          this.countdownMinutes--;
        } else {
          this.countdownMinutes = 59;
          this.countdownHours = this.countdownHours > 0 ? this.countdownHours - 1 : 23;
        }
      }
    }, 1000);
  }

  pad(n: number): string {
    return n.toString().padStart(2, '0');
  }
}

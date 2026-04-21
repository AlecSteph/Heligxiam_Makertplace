import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  Heart, ShoppingBag, Trash2, Star, ArrowRight, Search, Share2, Grid3x3, List,
  Filter, SlidersHorizontal, TrendingDown, Tag, CheckCircle2, XCircle, Package,
  Copy, Download, Sparkles, Bell, AlertTriangle, Flame, Gift, Mail
} from 'lucide-angular';
import { WishlistService } from '../../services/wishlist.service';
import { CartService } from '../../services/cart.service';
import { Product } from '../../models/product.model';

type SortKey = 'recent' | 'price-asc' | 'price-desc' | 'rating' | 'discount' | 'name';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule],
  templateUrl: './wishlist.component.html',
  styleUrls: ['./wishlist.component.css']
})
export class WishlistComponent implements OnInit {
  wishlist: Product[] = [];

  // Filters / sorts
  searchQuery = '';
  sortBy: SortKey = 'recent';
  selectedCategory = '';
  showInStockOnly = false;
  showPromoOnly = false;
  viewMode: 'grid' | 'list' = 'grid';
  selectedIds: Set<string> = new Set();

  // Visual feedback
  showCopied = false;

  // Lucide icons
  readonly Heart = Heart;
  readonly ShoppingBag = ShoppingBag;
  readonly Trash2 = Trash2;
  readonly Star = Star;
  readonly ArrowRight = ArrowRight;
  readonly Search = Search;
  readonly Share2 = Share2;
  readonly Grid3x3 = Grid3x3;
  readonly List = List;
  readonly Filter = Filter;
  readonly SlidersHorizontal = SlidersHorizontal;
  readonly TrendingDown = TrendingDown;
  readonly Tag = Tag;
  readonly CheckCircle2 = CheckCircle2;
  readonly XCircle = XCircle;
  readonly Package = Package;
  readonly Copy = Copy;
  readonly Download = Download;
  readonly Sparkles = Sparkles;
  readonly Bell = Bell;
  readonly AlertTriangle = AlertTriangle;
  readonly Flame = Flame;
  readonly Gift = Gift;
  readonly Mail = Mail;

  constructor(
    private wishlistService: WishlistService,
    private cartService: CartService
  ) {}

  ngOnInit(): void {
    this.wishlistService.wishlist$.subscribe(wishlist => {
      this.wishlist = wishlist;
      // Clean selected ids
      this.selectedIds = new Set([...this.selectedIds].filter(id => wishlist.some(p => p.id === id)));
    });
  }

  // ==========================================================================
  // Derived collections
  // ==========================================================================

  get categories(): string[] {
    const set = new Set<string>();
    this.wishlist.forEach(p => set.add(p.category));
    return [...set].sort();
  }

  get filteredWishlist(): Product[] {
    let list = [...this.wishlist];

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.brand ?? '').toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }

    if (this.selectedCategory) {
      list = list.filter(p => p.category === this.selectedCategory);
    }

    if (this.showInStockOnly) {
      list = list.filter(p => p.inStock);
    }

    if (this.showPromoOnly) {
      list = list.filter(p => !!p.originalPrice && p.originalPrice > p.price);
    }

    switch (this.sortBy) {
      case 'price-asc': list.sort((a, b) => a.price - b.price); break;
      case 'price-desc': list.sort((a, b) => b.price - a.price); break;
      case 'rating': list.sort((a, b) => b.rating - a.rating); break;
      case 'discount':
        list.sort((a, b) => this.discountPct(b) - this.discountPct(a));
        break;
      case 'name': list.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'recent':
      default: break; // keep insertion order
    }

    return list;
  }

  // ==========================================================================
  // Stats
  // ==========================================================================

  get totalValue(): number {
    return this.wishlist.reduce((s, p) => s + p.price, 0);
  }

  get potentialSavings(): number {
    return this.wishlist.reduce((s, p) => s + Math.max((p.originalPrice ?? p.price) - p.price, 0), 0);
  }

  get onSaleCount(): number {
    return this.wishlist.filter(p => !!p.originalPrice && p.originalPrice > p.price).length;
  }

  get outOfStockCount(): number {
    return this.wishlist.filter(p => !p.inStock).length;
  }

  get averageRating(): number {
    if (!this.wishlist.length) return 0;
    const total = this.wishlist.reduce((s, p) => s + p.rating, 0);
    return Math.round((total / this.wishlist.length) * 10) / 10;
  }

  // ==========================================================================
  // Actions
  // ==========================================================================

  removeFromWishlist(productId: string): void {
    this.wishlistService.removeFromWishlist(productId);
    this.selectedIds.delete(productId);
  }

  addToCart(product: Product): void {
    this.cartService.addToCart(product);
  }

  clearWishlist(): void {
    if (confirm('Voulez-vous vraiment vider votre liste de favoris ?')) {
      this.wishlistService.clearWishlist();
      this.selectedIds.clear();
    }
  }

  // Bulk selection
  toggleSelect(productId: string): void {
    if (this.selectedIds.has(productId)) {
      this.selectedIds.delete(productId);
    } else {
      this.selectedIds.add(productId);
    }
  }

  isSelected(productId: string): boolean {
    return this.selectedIds.has(productId);
  }

  toggleSelectAll(): void {
    const visible = this.filteredWishlist;
    const allSelected = visible.every(p => this.selectedIds.has(p.id));
    if (allSelected) {
      visible.forEach(p => this.selectedIds.delete(p.id));
    } else {
      visible.forEach(p => this.selectedIds.add(p.id));
    }
  }

  get allVisibleSelected(): boolean {
    const visible = this.filteredWishlist;
    return visible.length > 0 && visible.every(p => this.selectedIds.has(p.id));
  }

  get selectedCount(): number {
    return this.selectedIds.size;
  }

  addSelectedToCart(): void {
    const ids = [...this.selectedIds];
    const items = this.wishlist.filter(p => ids.includes(p.id) && p.inStock);
    items.forEach(p => this.cartService.addToCart(p));
    this.selectedIds.clear();
  }

  removeSelected(): void {
    if (!this.selectedIds.size) return;
    if (!confirm(`Supprimer ${this.selectedIds.size} article(s) des favoris ?`)) return;
    [...this.selectedIds].forEach(id => this.wishlistService.removeFromWishlist(id));
    this.selectedIds.clear();
  }

  addAllInStockToCart(): void {
    this.wishlist.filter(p => p.inStock).forEach(p => this.cartService.addToCart(p));
  }

  // Share
  async copyShareLink(): Promise<void> {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      this.showCopied = true;
      setTimeout(() => (this.showCopied = false), 2000);
    } catch {
      /* silent */
    }
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedCategory = '';
    this.showInStockOnly = false;
    this.showPromoOnly = false;
    this.sortBy = 'recent';
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  discountPct(product: Product): number {
    if (!product.originalPrice || product.originalPrice <= product.price) return 0;
    return Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
  }

  getBadgeClass(badge: string | undefined): string {
    if (!badge) return 'bg-gray-900/80 text-white';
    switch (badge) {
      case 'Promo':
      case 'Promotion':
        return 'bg-gradient-to-r from-red-500 to-pink-500 text-white';
      case 'Nouveau':
        return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white';
      case 'Bestseller':
      case 'Meilleure vente':
        return 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white';
      case 'Premium':
      case 'Pro':
        return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white';
      case 'Exclusif':
        return 'bg-gradient-to-r from-amber-500 to-orange-500 text-white';
      default:
        return 'bg-gray-900/80 text-white';
    }
  }

  getRatingStars(rating: number): number[] {
    return Array(5).fill(0).map((_, i) => (i < Math.round(rating) ? 1 : 0));
  }

  trackById(_: number, p: Product): string {
    return p.id;
  }
}

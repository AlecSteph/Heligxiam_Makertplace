import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import {
  LucideAngularModule, Trash2, ShoppingBag, Sparkles, ArrowRight, Shield, Truck,
  Heart, Tag, Minus, Plus, CheckCircle2, XCircle, CreditCard, Gift, MapPin,
  Clock, Lock, Zap, BadgePercent, Package, RefreshCcw, ChevronRight, AlertCircle,
  Star
} from 'lucide-angular';
import { CartService } from '../../services/cart.service';
import { WishlistService } from '../../services/wishlist.service';
import { CatalogService } from '../../services/catalog.service';
import { CartItem, Product } from '../../models/product.model';

type DeliveryOption = 'standard' | 'express' | 'premium';

interface Promo {
  code: string;
  label: string;
  type: 'percent' | 'amount';
  value: number;
  minAmount?: number;
}

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css']
})
export class CartComponent implements OnInit, OnDestroy {
  cart: CartItem[] = [];
  subtotal = 0;
  savedForLater: Product[] = [];
  recommendations: Product[] = [];

  // Promo
  promoInput = '';
  promoError = '';
  appliedPromo: Promo | null = null;
  availablePromos: Promo[] = [];

  // Delivery
  delivery: DeliveryOption = 'standard';
  readonly deliveryOptions: { id: DeliveryOption; label: string; sub: string; price: number; eta: string; icon: any; recommended?: boolean }[] = [];

  // Notifications
  showNotification = false;
  notificationMessage = '';

  // Subs
  private subs = new Subscription();

  // Lucide icons
  readonly Trash2 = Trash2;
  readonly ShoppingBag = ShoppingBag;
  readonly Sparkles = Sparkles;
  readonly ArrowRight = ArrowRight;
  readonly Shield = Shield;
  readonly Truck = Truck;
  readonly Heart = Heart;
  readonly Tag = Tag;
  readonly Minus = Minus;
  readonly Plus = Plus;
  readonly CheckCircle2 = CheckCircle2;
  readonly XCircle = XCircle;
  readonly CreditCard = CreditCard;
  readonly Gift = Gift;
  readonly MapPin = MapPin;
  readonly Clock = Clock;
  readonly Lock = Lock;
  readonly Zap = Zap;
  readonly BadgePercent = BadgePercent;
  readonly Package = Package;
  readonly RefreshCcw = RefreshCcw;
  readonly ChevronRight = ChevronRight;
  readonly AlertCircle = AlertCircle;
  readonly Star = Star;

  constructor(
    private cartService: CartService,
    private wishlistService: WishlistService,
    private catalogService: CatalogService
  ) {
    this.deliveryOptions = [
      { id: 'standard', label: 'Livraison Standard', sub: '3 à 5 jours ouvrés', price: 0, eta: 'Gratuite dès 49€', icon: this.Truck },
      { id: 'express',  label: 'Livraison Express',  sub: '24 à 48h',         price: 9.90, eta: '24-48h', icon: this.Zap, recommended: true },
      { id: 'premium',  label: 'Premium Same-Day',   sub: 'Aujourd\'hui avant 22h (zones éligibles)', price: 19.90, eta: 'Aujourd\'hui', icon: this.Sparkles }
    ];
  }

  ngOnInit(): void {
    this.catalogService.loadPromoCodes().then((codes) => {
      this.availablePromos = codes.map((c) => ({
        code: c.code,
        label: c.label,
        type: c.type === 'pourcentage' ? 'percent' as const : 'amount' as const,
        value: c.value,
        minAmount: c.minAmount > 0 ? c.minAmount : undefined
      }));
    });

    this.subs.add(this.cartService.cart$.subscribe(cart => {
      this.cart = cart;
      this.subtotal = this.cartService.getCartTotal();
      this.refreshRecommendations();
    }));

    this.subs.add(this.cartService.itemAdded.subscribe(name => {
      if (name) this.flashNotification('Article ajouté');
    }));

    // Pre-load some recommendations
    this.refreshRecommendations();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  // ==========================================================================
  // Items actions
  // ==========================================================================

  updateQuantity(productId: string, quantity: number): void {
    this.cartService.updateQuantity(productId, quantity);
  }

  removeFromCart(productId: string): void {
    this.cartService.removeFromCart(productId);
  }

  clearCart(): void {
    if (confirm('Voulez-vous vraiment vider votre panier ?')) {
      this.cartService.clearCart();
      this.appliedPromo = null;
    }
  }

  moveToWishlist(item: CartItem): void {
    this.wishlistService.addToWishlist(item);
    this.cartService.removeFromCart(item.id);
    this.flashNotification('Déplacé dans vos favoris');
  }

  saveForLater(item: CartItem): void {
    if (!this.savedForLater.some(p => p.id === item.id)) {
      this.savedForLater = [...this.savedForLater, { ...item }];
    }
    this.cartService.removeFromCart(item.id);
    this.flashNotification('Sauvegardé pour plus tard');
  }

  restoreSaved(product: Product): void {
    this.cartService.addToCart(product);
    this.savedForLater = this.savedForLater.filter(p => p.id !== product.id);
  }

  removeSaved(productId: string): void {
    this.savedForLater = this.savedForLater.filter(p => p.id !== productId);
  }

  // ==========================================================================
  // Recommendations
  // ==========================================================================

  private refreshRecommendations(): void {
    const cartIds = new Set(this.cart.map(i => i.id));
    const categoriesInCart = new Set(this.cart.map(i => i.category));
    const pool = this.catalogService.getProductsSnapshot().filter(p => !cartIds.has(p.id));
    if (!pool.length) {
      this.catalogService.loadProducts().then((products) => this.setRecommendations(products, cartIds, categoriesInCart));
      return;
    }
    this.setRecommendations(pool, cartIds, categoriesInCart);
  }

  private setRecommendations(pool: Product[], cartIds: Set<string>, categoriesInCart: Set<string>): void {
    const relevant = pool.filter(p => categoriesInCart.has(p.category));
    const others = pool.filter(p => !categoriesInCart.has(p.category));
    this.recommendations = [...relevant, ...others].sort((a, b) => b.rating - a.rating).slice(0, 6);
  }

  addRecommendation(product: Product): void {
    this.cartService.addToCart(product);
  }

  // ==========================================================================
  // Promo
  // ==========================================================================

  applyPromoCode(): void {
    this.promoError = '';
    const code = this.promoInput.trim().toUpperCase();
    if (!code) return;

    const promo = this.availablePromos.find(p => p.code === code);
    if (!promo) {
      this.promoError = 'Code promotionnel invalide';
      return;
    }
    if (promo.minAmount && this.subtotal < promo.minAmount) {
      this.promoError = `Commande minimum de ${promo.minAmount.toFixed(0)}€ requise`;
      return;
    }
    this.appliedPromo = promo;
    this.promoInput = '';
    this.flashNotification(`Code "${promo.code}" appliqué !`);
  }

  useSuggestedPromo(promo: Promo): void {
    if (promo.minAmount && this.subtotal < promo.minAmount) {
      this.promoError = `Cette offre nécessite ${promo.minAmount.toFixed(0)}€ d'achat minimum`;
      return;
    }
    this.appliedPromo = promo;
    this.promoError = '';
    this.flashNotification(`Code "${promo.code}" appliqué !`);
  }

  removePromo(): void {
    this.appliedPromo = null;
  }

  // ==========================================================================
  // Totals
  // ==========================================================================

  get itemsCount(): number {
    return this.cart.reduce((n, i) => n + i.quantity, 0);
  }

  get totalOriginal(): number {
    return this.cart.reduce((s, i) => s + (i.originalPrice ?? i.price) * i.quantity, 0);
  }

  get itemsSavings(): number {
    return Math.max(this.totalOriginal - this.subtotal, 0);
  }

  get shipping(): number {
    const chosen = this.deliveryOptions.find(d => d.id === this.delivery);
    if (!chosen) return 0;
    // FREESHIP code → always free; standard free over 99€
    if (this.appliedPromo?.code === 'FREESHIP') return 0;
    if (this.delivery === 'standard' && this.subtotal >= 49) return 0;
    return chosen.price;
  }

  get promoDiscount(): number {
    if (!this.appliedPromo) return 0;
    if (this.appliedPromo.code === 'FREESHIP') return 0; // handled via shipping
    if (this.appliedPromo.type === 'percent') {
      return +(this.subtotal * this.appliedPromo.value / 100).toFixed(2);
    }
    return this.appliedPromo.value;
  }

  get finalTotal(): number {
    return Math.max(this.subtotal - this.promoDiscount + this.shipping, 0);
  }

  get shippingProgress(): number {
    return Math.min((this.subtotal / 49) * 100, 100);
  }

  get remainingForFreeShipping(): number {
    return Math.max(49 - this.subtotal, 0);
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  itemSavings(item: CartItem): number {
    if (!item.originalPrice || item.originalPrice <= item.price) return 0;
    return (item.originalPrice - item.price) * item.quantity;
  }

  itemDiscountPct(item: CartItem): number {
    if (!item.originalPrice || item.originalPrice <= item.price) return 0;
    return Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100);
  }

  deliveryEstimate(): string {
    const today = new Date();
    const daysAdd = this.delivery === 'standard' ? 4 : this.delivery === 'express' ? 2 : 0;
    const eta = new Date(today);
    eta.setDate(today.getDate() + daysAdd);
    return eta.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  trackById(_: number, item: { id: string }): string {
    return item.id;
  }

  private flashNotification(msg: string): void {
    this.notificationMessage = msg;
    this.showNotification = true;
    setTimeout(() => (this.showNotification = false), 2500);
  }
}

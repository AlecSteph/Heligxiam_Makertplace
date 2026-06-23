import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { distinctUntilChanged, filter, map } from 'rxjs/operators';
import { Product, CartItem } from '../models/product.model';
import { NotificationService } from './notification.service';
import { AuthService } from './auth.service';

const LEGACY_CART_KEY = 'heligxiam-cart';
const GUEST_CART_KEY = 'heligxiam-cart-guest';

@Injectable({
  providedIn: 'root'
})
export class CartService implements OnDestroy {
  private cartItems = new BehaviorSubject<CartItem[]>([]);
  public cart$: Observable<CartItem[]> = this.cartItems.asObservable();
  public itemAdded = new BehaviorSubject<string>('');

  private authSub?: Subscription;
  private lastUserId: string | null = null;

  constructor(
    private notificationService: NotificationService,
    private authService: AuthService
  ) {
    this.authSub = this.authService.sessionReady$
      .pipe(filter((ready) => ready))
      .subscribe(() => this.reloadCartForUser());

    this.authService.authState$
      .pipe(
        map((state) => state.user?.id_user ?? null),
        distinctUntilChanged()
      )
      .subscribe((userId) => {
        if (userId !== this.lastUserId) {
          this.reloadCartForUser(userId);
        }
      });

    this.authService.loginSuccess$.subscribe((user) => {
      this.mergeGuestCartIntoUser(user.id_user);
    });
  }

  ngOnDestroy(): void {
    this.authSub?.unsubscribe();
  }

  private canUseStorage(): boolean {
    return typeof localStorage !== 'undefined';
  }

  private storageKey(userId?: string | null): string {
    if (userId) {
      return `heligxiam-cart-${userId}`;
    }
    return GUEST_CART_KEY;
  }

  private readStorage(key: string): CartItem[] | null {
    if (!this.canUseStorage()) return null;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  private writeStorage(key: string, items: CartItem[]): void {
    if (!this.canUseStorage()) return;
    try {
      localStorage.setItem(key, JSON.stringify(items));
    } catch {
      // Quota dépassé ou mode privé — panier reste en mémoire pour la session.
    }
  }

  private reloadCartForUser(explicitUserId?: string | null): void {
    const userId = explicitUserId ?? this.authService.currentUser?.id_user ?? null;
    this.lastUserId = userId;

    const key = this.storageKey(userId);
    let items = this.readStorage(key);

    if (!items?.length) {
      items = this.readStorage(LEGACY_CART_KEY) ?? this.readStorage(GUEST_CART_KEY) ?? [];
      if (items.length) {
        this.writeStorage(key, items);
      }
    }

    this.cartItems.next(items ?? []);
    this.saveCart();
  }

  private mergeGuestCartIntoUser(userId: string): void {
    const guestItems =
      this.readStorage(GUEST_CART_KEY) ??
      this.readStorage(LEGACY_CART_KEY) ??
      [];
    if (!guestItems.length) {
      this.reloadCartForUser(userId);
      return;
    }

    const userKey = this.storageKey(userId);
    const userItems = this.readStorage(userKey) ?? [];
    const merged = [...userItems];

    for (const guestItem of guestItems) {
      const existing = merged.find((item) => item.id === guestItem.id);
      if (existing) {
        existing.quantity += guestItem.quantity;
      } else {
        merged.push({ ...guestItem });
      }
    }

    this.cartItems.next(merged);
    this.writeStorage(userKey, merged);
    if (this.canUseStorage()) {
      localStorage.removeItem(GUEST_CART_KEY);
      localStorage.removeItem(LEGACY_CART_KEY);
    }
  }

  private saveCart(): void {
    const userId = this.authService.currentUser?.id_user ?? null;
    this.writeStorage(this.storageKey(userId), this.cartItems.value);
  }

  private sameProduct(a: Product, b: Product): boolean {
    return (
      String(a.id) === String(b.id) ||
      (!!a.sku && !!b.sku && String(a.sku) === String(b.sku))
    );
  }

  addToCart(product: Product): void {
    const currentCart = this.cartItems.value;
    const existingItem = currentCart.find((item) => this.sameProduct(item, product));

    if (existingItem) {
      existingItem.quantity++;
      this.cartItems.next([...currentCart]);
    } else {
      const newItem: CartItem = { ...product, quantity: 1 };
      this.cartItems.next([...currentCart, newItem]);
    }

    this.saveCart();
    this.notificationService.showNotification('Article ajouté');
  }

  removeFromCart(productId: string): void {
    const currentCart = this.cartItems.value.filter((item) => item.id !== productId);
    this.cartItems.next(currentCart);
    this.saveCart();
  }

  updateQuantity(productId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeFromCart(productId);
      return;
    }

    const currentCart = this.cartItems.value.map((item) =>
      item.id === productId ? { ...item, quantity } : item
    );
    this.cartItems.next(currentCart);
    this.saveCart();
  }

  clearCart(): void {
    this.cartItems.next([]);
    const userId = this.authService.currentUser?.id_user ?? null;
    if (this.canUseStorage()) {
      localStorage.removeItem(this.storageKey(userId));
    }
  }

  getCartTotal(): number {
    return this.cartItems.value.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
  }

  getCartCount(): number {
    return this.cartItems.value.reduce(
      (count, item) => count + item.quantity,
      0
    );
  }

  getCart(): CartItem[] {
    return this.cartItems.value;
  }

  /** Réaligne le panier sur le catalogue API (IDs MySQL, prix/stock à jour). */
  reconcileWithCatalog(products: Product[]): void {
    if (!products.length) return;
    const byId = new Map(products.map((p) => [String(p.id), p]));
    const bySku = new Map(
      products.filter((p) => p.sku).map((p) => [String(p.sku!), p])
    );
    const merged = new Map<string, CartItem>();
    for (const item of this.cartItems.value) {
      const fresh =
        byId.get(String(item.id)) || (item.sku ? bySku.get(String(item.sku)) : undefined);
      if (!fresh) continue;
      const key = String(fresh.id);
      const existing = merged.get(key);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        merged.set(key, { ...fresh, quantity: item.quantity });
      }
    }
    const next = [...merged.values()];
    const current = this.cartItems.value;
    const changed =
      next.length !== current.length ||
      next.some(
        (item, i) =>
          String(item.id) !== String(current[i]?.id) ||
          item.quantity !== current[i]?.quantity ||
          item.price !== current[i]?.price
      );
    if (changed) {
      this.cartItems.next(next);
      this.saveCart();
    }
  }
}

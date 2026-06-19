import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Product } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class WishlistService {
  private wishlistItems = new BehaviorSubject<Product[]>([]);
  public wishlist$ = this.wishlistItems.asObservable();

  constructor() {
    // Load wishlist from localStorage
    const savedWishlist = localStorage.getItem('heligxiam-wishlist');
    if (savedWishlist) {
      this.wishlistItems.next(JSON.parse(savedWishlist));
    }
  }

  private saveWishlist(): void {
    localStorage.setItem('heligxiam-wishlist', JSON.stringify(this.wishlistItems.value));
  }

  addToWishlist(product: Product): void {
    const currentWishlist = this.wishlistItems.value;
    const existingItem = currentWishlist.find(item => item.id === product.id);

    if (!existingItem) {
      this.wishlistItems.next([...currentWishlist, product]);
      this.saveWishlist();
    }
  }

  removeFromWishlist(productId: string): void {
    const currentWishlist = this.wishlistItems.value.filter(item => item.id !== productId);
    this.wishlistItems.next(currentWishlist);
    this.saveWishlist();
  }

  isInWishlist(productId: string): boolean {
    return this.wishlistItems.value.some(item => item.id === productId);
  }

  clearWishlist(): void {
    this.wishlistItems.next([]);
    localStorage.removeItem('heligxiam-wishlist');
  }

  getWishlist(): Product[] {
    return this.wishlistItems.value;
  }

  getWishlistCount(): number {
    return this.wishlistItems.value.length;
  }

  /** Réaligne les favoris sur le catalogue API (IDs MySQL, données à jour). */
  reconcileWithCatalog(products: Product[]): void {
    if (!products.length) return;
    const byId = new Map(products.map((p) => [String(p.id), p]));
    const bySku = new Map(
      products.filter((p) => p.sku).map((p) => [String(p.sku), p])
    );
    const current = this.wishlistItems.value;
    const next = current
      .map((item) => byId.get(String(item.id)) || (item.sku ? bySku.get(String(item.sku)) : undefined))
      .filter((p): p is Product => !!p);
    const changed =
      next.length !== current.length ||
      next.some((p, i) => String(p.id) !== String(current[i]?.id));
    if (changed) {
      this.wishlistItems.next(next);
      this.saveWishlist();
    }
  }
}

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
}

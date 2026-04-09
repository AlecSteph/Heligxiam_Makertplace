import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Product, CartItem } from '../models/product.model';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cartItems = new BehaviorSubject<CartItem[]>([]);
  public cart$: Observable<CartItem[]> = this.cartItems.asObservable();
  public itemAdded = new BehaviorSubject<string>('');

  constructor(private notificationService: NotificationService) {
    // Load cart from localStorage
    const savedCart = localStorage.getItem('heligxiam-cart');
    if (savedCart) {
      this.cartItems.next(JSON.parse(savedCart));
    }
  }

  private saveCart(): void {
    localStorage.setItem('heligxiam-cart', JSON.stringify(this.cartItems.value));
  }

  addToCart(product: Product): void {
    const currentCart = this.cartItems.value;
    const existingItem = currentCart.find(item => item.id === product.id);

    if (existingItem) {
      existingItem.quantity++;
      this.cartItems.next([...currentCart]);
    } else {
      const newItem: CartItem = { ...product, quantity: 1 };
      this.cartItems.next([...currentCart, newItem]);
    }

    this.saveCart();
    
    // Utiliser le service de notification global
    this.notificationService.showNotification('Article ajouté');
  }

  removeFromCart(productId: string): void {
    const currentCart = this.cartItems.value.filter(item => item.id !== productId);
    this.cartItems.next(currentCart);
    this.saveCart();
  }

  updateQuantity(productId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeFromCart(productId);
      return;
    }

    const currentCart = this.cartItems.value.map(item =>
      item.id === productId ? { ...item, quantity } : item
    );
    this.cartItems.next(currentCart);
    this.saveCart();
  }

  clearCart(): void {
    this.cartItems.next([]);
    localStorage.removeItem('heligxiam-cart');
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
}

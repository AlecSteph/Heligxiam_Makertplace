import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, Trash2, ShoppingBag, Sparkles, ArrowRight, Shield, Truck } from 'lucide-angular';
import { CartService } from '../../services/cart.service';
import { CartItem } from '../../models/product.model';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css']
})
export class CartComponent implements OnInit {
  cart: CartItem[] = [];
  total = 0;
  shipping = 0;
  finalTotal = 0;
  showNotification = false;
  notificationMessage = '';

  // Lucide icons
  readonly Trash2 = Trash2;
  readonly ShoppingBag = ShoppingBag;
  readonly Sparkles = Sparkles;
  readonly ArrowRight = ArrowRight;
  readonly Shield = Shield;
  readonly Truck = Truck;

  constructor(private cartService: CartService) {}

  ngOnInit(): void {
    this.cartService.cart$.subscribe(cart => {
      this.cart = cart;
      this.calculateTotals();
    });
    
    // Écouter les notifications d'ajout d'article
    this.cartService.itemAdded.subscribe(productName => {
      if (productName) {
        this.showAddedNotification();
      }
    });
  }

  calculateTotals(): void {
    this.total = this.cartService.getCartTotal();
    this.shipping = this.total >= 99 ? 0 : 9.99;
    this.finalTotal = this.total + this.shipping;
  }

  updateQuantity(productId: string, quantity: number): void {
    this.cartService.updateQuantity(productId, quantity);
  }

  removeFromCart(productId: string): void {
    this.cartService.removeFromCart(productId);
  }

  clearCart(): void {
    this.cartService.clearCart();
  }

  get shippingProgress(): number {
    return Math.min((this.total / 99) * 100, 100);
  }

  get remainingForFreeShipping(): number {
    return Math.max(99 - this.total, 0);
  }

  showAddedNotification(): void {
    this.notificationMessage = 'Article ajouté';
    this.showNotification = true;
    
    // Masquer la notification après 3 secondes
    setTimeout(() => {
      this.showNotification = false;
    }, 3000);
  }
}

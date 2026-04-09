import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Heart, ShoppingBag, Trash2, Star, ArrowRight } from 'lucide-angular';
import { WishlistService } from '../../services/wishlist.service';
import { CartService } from '../../services/cart.service';
import { Product } from '../../models/product.model';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule],
  templateUrl: './wishlist.component.html',
  styleUrls: ['./wishlist.component.css']
})
export class WishlistComponent implements OnInit {
  wishlist: Product[] = [];
  searchQuery = '';

  // Lucide icons
  readonly Heart = Heart;
  readonly ShoppingBag = ShoppingBag;
  readonly Trash2 = Trash2;
  readonly Star = Star;
  readonly ArrowRight = ArrowRight;

  constructor(
    private wishlistService: WishlistService,
    private cartService: CartService
  ) {}

  ngOnInit(): void {
    this.wishlistService.wishlist$.subscribe(wishlist => {
      this.wishlist = wishlist;
    });
  }

  get filteredWishlist(): Product[] {
    if (!this.searchQuery) {
      return this.wishlist;
    }
    return this.wishlist.filter(product =>
      product.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  }

  removeFromWishlist(productId: string): void {
    this.wishlistService.removeFromWishlist(productId);
  }

  addToCart(product: Product): void {
    this.cartService.addToCart(product);
  }

  isInWishlist(productId: string): boolean {
    return this.wishlist.some(item => item.id === productId);
  }

  clearWishlist(): void {
    this.wishlistService.clearWishlist();
  }

  get discount(): number {
    if (this.wishlist.length > 0 && this.wishlist[0].originalPrice) {
      return Math.round(
        ((this.wishlist[0].originalPrice - this.wishlist[0].price) / this.wishlist[0].originalPrice) * 100
      );
    }
    return 0;
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
    return Array(5).fill(0).map((_, i) => i < rating ? 1 : 0);
  }
}

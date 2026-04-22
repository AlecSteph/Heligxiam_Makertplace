import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, Star, ShoppingCart, Heart, Eye, TrendingUp } from 'lucide-angular';
import { Product } from '../../models/product.model';
import { CartService } from '../../services/cart.service';
import { WishlistService } from '../../services/wishlist.service';
import { LocalizedPricePipe } from '../../pipes/localized-price.pipe';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule, LocalizedPricePipe],
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.css']
})
export class ProductCardComponent implements OnInit {
  @Input() product!: Product;

  isHovered = false;
  isLiked = false;

  // Lucide icons
  readonly Star = Star;
  readonly ShoppingCart = ShoppingCart;
  readonly Heart = Heart;
  readonly Eye = Eye;
  readonly TrendingUp = TrendingUp;

  constructor(private cartService: CartService, private wishlistService: WishlistService) {}

  ngOnInit(): void {
    // Vérifier si le produit est déjà dans les favoris
    this.isLiked = this.wishlistService.isInWishlist(this.product.id);
  }

  get discount(): number {
    if (this.product.originalPrice) {
      return Math.round(
        ((this.product.originalPrice - this.product.price) / this.product.originalPrice) * 100
      );
    }
    return 0;
  }

  handleAddToCart(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.cartService.addToCart(this.product);
  }

  handleLike(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    
    if (this.isLiked) {
      this.wishlistService.removeFromWishlist(this.product.id);
    } else {
      this.wishlistService.addToWishlist(this.product);
    }
    
    this.isLiked = !this.isLiked;
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
}

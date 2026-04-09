import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ProductCardComponent } from '../../components/product-card/product-card.component';
import { PRODUCTS } from '../../data/products.data';
import { Product } from '../../models/product.model';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-product-detail',
  imports: [CommonModule, FormsModule, RouterModule, ProductCardComponent],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.css'
})
export class ProductDetailComponent implements OnInit {
  product: Product | undefined;
  relatedProducts: Product[] = [];
  quantity = 1;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cartService: CartService
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.product = PRODUCTS.find(p => p.id === id);
        if (this.product) {
          this.relatedProducts = PRODUCTS
            .filter(p => p.category === this.product!.category && p.id !== this.product!.id)
            .slice(0, 4);
        }
      }
    });
  }

  goBack() {
    this.router.navigate(['..']);
  }

  addToCart() {
    if (this.product) {
      for (let i = 0; i < this.quantity; i++) {
        this.cartService.addToCart(this.product);
      }
      this.router.navigate(['/cart']);
    }
  }

  increaseQuantity() {
    this.quantity++;
  }

  decreaseQuantity() {
    this.quantity = Math.max(1, this.quantity - 1);
  }

  getCategoryRoute(category: string) {
    return ['/category', category.toLowerCase().replace(/\s+/g, '-')];
  }

  getBadgeClass(badge?: string): string {
    switch (badge) {
      case 'Promo':
        return 'bg-red-500 text-white';
      case 'Nouveau':
        return 'bg-green-500 text-white';
      case 'Meilleure vente':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-purple-500 text-white';
    }
  }

  getStars(rating: number): number[] {
    return Array(5).fill(0).map((_, i) => i);
  }

  isStarFilled(rating: number, index: number): boolean {
    return index < Math.floor(rating);
  }

  trackByIndex(index: number): number {
    return index;
  }
}

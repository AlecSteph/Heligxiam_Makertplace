import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, ChevronRight, Sparkles, TrendingUp, Award, Package, Shield, Zap, Crown } from 'lucide-angular';
import { ProductCardComponent } from '../../components/product-card/product-card.component';
import { PRODUCTS } from '../../data/products.data';
import { Product } from '../../models/product.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule, ProductCardComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  featuredProducts: Product[];
  bestSellers: Product[];
  promoProducts: Product[];
  premiumProducts: Product[];

  // Lucide icons
  readonly ChevronRight = ChevronRight;
  readonly Sparkles = Sparkles;
  readonly TrendingUp = TrendingUp;
  readonly Award = Award;
  readonly Package = Package;
  readonly Shield = Shield;
  readonly Zap = Zap;
  readonly Crown = Crown;

  categories = [
    { name: 'Ordinateurs', icon: '💻', route: 'ordinateurs' },
    { name: 'Smartphones', icon: '📱', route: 'smartphones' },
    { name: 'Audio', icon: '🎧', route: 'audio' },
    { name: 'Gaming', icon: '🎮', route: 'gaming' },
    { name: 'Photo & Vidéo', icon: '📷', route: 'photo-vidéo' },
    { name: 'Accessoires', icon: '⌚', route: 'accessoires' },
    { name: 'Électronique', icon: '⚡', route: 'électronique' },
    { name: 'Plus', icon: '➕', route: 'plus' }
  ];

  constructor() {
    this.featuredProducts = PRODUCTS.slice(0, 4);
    this.bestSellers = PRODUCTS.filter(p => p.badge === 'Bestseller' || p.rating >= 4.8);
    this.promoProducts = PRODUCTS.filter(p => p.originalPrice);
    this.premiumProducts = PRODUCTS.filter(p => p.badge === 'Premium' || p.badge === 'Exclusif');
  }
}

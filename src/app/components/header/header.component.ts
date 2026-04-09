import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Search, ShoppingCart, User, Heart, Package, Sparkles } from 'lucide-angular';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
  searchQuery = '';
  cartCount = 0;
  isLoggedIn = false;

  // Lucide icons
  readonly Search = Search;
  readonly ShoppingCart = ShoppingCart;
  readonly User = User;
  readonly Heart = Heart;
  readonly Package = Package;
  readonly Sparkles = Sparkles;

  constructor(
    private cartService: CartService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cartService.cart$.subscribe(() => {
      this.cartCount = this.cartService.getCartCount();
    });
    
    // Vérifier l'état de connexion
    this.checkLoginStatus();
    
    // Écouter les changements de navigation pour mettre à jour l'état
    this.router.events.subscribe(() => {
      this.checkLoginStatus();
    });
    
    // Écouter les changements de localStorage (déconnexion dans d'autres onglets)
    window.addEventListener('storage', (event) => {
      if (event.key === 'userToken') {
        this.checkLoginStatus();
      }
    });
  }

  checkLoginStatus(): void {
    const userToken = localStorage.getItem('userToken');
    this.isLoggedIn = !!userToken;
  }

  handleSearch(): void {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/search'], {
        queryParams: { q: this.searchQuery.trim() }
      });
    }
  }
}

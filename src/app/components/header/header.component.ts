import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Search, ShoppingCart, User, Heart, Package, Sparkles, LogOut } from 'lucide-angular';
import { Subscription } from 'rxjs';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { User as AuthUser } from '../../models/auth.model';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, OnDestroy {
  searchQuery = '';
  cartCount = 0;
  isLoggedIn = false;
  currentUser: AuthUser | null = null;
  showUserMenu = false;

  private subscriptions = new Subscription();

  // Lucide icons
  readonly Search = Search;
  readonly ShoppingCart = ShoppingCart;
  readonly User = User;
  readonly Heart = Heart;
  readonly Package = Package;
  readonly Sparkles = Sparkles;
  readonly LogOut = LogOut;

  constructor(
    private cartService: CartService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.cartService.cart$.subscribe(() => {
        this.cartCount = this.cartService.getCartCount();
      })
    );

    this.subscriptions.add(
      this.authService.authState$.subscribe(state => {
        this.isLoggedIn = state.isAuthenticated;
        this.currentUser = state.user;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  handleSearch(): void {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/search'], {
        queryParams: { q: this.searchQuery.trim() }
      });
    }
  }

  toggleUserMenu(event: Event): void {
    event.stopPropagation();
    this.showUserMenu = !this.showUserMenu;
  }

  closeUserMenu(): void {
    this.showUserMenu = false;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.showUserMenu) {
      this.showUserMenu = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.showUserMenu = false;
  }

  logout(): void {
    this.showUserMenu = false;
    this.authService.logout();
  }

  get userInitials(): string {
    if (!this.currentUser) return '';
    const first = this.currentUser.prenom?.charAt(0) ?? '';
    const last = this.currentUser.nom?.charAt(0) ?? '';
    return (first + last).toUpperCase();
  }
}

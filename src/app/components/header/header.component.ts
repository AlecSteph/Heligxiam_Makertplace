import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Search, ShoppingCart, User, Heart, Package, Sparkles, LogOut, Store, UserPlus, List, BookOpen, Headphones } from 'lucide-angular';
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
  showGuestMenu = false;
  showSearchCategories = false;
  private guestHoverTimeout?: ReturnType<typeof setTimeout>;

  // Dropdown filter for search (Amazon-like "Toutes catégories")
  searchCategory: { label: string; value: string } = { label: 'Toutes catégories', value: '' };
  readonly searchCategories: { label: string; value: string; slug?: string }[] = [
    { label: 'Toutes catégories', value: '' },
    { label: 'Électronique', value: 'Électronique', slug: 'electronique' },
    { label: 'Mode & Accessoires', value: 'Mode & Accessoires', slug: 'mode' },
    { label: 'Maison & Décoration', value: 'Maison & Décoration', slug: 'maison' },
    { label: 'Beauté & Santé', value: 'Beauté & Santé', slug: 'beaute' },
    { label: 'Sport & Fitness', value: 'Sport & Fitness', slug: 'sport' },
    { label: 'Automobile', value: 'Automobile', slug: 'auto' },
    { label: 'Meilleures ventes', value: '__bestsellers' },
    { label: 'Nouveautés', value: '__new' },
    { label: 'Marques Premium', value: '__brands' },
    { label: '🔥 Promotions', value: '__promos' },
    { label: '⚡ Ventes Flash', value: '__flash' },
    { label: '💰 Bons plans', value: '__deals' }
  ];

  private subscriptions = new Subscription();

  // Lucide icons
  readonly Search = Search;
  readonly ShoppingCart = ShoppingCart;
  readonly User = User;
  readonly Heart = Heart;
  readonly Package = Package;
  readonly Sparkles = Sparkles;
  readonly LogOut = LogOut;
  readonly Store = Store;
  readonly UserPlus = UserPlus;
  readonly List = List;
  readonly BookOpen = BookOpen;
  readonly Headphones = Headphones;

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
    const q = this.searchQuery.trim();
    const v = this.searchCategory.value;
    const queryParams: any = {};
    if (q) queryParams.q = q;

    // Virtual collections
    if (v === '__bestsellers') queryParams.sort = 'rating';
    else if (v === '__new') queryParams.badge = 'Nouveau';
    else if (v === '__brands') queryParams.tab = 'brands';
    else if (v === '__promos') queryParams.promo = 'true';
    else if (v === '__flash') queryParams.promo = 'flash';
    else if (v === '__deals') queryParams.promo = 'deals';

    // Real category: nav to /category/:slug for better UX
    const selectedCat = this.searchCategories.find(c => c.value === v);
    if (selectedCat?.slug) {
      this.router.navigate(['/category', selectedCat.slug], {
        queryParams: q ? { q } : undefined
      });
      return;
    }

    this.router.navigate(['/search'], { queryParams });
  }

  toggleSearchCategories(event: Event): void {
    event.stopPropagation();
    this.showSearchCategories = !this.showSearchCategories;
  }

  selectSearchCategory(cat: { label: string; value: string }): void {
    this.searchCategory = cat;
    this.showSearchCategories = false;
  }

  toggleUserMenu(event: Event): void {
    event.stopPropagation();
    this.showUserMenu = !this.showUserMenu;
  }

  closeUserMenu(): void {
    this.showUserMenu = false;
  }

  openGuestMenu(): void {
    if (this.guestHoverTimeout) clearTimeout(this.guestHoverTimeout);
    this.showGuestMenu = true;
  }

  scheduleCloseGuestMenu(): void {
    if (this.guestHoverTimeout) clearTimeout(this.guestHoverTimeout);
    this.guestHoverTimeout = setTimeout(() => {
      this.showGuestMenu = false;
    }, 150);
  }

  toggleGuestMenu(event: Event): void {
    event.stopPropagation();
    this.showGuestMenu = !this.showGuestMenu;
  }

  closeGuestMenu(): void {
    this.showGuestMenu = false;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.showUserMenu) {
      this.showUserMenu = false;
    }
    if (this.showGuestMenu) {
      this.showGuestMenu = false;
    }
    if (this.showSearchCategories) {
      this.showSearchCategories = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.showUserMenu = false;
    this.showGuestMenu = false;
    this.showSearchCategories = false;
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

  get isSeller(): boolean {
    return this.currentUser?.role === 'vendeur';
  }

  get roleLabel(): string {
    switch (this.currentUser?.role) {
      case 'vendeur': return 'Vendeur partenaire';
      case 'admin': return 'Administrateur';
      case 'client': return 'Client';
      default: return '';
    }
  }
}

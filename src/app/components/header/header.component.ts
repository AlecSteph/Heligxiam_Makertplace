import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, HostListener, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Search, ShoppingCart, User, Heart, Package, Sparkles, LogOut, Store, UserPlus, List, BookOpen, Headphones, Globe, Languages, CheckCircle2, Tag, Ticket, Gift, Percent, Wallet, Zap, ArrowRight, Menu, MapPin, Smartphone, Briefcase, Building2, CreditCard, Newspaper, HandCoins, Accessibility, MessageCircle, Phone, Truck, RefreshCw, HelpCircle, Leaf, Crown, X, FileText, ChevronLeft, ChevronRight } from 'lucide-angular';
import { Subscription } from 'rxjs';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { LocaleService, LanguageOption, CountryOption } from '../../services/locale.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { LogoComponent } from '../logo/logo.component';
import { User as AuthUser } from '../../models/auth.model';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule, TranslatePipe, LogoComponent],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, OnDestroy, AfterViewInit {
  searchQuery = '';
  cartCount = 0;
  isLoggedIn = false;
  currentUser: AuthUser | null = null;
  showUserMenu = false;
  showGuestMenu = false;
  showSearchCategories = false;
  showLanguageMenu = false;
  showOffersMenu = false;
  showSideMenu = false;
  private guestHoverTimeout?: ReturnType<typeof setTimeout>;
  private offersHoverTimeout?: ReturnType<typeof setTimeout>;

  readonly sideMenuSections: {
    titleKey: string;
    items: { labelKey: string; icon: typeof MapPin; route?: string; queryParams?: Record<string, string>; fragment?: string; descKey?: string; badgeKey?: string }[];
  }[] = [
    {
      titleKey: 'side.delivery.title',
      items: [
        { labelKey: 'side.delivery.relay.label', icon: MapPin, route: '/guide', fragment: 'livraison', descKey: 'side.delivery.relay.desc' },
        { labelKey: 'side.delivery.track.label', icon: Package, route: '/profile', queryParams: { view: 'orders' }, descKey: 'side.delivery.track.desc' },
        { labelKey: 'side.delivery.returns.label', icon: RefreshCw, route: '/guide', fragment: 'retours', descKey: 'side.delivery.returns.desc' },
        { labelKey: 'side.delivery.options.label', icon: Truck, route: '/guide', fragment: 'livraison', descKey: 'side.delivery.options.desc' }
      ]
    },
    {
      titleKey: 'side.services.title',
      items: [
        { labelKey: 'side.services.app.label', icon: Smartphone, route: '/guide', descKey: 'side.services.app.desc' },
        { labelKey: 'side.services.gift.label', icon: Gift, route: '/offres', fragment: 'coupons', descKey: 'side.services.gift.desc', badgeKey: 'badge.new' },
        { labelKey: 'side.services.plus.label', icon: Crown, route: '/offres', fragment: 'cashback', descKey: 'side.services.plus.desc' },
        { labelKey: 'side.services.pay.label', icon: CreditCard, route: '/guide', descKey: 'side.services.pay.desc' }
      ]
    },
    {
      titleKey: 'side.pro.title',
      items: [
        { labelKey: 'side.pro.sell.label', icon: Store, route: '/sell', descKey: 'side.pro.sell.desc' },
        { labelKey: 'side.pro.dashboard.label', icon: Briefcase, route: '/seller', descKey: 'side.pro.dashboard.desc' },
        { labelKey: 'side.pro.business.label', icon: Building2, route: '/guide', descKey: 'side.pro.business.desc', badgeKey: 'badge.pro' },
        { labelKey: 'side.pro.affiliate.label', icon: HandCoins, route: '/guide', descKey: 'side.pro.affiliate.desc' }
      ]
    },
    {
      titleKey: 'side.help.title',
      items: [
        { labelKey: 'side.help.center.label', icon: HelpCircle, route: '/guide', fragment: 'aide', descKey: 'side.help.center.desc' },
        { labelKey: 'side.help.chat.label', icon: MessageCircle, route: '/guide', fragment: 'aide', descKey: 'side.help.chat.desc' },
        { labelKey: 'side.help.contact.label', icon: Phone, route: '/guide', fragment: 'aide', descKey: 'side.help.contact.desc' },
        { labelKey: 'side.help.a11y.label', icon: Accessibility, route: '/guide', descKey: 'side.help.a11y.desc' }
      ]
    },
    {
      titleKey: 'side.about.title',
      items: [
        { labelKey: 'side.about.press.label', icon: Newspaper, route: '/guide', descKey: 'side.about.press.desc' },
        { labelKey: 'side.about.careers.label', icon: Briefcase, route: '/guide', descKey: 'side.about.careers.desc', badgeKey: 'badge.jobs' },
        { labelKey: 'side.about.eco.label', icon: Leaf, route: '/guide', descKey: 'side.about.eco.desc' },
        { labelKey: 'side.about.legal.label', icon: FileText, route: '/legal', fragment: 'legal' }
      ]
    }
  ];

  // Language & country (source : LocaleService)
  get languages(): LanguageOption[] {
    return this.localeService.languageOptions;
  }
  get countries(): CountryOption[] {
    return this.localeService.countryOptions;
  }
  selectedLanguage!: LanguageOption;
  selectedCountry!: CountryOption;

  // Toast de confirmation pour l'enregistrement des préférences
  prefToastVisible = false;
  prefToastMessage = '';
  private prefToastTimer?: ReturnType<typeof setTimeout>;

  searchCategory: { labelKey: string; value: string } = { labelKey: 'header.search.allCategories', value: '' };
  readonly searchCategories: { labelKey: string; value: string; slug?: string }[] = [
    { labelKey: 'header.search.allCategories', value: '' },
    { labelKey: 'nav.electronics', value: 'Électronique', slug: 'electronique' },
    { labelKey: 'nav.fashion', value: 'Mode & Accessoires', slug: 'mode' },
    { labelKey: 'nav.home', value: 'Maison & Décoration', slug: 'maison' },
    { labelKey: 'nav.beauty', value: 'Beauté & Santé', slug: 'beaute' },
    { labelKey: 'nav.sport', value: 'Sport & Fitness', slug: 'sport' },
    { labelKey: 'nav.auto', value: 'Automobile', slug: 'auto' },
    { labelKey: 'nav.bestsellers', value: '__bestsellers' },
    { labelKey: 'nav.new', value: '__new' },
    { labelKey: 'header.search.brandsPremium', value: '__brands' },
    { labelKey: 'nav.promos', value: '__promos' },
    { labelKey: 'nav.flash', value: '__flash' },
    { labelKey: 'nav.deals', value: '__deals' }
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
  readonly Globe = Globe;
  readonly Languages = Languages;
  readonly CheckCircle2 = CheckCircle2;
  readonly Tag = Tag;
  readonly Ticket = Ticket;
  readonly Gift = Gift;
  readonly Percent = Percent;
  readonly Wallet = Wallet;
  readonly Zap = Zap;
  readonly ArrowRight = ArrowRight;
  readonly Menu = Menu;
  readonly MapPin = MapPin;
  readonly Smartphone = Smartphone;
  readonly Briefcase = Briefcase;
  readonly Building2 = Building2;
  readonly CreditCard = CreditCard;
  readonly Newspaper = Newspaper;
  readonly HandCoins = HandCoins;
  readonly Accessibility = Accessibility;
  readonly MessageCircle = MessageCircle;
  readonly Phone = Phone;
  readonly Truck = Truck;
  readonly RefreshCw = RefreshCw;
  readonly HelpCircle = HelpCircle;
  readonly Leaf = Leaf;
  readonly Crown = Crown;
  readonly X = X;
  readonly ChevronLeft = ChevronLeft;
  readonly ChevronRight = ChevronRight;

  // ========== Marquee (JS-driven auto-scroll + manual controls) ==========
  @ViewChild('marqueeTrack') private marqueeTrack?: ElementRef<HTMLElement>;
  private marqueePos = 0;
  private marqueeHalfWidth = 0;
  private marqueeHovered = false;
  private readonly marqueeSpeedPxPerSec = 55; // vitesse auto
  private marqueeRafId?: number;
  private marqueeLastTs = 0;

  onMarqueeHoverEnter(): void { this.marqueeHovered = true; }
  onMarqueeHoverLeave(): void { this.marqueeHovered = false; }

  scrollMarquee(direction: 'left' | 'right', event?: Event): void {
    event?.stopPropagation();
    const step = 260;
    this.marqueePos += direction === 'left' ? step : -step;
    this.applyMarqueeTransform(true);
  }

  private applyMarqueeTransform(smooth = false): void {
    const track = this.marqueeTrack?.nativeElement;
    if (!track) return;
    if (this.marqueeHalfWidth > 0) {
      while (this.marqueePos <= -this.marqueeHalfWidth) this.marqueePos += this.marqueeHalfWidth;
      while (this.marqueePos > 0) this.marqueePos -= this.marqueeHalfWidth;
    }
    track.style.transition = smooth ? 'transform 0.35s ease-out' : 'none';
    track.style.transform = `translate3d(${this.marqueePos}px, 0, 0)`;
  }

  private startMarqueeLoop(): void {
    if (typeof window === 'undefined') return;
    this.zone.runOutsideAngular(() => {
      const tick = (ts: number) => {
        if (!this.marqueeTrack) {
          this.marqueeRafId = requestAnimationFrame(tick);
          return;
        }
        const track = this.marqueeTrack.nativeElement;
        if (!this.marqueeHalfWidth) this.marqueeHalfWidth = track.scrollWidth / 2;
        const dt = this.marqueeLastTs ? (ts - this.marqueeLastTs) / 1000 : 0;
        this.marqueeLastTs = ts;
        if (!this.marqueeHovered && dt > 0 && dt < 0.5) {
          this.marqueePos -= this.marqueeSpeedPxPerSec * dt;
          this.applyMarqueeTransform(false);
        }
        this.marqueeRafId = requestAnimationFrame(tick);
      };
      this.marqueeRafId = requestAnimationFrame(tick);
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.startMarqueeLoop(), 50);
  }
  readonly FileText = FileText;

  constructor(
    private cartService: CartService,
    private authService: AuthService,
    private router: Router,
    private zone: NgZone,
    private localeService: LocaleService,
    private cdr: ChangeDetectorRef
  ) {
    this.syncLocaleSelectionFromService();
  }

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

    this.subscriptions.add(
      this.localeService.prefs$.subscribe(() => {
        this.syncLocaleSelectionFromService();
        this.cdr.markForCheck();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    if (this.marqueeRafId !== undefined) {
      cancelAnimationFrame(this.marqueeRafId);
    }
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

  selectSearchCategory(cat: { labelKey: string; value: string }): void {
    this.searchCategory = cat;
    this.showSearchCategories = false;
  }

  countryLabel(code: string, lang?: string): string {
    return this.localeService.countryLabel(code, lang);
  }

  deliverToLabel(country: CountryOption, lang?: string): string {
    return this.localeService.t('header.locale.deliverTo', lang, {
      country: this.countryLabel(country.code, lang)
    });
  }

  searchPlaceholder(): string {
    if (!this.searchCategory.value) {
      return this.localeService.t('header.search.placeholder');
    }
    return this.localeService.t('header.search.placeholderIn', undefined, {
      category: this.localeService.t(this.searchCategory.labelKey)
    });
  }

  toggleLanguageMenu(event: Event): void {
    event.stopPropagation();
    this.showLanguageMenu = !this.showLanguageMenu;
    // Toujours réaligner sur les préférences enregistrées à l’ouverture / fermeture
    this.syncLocaleSelectionFromService();
  }

  selectLanguage(lang: LanguageOption): void {
    this.selectedLanguage = this.localeService.resolveLanguage(lang.code);
    this.localeService.setPreferences(this.selectedLanguage, this.selectedCountry);
  }

  selectCountry(country: CountryOption): void {
    this.selectedCountry = this.localeService.resolveCountry(country.code);
    this.localeService.setPreferences(this.selectedLanguage, this.selectedCountry);
  }

  confirmLanguageChange(event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    this.localeService.setPreferences(this.selectedLanguage, this.selectedCountry);
    this.showLanguageMenu = false;
    this.showPrefToast(this.localeService.t('action.saved'));
  }

  private syncLocaleSelectionFromService(): void {
    const p = this.localeService.prefs;
    this.selectedLanguage = this.localeService.resolveLanguage(p.language.code);
    this.selectedCountry = this.localeService.resolveCountry(p.country.code);
  }

  private showPrefToast(message: string): void {
    this.prefToastMessage = message;
    this.prefToastVisible = true;
    if (this.prefToastTimer) clearTimeout(this.prefToastTimer);
    this.prefToastTimer = setTimeout(() => { this.prefToastVisible = false; }, 2600);
  }

  /** Libellé du bouton Enregistrer selon la langue sélectionnée dans le menu. */
  get savePreferencesButtonLabel(): string {
    return this.localeService.t('action.save', this.selectedLanguage.code);
  }

  openOffersMenu(): void {
    if (this.offersHoverTimeout) clearTimeout(this.offersHoverTimeout);
    this.showOffersMenu = true;
  }

  scheduleCloseOffersMenu(): void {
    if (this.offersHoverTimeout) clearTimeout(this.offersHoverTimeout);
    this.offersHoverTimeout = setTimeout(() => {
      this.showOffersMenu = false;
    }, 180);
  }

  toggleOffersMenu(event: Event): void {
    event.stopPropagation();
    this.showOffersMenu = !this.showOffersMenu;
  }

  closeOffersMenu(): void {
    this.showOffersMenu = false;
  }

  toggleSideMenu(event?: Event): void {
    if (event) event.stopPropagation();
    this.showSideMenu = !this.showSideMenu;
    if (typeof document !== 'undefined') {
      document.body.style.overflow = this.showSideMenu ? 'hidden' : '';
    }
  }

  closeSideMenu(): void {
    this.showSideMenu = false;
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
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

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const t = event.target as HTMLElement | null;
    const insideLocale = !!t?.closest?.('[data-locale-menu]');

    if (this.showUserMenu) {
      this.showUserMenu = false;
    }
    if (this.showGuestMenu) {
      this.showGuestMenu = false;
    }
    if (this.showSearchCategories) {
      this.showSearchCategories = false;
    }
    if (this.showLanguageMenu && !insideLocale) {
      this.syncLocaleSelectionFromService();
      this.showLanguageMenu = false;
    }
    if (this.showOffersMenu) {
      this.showOffersMenu = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.showUserMenu = false;
    this.showGuestMenu = false;
    this.showSearchCategories = false;
    if (this.showLanguageMenu) {
      this.syncLocaleSelectionFromService();
      this.showLanguageMenu = false;
    }
    this.showOffersMenu = false;
    if (this.showSideMenu) this.closeSideMenu();
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

  /** Session acheteur uniquement — l’espace client ne doit pas afficher le compte vendeur/admin. */
  get isClientLoggedIn(): boolean {
    return this.isLoggedIn && this.currentUser?.role === 'client';
  }

  get roleLabel(): string {
    switch (this.currentUser?.role) {
      case 'vendeur': return this.localeService.t('role.seller');
      case 'admin': return this.localeService.t('role.admin');
      case 'client': return this.localeService.t('role.client');
      default: return '';
    }
  }
}

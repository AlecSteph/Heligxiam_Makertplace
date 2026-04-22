import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, Heart, Share2, Check, Link2, Facebook, Twitter, Mail, MessageCircle, ChevronLeft, ChevronRight, Star, ThumbsUp, BadgeCheck, Filter } from 'lucide-angular';
import { ProductCardComponent } from '../../components/product-card/product-card.component';
import { PRODUCTS } from '../../data/products.data';
import { Product } from '../../models/product.model';
import { CartService } from '../../services/cart.service';
import { WishlistService } from '../../services/wishlist.service';

interface ReviewItem {
  id: number;
  author: string;
  avatarInitials: string;
  avatarColor: string;
  rating: number;
  date: string;
  verified: boolean;
  title: string;
  text: string;
  photos: string[];
  helpful: number;
  helpfulPressed?: boolean;
}

@Component({
  selector: 'app-product-detail',
  imports: [CommonModule, FormsModule, RouterModule, ProductCardComponent, LucideAngularModule],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.css'
})
export class ProductDetailComponent implements OnInit {
  product: Product | undefined;
  relatedProducts: Product[] = [];
  quantity = 1;

  // Galerie
  galleryImages: string[] = [];
  currentImageIndex = 0;

  // Wishlist
  isFavorite = false;

  // Share menu
  showShareMenu = false;

  // Toast feedback
  toastMessage = '';
  toastVisible = false;
  private toastTimer?: ReturnType<typeof setTimeout>;

  // Avis
  allReviews: ReviewItem[] = [];
  visibleReviewsCount = 4;
  filterRating: number | null = null; // null = tous

  // Icons
  readonly Heart = Heart;
  readonly Share2 = Share2;
  readonly Check = Check;
  readonly Link2 = Link2;
  readonly Facebook = Facebook;
  readonly Twitter = Twitter;
  readonly Mail = Mail;
  readonly MessageCircle = MessageCircle;
  readonly ChevronLeft = ChevronLeft;
  readonly ChevronRight = ChevronRight;
  readonly Star = Star;
  readonly ThumbsUp = ThumbsUp;
  readonly BadgeCheck = BadgeCheck;
  readonly Filter = Filter;

  // Images additionnelles par catégorie (fallback pour enrichir la galerie)
  private readonly categoryGallery: Record<string, string[]> = {
    'Électronique': [
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1000&q=80',
      'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=1000&q=80',
      'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=1000&q=80'
    ],
    'Mode & Accessoires': [
      'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1000&q=80',
      'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=1000&q=80',
      'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=1000&q=80'
    ],
    'Maison & Décoration': [
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1000&q=80',
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1000&q=80',
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1000&q=80'
    ],
    'Sport & Fitness': [
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1000&q=80',
      'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=1000&q=80',
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1000&q=80'
    ],
    'Beauté & Santé': [
      'https://images.unsplash.com/photo-1522335789203-aaa686ef3fb4?w=1000&q=80',
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=1000&q=80',
      'https://images.unsplash.com/photo-1571875257727-256c39da42af?w=1000&q=80'
    ],
    'Automobile': [
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1000&q=80',
      'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1000&q=80',
      'https://images.unsplash.com/photo-1553440569-bcc63803a83d?w=1000&q=80'
    ]
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cartService: CartService,
    private wishlistService: WishlistService
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
          this.isFavorite = this.wishlistService.isInWishlist(this.product.id);
          this.buildGallery();
          this.buildReviews();
          this.currentImageIndex = 0;
          this.visibleReviewsCount = 4;
          this.filterRating = null;
        }
      }
    });
  }

  // ========== Galerie ==========
  private buildGallery(): void {
    if (!this.product) return;
    const extras = this.categoryGallery[this.product.category] || [];
    this.galleryImages = [this.product.image, ...extras].slice(0, 4);
  }

  setImage(i: number): void {
    if (i < 0 || i >= this.galleryImages.length) return;
    this.currentImageIndex = i;
  }

  nextImage(): void {
    if (!this.galleryImages.length) return;
    this.currentImageIndex = (this.currentImageIndex + 1) % this.galleryImages.length;
  }

  prevImage(): void {
    if (!this.galleryImages.length) return;
    this.currentImageIndex = (this.currentImageIndex - 1 + this.galleryImages.length) % this.galleryImages.length;
  }

  // ========== Avis (mock) ==========
  private buildReviews(): void {
    if (!this.product) return;
    const name = this.product.name.split(' ').slice(0, 2).join(' ');
    this.allReviews = [
      {
        id: 1,
        author: 'Sophie Martin',
        avatarInitials: 'SM',
        avatarColor: 'bg-rose-500',
        rating: 5,
        date: '2 avril 2026',
        verified: true,
        title: 'Vraiment à la hauteur de mes attentes',
        text: `J'hésitais avant d'acheter ce ${name}, mais je ne regrette absolument pas ! La qualité est premium, l'emballage soigné et la livraison a été plus rapide que prévu. Je recommande les yeux fermés.`,
        photos: [
          'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80',
          'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80'
        ],
        helpful: 47
      },
      {
        id: 2,
        author: 'Julien Bernard',
        avatarInitials: 'JB',
        avatarColor: 'bg-indigo-500',
        rating: 4,
        date: '28 mars 2026',
        verified: true,
        title: 'Bon rapport qualité-prix',
        text: "Solide, bien conçu, conforme à la description. Seul petit bémol : le manuel est un peu succinct. Mais une fois pris en main, rien à redire. Je conseille !",
        photos: [],
        helpful: 23
      },
      {
        id: 3,
        author: 'Amélie Petit',
        avatarInitials: 'AP',
        avatarColor: 'bg-emerald-500',
        rating: 5,
        date: '18 mars 2026',
        verified: true,
        title: 'Exactement comme sur la photo',
        text: `Le ${name} est identique à ce qui est montré sur le site. Finitions impeccables, fonctionne parfaitement dès la sortie du carton. Service client réactif quand j'ai eu une question sur la garantie. Top.`,
        photos: [
          'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=400&q=80'
        ],
        helpful: 31
      },
      {
        id: 4,
        author: 'Thomas Lefèvre',
        avatarInitials: 'TL',
        avatarColor: 'bg-amber-500',
        rating: 4,
        date: '10 mars 2026',
        verified: false,
        title: 'Presque parfait',
        text: "Produit de qualité, livré rapidement. Je retire une étoile car l'emballage aurait pu être plus éco-responsable. Pour le reste, aucun reproche à faire, je le recommande.",
        photos: [],
        helpful: 15
      },
      {
        id: 5,
        author: 'Clara Dubois',
        avatarInitials: 'CD',
        avatarColor: 'bg-purple-500',
        rating: 5,
        date: '5 mars 2026',
        verified: true,
        title: 'Coup de cœur',
        text: "Je l'ai offert à ma sœur pour son anniversaire et elle en est ravie. Elle l'utilise tous les jours depuis. Packaging cadeau proposé par HELIGXIAM au top. Parfait !",
        photos: [],
        helpful: 28
      },
      {
        id: 6,
        author: 'Nicolas Roux',
        avatarInitials: 'NR',
        avatarColor: 'bg-sky-500',
        rating: 3,
        date: '28 février 2026',
        verified: true,
        title: 'Correct mais peut mieux faire',
        text: "Le produit fait le job, mais pour le prix je m'attendais à un peu plus. Les matériaux sont bons sans être exceptionnels. Cela dit, service client réactif donc je reviendrai sans doute.",
        photos: [],
        helpful: 9
      },
      {
        id: 7,
        author: 'Léa Moreau',
        avatarInitials: 'LM',
        avatarColor: 'bg-pink-500',
        rating: 5,
        date: '15 février 2026',
        verified: true,
        title: 'Je recommande à 100%',
        text: `Déjà mon 2e ${name}, le premier étant parti chez mon père. Aucun souci, qualité constante, livraison rapide. Je continue de commander sur HELIGXIAM les yeux fermés.`,
        photos: [
          'https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=400&q=80',
          'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80'
        ],
        helpful: 52
      },
      {
        id: 8,
        author: 'Kevin Simon',
        avatarInitials: 'KS',
        avatarColor: 'bg-orange-500',
        rating: 2,
        date: '8 février 2026',
        verified: true,
        title: 'Déçu par la finition',
        text: "Le produit en lui-même est OK, mais j'ai eu une petite rayure dès le déballage. Retour facile grâce au service client, mais un peu dommage pour un premier achat.",
        photos: [],
        helpful: 6
      }
    ];
  }

  get filteredReviews(): ReviewItem[] {
    if (this.filterRating === null) return this.allReviews;
    return this.allReviews.filter(r => Math.floor(r.rating) === this.filterRating);
  }

  get visibleReviews(): ReviewItem[] {
    return this.filteredReviews.slice(0, this.visibleReviewsCount);
  }

  ratingDistribution(): { stars: number; count: number; percent: number }[] {
    const total = this.allReviews.length;
    return [5, 4, 3, 2, 1].map(stars => {
      const count = this.allReviews.filter(r => Math.floor(r.rating) === stars).length;
      return { stars, count, percent: total ? Math.round((count / total) * 100) : 0 };
    });
  }

  averageRating(): number {
    if (!this.allReviews.length) return 0;
    const sum = this.allReviews.reduce((a, r) => a + r.rating, 0);
    return Math.round((sum / this.allReviews.length) * 10) / 10;
  }

  setReviewFilter(rating: number | null): void {
    this.filterRating = rating;
    this.visibleReviewsCount = 4;
  }

  loadMoreReviews(): void {
    this.visibleReviewsCount += 4;
  }

  markHelpful(review: ReviewItem): void {
    if (review.helpfulPressed) return;
    review.helpful += 1;
    review.helpfulPressed = true;
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

  // ========== Favoris ==========
  toggleFavorite(): void {
    if (!this.product) return;
    if (this.isFavorite) {
      this.wishlistService.removeFromWishlist(this.product.id);
      this.isFavorite = false;
      this.showToast('Retiré de vos favoris');
    } else {
      this.wishlistService.addToWishlist(this.product);
      this.isFavorite = true;
      this.showToast('Ajouté à vos favoris ❤');
    }
  }

  // ========== Partage ==========
  private getShareUrl(): string {
    return typeof window !== 'undefined' ? window.location.href : '';
  }

  private getShareText(): string {
    if (!this.product) return '';
    return `Découvrez ${this.product.name} sur HELIGXIAM — ${this.product.price.toFixed(2)}€`;
  }

  toggleShareMenu(event?: Event): void {
    event?.stopPropagation();
    const nav = (typeof navigator !== 'undefined' ? navigator : undefined) as (Navigator & { share?: (data: ShareData) => Promise<void> }) | undefined;
    if (nav && typeof nav.share === 'function' && this.product) {
      nav.share({
        title: this.product.name,
        text: this.getShareText(),
        url: this.getShareUrl()
      }).catch(() => { /* user cancelled */ });
      return;
    }
    this.showShareMenu = !this.showShareMenu;
  }

  closeShareMenu(): void {
    this.showShareMenu = false;
  }

  copyLink(): void {
    const url = this.getShareUrl();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        this.showToast('Lien copié !');
        this.closeShareMenu();
      }).catch(() => {
        this.fallbackCopy(url);
      });
    } else {
      this.fallbackCopy(url);
    }
  }

  private fallbackCopy(text: string): void {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      this.showToast('Lien copié !');
      this.closeShareMenu();
    } catch {
      this.showToast("Impossible de copier");
    }
  }

  shareOn(platform: 'facebook' | 'twitter' | 'whatsapp' | 'email'): void {
    const url = encodeURIComponent(this.getShareUrl());
    const text = encodeURIComponent(this.getShareText());
    let target = '';
    switch (platform) {
      case 'facebook':
        target = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
        break;
      case 'twitter':
        target = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
        break;
      case 'whatsapp':
        target = `https://api.whatsapp.com/send?text=${text}%20${url}`;
        break;
      case 'email':
        target = `mailto:?subject=${text}&body=${text}%20${url}`;
        break;
    }
    if (target) {
      window.open(target, '_blank', 'noopener,noreferrer');
      this.closeShareMenu();
    }
  }

  // ========== Toast ==========
  private showToast(msg: string): void {
    this.toastMessage = msg;
    this.toastVisible = true;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.toastVisible = false; }, 2200);
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

  trackByReview(index: number, item: ReviewItem): number {
    return item.id;
  }
}

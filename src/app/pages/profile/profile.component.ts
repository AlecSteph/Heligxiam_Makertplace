import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription as RxSubscription } from 'rxjs';
import {
  LucideAngularModule,
  LayoutDashboard,
  ShoppingBag,
  Package,
  Heart,
  MapPin,
  CreditCard,
  Star,
  MessageSquare,
  Settings,
  HelpCircle,
  Shield,
  LogOut,
  Bell,
  Gift,
  Crown,
  Award,
  Sparkles,
  TrendingUp,
  Truck,
  Clock,
  CheckCircle2,
  Edit3,
  Trash2,
  Plus,
  Home,
  Briefcase,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Globe,
  Smartphone,
  User as UserIcon,
  Wallet,
  Tag,
  Percent,
  Leaf,
  Zap,
  BookOpen,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  Calendar,
  Camera,
  Download,
  RefreshCw,
  Search,
  Filter,
  AlertCircle,
  CheckCircle,
  Copy,
  ExternalLink,
  ShoppingCart,
  Repeat,
  PlayCircle,
  Music,
  Headphones,
  Tv,
  Gamepad2
} from 'lucide-angular';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/auth.model';

type ProfileView =
  | 'dashboard'
  | 'orders'
  | 'purchases'
  | 'wishlist'
  | 'addresses'
  | 'payments'
  | 'reviews'
  | 'messages'
  | 'coupons'
  | 'loyalty'
  | 'subscriptions'
  | 'settings'
  | 'security'
  | 'help';

interface NavItem {
  id: ProfileView;
  label: string;
  icon: any;
  badge?: number;
}
interface NavGroup { label: string; items: NavItem[]; }

interface OrderItem {
  id: string;
  date: Date;
  status: 'delivered' | 'shipped' | 'processing' | 'cancelled' | 'preparing';
  total: number;
  items: number;
  seller: string;
  products: { name: string; image: string; qty: number }[];
  tracking?: string;
  eta?: string;
  progress?: number; // 0-100
}

interface WishlistItem {
  id: number;
  name: string;
  price: number;
  oldPrice?: number;
  seller: string;
  rating: number;
  reviews: number;
  image: string;
  discount: number;
  inStock: boolean;
}

interface Recommendation {
  id: number;
  name: string;
  image: string;
  price: number;
  rating: number;
  badge?: string;
  reason: string;
}

interface Coupon {
  id: number;
  code: string;
  title: string;
  description: string;
  discount: string;
  minAmount: number;
  expiresAt: Date;
  used: boolean;
  color: string;
  icon: any;
}

interface UserSubscription {
  id: number;
  name: string;
  description: string;
  price: string;
  renewDate: Date;
  status: 'active' | 'paused' | 'cancelled';
  icon: any;
  color: string;
  perks: string[];
}

interface ReviewItem {
  id: number;
  productName: string;
  productImage: string;
  rating: number;
  comment: string;
  date: Date;
  helpful: number;
  reply?: string;
}

interface MessageItem {
  id: number;
  sender: string;
  senderAvatar?: string;
  subject: string;
  preview: string;
  date: Date;
  read: boolean;
  type: 'order' | 'promo' | 'support' | 'seller';
}

interface Activity {
  id: number;
  icon: any;
  color: string;
  title: string;
  description: string;
  time: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, LucideAngularModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ProfileComponent implements OnInit, OnDestroy {
  currentView: ProfileView = 'dashboard';

  private authSubscription?: RxSubscription;

  // ==== Icons ====
  readonly LayoutDashboard = LayoutDashboard;
  readonly ShoppingBag = ShoppingBag;
  readonly Package = Package;
  readonly Heart = Heart;
  readonly MapPin = MapPin;
  readonly CreditCard = CreditCard;
  readonly Star = Star;
  readonly MessageSquare = MessageSquare;
  readonly Settings = Settings;
  readonly HelpCircle = HelpCircle;
  readonly Shield = Shield;
  readonly LogOut = LogOut;
  readonly Bell = Bell;
  readonly Gift = Gift;
  readonly Crown = Crown;
  readonly Award = Award;
  readonly Sparkles = Sparkles;
  readonly TrendingUp = TrendingUp;
  readonly Truck = Truck;
  readonly Clock = Clock;
  readonly CheckCircle2 = CheckCircle2;
  readonly Edit3 = Edit3;
  readonly Trash2 = Trash2;
  readonly Plus = Plus;
  readonly Home = Home;
  readonly Briefcase = Briefcase;
  readonly Phone = Phone;
  readonly Mail = Mail;
  readonly Lock = Lock;
  readonly Eye = Eye;
  readonly EyeOff = EyeOff;
  readonly Globe = Globe;
  readonly Smartphone = Smartphone;
  readonly UserIcon = UserIcon;
  readonly Wallet = Wallet;
  readonly Tag = Tag;
  readonly Percent = Percent;
  readonly Leaf = Leaf;
  readonly Zap = Zap;
  readonly BookOpen = BookOpen;
  readonly ArrowRight = ArrowRight;
  readonly ChevronRight = ChevronRight;
  readonly ChevronDown = ChevronDown;
  readonly Calendar = Calendar;
  readonly Camera = Camera;
  readonly Download = Download;
  readonly RefreshCw = RefreshCw;
  readonly Search = Search;
  readonly Filter = Filter;
  readonly AlertCircle = AlertCircle;
  readonly CheckCircle = CheckCircle;
  readonly Copy = Copy;
  readonly ExternalLink = ExternalLink;
  readonly ShoppingCart = ShoppingCart;
  readonly Repeat = Repeat;
  readonly PlayCircle = PlayCircle;
  readonly Music = Music;
  readonly Headphones = Headphones;
  readonly Tv = Tv;
  readonly Gamepad2 = Gamepad2;

  // ==== User ====
  userInfo = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '+33 6 12 34 56 78',
    avatar: '',
    memberSince: new Date(),
    userType: 'client',
    verified: true,
    level: 'Gold',
    bio: 'Passionné de tech et de bons plans.'
  };

  // ==== Stats ====
  stats = {
    totalOrders: 24,
    totalPurchases: 18,
    totalSpent: 2847.50,
    savedItems: 12,
    reviews: 8,
    averageRating: 4.5,
    totalSavings: 487.20,
    co2Saved: 12.4 // kg
  };

  // ==== Loyalty ====
  loyalty = {
    points: 2847,
    tier: 'Gold',
    nextTier: 'Platinum',
    pointsToNext: 653,
    nextTierTotal: 3500,
    tierBenefits: [
      'Livraison gratuite prioritaire',
      'Support dédié 7j/7',
      'Offres exclusives mensuelles',
      'Cashback 2% sur toutes vos commandes'
    ],
    history: [
      { label: 'Achat Casque Aurora', date: 'Il y a 3 jours', points: 159 },
      { label: 'Parrainage Léa B.', date: 'Il y a 1 semaine', points: 500 },
      { label: 'Avis laissé sur 2 produits', date: 'Il y a 2 semaines', points: 50 },
      { label: 'Achat Montre Pulse X2', date: 'Il y a 3 semaines', points: 189 }
    ]
  };

  // ==== Credit ====
  creditBalance = 42.50;

  // ==== Delivery tracking (active) ====
  activeDelivery = {
    orderId: 'CMD-2026-00247',
    product: 'Casque Audio Aurora',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&q=80',
    seller: 'TechStore Pro',
    status: 'shipped' as const,
    carrier: 'HELIGXIAM Express',
    tracking: 'HX-284027-FR',
    eta: 'Demain avant 18h',
    progress: 70,
    steps: [
      { label: 'Commandé', done: true, date: '20 avr' },
      { label: 'Préparé', done: true, date: '20 avr' },
      { label: 'Expédié', done: true, date: '21 avr' },
      { label: 'En livraison', done: false, date: 'Aujourd\'hui' },
      { label: 'Livré', done: false, date: 'Demain' }
    ]
  };

  // ==== Orders ====
  recentOrders: OrderItem[] = [
    {
      id: 'CMD-2026-00247',
      date: new Date(2026, 3, 20),
      status: 'shipped',
      total: 159.00,
      items: 1,
      seller: 'TechStore Pro',
      products: [{ name: 'Casque Audio Aurora', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&q=80', qty: 1 }],
      tracking: 'HX-284027-FR',
      eta: 'Demain avant 18h',
      progress: 70
    },
    {
      id: 'CMD-2026-00239',
      date: new Date(2026, 3, 18),
      status: 'processing',
      total: 234.75,
      items: 3,
      seller: 'ElectroMarket',
      products: [
        { name: 'Chargeur sans fil', image: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=200&q=80', qty: 2 },
        { name: 'Câble USB-C tressé', image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=200&q=80', qty: 3 }
      ],
      progress: 25
    },
    {
      id: 'CMD-2026-00221',
      date: new Date(2026, 3, 10),
      status: 'delivered',
      total: 189.00,
      items: 1,
      seller: 'TechStore Pro',
      products: [{ name: 'Montre connectée Pulse X2', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&q=80', qty: 1 }],
      progress: 100
    },
    {
      id: 'CMD-2026-00198',
      date: new Date(2026, 2, 28),
      status: 'delivered',
      total: 89.50,
      items: 2,
      seller: 'Fashion Hub',
      products: [
        { name: 'Sac à dos minimaliste', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=200&q=80', qty: 1 },
        { name: 'T-shirt premium', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200&q=80', qty: 1 }
      ],
      progress: 100
    },
    {
      id: 'CMD-2026-00172',
      date: new Date(2026, 2, 15),
      status: 'cancelled',
      total: 49.90,
      items: 1,
      seller: 'Home Essentials',
      products: [{ name: 'Diffuseur d\'huiles essentielles', image: 'https://images.unsplash.com/photo-1598300056393-4aac492f4344?w=200&q=80', qty: 1 }],
      progress: 0
    }
  ];

  // ==== Recommendations ====
  recommendations: Recommendation[] = [
    { id: 1, name: 'Enceinte Bluetooth Waveform', image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&q=80', price: 89, rating: 4.6, badge: 'Best-seller', reason: 'Parce que vous avez acheté "Casque Aurora"' },
    { id: 2, name: 'Clavier mécanique RGB', image: 'https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=400&q=80', price: 129.90, rating: 4.7, reason: 'Dans votre catégorie préférée' },
    { id: 3, name: 'Souris ergonomique Pro', image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&q=80', price: 54.90, rating: 4.5, badge: '-20%', reason: 'Populaire cette semaine' },
    { id: 4, name: 'Webcam 4K StreamPro', image: 'https://images.unsplash.com/photo-1587304931437-36bb6bee8edb?w=400&q=80', price: 149, rating: 4.4, reason: 'Complète votre setup' }
  ];

  // ==== Recently viewed ====
  recentlyViewed = [
    { id: 1, name: 'AirPods Pro 2', image: 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=300&q=80', price: 279 },
    { id: 2, name: 'iPad Air M2', image: 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=300&q=80', price: 799 },
    { id: 3, name: 'Kindle Paperwhite', image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300&q=80', price: 149 },
    { id: 4, name: 'GoPro Hero 12', image: 'https://images.unsplash.com/photo-1526045478516-99145907023c?w=300&q=80', price: 449 },
    { id: 5, name: 'PlayStation 5', image: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=300&q=80', price: 549 }
  ];

  // ==== Addresses ====
  addresses = [
    { id: 1, type: 'principal', name: 'Domicile', icon: this.Home, street: '123 Avenue des Champs-Élysées', city: 'Paris', postalCode: '75008', country: 'France', phone: '0612345678', isDefault: true },
    { id: 2, type: 'secondary', name: 'Bureau', icon: this.Briefcase, street: '45 Rue de la Paix', city: 'Lyon', postalCode: '69000', country: 'France', phone: '0612345678', isDefault: false }
  ];

  // ==== Payment methods ====
  paymentMethods = [
    { id: 1, type: 'visa', name: 'Visa', last4: '4242', expiry: '12/27', isDefault: true, brand: 'Visa' },
    { id: 2, type: 'mastercard', name: 'Mastercard', last4: '8888', expiry: '08/26', isDefault: false, brand: 'Mastercard' },
    { id: 3, type: 'paypal', name: 'PayPal', email: 'jean.dupont@email.com', isDefault: false, brand: 'PayPal' }
  ];

  // ==== Wishlist ====
  wishlist: WishlistItem[] = [
    { id: 1, name: 'iPhone 15 Pro Max', price: 1169.99, oldPrice: 1299.99, seller: 'TechStore Pro', rating: 4.8, reviews: 1284, image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&q=80', discount: 10, inStock: true },
    { id: 2, name: 'MacBook Air M2', price: 999.99, seller: 'Apple Reseller', rating: 4.9, reviews: 876, image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&q=80', discount: 0, inStock: true },
    { id: 3, name: 'Sony WH-1000XM5', price: 349, oldPrice: 399, seller: 'Audio Expert', rating: 4.7, reviews: 542, image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400&q=80', discount: 12, inStock: false },
    { id: 4, name: 'Apple Watch Ultra 2', price: 899, seller: 'TechStore Pro', rating: 4.8, reviews: 321, image: 'https://images.unsplash.com/photo-1551816230-ef5deaed4a26?w=400&q=80', discount: 0, inStock: true }
  ];

  // ==== Messages ====
  messages: MessageItem[] = [
    { id: 1, sender: 'TechStore Pro', subject: 'Votre commande CMD-2026-00247 a été expédiée', preview: 'Bonjour, votre colis est en route et sera livré demain avant 18h...', date: new Date(2026, 3, 21), read: false, type: 'order' },
    { id: 2, sender: 'HELIGXIAM', subject: 'Offre exclusive -30% rien que pour vous', preview: 'Profitez de -30% sur la catégorie Mode jusqu\'à dimanche minuit...', date: new Date(2026, 3, 20), read: false, type: 'promo' },
    { id: 3, sender: 'Fashion Hub', subject: 'Merci pour votre avis !', preview: 'Nous avons reçu votre avis 5 étoiles sur le sac à dos, un grand merci...', date: new Date(2026, 3, 19), read: true, type: 'seller' },
    { id: 4, sender: 'Support HELIGXIAM', subject: 'Votre demande de retour est acceptée', preview: 'Bonjour Jean, votre demande de retour pour la commande CMD-2026-00172 a été approuvée...', date: new Date(2026, 3, 16), read: true, type: 'support' }
  ];

  // ==== Reviews ====
  reviews: ReviewItem[] = [
    { id: 1, productName: 'Montre connectée Pulse X2', productImage: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&q=80', rating: 5, comment: 'Excellente montre, l\'autonomie tient vraiment 14 jours comme annoncé. L\'écran est superbe et les notifications précises.', date: new Date(2026, 3, 14), helpful: 24, reply: 'Merci pour votre retour ! Nous sommes ravis.' },
    { id: 2, productName: 'Sac à dos minimaliste', productImage: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=200&q=80', rating: 4, comment: 'Très pratique pour le quotidien, bien pensé. Un peu cher mais la qualité est au rendez-vous.', date: new Date(2026, 3, 8), helpful: 12 },
    { id: 3, productName: 'T-shirt premium', productImage: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200&q=80', rating: 5, comment: 'Matière douce, coupe parfaite. Je prends la même chose en noir !', date: new Date(2026, 2, 30), helpful: 8 }
  ];

  // ==== Coupons ====
  coupons: Coupon[] = [
    { id: 1, code: 'BIENVENUE10', title: 'Bienvenue chez HELIGXIAM', description: '10€ de réduction sur votre prochaine commande', discount: '-10€', minAmount: 50, expiresAt: new Date(2026, 5, 30), used: false, color: 'from-indigo-500 to-purple-600', icon: this.Gift },
    { id: 2, code: 'MODE30', title: 'Spécial Mode', description: 'Toute la catégorie Mode & Accessoires', discount: '-30%', minAmount: 40, expiresAt: new Date(2026, 4, 5), used: false, color: 'from-pink-500 to-rose-600', icon: this.Tag },
    { id: 3, code: 'TECH15', title: 'Électronique Premium', description: 'Sur les produits de la catégorie électronique', discount: '-15%', minAmount: 100, expiresAt: new Date(2026, 4, 12), used: false, color: 'from-cyan-500 to-blue-600', icon: this.Zap },
    { id: 4, code: 'FIRST5', title: 'Premier achat', description: 'Code utilisé le 05/02/2026', discount: '-5€', minAmount: 25, expiresAt: new Date(2026, 1, 5), used: true, color: 'from-gray-400 to-gray-500', icon: this.CheckCircle }
  ];

  copiedCouponId: number | null = null;

  // ==== Subscriptions ====
  subscriptions: UserSubscription[] = [
    { id: 1, name: 'HELIGXIAM Premium', description: 'Livraison, streaming, ebooks et jeux', price: '5,99€/mois', renewDate: new Date(2026, 4, 15), status: 'active', icon: this.Crown, color: 'from-indigo-600 to-purple-700', perks: ['Livraison gratuite illimitée', 'Films & séries HD', '2M titres musicaux', '1 ebook/mois offert'] },
    { id: 2, name: 'Livraison Jour J', description: 'Livraison express same-day', price: '9,99€/mois', renewDate: new Date(2026, 4, 22), status: 'paused', icon: this.Truck, color: 'from-amber-500 to-orange-600', perks: ['Livraison en 2-4h', 'Paris + Grandes villes', 'Sans minimum d\'achat'] }
  ];

  // ==== Activity feed ====
  activities: Activity[] = [
    { id: 1, icon: this.Truck, color: 'bg-blue-100 text-blue-700', title: 'Colis en chemin', description: 'Casque Aurora arrive demain', time: 'Il y a 2h' },
    { id: 2, icon: this.Gift, color: 'bg-amber-100 text-amber-700', title: 'Coupon débloqué', description: '-30% sur la catégorie Mode', time: 'Hier' },
    { id: 3, icon: this.Star, color: 'bg-purple-100 text-purple-700', title: 'Points fidélité +159', description: 'Achat Casque Aurora', time: 'Il y a 3 jours' },
    { id: 4, icon: this.CheckCircle2, color: 'bg-green-100 text-green-700', title: 'Commande livrée', description: 'Montre Pulse X2', time: 'Il y a 1 sem.' },
    { id: 5, icon: this.Heart, color: 'bg-pink-100 text-pink-700', title: 'Ajouté aux favoris', description: 'Sony WH-1000XM5', time: 'Il y a 1 sem.' }
  ];

  // ==== Sidebar structure ====
  navGroups: NavGroup[] = [
    {
      label: 'Général',
      items: [
        { id: 'dashboard', label: 'Tableau de bord', icon: this.LayoutDashboard }
      ]
    },
    {
      label: 'Achats',
      items: [
        { id: 'orders', label: 'Mes commandes', icon: this.Package, badge: 2 },
        { id: 'purchases', label: 'Historique d\'achats', icon: this.ShoppingBag },
        { id: 'wishlist', label: 'Liste d\'envies', icon: this.Heart, badge: 4 },
        { id: 'reviews', label: 'Mes avis', icon: this.Star }
      ]
    },
    {
      label: 'Avantages',
      items: [
        { id: 'loyalty', label: 'Points fidélité', icon: this.Award },
        { id: 'coupons', label: 'Coupons & codes', icon: this.Tag, badge: 3 },
        { id: 'subscriptions', label: 'Mes abonnements', icon: this.Crown }
      ]
    },
    {
      label: 'Compte',
      items: [
        { id: 'addresses', label: 'Adresses', icon: this.MapPin },
        { id: 'payments', label: 'Moyens de paiement', icon: this.CreditCard },
        { id: 'messages', label: 'Messagerie', icon: this.MessageSquare, badge: 2 }
      ]
    },
    {
      label: 'Préférences',
      items: [
        { id: 'settings', label: 'Paramètres', icon: this.Settings },
        { id: 'security', label: 'Sécurité & Confidentialité', icon: this.Shield },
        { id: 'help', label: 'Aide & Support', icon: this.HelpCircle }
      ]
    }
  ];

  // ==== Forms ====
  profileForm: FormGroup = new FormGroup({});
  addressForm: FormGroup = new FormGroup({});
  paymentForm: FormGroup = new FormGroup({});
  passwordForm: FormGroup = new FormGroup({});

  showPassword = false;
  securityPrefs: Record<string, boolean> = {
    twoFactor: true,
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    promoEmails: true,
    newsletter: false
  };

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    if (!this.authService.isAuthenticated) {
      this.router.navigate(['/account']);
      return;
    }

    this.authSubscription = this.authService.authState$.subscribe(state => {
      if (!state.isAuthenticated) {
        this.router.navigate(['/account']);
        return;
      }
      if (state.user) this.syncUserInfo(state.user);
    });

    this.route.queryParams.subscribe(params => {
      const view = params['view'] as ProfileView | undefined;
      if (view) this.currentView = view;
    });
  }

  ngOnDestroy(): void {
    this.authSubscription?.unsubscribe();
  }

  private syncUserInfo(user: User): void {
    this.userInfo = {
      ...this.userInfo,
      firstName: user.prenom,
      lastName: user.nom,
      email: user.email,
      memberSince: user.created_at ? new Date(user.created_at) : new Date(),
      userType: user.role
    };
    this.profileForm.patchValue({
      firstName: user.prenom,
      lastName: user.nom,
      email: user.email
    });
  }

  private initializeForms(): void {
    this.profileForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.pattern('^[0-9+ ]{9,15}$')],
      bio: ['']
    });
    this.addressForm = this.fb.group({
      name: ['', Validators.required],
      street: ['', Validators.required],
      city: ['', Validators.required],
      postalCode: ['', Validators.required],
      country: ['France', Validators.required],
      phone: ['', Validators.pattern('^[0-9]{10}$')]
    });
    this.paymentForm = this.fb.group({
      cardNumber: ['', [Validators.required, Validators.pattern('^[0-9 ]{16,19}$')]],
      cardName: ['', Validators.required],
      expiry: ['', Validators.required],
      cvv: ['', [Validators.required, Validators.pattern('^[0-9]{3,4}$')]]
    });
    this.passwordForm = this.fb.group({
      current: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirm: ['', Validators.required]
    });
  }

  // ==== Getters ====
  get fullName(): string {
    return `${this.userInfo.firstName} ${this.userInfo.lastName}`.trim() || 'Cher client';
  }

  get initials(): string {
    const f = this.userInfo.firstName?.charAt(0) ?? '';
    const l = this.userInfo.lastName?.charAt(0) ?? '';
    return (f + l).toUpperCase() || 'U';
  }

  get loyaltyProgress(): number {
    return Math.min(100, Math.round((this.loyalty.points / this.loyalty.nextTierTotal) * 100));
  }

  get activeCouponsCount(): number {
    return this.coupons.filter(c => !c.used).length;
  }

  get unreadMessagesCount(): number {
    return this.messages.filter(m => !m.read).length;
  }

  get memberYears(): number {
    const years = (Date.now() - this.userInfo.memberSince.getTime()) / (1000 * 60 * 60 * 24 * 365);
    return Math.max(1, Math.floor(years));
  }

  // ==== Actions ====
  switchView(view: ProfileView): void {
    this.currentView = view;
  }

  saveProfile(): void {
    if (this.profileForm.valid) console.log('Profil sauvegardé:', this.profileForm.value);
  }

  addAddress(): void {
    if (this.addressForm.valid) {
      console.log('Adresse ajoutée:', this.addressForm.value);
      this.addressForm.reset({ country: 'France' });
    }
  }

  deleteAddress(id: number): void {
    this.addresses = this.addresses.filter(a => a.id !== id);
  }

  setDefaultAddress(id: number): void {
    this.addresses = this.addresses.map(a => ({ ...a, isDefault: a.id === id }));
  }

  addPaymentMethod(): void {
    if (this.paymentForm.valid) {
      console.log('Paiement ajouté:', this.paymentForm.value);
      this.paymentForm.reset();
    }
  }

  deletePaymentMethod(id: number): void {
    this.paymentMethods = this.paymentMethods.filter(p => p.id !== id);
  }

  setDefaultPayment(id: number): void {
    this.paymentMethods = this.paymentMethods.map(p => ({ ...p, isDefault: p.id === id }));
  }

  removeFromWishlist(itemId: number): void {
    this.wishlist = this.wishlist.filter(item => item.id !== itemId);
  }

  addWishlistToCart(itemId: number): void {
    console.log('Ajout au panier:', itemId);
  }

  markAllMessagesRead(): void {
    this.messages = this.messages.map(m => ({ ...m, read: true }));
  }

  markMessageAsRead(messageId: number): void {
    const m = this.messages.find(msg => msg.id === messageId);
    if (m) m.read = true;
  }

  copyCoupon(coupon: Coupon): void {
    if (coupon.used) return;
    navigator.clipboard?.writeText(coupon.code).catch(() => {});
    this.copiedCouponId = coupon.id;
    setTimeout(() => { if (this.copiedCouponId === coupon.id) this.copiedCouponId = null; }, 2000);
  }

  toggleSubscription(sub: UserSubscription): void {
    sub.status = sub.status === 'active' ? 'paused' : 'active';
  }

  changePassword(): void {
    if (this.passwordForm.valid) {
      const { newPassword, confirm } = this.passwordForm.value;
      if (newPassword !== confirm) return;
      console.log('Mot de passe changé');
      this.passwordForm.reset();
    }
  }

  logout(): void {
    this.authService.logout();
  }

  // ==== Helpers ====
  getStatusColor(status: string): string {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-700 border-green-200';
      case 'shipped': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'preparing':
      case 'processing': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'delivered': return 'Livrée';
      case 'shipped': return 'Expédiée';
      case 'processing': return 'En préparation';
      case 'preparing': return 'En préparation';
      case 'cancelled': return 'Annulée';
      default: return status;
    }
  }

  getStatusIcon(status: string): any {
    switch (status) {
      case 'delivered': return this.CheckCircle2;
      case 'shipped': return this.Truck;
      case 'processing':
      case 'preparing': return this.Clock;
      case 'cancelled': return this.AlertCircle;
      default: return this.Package;
    }
  }

  getSubStatusLabel(s: UserSubscription['status']): string {
    switch (s) {
      case 'active': return 'Actif';
      case 'paused': return 'En pause';
      case 'cancelled': return 'Résilié';
    }
  }

  getSubStatusClass(s: UserSubscription['status']): string {
    switch (s) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'paused': return 'bg-amber-100 text-amber-700';
      case 'cancelled': return 'bg-gray-100 text-gray-700';
    }
  }

  getMessageTypeBadge(t: MessageItem['type']): { label: string; class: string } {
    switch (t) {
      case 'order': return { label: 'Commande', class: 'bg-blue-100 text-blue-700' };
      case 'promo': return { label: 'Promo', class: 'bg-pink-100 text-pink-700' };
      case 'seller': return { label: 'Vendeur', class: 'bg-amber-100 text-amber-700' };
      case 'support': return { label: 'Support', class: 'bg-emerald-100 text-emerald-700' };
    }
  }

  starArray(n: number): number[] {
    return Array.from({ length: 5 }, (_, i) => (i < Math.round(n) ? 1 : 0));
  }
}

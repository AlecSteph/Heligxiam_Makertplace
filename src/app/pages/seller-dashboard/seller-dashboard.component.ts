import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Subscription, firstValueFrom } from 'rxjs';
import {
  LucideAngularModule,
  LayoutDashboard,
  Package,
  ShoppingBag,
  BarChart3,
  Megaphone,
  Wallet,
  Settings,
  MessageSquare,
  LogOut,
  Bell,
  Search,
  Plus,
  TrendingUp,
  TrendingDown,
  Eye,
  Star,
  AlertCircle,
  CheckCircle2,
  Clock,
  Truck,
  Store,
  ExternalLink,
  DollarSign,
  Users,
  ChevronRight,
  ChevronDown,
  Filter,
  Download,
  Sparkles,
  Zap,
  FileCheck,
  Upload,
  HelpCircle,
  Globe,
  Heart,
  Archive,
  Tag,
  Percent,
  Award,
  Shield,
  Activity,
  Boxes,
  Receipt,
  FileText,
  Languages,
  BookOpen,
  Briefcase,
  LineChart,
  PackageSearch,
  Target,
  Lightbulb,
  Rocket,
  ShieldCheck,
  AlertTriangle,
  Info,
  X,
  RefreshCw,
  Headphones,
  Calendar,
  Gift,
  Flame,
  Inbox,
  Menu,
  UserRound,
  Mail,
  Smartphone,
  MessageCircle
} from 'lucide-angular';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/auth.model';

interface NavItem {
  id: string;
  label: string;
  icon?: any;
  badge?: number | string;
  hot?: boolean;
  new?: boolean;
}

interface NavSection {
  label: string;
  collapsed?: boolean;
  items: NavItem[];
}

interface KpiCard {
  label: string;
  value: string;
  trend: number;
  trendLabel: string;
  icon: any;
  color: string;
  sparkline: number[];
}

interface Order {
  id: string;
  ref?: string;
  customer: string;
  product: string;
  image: string;
  qty: number;
  total: number;
  status: 'pending' | 'shipped' | 'delivered' | 'returned';
  date: string;
  sla?: string;
  priority?: 'high' | 'normal';
}

interface ProductRow {
  id: string;
  productId?: number;
  name: string;
  image: string;
  price: number;
  stock: number;
  sales: number;
  rating: number;
  status: 'active' | 'draft' | 'out-of-stock';
  buyBox: number;
}

interface AddProductFormModel {
  name: string;
  brand: string;
  category: string;
  description: string;
  price: number | null;
  stock: number | null;
  imagePreview: string;
  imageName: string;
}

interface BulkHistoryRow {
  id: string;
  file: string;
  items: number;
  success: number;
  errors: number;
  date: string;
  status: 'completed' | 'warning';
}

interface BrandRegistrationRow {
  id: number;
  libelle_marque: string;
  statut_dossier: string;
  date_soumission: string;
}

interface ActivityItem {
  icon: any;
  color: string;
  title: string;
  time: string;
}

interface Case {
  id: string;
  subject: string;
  type: 'policy' | 'technical' | 'shipping' | 'customer';
  priority: 'urgent' | 'high' | 'normal';
  updated: string;
  status: 'open' | 'pending' | 'resolved';
}

interface CoachTip {
  id: string;
  icon: any;
  title: string;
  text: string;
  impact: 'high' | 'medium' | 'low';
  ctaLabel: string;
  color: string;
}

interface NewsItem {
  id: string;
  category: string;
  title: string;
  excerpt: string;
  date: string;
  isNew?: boolean;
}

interface HealthMetric {
  key: string;
  label: string;
  value: string | number;
  target: string;
  status: 'good' | 'warning' | 'critical';
}

interface SellerCouponRow {
  id: string;
  dbId?: number;
  code: string;
  label?: string;
  discount: string;
  scope: string;
  used: number;
  max: number | string;
  expires: string;
  status: string;
  moderationStatus?: string;
  editable?: boolean;
}

interface SellerProductPromoRow {
  id: string;
  dbId?: number;
  productId?: number;
  sku: string;
  name: string;
  image: string;
  price: number;
  originalPrice?: number;
  discountPct?: number | null;
  type: 'flash' | 'promo';
  badge: string;
  status: string;
  moderationStatus?: string;
  editable?: boolean;
  source?: string;
}

interface PromoProductOption {
  id: number;
  sku: string;
  name: string;
  price: number;
}

interface PromotionsSummary {
  activeCoupons: number;
  pendingCoupons?: number;
  uses30d: number;
  promoProductCount: number;
  flashProductCount: number;
  standardPromoCount: number;
  avgDiscountPct: number;
}

/** Étapes d’activation boutique (soumission → attente validation admin) */
export type OnboardingStepStatus = 'a_faire' | 'en_attente_validation' | 'valide';

export interface OnboardingStepModel {
  id: 'plan' | 'docs' | 'profile' | 'shipping' | 'payout';
  label: string;
  status: OnboardingStepStatus;
  /** Réf. dossier côté plateforme (démo) */
  fileReference?: string;
  /** Horodatage soumission */
  submittedAt?: string;
}

@Component({
  selector: 'app-seller-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule],
  templateUrl: './seller-dashboard.component.html',
  styleUrl: './seller-dashboard.component.css'
})
export class SellerDashboardComponent implements OnInit, OnDestroy {
  // Icons
  readonly LayoutDashboard = LayoutDashboard;
  readonly Package = Package;
  readonly ShoppingBag = ShoppingBag;
  readonly BarChart3 = BarChart3;
  readonly Megaphone = Megaphone;
  readonly Wallet = Wallet;
  readonly Settings = Settings;
  readonly MessageSquare = MessageSquare;
  readonly LogOut = LogOut;
  readonly Bell = Bell;
  readonly Search = Search;
  readonly Plus = Plus;
  readonly TrendingUp = TrendingUp;
  readonly TrendingDown = TrendingDown;
  readonly Eye = Eye;
  readonly Star = Star;
  readonly AlertCircle = AlertCircle;
  readonly CheckCircle2 = CheckCircle2;
  readonly Clock = Clock;
  readonly Truck = Truck;
  readonly Store = Store;
  readonly ExternalLink = ExternalLink;
  readonly DollarSign = DollarSign;
  readonly Users = Users;
  readonly ChevronRight = ChevronRight;
  readonly ChevronDown = ChevronDown;
  readonly Filter = Filter;
  readonly Download = Download;
  readonly Sparkles = Sparkles;
  readonly Zap = Zap;
  readonly FileCheck = FileCheck;
  readonly Upload = Upload;
  readonly HelpCircle = HelpCircle;
  readonly Globe = Globe;
  readonly Heart = Heart;
  readonly Archive = Archive;
  readonly Tag = Tag;
  readonly Percent = Percent;
  readonly Award = Award;
  readonly Shield = Shield;
  readonly Activity = Activity;
  readonly Boxes = Boxes;
  readonly Receipt = Receipt;
  readonly FileText = FileText;
  readonly Languages = Languages;
  readonly BookOpen = BookOpen;
  readonly Briefcase = Briefcase;
  readonly LineChart = LineChart;
  readonly PackageSearch = PackageSearch;
  readonly Target = Target;
  readonly Lightbulb = Lightbulb;
  readonly Rocket = Rocket;
  readonly ShieldCheck = ShieldCheck;
  readonly AlertTriangle = AlertTriangle;
  readonly Info = Info;
  readonly X = X;
  readonly RefreshCw = RefreshCw;
  readonly Headphones = Headphones;
  readonly Calendar = Calendar;
  readonly Gift = Gift;
  readonly Flame = Flame;
  readonly Inbox = Inbox;
  readonly Menu = Menu;
  readonly UserRound = UserRound;
  readonly Mail = Mail;
  readonly Smartphone = Smartphone;
  readonly MessageCircle = MessageCircle;

  currentUser: User | null = null;
  activeNav = 'dashboard';
  searchQuery = '';
  selectedMarket: 'FR' | 'DE' | 'IT' | 'ES' | 'UK' = 'FR';
  selectedPeriod: '7d' | '30d' | '90d' | 'ytd' = '30d';
  showMobileSidebar = false;
  showMarketMenu = false;
  showNotifications = false;
  showHelpMenu = false;
  showBanner = true;
  private sub = new Subscription();

  // =========== Sidebar structure (Amazon Seller Central style) ===========
  navSections: NavSection[] = [
    {
      label: 'Accueil',
      items: [
        { id: 'dashboard', label: 'Tableau de bord', icon: this.LayoutDashboard }
      ]
    },
    {
      label: 'Catalogue',
      items: [
        { id: 'catalog', label: 'Produits', icon: this.Package },
        { id: 'add-product', label: 'Ajouter un produit', icon: this.Plus },
        { id: 'brand-registry', label: 'Registre des marques', icon: this.ShieldCheck },
        { id: 'bulk-upload', label: 'Import en masse (CSV)', icon: this.Upload }
      ]
    },
    {
      label: 'Stock & Expédition',
      items: [
        { id: 'inventory', label: 'Gestion du stock', icon: this.Boxes },
        { id: 'fba-shipments', label: 'Expéditions Logistique HX', icon: this.Truck },
        { id: 'returns', label: 'Retours & remboursements', icon: this.RefreshCw }
      ]
    },
    {
      label: 'Prix',
      items: [
        { id: 'pricing', label: 'Tarification', icon: this.Tag },
        { id: 'auto-pricing', label: 'Retarification auto', icon: this.Activity },
        { id: 'promotions', label: 'Promotions & coupons', icon: this.Percent }
      ]
    },
    {
      label: 'Commandes',
      items: [
        { id: 'orders', label: 'Gérer les commandes', icon: this.ShoppingBag },
        { id: 'unshipped', label: 'À expédier', icon: this.Package },
        { id: 'messages', label: 'Messagerie acheteurs', icon: this.MessageSquare }
      ]
    },
    {
      label: 'Publicité',
      items: [
        { id: 'campaigns', label: 'Campagnes', icon: this.Megaphone },
        { id: 'sponsored-brands', label: 'Sponsored Brands', icon: this.Rocket },
        { id: 'deals', label: 'Ventes flash & Deals', icon: this.Flame }
      ]
    },
    {
      label: 'Croissance',
      items: [
        { id: 'coach', label: 'Growth Coach', icon: this.Lightbulb },
        { id: 'programs', label: 'Programmes HELIGXIAM', icon: this.Award },
        { id: 'global-selling', label: 'Vendre à l\'international', icon: this.Globe }
      ]
    },
    {
      label: 'Rapports',
      items: [
        { id: 'analytics', label: 'Statistiques ventes', icon: this.BarChart3 },
        { id: 'traffic', label: 'Trafic & conversion', icon: this.LineChart },
        { id: 'search-terms', label: 'Termes de recherche', icon: this.PackageSearch }
      ]
    },
    {
      label: 'Performance',
      items: [
        { id: 'account-health', label: 'Santé du compte', icon: this.ShieldCheck },
        { id: 'feedback', label: 'Évaluations & avis', icon: this.Star },
        { id: 'cases', label: 'Cas & réclamations', icon: this.Inbox }
      ]
    },
    {
      label: 'Compte',
      items: [
        { id: 'seller-profile', label: 'Mon profil & vérification', icon: this.UserRound },
        { id: 'admin-messaging', label: 'Messagerie opérateur (admin)', icon: this.MessageCircle },
        { id: 'payouts', label: 'Paiements & versements', icon: this.Wallet },
        { id: 'invoices', label: 'Factures & fiscalité', icon: this.Receipt },
        { id: 'settings', label: 'Paramètres boutique', icon: this.Settings }
      ]
    }
  ];

  /** Formule choisie avant envoi (page marketing) */
  sellerPlan: 'particulier' | 'professionnel' | null = null;

  // =========== Onboarding (soumission → en attente admin → validé) ===========
  onboardingSteps: OnboardingStepModel[] = [
    { id: 'plan', label: 'Choisir votre plan d\'abonnement (Particulier ou Professionnel)', status: 'a_faire' },
    { id: 'docs', label: 'Téléverser vos documents (Kbis, RIB, CNI)', status: 'a_faire' },
    { id: 'profile', label: 'Compléter votre profil boutique', status: 'a_faire' },
    { id: 'shipping', label: 'Configurer les frais de livraison', status: 'a_faire' },
    { id: 'payout', label: 'Valider votre compte bancaire', status: 'a_faire' }
  ];

  /** Panneau de formulaire ouvert (clic sur une ligne) */
  onboardingOpenPanel: OnboardingStepModel['id'] | null = null;

  /** Démonstration : noms de fichiers / champs (API fichiers plus tard) */
  onboardingFormDocs = {
    fichierKbis: '',
    fichierCni: '',
    fichierRib: '',
    commentaire: ''
  };
  onboardingDocFiles: { kbis: File | null; cni: File | null; rib: File | null } = {
    kbis: null,
    cni: null,
    rib: null
  };
  docsUploading = false;
  onboardingLoading = false;
  onboardingHydrated = false;
  planSubmitting = false;
  stepSubmitting = false;
  private sellerDataLoadedFor: number | null = null;
  private onboardingRequestId = 0;
  private readonly onboardingCachePrefix = 'hx_onboarding_v_';
  private readonly dashboardCachePrefix = 'hx_seller_dashboard_v_';
  sellerSessionBootstrapping = true;

  onboardingFormProfile = {
    raisonSociale: '',
    nomAffichage: '',
    siret: '',
    tva: '',
    emailPro: '',
    telephone: '',
    adresse: ''
  };

  onboardingFormShipping = {
    colissimo: '',
    chronopost: '',
    relais: '',
    hxLogistics: true,
    remarque: ''
  };

  onboardingFormPayout = {
    titulaire: '',
    iban: '',
    bic: '',
    referenceInterne: ''
  };

  onboardingFeedback = '';
  private onboardingFeedbackTimer?: ReturnType<typeof setTimeout>;

  // =========== KPI Cards ===========
  readonly kpis: KpiCard[] = [
    { label: 'Ventes (30j)', value: '0 €', trend: 0, trendLabel: 'vs mois dernier', icon: this.DollarSign, color: 'from-emerald-500 to-green-600', sparkline: [0, 0, 0, 0, 0, 0, 0, 0] },
    { label: 'Commandes', value: '0', trend: 0, trendLabel: '0 à traiter', icon: this.ShoppingBag, color: 'from-indigo-500 to-blue-600', sparkline: [0, 0, 0, 0, 0, 0, 0, 0] },
    { label: 'Pages vues', value: '0', trend: 0, trendLabel: 'vs mois dernier', icon: this.Eye, color: 'from-fuchsia-500 to-pink-600', sparkline: [0, 0, 0, 0, 0, 0, 0, 0] },
    { label: 'Note boutique', value: '—', trend: 0, trendLabel: '0 avis', icon: this.Star, color: 'from-amber-500 to-orange-600', sparkline: [0, 0, 0, 0, 0, 0, 0, 0] },
    { label: 'Taux de conversion', value: '0 %', trend: 0, trendLabel: 'vs mois dernier', icon: this.Target, color: 'from-teal-500 to-cyan-600', sparkline: [0, 0, 0, 0, 0, 0, 0, 0] },
    { label: 'Buy Box', value: '0 %', trend: 0, trendLabel: 'moyenne catalogue', icon: this.Award, color: 'from-purple-500 to-violet-600', sparkline: [0, 0, 0, 0, 0, 0, 0, 0] }
  ];

  // =========== Today vs Yesterday (Amazon style) ===========
  readonly todaySnapshot = {
    today: { sales: 0, units: 0, orders: 0, pageViews: 0, sessions: 0 },
    yesterday: { sales: 0, units: 0, orders: 0, pageViews: 0, sessions: 0 },
    lastWeek: { sales: 0, units: 0, orders: 0, pageViews: 0, sessions: 0 }
  };

  // =========== Orders ===========
  readonly orders: Order[] = [];

  // =========== Products ===========
  topProducts: ProductRow[] = [];
  addProductForm: AddProductFormModel = {
    name: '',
    brand: '',
    category: 'Électronique',
    description: '',
    price: null,
    stock: null,
    imagePreview: '',
    imageName: ''
  };
  private addProductImageFile: File | null = null;
  bulkUploadFeedback = '';
  private bulkUploadFeedbackTimer?: ReturnType<typeof setTimeout>;
  private selectedCsvFile: File | null = null;
  addProductFeedback = '';
  brandRegistrations: BrandRegistrationRow[] = [];
  brandFormLabel = '';
  brandRegistryFeedback = '';

  // =========== Activity Feed ===========
  readonly activity: ActivityItem[] = [];

  // =========== Chart ===========
  readonly chartData = [
    { day: 'Lun', value: 0, amount: 0 },
    { day: 'Mar', value: 0, amount: 0 },
    { day: 'Mer', value: 0, amount: 0 },
    { day: 'Jeu', value: 0, amount: 0 },
    { day: 'Ven', value: 0, amount: 0 },
    { day: 'Sam', value: 0, amount: 0 },
    { day: 'Dim', value: 0, amount: 0 }
  ];

  // =========== Account Health ===========
  readonly healthMetrics: HealthMetric[] = [
    { key: 'odr', label: 'Taux de commandes défectueuses', value: '0 %', target: '< 1%', status: 'good' },
    { key: 'late', label: 'Taux d\'expédition en retard', value: '0 %', target: '< 4%', status: 'good' },
    { key: 'cancel', label: 'Taux d\'annulations avant exp.', value: '0 %', target: '< 2,5%', status: 'good' },
    { key: 'returns', label: 'Taux de retours valides', value: '0 %', target: '< 5%', status: 'good' },
    { key: 'response', label: 'Temps de réponse message', value: '0 h', target: '< 24h', status: 'good' },
    { key: 'policy', label: 'Violations politique produit', value: '0', target: '0', status: 'good' }
  ];

  // =========== Cases ===========
  readonly cases: Case[] = [];

  // =========== Coach tips (Selling Coach) ===========
  readonly coachTips: CoachTip[] = [];

  // =========== News ===========
  readonly news: NewsItem[] = [];

  // =========== Notifications ===========
  notifications: { id: number; icon: any; title: string; text: string; time: string; type: string; read: boolean }[] = [];
  notificationsUnreadCount = 0;
  private notifPollTimer?: ReturnType<typeof setInterval>;

  // =========== Inventory health ===========
  readonly inventoryBreakdown = [
    { label: 'Produits actifs', value: 0, percent: 0, color: 'bg-emerald-500' },
    { label: 'Stock faible (<10)', value: 0, percent: 0, color: 'bg-amber-500' },
    { label: 'Ruptures', value: 0, percent: 0, color: 'bg-red-500' },
    { label: 'Brouillons', value: 0, percent: 0, color: 'bg-gray-400' }
  ];

  // =========== Payouts ===========
  readonly payoutSummary = {
    available: 0,
    pending: 0,
    lastPayout: 0,
    nextPayoutDate: '—',
    currency: 'EUR'
  };

  // =========== Markets ===========
  readonly markets = [
    { code: 'FR' as const, label: 'France', domain: 'heligxiam.fr', flag: '🇫🇷' },
    { code: 'DE' as const, label: 'Allemagne', domain: 'heligxiam.de', flag: '🇩🇪' },
    { code: 'IT' as const, label: 'Italie', domain: 'heligxiam.it', flag: '🇮🇹' },
    { code: 'ES' as const, label: 'Espagne', domain: 'heligxiam.es', flag: '🇪🇸' },
    { code: 'UK' as const, label: 'Royaume-Uni', domain: 'heligxiam.co.uk', flag: '🇬🇧' }
  ];

  // =========== Page headers (per nav id) ===========
  readonly pageHeaders: Record<string, { title: string; subtitle: string; }> = {
    'dashboard':        { title: 'Tableau de bord',         subtitle: 'Aperçu global de votre activité' },
    'catalog':          { title: 'Produits',                subtitle: 'Gérez, modifiez et suivez vos références' },
    'add-product':      { title: 'Ajouter un produit',      subtitle: 'Créez une nouvelle fiche produit' },
    'brand-registry':   { title: 'Registre des marques',    subtitle: 'Protégez vos marques et combattez la contrefaçon' },
    'bulk-upload':      { title: 'Import en masse (CSV)',   subtitle: 'Créez ou modifiez des centaines de produits en un fichier' },
    'inventory':        { title: 'Gestion du stock',        subtitle: 'Niveaux, alertes et prévisions de réapprovisionnement' },
    'fba-shipments':    { title: 'Expéditions Logistique HX', subtitle: 'Envois vers les entrepôts HELIGXIAM Fulfillment' },
    'returns':          { title: 'Retours & remboursements', subtitle: 'Gérez les demandes de retour et les remboursements' },
    'pricing':          { title: 'Tarification',            subtitle: 'Prix, marges et alertes concurrentielles' },
    'auto-pricing':     { title: 'Retarification automatique', subtitle: 'Gardez la Buy Box avec des règles de prix automatiques' },
    'promotions':       { title: 'Promotions & coupons',    subtitle: 'Créez des remises, coupons, lots et code promo' },
    'orders':           { title: 'Gérer les commandes',     subtitle: 'Toutes vos commandes, filtres, impression d\'étiquettes' },
    'unshipped':        { title: 'À expédier',              subtitle: 'Commandes en attente d\'expédition' },
    'messages':         { title: 'Messagerie acheteurs',    subtitle: 'Répondez en moins de 24h pour rester en bonne santé' },
    'campaigns':        { title: 'Campagnes publicitaires', subtitle: 'Sponsored Products, Brands, Display — en temps réel' },
    'sponsored-brands': { title: 'Sponsored Brands',        subtitle: 'Créativités vidéo et catalogue pour promouvoir votre marque' },
    'deals':            { title: 'Ventes flash & Deals',    subtitle: 'Lightning Deals, 7-day Deals, Outlet — boostez la visibilité' },
    'coach':            { title: 'Growth Coach',            subtitle: 'Recommandations personnalisées par IA' },
    'programs':         { title: 'Programmes HELIGXIAM',    subtitle: 'Vine, Marque enregistrée, A+ Contenu, Climate Pledge…' },
    'global-selling':   { title: 'Vendre à l\'international', subtitle: 'Ouvrez votre boutique sur 5 marchés européens' },
    'analytics':        { title: 'Statistiques de ventes',  subtitle: 'Chiffre d\'affaires, unités, tendances' },
    'traffic':          { title: 'Trafic & conversion',     subtitle: 'Sessions, pages vues, taux de conversion' },
    'search-terms':     { title: 'Termes de recherche',     subtitle: 'Les mots-clés qui génèrent vos ventes' },
    'account-health':   { title: 'Santé du compte',         subtitle: 'Indicateurs de performance et conformité' },
    'feedback':         { title: 'Évaluations & avis',      subtitle: 'Notes boutique et avis produits' },
    'cases':            { title: 'Cas & réclamations',      subtitle: 'Dossiers ouverts avec le support HELIGXIAM' },
    'seller-profile':   { title: 'Mon profil & vérification', subtitle: 'Identité, coordonnées, vérifications (aligné sur la BDD `profils_vendeur`)' },
    'admin-messaging':  { title: 'Messagerie opérateur (admin)', subtitle: 'Échangez avec l’équipe HELIGXIAM (conformité, KYC, compte boutique)' },
    'payouts':          { title: 'Paiements & versements',  subtitle: 'Historique, disponible, en attente' },
    'invoices':         { title: 'Factures & fiscalité',    subtitle: 'Documents comptables et TVA' },
    'settings':         { title: 'Paramètres boutique',     subtitle: 'Informations, logo, politiques, collaborateurs' }
  };

  // =========== Shipments (FBA-like) ===========
  readonly shipments: { id: string; items: number; destination: string; status: string; expected: string; units: number }[] = [];

  // =========== Returns ===========
  readonly returnsList: { id: string; order: string; product: string; reason: string; status: string; refund: number; created: string }[] = [];

  /** API vendeur (auth-service) — documents KYC + fil opérateur (JWT + boutique du token) */
  private readonly sellerApiBase = 'http://localhost:3001/api/seller';

  operatorThreadLoading = false;

  /** Contexte MySQL vendeur (session) — absent si compte mémoire / non vendeur. */
  get sellerMysqlContext(): { boutiqueId: number; vendeurId: number } | null {
    const u = this.currentUser ?? this.authService.currentUser;
    if (!u || u.role !== 'vendeur') {
      return null;
    }
    const boutiqueId = Number(u.identifiant_boutique);
    const vendeurId = Number(u.identifiant_vendeur);
    if (!Number.isFinite(boutiqueId) || boutiqueId < 1 || !Number.isFinite(vendeurId) || vendeurId < 1) {
      return null;
    }
    return { boutiqueId, vendeurId };
  }

  /** Fils de discussion avec l’opérateur / admin — chargé via GET /api/seller/operator-thread */
  adminOperatorThread: { id: string; from: 'vendeur' | 'operateur' | 'systeme'; body: string; at: string }[] = [];
  newMessageToOperator = '';

  // =========== Messages acheteurs ===========
  readonly buyerMessages: { id: string; buyer: string; subject: string; preview: string; time: string; unread: boolean; sla: string }[] = [];

  // =========== Ad Campaigns ===========
  readonly adCampaigns: { id: string; name: string; type: string; status: string; budget: number; spent: number; impressions: number; clicks: number; acos: number; sales: number }[] = [];

  // =========== Sponsored Brands (creatives) ===========
  readonly sbCreatives: { id: string; headline: string; format: string; status: string; ctr: number; acos: number; reach: string }[] = [];

  // =========== Flash deals (côté vendeur) ===========
  readonly sellerDeals: { id: string; product: string; discount: number; startsIn: string; units: number; sold: number; status: string; fee: number }[] = [];

  // =========== HELIGXIAM Programs ===========
  programs: {
    id: string;
    name: string;
    desc: string;
    badge: string;
    eligible: boolean;
    enrolled: boolean;
    icon: any;
  }[] = [];

  // =========== Marchés internationaux ===========
  readonly internationalMarkets: { code: string; label: string; flag: string; status: string; sales: number; growth: number }[] = [];

  // =========== Termes de recherche ===========
  readonly searchTerms: { term: string; impressions: number; clicks: number; conv: number; sales: number }[] = [];

  // =========== Évaluations & avis ===========
  readonly sellerFeedback: { id: string; rating: number; author: string; comment: string; date: string; product: string }[] = [];

  readonly feedbackDistribution: { stars: number; percent: number; count: number }[] = [];

  // =========== Payouts history ===========
  readonly payoutsHistory: { id: string; date: string; amount: number; status: string; method: string; ref: string }[] = [];

  // =========== Factures ===========
  readonly invoices: { id: string; type: string; period: string; amount: number; status: string; download: boolean; downloadUrl?: string | null }[] = [];

  // =========== Paramètres boutique ===========
  storeSettings = {
    name: '',
    displayName: '',
    language: 'fr',
    currency: 'EUR',
    vat: '',
    siret: '',
    email: '',
    phone: '',
    autoAcceptReturns: false,
    lowStockAlerts: false,
    weeklyReport: false,
    smsNotifications: false
  };

  private storeSettingsBackup: Record<string, unknown> | null = null;

  /**
   * Données d’écran « Mon profil » — miroir de la table SQL `profils_vendeur`
   * (persistance via API à brancher).
   */
  sellerProfile: {
    urlPhoto: string;
    biographie: string;
    posteOuFonction: string;
    siteWeb: string;
    langueInterface: string;
    fuseauHoraire: string;
    courrielVerifie: boolean;
    telephoneVerifie: boolean;
    adresseLigne1: string;
    adresseLigne2: string;
    ville: string;
    codePostal: string;
    codePays: string;
    notifCommande: boolean;
    notifPromo: boolean;
    notifSmsUrgent: boolean;
    accepteCgu: boolean;
    dateAcceptationCgu: string;
    accepteDonnees: boolean;
    dateAcceptationDonnees: string;
    profilComplet: boolean;
  } = {
    urlPhoto: '',
    biographie: '',
    posteOuFonction: '',
    siteWeb: '',
    langueInterface: 'fr',
    fuseauHoraire: 'Europe/Paris',
    courrielVerifie: false,
    telephoneVerifie: false,
    adresseLigne1: '',
    adresseLigne2: '',
    ville: '',
    codePostal: '',
    codePays: 'FR',
    notifCommande: true,
    notifPromo: false,
    notifSmsUrgent: false,
    accepteCgu: false,
    dateAcceptationCgu: '',
    accepteDonnees: false,
    dateAcceptationDonnees: '',
    profilComplet: false
  };

  relectureProfilHistorique: { type: string; date: string }[] = [];

  profileFeedback = '';
  private profileFeedbackTimer?: ReturnType<typeof setTimeout>;
  private addProductFeedbackTimer?: ReturnType<typeof setTimeout>;

  readonly languesInterface = [
    { code: 'fr', libelle: 'Français' },
    { code: 'en', libelle: 'English' },
    { code: 'de', libelle: 'Deutsch' }
  ];

  readonly fuseauxHoraire = [
    { id: 'Europe/Paris', libelle: 'Europe / Paris' },
    { id: 'Europe/Brussels', libelle: 'Europe / Bruxelles' },
    { id: 'Europe/Berlin', libelle: 'Europe / Berlin' }
  ];

  // =========== Bulk upload templates ===========
  readonly csvTemplates = [
    { id: 'cat-elec', label: 'Électronique', cols: 42, samples: 5, updated: '10 avr. 2026' },
    { id: 'cat-mode', label: 'Mode & Accessoires', cols: 38, samples: 5, updated: '10 avr. 2026' },
    { id: 'cat-maison', label: 'Maison & Déco', cols: 36, samples: 5, updated: '10 avr. 2026' },
    { id: 'cat-beaute', label: 'Beauté & Santé', cols: 34, samples: 5, updated: '10 avr. 2026' }
  ];

  readonly bulkHistory: BulkHistoryRow[] = [];

  // =========== Coupons (promotions page) ===========
  sellerCoupons: SellerCouponRow[] = [];

  sellerProductPromos: SellerProductPromoRow[] = [];

  promotionsSummary: PromotionsSummary = {
    activeCoupons: 0,
    pendingCoupons: 0,
    uses30d: 0,
    promoProductCount: 0,
    flashProductCount: 0,
    standardPromoCount: 0,
    avgDiscountPct: 0
  };

  showCouponModal = false;
  editingCouponId: number | null = null;
  couponSaving = false;
  showProductPromoModal = false;
  editingProductPromoId: number | null = null;
  productPromoSaving = false;
  promoProductOptions: PromoProductOption[] = [];
  promoFeedback = '';
  private promoFeedbackTimer?: ReturnType<typeof setTimeout>;
  couponForm = {
    code: '',
    label: '',
    typeRemise: 'pourcentage' as 'pourcentage' | 'montant',
    valeur: 10,
    plafond: 100,
    validDays: 30
  };
  productPromoForm = {
    productId: 0,
    promoPrice: 0,
    originalPrice: 0,
    typePromo: 'promo' as 'promo' | 'flash',
    label: '',
    validDays: 14
  };

  pageFeedback = '';
  private pageFeedbackTimer?: ReturnType<typeof setTimeout>;
  orderStatusFilter: 'all' | 'pending' | 'shipped' | 'delivered' = 'all';
  catalogSearch = '';
  healthScore = 0;
  feedbackSummary = { average: 0, total: 0 };
  buyerMessagesUnread = 0;
  trafficOverview = { sessions: 0, pages_vues: 0, conversion: 0 };
  buyBoxPercent = 0;
  orderActionLoading = false;
  stockEditProductId: number | null = null;

  // =========== Règles de retarification ===========
  readonly pricingRules: { id: string; name: string; scope: string; minMargin: number; active: boolean; last: string }[] = [];
  readonly trafficSources: { name: string; value: number; color: string }[] = [];

  // =========== Helpers for templates ===========
  getPageHeader(id: string): { title: string; subtitle: string } {
    return this.pageHeaders[id] ?? { title: id, subtitle: '' };
  }

  getShipmentStatusClass(s: string): string {
    switch (s) {
      case 'received':   return 'bg-green-100 text-green-700';
      case 'in-transit': return 'bg-blue-100 text-blue-700';
      case 'pending':    return 'bg-amber-100 text-amber-700';
      default:           return 'bg-slate-100 text-slate-700';
    }
  }

  getShipmentStatusLabel(s: string): string {
    switch (s) {
      case 'received':   return 'Reçu';
      case 'in-transit': return 'En transit';
      case 'pending':    return 'À envoyer';
      default:           return s;
    }
  }

  getReturnStatusClass(s: string): string {
    switch (s) {
      case 'refunded': return 'bg-green-100 text-green-700';
      case 'transit':  return 'bg-blue-100 text-blue-700';
      case 'awaiting': return 'bg-amber-100 text-amber-700';
      default:         return 'bg-slate-100 text-slate-700';
    }
  }

  getReturnStatusLabel(s: string): string {
    switch (s) {
      case 'refunded': return 'Remboursé';
      case 'transit':  return 'En retour';
      case 'awaiting': return 'À traiter';
      default:         return s;
    }
  }

  getCampaignStatusClass(s: string): string {
    switch (s) {
      case 'active':   return 'bg-green-100 text-green-700';
      case 'paused':   return 'bg-slate-100 text-slate-700';
      case 'ended':    return 'bg-red-100 text-red-700';
      default:         return 'bg-slate-100 text-slate-700';
    }
  }

  getCouponStatusClass(s: string): string {
    switch (s) {
      case 'active':    return 'bg-green-100 text-green-700';
      case 'pending':   return 'bg-amber-100 text-amber-800';
      case 'rejected':  return 'bg-rose-100 text-rose-700';
      case 'scheduled': return 'bg-blue-100 text-blue-700';
      case 'expired':   return 'bg-slate-100 text-slate-500';
      default:          return 'bg-slate-100 text-slate-700';
    }
  }

  getPromoStatusLabel(s: string): string {
    switch (s) {
      case 'active': return 'Active';
      case 'pending': return 'En attente admin';
      case 'rejected': return 'Refusée';
      case 'expired': return 'Expirée';
      default: return s;
    }
  }

  getInvoiceStatusClass(s: string): string {
    switch (s) {
      case 'paid':    return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'overdue': return 'bg-red-100 text-red-700';
      default:        return 'bg-slate-100 text-slate-700';
    }
  }

  getPayoutStatusClass(s: string): string {
    switch (s) {
      case 'paid':    return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-amber-100 text-amber-700';
      default:        return 'bg-slate-100 text-slate-700';
    }
  }

  // Action methods for new sections
  toggleCampaignStatus(c: { id: string; status: string }): void {
    if (!this.sellerMysqlContext) return;
    const next = c.status === 'active' ? 'paused' : 'active';
    this.http
      .patch<{ success: boolean; data?: { status: string } }>(
        `${this.sellerApiBase}/campaigns/${c.id}`,
        { status: next === 'active' ? 'active' : 'paused' }
      )
      .subscribe({
        next: (res) => {
          if (res.data?.status) c.status = res.data.status === 'pause' ? 'paused' : res.data.status;
          else c.status = next;
        },
        error: () => this.showProfileMessage('Impossible de modifier la campagne.')
      });
  }

  togglePricingRule(r: { id: string; active: boolean }): void {
    if (!this.sellerMysqlContext) return;
    const next = !r.active;
    this.http
      .patch<{ success: boolean; data?: { active: boolean } }>(
        `${this.sellerApiBase}/pricing-rules/${r.id}`,
        { active: next }
      )
      .subscribe({
        next: (res) => {
          r.active = res.data?.active ?? next;
        },
        error: () => this.showProfileMessage('Impossible de modifier la règle de prix.')
      });
  }

  toggleProgramEnrollment(p: { id: string; eligible: boolean; enrolled: boolean }): void {
    if (!p.eligible || !this.sellerMysqlContext) return;
    const next = !p.enrolled;
    this.http
      .patch<{ success: boolean; data?: { enrolled: boolean } }>(
        `${this.sellerApiBase}/programs/${p.id}`,
        { enrolled: next }
      )
      .subscribe({
        next: (res) => {
          p.enrolled = res.data?.enrolled ?? next;
        },
        error: () => this.showProfileMessage('Impossible de modifier l’inscription au programme.')
      });
  }

  markAllMessagesRead(): void {
    if (!this.sellerMysqlContext) {
      this.buyerMessages.forEach((m) => (m.unread = false));
      this.buyerMessagesUnread = 0;
      return;
    }
    this.http.patch(`${this.sellerApiBase}/buyer-messages/read-all`, {}).subscribe({
      next: () => {
        this.buyerMessages.forEach((m) => (m.unread = false));
        this.buyerMessagesUnread = 0;
        this.showPageFeedback('Messages acheteurs marqués comme lus.');
      },
      error: () => this.showPageFeedback('Impossible de marquer les messages comme lus.')
    });
  }

  showPageFeedback(msg: string): void {
    this.pageFeedback = msg;
    this.promoFeedback = msg;
    if (this.pageFeedbackTimer) clearTimeout(this.pageFeedbackTimer);
    this.pageFeedbackTimer = setTimeout(() => {
      this.pageFeedback = '';
      if (this.activeNav !== 'promotions') this.promoFeedback = '';
    }, 4500);
    this.cdr.markForCheck();
  }

  filteredOrders(): Order[] {
    if (this.orderStatusFilter === 'all') return this.orders;
    return this.orders.filter((o) => o.status === this.orderStatusFilter);
  }

  filteredCatalogProducts(): ProductRow[] {
    const q = this.catalogSearch.trim().toLowerCase();
    if (!q) return this.topProducts;
    return this.topProducts.filter(
      (p) => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)
    );
  }

  updateOrderStatus(order: Order, status: Order['status']): void {
    if (!this.sellerMysqlContext || !order.ref) return;
    this.orderActionLoading = true;
    this.http
      .patch<{ success: boolean; message?: string }>(`${this.sellerApiBase}/orders/${order.ref}/status`, {
        status
      })
      .subscribe({
        next: () => {
          this.orderActionLoading = false;
          order.status = status;
          this.showPageFeedback(`Commande ${order.id} mise à jour.`);
          this.loadDashboardDataFromApi();
        },
        error: (err) => {
          this.orderActionLoading = false;
          this.showPageFeedback(err.error?.message || 'Mise à jour commande impossible.');
        }
      });
  }

  shipOrder(order: Order): void {
    this.updateOrderStatus(order, 'shipped');
  }

  shipAllPendingOrders(): void {
    const pending = this.orders.filter((o) => o.status === 'pending');
    if (!pending.length) {
      this.showPageFeedback('Aucune commande à expédier.');
      return;
    }
    if (!confirm(`Marquer ${pending.length} commande(s) comme expédiée(s) ?`)) return;
    let done = 0;
    for (const o of pending) {
      if (!o.ref) continue;
      this.http
        .patch(`${this.sellerApiBase}/orders/${o.ref}/status`, { status: 'shipped' })
        .subscribe({
          next: () => {
            done++;
            if (done === pending.length) {
              this.showPageFeedback(`${pending.length} commande(s) expédiée(s).`);
              this.loadDashboardDataFromApi();
            }
          }
        });
    }
  }

  printShippingLabels(): void {
    const pending = this.orders.filter((o) => o.status === 'pending');
    if (!pending.length) {
      this.showPageFeedback('Aucune étiquette à imprimer.');
      return;
    }
    this.showPageFeedback(`${pending.length} étiquette(s) générée(s) (simulation).`);
    window.print();
  }

  editProductStock(product: ProductRow): void {
    const pid = product.productId || Number(String(product.id).replace(/^p-/, ''));
    if (!pid) return;
    const raw = prompt(`Nouveau stock pour « ${product.name} » :`, String(product.stock));
    if (raw == null) return;
    const stock = Number(raw);
    if (!Number.isFinite(stock) || stock < 0) {
      this.showPageFeedback('Stock invalide.');
      return;
    }
    this.http
      .patch<{ success: boolean }>(`${this.sellerApiBase}/products/${pid}/stock`, { stock })
      .subscribe({
        next: () => {
          product.stock = stock;
          this.showPageFeedback('Stock mis à jour.');
          this.loadDashboardDataFromApi();
        },
        error: (err) => this.showPageFeedback(err.error?.message || 'Mise à jour stock impossible.')
      });
  }

  createPricingRule(): void {
    const name = prompt('Nom de la règle de retarification :', 'Marge minimum 15 %');
    if (!name?.trim()) return;
    this.http
      .post<{ success: boolean; message?: string }>(`${this.sellerApiBase}/pricing-rules`, { name: name.trim() })
      .subscribe({
        next: (res) => {
          this.showPageFeedback(res.message || 'Règle créée.');
          this.loadDashboardDataFromApi();
        },
        error: () => this.showPageFeedback('Création de règle impossible.')
      });
  }

  exportSectionData(): void {
    const rows: string[] = [];
    if (this.activeNav === 'orders' || this.activeNav === 'unshipped') {
      rows.push('id,client,produit,qte,total,statut');
      this.filteredOrders().forEach((o) =>
        rows.push([o.id, o.customer, o.product, o.qty, o.total, o.status].join(','))
      );
    } else if (this.activeNav === 'catalog' || this.activeNav === 'inventory') {
      rows.push('id,nom,prix,stock,ventes');
      this.topProducts.forEach((p) =>
        rows.push([p.id, p.name, p.price, p.stock, p.sales].join(','))
      );
    } else {
      rows.push('label,valeur');
      this.kpis.forEach((k) => rows.push([k.label, k.value].join(',')));
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export-vendeur-${this.activeNav}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.showPageFeedback('Export CSV téléchargé.');
  }

  openQuickAction(action: string): void {
    switch (action) {
      case 'add-product':
        this.setActiveNav('add-product');
        break;
      case 'bulk-upload':
        this.setActiveNav('bulk-upload');
        break;
      case 'flash-deal':
        this.setActiveNav('promotions');
        this.openCreateProductPromoModal();
        this.productPromoForm.typePromo = 'flash';
        break;
      case 'campaign':
        this.setActiveNav('campaigns');
        break;
      case 'export':
        this.exportSectionData();
        break;
      case 'coupon':
        this.openCreateCouponModal();
        break;
      case 'promo':
        this.openCreateProductPromoModal();
        break;
      case 'support':
        this.setActiveNav('admin-messaging');
        break;
      case 'returns':
        this.setActiveNav('returns');
        break;
      case 'shipment':
        this.setActiveNav('fba-shipments');
        break;
      case 'pricing-rule':
        this.setActiveNav('auto-pricing');
        this.createPricingRule();
        break;
      default:
        this.showPageFeedback('Section ouverte.');
    }
  }

  reloadDashboard(): void {
    this.loadDashboardDataFromApi();
    this.showPageFeedback('Données actualisées.');
  }

  applyCoachTip(tip: CoachTip): void {
    const navByCode: Record<string, string> = {
      seo_titres: 'catalog',
      fiches_images: 'catalog',
      reponse_msg_24h: 'buyer-messaging',
      stock_reassort: 'inventory'
    };
    this.setActiveNav(navByCode[tip.id] || 'coach');
    this.showPageFeedback(`Conseil « ${tip.title} » — section ouverte.`);
  }

  requestPayout(early = false): void {
    if (!this.sellerMysqlContext) {
      this.showPageFeedback('Connexion vendeur requise.');
      return;
    }
    const amount = this.payoutSummary.available;
    if (amount <= 0) {
      this.showPageFeedback('Aucun montant disponible pour un versement.');
      return;
    }
    const label = early ? 'versement anticipé' : 'versement';
    if (!confirm(`Demander un ${label} de ${amount.toFixed(2)} € ?`)) return;
    this.http
      .post<{ success: boolean; message?: string }>(`${this.sellerApiBase}/payouts/request`, { amount, early })
      .subscribe({
        next: (res) => {
          this.showPageFeedback(res.message || 'Demande de versement enregistrée.');
          this.loadDashboardDataFromApi();
        },
        error: (err) => this.showPageFeedback(err.error?.message || 'Demande impossible.')
      });
  }

  downloadCsvTemplate(t: { id: string; label: string }): void {
    const headers = ['sku', 'titre', 'description', 'prix', 'stock', 'categorie'];
    const sample = ['SKU-001', `Exemple ${t.label}`, 'Description produit', '29.99', '10', t.label];
    const blob = new Blob([[headers.join(','), sample.join(',')].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `modele-import-${t.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.showPageFeedback(`Modèle « ${t.label} » téléchargé.`);
  }

  downloadInvoice(inv: { id: string; type: string; period: string; amount: number; downloadUrl?: string | null }): void {
    if (inv.downloadUrl) {
      window.open(inv.downloadUrl, '_blank');
      return;
    }
    const content = `Facture ${inv.id}\nType: ${inv.type}\nPériode: ${inv.period}\nMontant: ${inv.amount.toFixed(2)} EUR`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${inv.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    this.showPageFeedback(`Document ${inv.id} téléchargé.`);
  }

  downloadVatReport(): void {
    const rows = ['periode,type,montant,statut'];
    this.invoices.forEach((i) => rows.push([i.period, i.type, i.amount.toFixed(2), i.status].join(',')));
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-tva-vendeur-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.showPageFeedback('Rapport TVA exporté.');
  }

  editCatalogProduct(p: ProductRow): void {
    this.addProductForm.name = p.name;
    this.addProductForm.price = Number(p.price) || 0;
    this.addProductForm.stock = p.stock ?? 0;
    this.addProductForm.description = '';
    if (p.image) {
      this.addProductForm.imagePreview = p.image;
      this.addProductImageFile = null;
    }
    this.setActiveNav('add-product');
    this.showPageFeedback(`Édition de « ${p.name} » — modifiez la fiche puis publiez.`);
  }

  trackShipment(shipment: { id: string }): void {
    this.showPageFeedback(`Suivi colis ${shipment.id} : en transit (simulation transporteur).`);
  }

  openCasesList(): void {
    this.setActiveNav('cases');
  }

  openOrdersList(filter: 'all' | 'pending' | 'shipped' | 'delivered' = 'all'): void {
    this.orderStatusFilter = filter;
    this.setActiveNav(filter === 'pending' ? 'unshipped' : 'orders');
  }

  addSearchTermToCampaign(term: string): void {
    this.setActiveNav('campaigns');
    this.showPageFeedback(`Terme « ${term} » ajouté à votre liste campagnes (brouillon).`);
  }

  cancelStoreSettings(): void {
    if (this.storeSettingsBackup) {
      Object.assign(this.storeSettings, this.storeSettingsBackup);
      this.showPageFeedback('Modifications annulées.');
    } else {
      this.loadSettingsFromApi();
      this.showPageFeedback('Paramètres rechargés.');
    }
  }

  changeStoreLogo(): void {
    this.setActiveNav('seller-profile');
    this.showPageFeedback('Mettez à jour votre photo de profil / logo dans Mon profil.');
  }

  inviteCollaborator(): void {
    const email = prompt('E-mail du collaborateur à inviter :');
    if (!email?.trim()) return;
    this.showPageFeedback(`Invitation envoyée à ${email.trim()} (simulation).`);
  }

  showCatalogBulkActions(): void {
    this.showPageFeedback('Sélectionnez des produits via les cases à cocher, puis relancez l’action.');
  }

  openBrandRegistryAction(action: 'report' | 'aplus' | 'storefront'): void {
    switch (action) {
      case 'report':
        this.setActiveNav('cases');
        this.showPageFeedback('Signalement — décrivez le listing contrefaisant au support.');
        break;
      case 'aplus':
        this.setActiveNav('catalog');
        this.showPageFeedback('Contenu A+ : enrichissez vos fiches depuis le catalogue.');
        break;
      case 'storefront':
        this.setActiveNav('settings');
        this.showPageFeedback('Personnalisez votre vitrine dans Paramètres boutique.');
        break;
    }
  }

  getOrderTotalPending(): number {
    return this.orders.filter(o => o.status === 'pending').reduce((s, o) => s + o.total, 0);
  }

  constructor(
    private authService: AuthService,
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.currentUser;
    this.restoreOnboardingFromCache();
    this.restoreDashboardFromCache();

    this.sub.add(
      this.authService.validateSession().subscribe((valid) => {
        this.sellerSessionBootstrapping = false;
        this.currentUser = this.authService.currentUser;
        if (valid && this.sellerMysqlContext) {
          this.restoreOnboardingFromCache();
          this.restoreDashboardFromCache();
          this.ensureSellerDataLoaded(true);
        }
        this.cdr.markForCheck();
      })
    );

    this.sub.add(
      this.authService.loginSuccess$.subscribe((user) => {
        this.currentUser = user;
        this.sellerDataLoadedFor = null;
        this.ensureSellerDataLoaded(true);
        this.cdr.markForCheck();
      })
    );

    this.sub.add(
      this.authService.authState$.subscribe((state) => {
        this.currentUser = state.user;
        if (!state.isAuthenticated) {
          this.sellerDataLoadedFor = null;
        }
        this.cdr.markForCheck();
      })
    );

    this.notifPollTimer = setInterval(() => {
      if (this.sellerMysqlContext) {
        this.loadNotificationsFromApi();
      }
    }, 45_000);
  }

  /** Une seule vague de chargement API par vendeur (évite doublons au refresh token). */
  private ensureSellerDataLoaded(force = false): void {
    const ctx = this.sellerMysqlContext;
    if (!ctx) return;
    if (!force && this.sellerDataLoadedFor === ctx.vendeurId) return;
    this.sellerDataLoadedFor = ctx.vendeurId;
    this.loadDashboardDataFromApi();
    this.loadOnboardingFromApi();
    this.loadProfileFromApi();
    this.loadSettingsFromApi();
    this.loadOperatorThreadFromApi();
    this.loadNotificationsFromApi();
  }

  private onboardingCacheKey(): string | null {
    const id = this.sellerMysqlContext?.vendeurId;
    return id ? `${this.onboardingCachePrefix}${id}` : null;
  }

  private restoreOnboardingFromCache(): void {
    const key = this.onboardingCacheKey();
    if (!key) return;
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) {
        this.applyOnboardingData(JSON.parse(raw));
        this.onboardingHydrated = true;
      }
    } catch {
      /* ignore cache parse errors */
    }
  }

  private persistOnboardingCache(data: unknown): void {
    const key = this.onboardingCacheKey();
    if (!key || !data) return;
    try {
      sessionStorage.setItem(key, JSON.stringify(data));
    } catch {
      /* quota / private mode */
    }
  }

  private dashboardCacheKey(): string | null {
    const id = this.sellerMysqlContext?.vendeurId;
    return id ? `${this.dashboardCachePrefix}${id}` : null;
  }

  private restoreDashboardFromCache(): void {
    const key = this.dashboardCacheKey();
    if (!key) return;
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) {
        this.applyDashboardData(JSON.parse(raw));
        this.cdr.markForCheck();
      }
    } catch {
      /* ignore cache parse errors */
    }
  }

  private persistDashboardCache(data: unknown): void {
    const key = this.dashboardCacheKey();
    if (!key || !data) return;
    try {
      sessionStorage.setItem(key, JSON.stringify(data));
    } catch {
      /* quota / private mode */
    }
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    if (this.notifPollTimer) clearInterval(this.notifPollTimer);
    if (this.profileFeedbackTimer) clearTimeout(this.profileFeedbackTimer);
    if (this.onboardingFeedbackTimer) clearTimeout(this.onboardingFeedbackTimer);
    if (this.addProductFeedbackTimer) clearTimeout(this.addProductFeedbackTimer);
    if (this.bulkUploadFeedbackTimer) clearTimeout(this.bulkUploadFeedbackTimer);
  }

  // =========== Computed ===========
  get storeName(): string {
    if (!this.currentUser) return 'Votre boutique';
    return `Boutique ${this.currentUser.prenom} ${this.currentUser.nom}`.trim();
  }

  get userInitials(): string {
    if (!this.currentUser) return 'V';
    const f = this.currentUser.prenom?.charAt(0) ?? '';
    const l = this.currentUser.nom?.charAt(0) ?? '';
    return (f + l).toUpperCase() || 'V';
  }

  get greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  }

  stepOnboardingValide(step: OnboardingStepModel): boolean {
    return step.status === 'valide';
  }

  /** 0 = à faire, 0,5 = en attente admin, 1 = validé */
  get onboardingProgress(): number {
    if (!this.onboardingHydrated) {
      return 0;
    }
    const w: Record<OnboardingStepStatus, number> = {
      a_faire: 0,
      en_attente_validation: 0.5,
      valide: 1
    };
    const sum = this.onboardingSteps.reduce((acc, s) => acc + w[s.status], 0);
    return Math.round((sum / this.onboardingSteps.length) * 100);
  }

  get onboardingActivationTerminee(): boolean {
    return this.onboardingSteps.every(s => s.status === 'valide');
  }

  onboardingStatusLabel(status: OnboardingStepStatus): string {
    const m: Record<OnboardingStepStatus, string> = {
      a_faire: 'À compléter',
      en_attente_validation: 'En attente validation',
      valide: 'Validé'
    };
    return m[status];
  }

  onboardingBadgeClass(status: OnboardingStepStatus): string {
    const m: Record<OnboardingStepStatus, string> = {
      a_faire: 'bg-slate-100 text-slate-600',
      en_attente_validation: 'bg-amber-100 text-amber-900',
      valide: 'bg-emerald-100 text-emerald-800'
    };
    return m[status];
  }

  private patchOnboardingStep(id: OnboardingStepModel['id'], patch: Partial<OnboardingStepModel>): void {
    this.onboardingSteps = this.onboardingSteps.map(s => (s.id === id ? { ...s, ...patch } : s));
  }

  private showOnboardingMessage(msg: string): void {
    this.onboardingFeedback = msg;
    if (this.onboardingFeedbackTimer) clearTimeout(this.onboardingFeedbackTimer);
    this.onboardingFeedbackTimer = setTimeout(() => (this.onboardingFeedback = ''), 4500);
  }

  private apiErrorMessage(err: unknown, fallback: string): string {
    const e = err as HttpErrorResponse & { userMessage?: string };
    if (e?.error?.message) return String(e.error.message);
    if (e?.userMessage) return e.userMessage;
    if (e?.status === 0) {
      return 'Serveur injoignable. Lancez auth-service (port 3001) et vérifiez que le front est sur localhost.';
    }
    if (e?.status === 401) {
      return 'Session expirée — déconnectez-vous puis reconnectez-vous (compte vendeur MySQL).';
    }
    if (e?.status === 403) {
      return 'Accès refusé — reconnectez-vous avec un compte vendeur enregistré en base MySQL.';
    }
    return fallback;
  }

  private refDossier(prefix: string): string {
    const t = Date.now().toString(36).toUpperCase();
    return `${prefix}-${t.slice(-6)}`;
  }

  getOnboardingStepById(id: OnboardingStepModel['id']): OnboardingStepModel | undefined {
    return this.onboardingSteps.find(s => s.id === id);
  }

  get currentMarket() {
    return this.markets.find(m => m.code === this.selectedMarket) ?? this.markets[0];
  }

  private notificationIcon(type: string) {
    switch (type) {
      case 'action_requise':
        return this.AlertCircle;
      case 'kyc':
        return this.FileCheck;
      case 'moderation':
        return this.Package;
      case 'onboarding':
        return this.Sparkles;
      default:
        return this.Bell;
    }
  }

  private mapNotificationRow(n: {
    id: number;
    type: string;
    title: string;
    text: string;
    time: string;
    read?: boolean;
  }) {
    return {
      id: n.id,
      type: n.type,
      title: n.title,
      text: n.text,
      time: n.time,
      read: Boolean(n.read),
      icon: this.notificationIcon(n.type)
    };
  }

  loadNotificationsFromApi(): void {
    if (!this.sellerMysqlContext) return;
    this.http
      .get<{ success: boolean; data?: { rows: any[]; unreadCount: number } }>(
        `${this.sellerApiBase}/notifications`
      )
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.notifications = (res.data.rows || []).map((n) => this.mapNotificationRow(n));
            this.notificationsUnreadCount = res.data.unreadCount ?? 0;
            this.cdr.markForCheck();
          }
        }
      });
  }

  markAllNotificationsRead(): void {
    this.http.patch(`${this.sellerApiBase}/notifications/read-all`, {}).subscribe({
      next: () => {
        this.notifications = this.notifications.map((n) => ({ ...n, read: true }));
        this.notificationsUnreadCount = 0;
        this.cdr.markForCheck();
      }
    });
  }

  openSellerNotification(n: { id: number; read: boolean; type: string }): void {
    if (!n.read) {
      this.http.patch(`${this.sellerApiBase}/notifications/${n.id}/read`, {}).subscribe({
        next: (res: any) => {
          n.read = true;
          if (res?.data?.unreadCount != null) {
            this.notificationsUnreadCount = res.data.unreadCount;
          } else if (this.notificationsUnreadCount > 0) {
            this.notificationsUnreadCount--;
          }
          this.cdr.markForCheck();
        }
      });
    }
    this.showNotifications = false;
    if (n.type === 'message') {
      this.setActiveNav('admin-messaging');
      return;
    }
    if (n.type === 'onboarding' || n.type === 'action_requise' || n.type === 'kyc') {
      this.activeNav = 'dashboard';
      this.onboardingOpenPanel = null;
    } else if (n.type === 'moderation') {
      this.activeNav = 'catalog';
    }
    this.cdr.markForCheck();
  }

  get notificationsCount(): number {
    return this.notificationsUnreadCount;
  }

  get casesCount(): number {
    return this.cases.length;
  }

  get unshippedCount(): number {
    return this.orders.filter(o => o.status === 'pending').length;
  }

  get salesVsYesterdayPercent(): number {
    const t = this.todaySnapshot.today.sales;
    const y = this.todaySnapshot.yesterday.sales;
    if (y === 0) return 0;
    return +(((t - y) / y) * 100).toFixed(1);
  }

  get salesVsLastWeekPercent(): number {
    const t = this.todaySnapshot.today.sales;
    const lw = this.todaySnapshot.lastWeek.sales;
    if (lw === 0) return 0;
    return +(((t - lw) / lw) * 100).toFixed(1);
  }

  // =========== Actions — Onboarding ===========
  selectOnboardingRow(id: OnboardingStepModel['id']): void {
    if (this.onboardingOpenPanel === id) {
      return;
    }
    this.onboardingOpenPanel = id;
  }

  selectSellerPlan(tier: 'particulier' | 'professionnel'): void {
    this.sellerPlan = tier;
    this.cdr.markForCheck();
  }

  soumettreOnboardingPlan(): void {
    if (this.planSubmitting) return;
    const step = this.onboardingSteps.find(s => s.id === 'plan');
    if (!step) return;
    if (step.status === 'en_attente_validation') {
      this.showOnboardingMessage('Formule déjà soumise — en attente de validation admin.');
      return;
    }
    if (step.status === 'valide') {
      this.showOnboardingMessage('Formule déjà validée par l’admin.');
      return;
    }
    if (step.status !== 'a_faire') {
      return;
    }
    if (!this.sellerPlan) {
      this.showOnboardingMessage('Choisissez d’abord Particulier ou Professionnel.');
      return;
    }
    if (!this.sellerMysqlContext) {
      this.showOnboardingMessage('Connectez-vous avec un compte vendeur MySQL pour soumettre la formule.');
      return;
    }
    this.planSubmitting = true;
    this.http
      .post<{ success: boolean; message?: string; data?: any }>(
        `${this.sellerApiBase}/onboarding/plan`,
        { tier: this.sellerPlan }
      )
      .subscribe({
        next: (res) => {
          this.planSubmitting = false;
          if (res.data) this.applyOnboardingData(res.data);
          this.showOnboardingMessage(res.message || 'Formule soumise pour validation admin.');
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.planSubmitting = false;
          this.showOnboardingMessage(
            this.apiErrorMessage(err, 'Impossible de soumettre la formule. Vérifiez auth-service (port 3001).')
          );
          this.cdr.markForCheck();
        }
      });
  }

  async soumettreEtapeOnboarding(id: OnboardingStepModel['id']): Promise<void> {
    if (this.stepSubmitting) return;
    const step = this.onboardingSteps.find(s => s.id === id);
    if (!step || step.status !== 'a_faire' || id === 'plan') {
      return;
    }

    if (id === 'docs') {
      if (!this.onboardingDocFiles.kbis || !this.onboardingDocFiles.cni || !this.onboardingDocFiles.rib) {
        this.showOnboardingMessage('Ajoutez les 3 fichiers : Kbis, CNI/passeport et RIB.');
        return;
      }
      this.docsUploading = true;
      try {
        if (!this.sellerMysqlContext) {
          this.showOnboardingMessage(
            'Connectez-vous avec un compte vendeur enregistré en base (MySQL + auth-service) pour envoyer les pièces KYC.'
          );
          this.docsUploading = false;
          return;
        }

        const formData = new FormData();
        formData.append('kbis', this.onboardingDocFiles.kbis);
        formData.append('cni', this.onboardingDocFiles.cni);
        formData.append('rib', this.onboardingDocFiles.rib);
        if (this.onboardingFormDocs.commentaire?.trim()) {
          formData.append('commentaire', this.onboardingFormDocs.commentaire.trim());
        }

        const response = await firstValueFrom(
          this.http.post<any>(`${this.sellerApiBase}/documents`, formData)
        );
        this.onboardingFormDocs.fichierKbis = response?.data?.kbis?.originalName || this.onboardingDocFiles.kbis.name;
        this.onboardingFormDocs.fichierCni = response?.data?.cni?.originalName || this.onboardingDocFiles.cni.name;
        this.onboardingFormDocs.fichierRib = response?.data?.rib?.originalName || this.onboardingDocFiles.rib.name;
        if (response?.data?.onboarding) {
          this.applyOnboardingData(response.data.onboarding);
        }
        this.showOnboardingMessage('Documents transmis — en attente de validation admin.');
        return;
      } catch (_error) {
        this.showOnboardingMessage('Échec du téléversement. Vérifiez que le service auth est bien lancé sur le port 3001.');
        return;
      } finally {
        this.docsUploading = false;
      }
    }

    if (!this.sellerMysqlContext) {
      this.showOnboardingMessage('Connectez-vous avec un compte vendeur MySQL pour soumettre cette étape.');
      return;
    }

    if (id === 'profile') {
      if (!this.onboardingFormProfile.raisonSociale?.trim()) {
        this.showOnboardingMessage('La raison sociale est obligatoire (ou « Exemple »).');
        return;
      }
    }
    if (id === 'payout') {
      if (!this.onboardingFormPayout.iban?.trim() || !this.onboardingFormPayout.titulaire?.trim()) {
        this.showOnboardingMessage('Titulaire et IBAN sont requis (ou « Exemple »).');
        return;
      }
    }

    const endpoints: Partial<Record<OnboardingStepModel['id'], string>> = {
      profile: '/onboarding/profile',
      shipping: '/onboarding/shipping',
      payout: '/onboarding/payout'
    };
    const bodies: Partial<Record<OnboardingStepModel['id'], object>> = {
      profile: this.onboardingFormProfile,
      shipping: this.onboardingFormShipping,
      payout: this.onboardingFormPayout
    };

    const path = endpoints[id];
    if (!path) return;

    this.stepSubmitting = true;
    try {
      const response = await firstValueFrom(
        this.http.post<{ success: boolean; message?: string; data?: any }>(
          `${this.sellerApiBase}${path}`,
          bodies[id]
        )
      );
      if (response.data) this.applyOnboardingData(response.data);
      this.showOnboardingMessage(response.message || 'Étape soumise pour validation admin.');
      this.loadNotificationsFromApi();
    } catch (err) {
      this.showOnboardingMessage(this.apiErrorMessage(err, 'Échec de la soumission. Vérifiez auth-service et la base MySQL.'));
    } finally {
      this.stepSubmitting = false;
      this.cdr.markForCheck();
    }
  }

  onDocFileSelected(kind: 'kbis' | 'cni' | 'rib', event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.onboardingDocFiles[kind] = file;
    if (kind === 'kbis') this.onboardingFormDocs.fichierKbis = file?.name ?? '';
    if (kind === 'cni') this.onboardingFormDocs.fichierCni = file?.name ?? '';
    if (kind === 'rib') this.onboardingFormDocs.fichierRib = file?.name ?? '';
  }

  scrollToOnboardingPlan(): void {
    const el = document.getElementById('seller-onboarding-plan');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.onboardingOpenPanel = 'plan';
  }

  setActiveNav(id: string): void {
    if (this.activeNav === id) {
      this.showMobileSidebar = false;
      if (id === 'admin-messaging') {
        this.loadOperatorThreadFromApi();
      }
      return;
    }
    this.activeNav = id;
    this.showMobileSidebar = false;
    this.cdr.markForCheck();
    if (id === 'brand-registry' && this.sellerMysqlContext) {
      this.loadBrandRegistrationsFromApi();
    }
    if (id === 'admin-messaging') {
      this.loadOperatorThreadFromApi();
    }
    if (id === 'promotions' && this.sellerMysqlContext) {
      this.loadPromotionsFromApi();
    }
  }

  openCreateCouponModal(): void {
    this.setActiveNav('promotions');
    this.editingCouponId = null;
    this.couponForm = {
      code: '',
      label: '',
      typeRemise: 'pourcentage',
      valeur: 10,
      plafond: 100,
      validDays: 30
    };
    this.showCouponModal = true;
    this.cdr.markForCheck();
  }

  openEditCouponModal(coupon: SellerCouponRow): void {
    if (!coupon.dbId) return;
    this.editingCouponId = coupon.dbId;
    const isPct = coupon.discount.includes('%');
    const valeur = Number(coupon.discount.replace(/[^0-9.]/g, '')) || 10;
    this.couponForm = {
      code: coupon.code,
      label: coupon.label || '',
      typeRemise: isPct ? 'pourcentage' : 'montant',
      valeur,
      plafond: typeof coupon.max === 'number' ? coupon.max : 100,
      validDays: 30
    };
    this.showCouponModal = true;
    this.cdr.markForCheck();
  }

  closeCouponModal(): void {
    this.showCouponModal = false;
    this.editingCouponId = null;
  }

  openCreateProductPromoModal(): void {
    this.setActiveNav('promotions');
    this.editingProductPromoId = null;
    this.loadPromoProductOptions();
    this.productPromoForm = {
      productId: 0,
      promoPrice: 0,
      originalPrice: 0,
      typePromo: 'promo',
      label: '',
      validDays: 14
    };
    this.showProductPromoModal = true;
    this.cdr.markForCheck();
  }

  openEditProductPromoModal(promo: SellerProductPromoRow): void {
    if (!promo.dbId) return;
    this.editingProductPromoId = promo.dbId;
    this.loadPromoProductOptions();
    this.productPromoForm = {
      productId: promo.productId || 0,
      promoPrice: promo.price,
      originalPrice: promo.originalPrice || promo.price,
      typePromo: promo.type,
      label: promo.badge || '',
      validDays: 14
    };
    this.showProductPromoModal = true;
    this.cdr.markForCheck();
  }

  closeProductPromoModal(): void {
    this.showProductPromoModal = false;
    this.editingProductPromoId = null;
  }

  onPromoProductSelected(): void {
    const p = this.promoProductOptions.find((x) => x.id === Number(this.productPromoForm.productId));
    if (!p) return;
    this.productPromoForm.originalPrice = p.price;
    if (!this.productPromoForm.promoPrice) {
      this.productPromoForm.promoPrice = Math.round(p.price * 0.9 * 100) / 100;
    }
  }

  loadPromoProductOptions(): void {
    if (!this.sellerMysqlContext) return;
    this.http
      .get<{ success: boolean; data?: { products: PromoProductOption[] } }>(
        `${this.sellerApiBase}/promotions/product-options`
      )
      .subscribe({
        next: (res) => {
          if (res.success && res.data?.products) {
            this.replaceArray(this.promoProductOptions, res.data.products);
            this.cdr.markForCheck();
          }
        }
      });
  }

  loadPromotionsFromApi(): void {
    if (!this.sellerMysqlContext) return;
    this.http
      .get<{
        success: boolean;
        data?: {
          coupons: SellerCouponRow[];
          productPromos: SellerProductPromoRow[];
          summary: PromotionsSummary;
        };
      }>(`${this.sellerApiBase}/promotions`)
      .subscribe({
        next: (res) => {
          if (!res.success || !res.data) return;
          this.replaceArray(this.sellerCoupons, res.data.coupons);
          this.replaceArray(this.sellerProductPromos, res.data.productPromos);
          Object.assign(this.promotionsSummary, res.data.summary);
          this.cdr.markForCheck();
        },
        error: () => this.showPromoFeedback('Impossible de charger les promotions.')
      });
  }

  submitCreateCoupon(): void {
    if (!this.sellerMysqlContext) return;
    const code = this.couponForm.code.trim();
    if (!code || code.length < 3) {
      this.showPromoFeedback('Code requis (3 caractères minimum).');
      return;
    }
    if (!this.couponForm.valeur || this.couponForm.valeur <= 0) {
      this.showPromoFeedback('Indiquez une valeur de remise valide.');
      return;
    }

    const body = {
      code: code.toUpperCase(),
      label: this.couponForm.label.trim() || undefined,
      typeRemise: this.couponForm.typeRemise,
      valeur: this.couponForm.valeur,
      plafond: this.couponForm.plafond || undefined,
      validDays: this.couponForm.validDays
    };

    this.couponSaving = true;
    const req$ = this.editingCouponId
      ? this.http.patch<{ success: boolean; message?: string }>(
          `${this.sellerApiBase}/promotions/coupons/${this.editingCouponId}`,
          body
        )
      : this.http.post<{ success: boolean; message?: string }>(
          `${this.sellerApiBase}/promotions/coupons`,
          body
        );

    req$.subscribe({
      next: (res) => {
        this.couponSaving = false;
        if (res.success) {
          this.showCouponModal = false;
          this.editingCouponId = null;
          this.showPromoFeedback(res.message || 'Coupon enregistré.');
          this.loadPromotionsFromApi();
        }
      },
      error: (err) => {
        this.couponSaving = false;
        this.showPromoFeedback(err.error?.message || 'Enregistrement impossible.');
      }
    });
  }

  deleteCoupon(coupon: SellerCouponRow): void {
    if (!coupon.dbId || !confirm(`Supprimer le coupon « ${coupon.code} » ?`)) return;
    this.http
      .delete<{ success: boolean; message?: string }>(
        `${this.sellerApiBase}/promotions/coupons/${coupon.dbId}`
      )
      .subscribe({
        next: (res) => {
          this.showPromoFeedback(res.message || 'Coupon supprimé.');
          this.loadPromotionsFromApi();
        },
        error: (err) => this.showPromoFeedback(err.error?.message || 'Suppression impossible.')
      });
  }

  submitProductPromo(): void {
    if (!this.sellerMysqlContext) return;
    if (!this.productPromoForm.productId) {
      this.showPromoFeedback('Sélectionnez un produit.');
      return;
    }
    if (!this.productPromoForm.promoPrice || this.productPromoForm.promoPrice <= 0) {
      this.showPromoFeedback('Indiquez un prix promo valide.');
      return;
    }

    const body = {
      productId: this.productPromoForm.productId,
      promoPrice: this.productPromoForm.promoPrice,
      originalPrice: this.productPromoForm.originalPrice || undefined,
      typePromo: this.productPromoForm.typePromo,
      label: this.productPromoForm.label.trim() || undefined,
      validDays: this.productPromoForm.validDays
    };

    this.productPromoSaving = true;
    const req$ = this.editingProductPromoId
      ? this.http.patch<{ success: boolean; message?: string }>(
          `${this.sellerApiBase}/promotions/products/${this.editingProductPromoId}`,
          body
        )
      : this.http.post<{ success: boolean; message?: string }>(
          `${this.sellerApiBase}/promotions/products`,
          body
        );

    req$.subscribe({
      next: (res) => {
        this.productPromoSaving = false;
        if (res.success) {
          this.showProductPromoModal = false;
          this.editingProductPromoId = null;
          this.showPromoFeedback(res.message || 'Promotion enregistrée.');
          this.loadPromotionsFromApi();
        }
      },
      error: (err) => {
        this.productPromoSaving = false;
        this.showPromoFeedback(err.error?.message || 'Enregistrement impossible.');
      }
    });
  }

  deleteProductPromo(promo: SellerProductPromoRow): void {
    if (!promo.dbId || !confirm(`Supprimer la promotion sur « ${promo.name} » ?`)) return;
    this.http
      .delete<{ success: boolean; message?: string }>(
        `${this.sellerApiBase}/promotions/products/${promo.dbId}`
      )
      .subscribe({
        next: (res) => {
          this.showPromoFeedback(res.message || 'Promotion supprimée.');
          this.loadPromotionsFromApi();
        },
        error: (err) => this.showPromoFeedback(err.error?.message || 'Suppression impossible.')
      });
  }

  private showPromoFeedback(msg: string): void {
    this.promoFeedback = msg;
    if (this.promoFeedbackTimer) clearTimeout(this.promoFeedbackTimer);
    this.promoFeedbackTimer = setTimeout(() => (this.promoFeedback = ''), 4500);
  }

  getProductPromoTypeClass(type: string): string {
    return type === 'flash' ? 'bg-red-100 text-red-700' : 'bg-rose-100 text-rose-700';
  }

  openSupportMessaging(): void {
    this.showHelpMenu = false;
    this.setActiveNav('admin-messaging');
  }

  loadBrandRegistrationsFromApi(): void {
    this.http
      .get<{ success: boolean; data?: { rows: BrandRegistrationRow[] } }>(
        `${this.sellerApiBase}/brand-registrations`
      )
      .subscribe({
        next: (res) => {
          if (res.success && res.data?.rows) {
            this.brandRegistrations = res.data.rows;
          }
        },
        error: () => (this.brandRegistryFeedback = 'Impossible de charger les marques.')
      });
  }

  submitBrandRegistration(): void {
    const libelle = this.brandFormLabel.trim() || this.storeSettings.displayName || this.storeSettings.name;
    if (!libelle) {
      this.brandRegistryFeedback = 'Indiquez un nom de marque.';
      return;
    }
    this.http
      .post<{ success: boolean; message?: string }>(`${this.sellerApiBase}/brand-registrations`, {
        libelleMarque: libelle
      })
      .subscribe({
        next: (res) => {
          this.brandRegistryFeedback = res.message || 'Demande enregistrée.';
          this.brandFormLabel = '';
          this.loadBrandRegistrationsFromApi();
        },
        error: () => (this.brandRegistryFeedback = 'Échec enregistrement marque.')
      });
  }

  get primaryBrandRegistration(): BrandRegistrationRow | null {
    return this.brandRegistrations[0] || null;
  }

  private showProfileMessage(msg: string): void {
    this.profileFeedback = msg;
    if (this.profileFeedbackTimer) clearTimeout(this.profileFeedbackTimer);
    this.profileFeedbackTimer = setTimeout(() => (this.profileFeedback = ''), 4000);
  }

  private replaceArray<T>(target: T[], source: T[] | undefined): void {
    target.splice(0, target.length, ...((source || []) as T[]));
  }

  private applyDashboardData(data: any): void {
    if (!data) return;
    this.persistDashboardCache(data);
    this.replaceArray(this.kpis, data.kpis);
    Object.assign(this.todaySnapshot.today, data.todaySnapshot?.today || {});
    Object.assign(this.todaySnapshot.yesterday, data.todaySnapshot?.yesterday || {});
    Object.assign(this.todaySnapshot.lastWeek, data.todaySnapshot?.lastWeek || {});
    this.replaceArray(this.orders, data.orders);
    this.replaceArray(this.topProducts, data.topProducts);
    this.replaceArray(this.inventoryBreakdown, data.inventoryBreakdown);
    Object.assign(this.payoutSummary, data.payoutSummary || {});
    this.replaceArray(this.activity, data.activity);
    this.replaceArray(this.chartData, data.chartData);
    this.replaceArray(this.healthMetrics, data.healthMetrics);
    this.replaceArray(this.cases, data.cases);
    this.replaceArray(this.coachTips, data.coachTips);
    this.replaceArray(this.news, data.news);
    this.replaceArray(this.shipments, data.shipments);
    this.replaceArray(this.returnsList, data.returnsList);
    this.replaceArray(this.buyerMessages, data.buyerMessages);
    this.replaceArray(this.adCampaigns, data.adCampaigns);
    this.replaceArray(this.sbCreatives, data.sbCreatives);
    this.replaceArray(this.sellerDeals, data.sellerDeals);
    this.replaceArray(this.internationalMarkets, data.internationalMarkets);
    this.replaceArray(this.searchTerms, data.searchTerms);
    this.replaceArray(this.sellerFeedback, data.sellerFeedback);
    this.replaceArray(this.feedbackDistribution, data.feedbackDistribution);
    this.replaceArray(this.payoutsHistory, data.payoutsHistory);
    this.replaceArray(this.invoices, data.invoices);
    this.replaceArray(this.sellerCoupons, data.sellerCoupons);
    this.replaceArray(this.sellerProductPromos, data.sellerProductPromos);
    if (data.promotionsSummary) {
      Object.assign(this.promotionsSummary, data.promotionsSummary);
    }
    this.replaceArray(this.pricingRules, data.pricingRules);
    this.replaceArray(this.bulkHistory, data.bulkHistory);
    this.replaceArray(this.trafficSources, data.trafficSources);
    this.replaceArray(this.programs, this.enrichPrograms(data.programs));
    this.replaceArray(
      this.notifications,
      (data.notifications || []).map((n: any) =>
        this.mapNotificationRow({
          id: Number(n.id),
          type: n.type,
          title: n.title,
          text: n.text,
          time: n.time,
          read: n.read
        })
      )
    );
    if (typeof data.notificationsUnreadCount === 'number') {
      this.notificationsUnreadCount = data.notificationsUnreadCount;
    }
    if (data.trafficOverview) {
      Object.assign(this.trafficOverview, data.trafficOverview);
      this.todaySnapshot.today.sessions = Number(data.trafficOverview.sessions || 0);
      this.todaySnapshot.today.pageViews = Number(data.trafficOverview.pages_vues || 0);
    }
    if (typeof data.healthScore === 'number') {
      this.healthScore = data.healthScore;
    }
    if (data.feedbackSummary) {
      Object.assign(this.feedbackSummary, data.feedbackSummary);
    }
    if (typeof data.buyerMessagesUnread === 'number') {
      this.buyerMessagesUnread = data.buyerMessagesUnread;
    }
    const buyBoxKpi = (data.kpis || []).find((k: { label?: string }) => k.label === 'Buy Box');
    if (buyBoxKpi?.value) {
      const m = String(buyBoxKpi.value).match(/[\d.]+/);
      this.buyBoxPercent = m ? Number(m[0]) : 0;
    }
  }

  private applyOnboardingData(data: any): void {
    if (!data) return;
    if (data.sellerPlan === 'particulier' || data.sellerPlan === 'professionnel') {
      this.sellerPlan = data.sellerPlan;
    }
    if (Array.isArray(data.steps)) {
      this.onboardingSteps = data.steps.map((s: OnboardingStepModel) => ({
        id: s.id,
        label: s.label,
        status: s.status,
        fileReference: s.fileReference,
        submittedAt: s.submittedAt
      }));
    }
    const forms = data.forms || {};
    if (forms.docs) {
      this.onboardingFormDocs.commentaire = forms.docs.commentaire || '';
    }
    if (forms.profile) {
      this.onboardingFormProfile = { ...this.onboardingFormProfile, ...forms.profile };
    }
    if (forms.shipping) {
      this.onboardingFormShipping = { ...this.onboardingFormShipping, ...forms.shipping };
    }
    if (forms.payout) {
      this.onboardingFormPayout = { ...this.onboardingFormPayout, ...forms.payout };
    }
    this.onboardingHydrated = true;
    this.persistOnboardingCache(data);
    this.cdr.markForCheck();
  }

  private enrichPrograms(
    programs: Array<{ id: string; name: string; desc: string; badge: string; eligible: boolean; enrolled: boolean }> | undefined
  ) {
    const iconMap: Record<string, typeof this.Star> = {
      vine: this.Star,
      brand: this.ShieldCheck,
      aplus: this.Sparkles,
      climate: this.Award,
      subs: this.RefreshCw,
      hxprime: this.Rocket
    };
    return (programs || []).map((p) => ({ ...p, icon: iconMap[p.id] || this.Award }));
  }

  loadProfileFromApi(): void {
    if (!this.sellerMysqlContext) return;
    this.http.get<{ success: boolean; data?: { profile: any; relectures: any[] } }>(`${this.sellerApiBase}/profile`).subscribe({
      next: (res) => {
        if (res.data?.profile) Object.assign(this.sellerProfile, res.data.profile);
        if (res.data?.relectures) this.relectureProfilHistorique = res.data.relectures;
      }
    });
  }

  loadSettingsFromApi(): void {
    if (!this.sellerMysqlContext) return;
    this.http.get<{ success: boolean; data?: { settings: any } }>(`${this.sellerApiBase}/settings`).subscribe({
      next: (res) => {
        if (res.data?.settings) {
          Object.assign(this.storeSettings, res.data.settings);
          this.storeSettingsBackup = { ...this.storeSettings };
        }
      }
    });
  }

  loadOnboardingFromApi(): void {
    if (!this.sellerMysqlContext) return;
    const reqId = ++this.onboardingRequestId;
    this.onboardingLoading = true;
    this.http
      .get<{ success: boolean; data?: any }>(`${this.sellerApiBase}/onboarding`)
      .subscribe({
        next: (res) => {
          if (reqId !== this.onboardingRequestId) return;
          this.onboardingLoading = false;
          if (res.success && res.data) {
            this.applyOnboardingData(res.data);
          }
        },
        error: (err) => {
          if (reqId !== this.onboardingRequestId) return;
          this.onboardingLoading = false;
          if (!this.onboardingHydrated) {
            this.showOnboardingMessage(
              this.apiErrorMessage(err, 'Impossible de charger l’onboarding vendeur.')
            );
          }
          this.cdr.markForCheck();
        }
      });
  }

  loadDashboardDataFromApi(): void {
    if (!this.sellerMysqlContext) return;
    this.http
      .get<{ success: boolean; data?: any }>(`${this.sellerApiBase}/dashboard`)
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.applyDashboardData(res.data);
          }
        },
        error: () => {
          this.showProfileMessage('Impossible de charger les données vendeur depuis la base.');
        }
      });
  }

  private computeProfilComplet(): boolean {
    const p = this.sellerProfile;
    return !!(
      p.adresseLigne1?.trim() &&
      p.ville?.trim() &&
      p.codePostal?.trim() &&
      p.biographie?.trim()
    );
  }

  saveSellerProfile(): void {
    if (!this.sellerMysqlContext) {
      this.showProfileMessage('Connectez-vous avec un compte vendeur MySQL.');
      return;
    }
    this.http
      .put<{ success: boolean; message?: string; data?: { profile: any } }>(
        `${this.sellerApiBase}/profile`,
        this.sellerProfile
      )
      .subscribe({
        next: (res) => {
          if (res.data?.profile) Object.assign(this.sellerProfile, res.data.profile);
          this.showProfileMessage(res.message || 'Profil enregistré.');
        },
        error: () => this.showProfileMessage('Impossible d’enregistrer le profil.')
      });
  }

  saveStoreSettings(): void {
    if (!this.sellerMysqlContext) {
      this.showProfileMessage('Connectez-vous avec un compte vendeur MySQL.');
      return;
    }
    this.http
      .put<{ success: boolean; message?: string; data?: { settings: any } }>(
        `${this.sellerApiBase}/settings`,
        this.storeSettings
      )
      .subscribe({
        next: (res) => {
          if (res.data?.settings) Object.assign(this.storeSettings, res.data.settings);
          this.storeSettingsBackup = { ...this.storeSettings };
          this.showProfileMessage(res.message || 'Paramètres enregistrés.');
        },
        error: () => this.showProfileMessage('Impossible d’enregistrer les paramètres.')
      });
  }

  envoyerLienVerificationCourriel(): void {
    if (!this.sellerMysqlContext) return;
    this.http.post<{ success: boolean; message?: string }>(`${this.sellerApiBase}/profile/verify-email`, {}).subscribe({
      next: (res) => this.showProfileMessage(res.message || 'E-mail de vérification envoyé.'),
      error: () => this.showProfileMessage('Envoi impossible.')
    });
  }

  envoyerCodeVerificationTelephone(): void {
    if (!this.sellerMysqlContext) return;
    this.http.post<{ success: boolean; message?: string }>(`${this.sellerApiBase}/profile/verify-phone`, {}).subscribe({
      next: (res) => this.showProfileMessage(res.message || 'Code SMS envoyé.'),
      error: () => this.showProfileMessage('Envoi impossible.')
    });
  }

  confirmerRelectureDonnees(): void {
    if (!this.sellerMysqlContext) return;
    this.http
      .post<{ success: boolean; message?: string; data?: { relectures: any[] } }>(
        `${this.sellerApiBase}/profile/relecture-donnees`,
        {}
      )
      .subscribe({
        next: (res) => {
          if (res.data?.relectures) this.relectureProfilHistorique = res.data.relectures;
          this.showProfileMessage(res.message || 'Confirmation enregistrée.');
        },
        error: () => this.showProfileMessage('Enregistrement impossible.')
      });
  }

  loadOperatorThreadFromApi(): void {
    if (!this.sellerMysqlContext) {
      this.showProfileMessage(
        'Messagerie opérateur : connectez-vous en vendeur (compte créé avec MySQL configuré sur auth-service).'
      );
      return;
    }
    this.operatorThreadLoading = true;
    this.http
      .get<{
        success: boolean;
        data?: { messages: { id: string; from: 'vendeur' | 'operateur' | 'systeme'; body: string; at: string }[] };
      }>(`${this.sellerApiBase}/operator-thread`)
      .subscribe({
        next: (res) => {
          if (res.success && res.data?.messages) {
            this.adminOperatorThread = res.data.messages;
          }
          this.operatorThreadLoading = false;
        },
        error: () => {
          this.operatorThreadLoading = false;
        }
      });
  }

  async envoyerMessageOperateur(): Promise<void> {
    const body = this.newMessageToOperator.trim();
    if (!body) {
      return;
    }
    if (!this.sellerMysqlContext) {
      this.showProfileMessage('Connectez-vous en vendeur (MySQL) pour envoyer un message à l’opérateur.');
      return;
    }
    try {
      const res = await firstValueFrom(
        this.http.post<{
          success: boolean;
          data?: { messages: { id: string; from: 'vendeur' | 'operateur' | 'systeme'; body: string; at: string }[] };
        }>(`${this.sellerApiBase}/operator-thread/messages`, { body })
      );
      if (res.success && res.data?.messages) {
        this.adminOperatorThread = res.data.messages;
      }
      this.newMessageToOperator = '';
      this.showProfileMessage('Message enregistré (API vendeur).');
    } catch {
      this.showProfileMessage('Impossible d’envoyer le message (vérifiez que auth-service tourne sur le port 3001).');
    }
  }

  toggleSection(label: string): void {
    this.navSections = this.navSections.map(sec =>
      sec.label === label ? { ...sec, collapsed: !sec.collapsed } : sec
    );
  }

  onAddProductImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.showAddProductMessage('Fichier invalide : choisissez une image (JPG/PNG/WebP).');
      return;
    }
    this.addProductImageFile = file;
    this.addProductForm.imageName = file.name;
    this.addProductForm.imagePreview = URL.createObjectURL(file);
    this.showAddProductMessage('Photo produit ajoutée avec succès.');
  }

  async saveAddProduct(mode: 'draft' | 'publish'): Promise<void> {
    if (!this.addProductForm.name.trim()) {
      this.showAddProductMessage('Le nom du produit est obligatoire.');
      return;
    }
    if (!this.addProductForm.price || this.addProductForm.price <= 0) {
      this.showAddProductMessage('Le prix doit être supérieur à 0.');
      return;
    }
    if (!this.addProductForm.imagePreview || !this.addProductImageFile) {
      this.showAddProductMessage('Ajoutez au moins une photo du produit.');
      return;
    }
    if (!this.sellerMysqlContext) {
      this.showAddProductMessage('Connectez-vous en vendeur MySQL pour publier le produit.');
      return;
    }
    try {
      const created = await firstValueFrom(this.http.post<{ success: boolean; data?: { productId: number } }>(
        `${this.sellerApiBase}/products`,
        {
          name: this.addProductForm.name.trim(),
          description: this.addProductForm.description || '',
          price: this.addProductForm.price,
          stock: this.addProductForm.stock ?? 0,
          status: mode === 'publish' ? 'publie' : 'brouillon'
        }
      ));
      if (!created.success || !created.data?.productId) {
        this.showAddProductMessage('Impossible de créer le produit.');
        return;
      }
      const formData = new FormData();
      formData.append('image', this.addProductImageFile);
      const uploaded = await firstValueFrom(this.http.post<{ success: boolean }>(
        `${this.sellerApiBase}/products/${created.data.productId}/images`,
        formData
      ));
      if (!uploaded.success) {
        this.showAddProductMessage('Produit créé, mais échec upload image.');
        return;
      }
      this.loadDashboardDataFromApi();
      this.showAddProductMessage(mode === 'publish' ? 'Produit publié en base avec sa photo.' : 'Brouillon enregistré en base.');
      this.resetAddProductForm();
      this.activeNav = 'catalog';
    } catch {
      this.showAddProductMessage('Échec création produit. Vérifiez auth-service (port 3001).');
    }
  }

  private resetAddProductForm(): void {
    this.addProductForm = {
      name: '',
      brand: '',
      category: 'Électronique',
      description: '',
      price: null,
      stock: null,
      imagePreview: '',
      imageName: ''
    };
    this.addProductImageFile = null;
  }

  private showAddProductMessage(message: string): void {
    this.addProductFeedback = message;
    if (this.addProductFeedbackTimer) clearTimeout(this.addProductFeedbackTimer);
    this.addProductFeedbackTimer = setTimeout(() => (this.addProductFeedback = ''), 3500);
  }

  onBulkCsvSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    this.selectedCsvFile = file;
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      this.selectedCsvFile = null;
      this.showBulkUploadMessage('Format invalide: choisissez un fichier CSV.');
      return;
    }
    this.showBulkUploadMessage(`Fichier sélectionné: ${file.name}`);
  }

  async uploadBulkCsv(): Promise<void> {
    if (!this.selectedCsvFile) {
      this.showBulkUploadMessage('Sélectionnez un fichier CSV avant envoi.');
      return;
    }
    if (!this.sellerMysqlContext) {
      this.showBulkUploadMessage('Connexion vendeur MySQL requise.');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('file', this.selectedCsvFile);
      const res = await firstValueFrom(this.http.post<{ success: boolean; data?: BulkHistoryRow }>(
        `${this.sellerApiBase}/imports-catalogue`,
        formData
      ));
      if (!res.success || !res.data) {
        this.showBulkUploadMessage('Import échoué.');
        return;
      }
      this.bulkHistory.unshift({
        ...res.data,
        status: res.data.errors > 0 ? 'warning' : 'completed'
      });
      this.showBulkUploadMessage(`Import terminé: ${res.data.file} (${res.data.items} lignes).`);
      this.selectedCsvFile = null;
      this.loadDashboardDataFromApi();
    } catch {
      this.showBulkUploadMessage('Échec import CSV. Vérifiez auth-service.');
    }
  }

  private showBulkUploadMessage(message: string): void {
    this.bulkUploadFeedback = message;
    if (this.bulkUploadFeedbackTimer) clearTimeout(this.bulkUploadFeedbackTimer);
    this.bulkUploadFeedbackTimer = setTimeout(() => (this.bulkUploadFeedback = ''), 4000);
  }

  selectMarket(code: 'FR' | 'DE' | 'IT' | 'ES' | 'UK'): void {
    this.selectedMarket = code;
    this.showMarketMenu = false;
  }

  closeBanner(): void {
    this.showBanner = false;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  toggleMobileSidebar(): void {
    this.showMobileSidebar = !this.showMobileSidebar;
  }

  // =========== Helpers ===========
  getOrderStatusClass(status: Order['status']): string {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'shipped': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'delivered': return 'bg-green-100 text-green-700 border-green-200';
      case 'returned': return 'bg-red-100 text-red-700 border-red-200';
    }
  }

  getOrderStatusLabel(status: Order['status']): string {
    switch (status) {
      case 'pending': return 'À préparer';
      case 'shipped': return 'Expédiée';
      case 'delivered': return 'Livrée';
      case 'returned': return 'Retour';
    }
  }

  getProductStatusClass(status: ProductRow['status']): string {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'draft': return 'bg-gray-100 text-gray-700';
      case 'out-of-stock': return 'bg-red-100 text-red-700';
    }
  }

  getProductStatusLabel(status: ProductRow['status']): string {
    switch (status) {
      case 'active': return 'En ligne';
      case 'draft': return 'Brouillon';
      case 'out-of-stock': return 'Rupture';
    }
  }

  getHealthColor(status: HealthMetric['status']): string {
    switch (status) {
      case 'good': return 'text-green-700 bg-green-100';
      case 'warning': return 'text-amber-700 bg-amber-100';
      case 'critical': return 'text-red-700 bg-red-100';
    }
  }

  getHealthDot(status: HealthMetric['status']): string {
    switch (status) {
      case 'good': return 'bg-green-500';
      case 'warning': return 'bg-amber-500';
      case 'critical': return 'bg-red-500';
    }
  }

  getCasePriorityClass(p: Case['priority']): string {
    switch (p) {
      case 'urgent': return 'bg-red-600 text-white';
      case 'high': return 'bg-amber-500 text-white';
      case 'normal': return 'bg-gray-200 text-gray-700';
    }
  }

  getImpactLabel(impact: CoachTip['impact']): string {
    switch (impact) {
      case 'high': return 'Impact élevé';
      case 'medium': return 'Impact moyen';
      case 'low': return 'Impact faible';
    }
  }

  getImpactColor(impact: CoachTip['impact']): string {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-amber-100 text-amber-700';
      case 'low': return 'bg-gray-100 text-gray-700';
    }
  }

  buildSparkPath(points: number[]): string {
    if (!points.length) return '';
    const max = Math.max(...points);
    const min = Math.min(...points);
    const range = max - min || 1;
    const step = 100 / (points.length - 1);
    return points
      .map((p, i) => {
        const x = (i * step).toFixed(2);
        const y = (100 - ((p - min) / range) * 100).toFixed(2);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  }
}

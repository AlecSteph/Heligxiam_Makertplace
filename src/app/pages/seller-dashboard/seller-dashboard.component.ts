import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
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
  Menu
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
  name: string;
  image: string;
  price: number;
  stock: number;
  sales: number;
  rating: number;
  status: 'active' | 'draft' | 'out-of-stock';
  buyBox: number;
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
        { id: 'catalog', label: 'Produits', icon: this.Package, badge: 12 },
        { id: 'add-product', label: 'Ajouter un produit', icon: this.Plus, new: true },
        { id: 'brand-registry', label: 'Registre des marques', icon: this.ShieldCheck },
        { id: 'bulk-upload', label: 'Import en masse (CSV)', icon: this.Upload }
      ]
    },
    {
      label: 'Stock & Expédition',
      items: [
        { id: 'inventory', label: 'Gestion du stock', icon: this.Boxes },
        { id: 'fba-shipments', label: 'Expéditions Logistique HX', icon: this.Truck, badge: 2 },
        { id: 'returns', label: 'Retours & remboursements', icon: this.RefreshCw, badge: 1 }
      ]
    },
    {
      label: 'Prix',
      items: [
        { id: 'pricing', label: 'Tarification', icon: this.Tag },
        { id: 'auto-pricing', label: 'Retarification auto', icon: this.Activity, new: true },
        { id: 'promotions', label: 'Promotions & coupons', icon: this.Percent }
      ]
    },
    {
      label: 'Commandes',
      items: [
        { id: 'orders', label: 'Gérer les commandes', icon: this.ShoppingBag, badge: 7 },
        { id: 'unshipped', label: 'À expédier', icon: this.Package, badge: 4 },
        { id: 'messages', label: 'Messagerie acheteurs', icon: this.MessageSquare, badge: 3 }
      ]
    },
    {
      label: 'Publicité',
      items: [
        { id: 'campaigns', label: 'Campagnes', icon: this.Megaphone, hot: true },
        { id: 'sponsored-brands', label: 'Sponsored Brands', icon: this.Rocket },
        { id: 'deals', label: 'Ventes flash & Deals', icon: this.Flame }
      ]
    },
    {
      label: 'Croissance',
      items: [
        { id: 'coach', label: 'Growth Coach', icon: this.Lightbulb, new: true },
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
        { id: 'cases', label: 'Cas & réclamations', icon: this.Inbox, badge: 2 }
      ]
    },
    {
      label: 'Compte',
      items: [
        { id: 'payouts', label: 'Paiements & versements', icon: this.Wallet },
        { id: 'invoices', label: 'Factures & fiscalité', icon: this.Receipt },
        { id: 'settings', label: 'Paramètres boutique', icon: this.Settings }
      ]
    }
  ];

  // =========== Onboarding ===========
  onboardingSteps = [
    { id: 'docs', label: 'Téléverser vos documents (Kbis, RIB, CNI)', done: false },
    { id: 'profile', label: 'Compléter votre profil boutique', done: false },
    { id: 'products', label: 'Ajouter vos 5 premiers produits', done: false },
    { id: 'shipping', label: 'Configurer les frais de livraison', done: false },
    { id: 'payout', label: 'Valider votre compte bancaire', done: false }
  ];

  // =========== KPI Cards ===========
  readonly kpis: KpiCard[] = [
    { label: 'Ventes (30j)', value: '12 847,40 €', trend: 18.2, trendLabel: 'vs mois dernier', icon: this.DollarSign, color: 'from-emerald-500 to-green-600', sparkline: [42, 55, 48, 62, 58, 71, 86, 94] },
    { label: 'Commandes', value: '184', trend: 12.4, trendLabel: '7 à traiter', icon: this.ShoppingBag, color: 'from-indigo-500 to-blue-600', sparkline: [30, 35, 28, 40, 44, 52, 59, 68] },
    { label: 'Pages vues', value: '4 320', trend: -3.1, trendLabel: 'vs mois dernier', icon: this.Eye, color: 'from-fuchsia-500 to-pink-600', sparkline: [88, 72, 80, 68, 65, 70, 62, 58] },
    { label: 'Note boutique', value: '4,7 ★', trend: 0.2, trendLabel: '147 avis', icon: this.Star, color: 'from-amber-500 to-orange-600', sparkline: [45, 48, 50, 52, 55, 58, 60, 62] },
    { label: 'Taux de conversion', value: '4,26 %', trend: 0.8, trendLabel: 'vs mois dernier', icon: this.Target, color: 'from-teal-500 to-cyan-600', sparkline: [35, 38, 42, 40, 44, 47, 49, 52] },
    { label: 'Buy Box', value: '87 %', trend: 2.3, trendLabel: 'moyenne catalogue', icon: this.Award, color: 'from-purple-500 to-violet-600', sparkline: [70, 72, 75, 78, 80, 82, 85, 87] }
  ];

  // =========== Today vs Yesterday (Amazon style) ===========
  readonly todaySnapshot = {
    today: { sales: 1284.50, units: 27, orders: 18, pageViews: 420, sessions: 312 },
    yesterday: { sales: 1092.30, units: 22, orders: 15, pageViews: 398, sessions: 288 },
    lastWeek: { sales: 1456.80, units: 31, orders: 21, pageViews: 512, sessions: 380 }
  };

  // =========== Orders ===========
  readonly orders: Order[] = [
    { id: '#HX-84027', customer: 'Léa Bernard', product: 'Montre connectée Pulse X2', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=120&q=80', qty: 1, total: 189.00, status: 'pending', date: 'Il y a 12 min', sla: '23h57', priority: 'high' },
    { id: '#HX-84021', customer: 'Ahmed Zidane', product: 'Casque Audio Aurora', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=120&q=80', qty: 2, total: 318.00, status: 'pending', date: 'Il y a 48 min', sla: '22h18', priority: 'normal' },
    { id: '#HX-84018', customer: 'Sophie Durand', product: 'Clavier Mécanique RGB', image: 'https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=120&q=80', qty: 1, total: 129.90, status: 'shipped', date: 'Il y a 2h' },
    { id: '#HX-84014', customer: 'Tom Roussel', product: 'Enceinte Bluetooth Waveform', image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=120&q=80', qty: 1, total: 89.00, status: 'shipped', date: 'Il y a 4h' },
    { id: '#HX-84005', customer: 'Claire Martin', product: 'Chargeur Sans Fil Premium', image: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=120&q=80', qty: 3, total: 74.70, status: 'delivered', date: 'Hier, 14:32' },
    { id: '#HX-83996', customer: 'Karim Benzarti', product: 'Souris Ergonomique Pro', image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=120&q=80', qty: 1, total: 54.90, status: 'delivered', date: 'Hier, 09:18' },
    { id: '#HX-83987', customer: 'Julie Laurent', product: 'Webcam 4K StreamPro', image: 'https://images.unsplash.com/photo-1587304931437-36bb6bee8edb?w=120&q=80', qty: 1, total: 149.00, status: 'returned', date: 'Avant-hier' }
  ];

  // =========== Products ===========
  readonly topProducts: ProductRow[] = [
    { id: 'p1', name: 'Montre connectée Pulse X2', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=120&q=80', price: 189, stock: 48, sales: 142, rating: 4.8, status: 'active', buyBox: 94 },
    { id: 'p2', name: 'Casque Audio Aurora', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=120&q=80', price: 159, stock: 23, sales: 98, rating: 4.6, status: 'active', buyBox: 88 },
    { id: 'p3', name: 'Clavier Mécanique RGB', image: 'https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=120&q=80', price: 129.9, stock: 0, sales: 76, rating: 4.7, status: 'out-of-stock', buyBox: 0 },
    { id: 'p4', name: 'Enceinte Bluetooth Waveform', image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=120&q=80', price: 89, stock: 67, sales: 64, rating: 4.5, status: 'active', buyBox: 82 },
    { id: 'p5', name: 'Webcam 4K StreamPro', image: 'https://images.unsplash.com/photo-1587304931437-36bb6bee8edb?w=120&q=80', price: 149, stock: 12, sales: 0, rating: 0, status: 'draft', buyBox: 0 }
  ];

  // =========== Activity Feed ===========
  readonly activity: ActivityItem[] = [
    { icon: this.ShoppingBag, color: 'bg-emerald-100 text-emerald-700', title: 'Nouvelle commande #HX-84027 (189€) de Léa B.', time: 'Il y a 12 min' },
    { icon: this.Star, color: 'bg-amber-100 text-amber-700', title: 'Avis 5★ laissé sur Casque Aurora', time: 'Il y a 34 min' },
    { icon: this.MessageSquare, color: 'bg-indigo-100 text-indigo-700', title: 'Nouveau message de Tom R. sur "Enceinte Waveform"', time: 'Il y a 1h' },
    { icon: this.AlertCircle, color: 'bg-red-100 text-red-700', title: 'Stock épuisé : Clavier Mécanique RGB', time: 'Il y a 2h' },
    { icon: this.Wallet, color: 'bg-green-100 text-green-700', title: 'Versement bancaire effectué (1 248€)', time: 'Hier, 18:00' },
    { icon: this.Megaphone, color: 'bg-fuchsia-100 text-fuchsia-700', title: 'Campagne Sponsored Products : +42% d\'impressions', time: 'Hier, 10:22' }
  ];

  // =========== Chart ===========
  readonly chartData = [
    { day: 'Lun', value: 55, amount: 1240 },
    { day: 'Mar', value: 72, amount: 1580 },
    { day: 'Mer', value: 48, amount: 1020 },
    { day: 'Jeu', value: 86, amount: 2100 },
    { day: 'Ven', value: 94, amount: 2340 },
    { day: 'Sam', value: 78, amount: 1890 },
    { day: 'Dim', value: 62, amount: 1430 }
  ];

  // =========== Account Health ===========
  readonly healthMetrics: HealthMetric[] = [
    { key: 'odr', label: 'Taux de commandes défectueuses', value: '0,4 %', target: '< 1%', status: 'good' },
    { key: 'late', label: 'Taux d\'expédition en retard', value: '1,2 %', target: '< 4%', status: 'good' },
    { key: 'cancel', label: 'Taux d\'annulations avant exp.', value: '0,7 %', target: '< 2,5%', status: 'good' },
    { key: 'returns', label: 'Taux de retours valides', value: '3,1 %', target: '< 5%', status: 'warning' },
    { key: 'response', label: 'Temps de réponse message', value: '14 h', target: '< 24h', status: 'good' },
    { key: 'policy', label: 'Violations politique produit', value: '0', target: '0', status: 'good' }
  ];

  // =========== Cases ===========
  readonly cases: Case[] = [
    { id: 'CASE-9827', subject: 'Demande de remboursement partiel — #HX-83987', type: 'customer', priority: 'urgent', updated: 'Il y a 1h', status: 'open' },
    { id: 'CASE-9810', subject: 'Réclamation acheteur sur colis endommagé', type: 'shipping', priority: 'high', updated: 'Il y a 4h', status: 'pending' }
  ];

  // =========== Coach tips (Selling Coach) ===========
  readonly coachTips: CoachTip[] = [
    { id: 'c1', icon: this.Zap, title: 'Stock bientôt épuisé sur 2 produits best-sellers', text: 'Réapprovisionnez « Casque Aurora » (23 unités) et « Pulse X2 » (48 unités) pour éviter de perdre la Buy Box.', impact: 'high', ctaLabel: 'Créer un réapprovisionnement', color: 'from-red-500 to-pink-600' },
    { id: 'c2', icon: this.Target, title: 'Votre concurrence a baissé ses prix', text: 'Sur 3 produits, vos concurrents ont baissé leur prix de 4 à 8% la semaine dernière. Activez la retarification auto.', impact: 'high', ctaLabel: 'Activer la retarification', color: 'from-amber-500 to-orange-600' },
    { id: 'c3', icon: this.Rocket, title: '850€ de crédit Sponsored Products disponibles', text: 'Lancez votre 1ère campagne publicitaire et bénéficiez de visibilité sur les fiches concurrentes.', impact: 'medium', ctaLabel: 'Créer une campagne', color: 'from-indigo-500 to-purple-600' },
    { id: 'c4', icon: this.Globe, title: 'Développez-vous en Allemagne', text: 'Vos produits se vendent bien en France. Les clients allemands recherchent 3× plus votre catégorie.', impact: 'medium', ctaLabel: 'Étendre à Amazon.de', color: 'from-teal-500 to-cyan-600' }
  ];

  // =========== News ===========
  readonly news: NewsItem[] = [
    { id: 'n1', category: 'Nouveauté', title: 'Logistique HELIGXIAM lance les retours gratuits automatiques', excerpt: 'À partir du 1er mai, tous vos produits FBA seront automatiquement éligibles aux retours gratuits.', date: 'Il y a 2h', isNew: true },
    { id: 'n2', category: 'Important', title: 'Mise à jour des politiques de remboursement', excerpt: 'Les nouvelles règles s\'appliqueront à partir du 15 mai. Consultez les changements.', date: 'Hier' },
    { id: 'n3', category: 'Fiscalité', title: 'Préparez votre déclaration de TVA Q2 2026', excerpt: 'Téléchargez votre rapport de ventes consolidé depuis la section Factures & fiscalité.', date: 'Il y a 3 jours' },
    { id: 'n4', category: 'Formation', title: 'Webinaire gratuit : optimiser vos fiches produits', excerpt: 'Rejoignez notre session live le jeudi 23 avril à 14h avec un expert Seller Central.', date: 'Il y a 5 jours' }
  ];

  // =========== Notifications ===========
  readonly notifications = [
    { id: 'nt1', icon: this.ShoppingBag, title: 'Nouvelle commande urgente', text: '#HX-84027 • Expédition sous 23h57', time: '12 min', type: 'order' },
    { id: 'nt2', icon: this.AlertCircle, title: 'Stock épuisé', text: 'Clavier Mécanique RGB', time: '2h', type: 'alert' },
    { id: 'nt3', icon: this.MessageSquare, title: 'Message acheteur', text: 'Tom R. demande le délai de livraison', time: '1h', type: 'message' },
    { id: 'nt4', icon: this.Wallet, title: 'Versement effectué', text: '1 248€ reçus sur votre compte', time: '1j', type: 'payout' }
  ];

  // =========== Inventory health ===========
  readonly inventoryBreakdown = [
    { label: 'Produits actifs', value: 10, percent: 55, color: 'bg-emerald-500' },
    { label: 'Stock faible (<10)', value: 3, percent: 17, color: 'bg-amber-500' },
    { label: 'Ruptures', value: 2, percent: 11, color: 'bg-red-500' },
    { label: 'Brouillons', value: 3, percent: 17, color: 'bg-gray-400' }
  ];

  // =========== Payouts ===========
  readonly payoutSummary = {
    available: 2487.50,
    pending: 1248.30,
    lastPayout: 1248.00,
    nextPayoutDate: 'Vendredi 24 avr.',
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
    'payouts':          { title: 'Paiements & versements',  subtitle: 'Historique, disponible, en attente' },
    'invoices':         { title: 'Factures & fiscalité',    subtitle: 'Documents comptables et TVA' },
    'settings':         { title: 'Paramètres boutique',     subtitle: 'Informations, logo, politiques, collaborateurs' }
  };

  // =========== Shipments (FBA-like) ===========
  readonly shipments = [
    { id: 'FBA-2204-001', items: 340, destination: 'Centre HX Lyon (LY-01)', status: 'in-transit', expected: '22 avr. 2026', units: 340 },
    { id: 'FBA-2204-002', items: 128, destination: 'Centre HX Paris (PA-03)', status: 'received', expected: '19 avr. 2026', units: 128 },
    { id: 'FBA-2204-003', items: 76,  destination: 'Centre HX Lille (LI-02)', status: 'pending',   expected: '28 avr. 2026', units: 76 }
  ];

  // =========== Returns ===========
  readonly returnsList = [
    { id: 'RET-7712', order: '#HX-83987', product: 'Webcam 4K StreamPro', reason: 'Ne correspond pas à la description', status: 'awaiting', refund: 149.00, created: 'Il y a 2j' },
    { id: 'RET-7703', order: '#HX-83950', product: 'Casque Audio Aurora', reason: 'Défectueux',                        status: 'refunded', refund: 159.00, created: 'Il y a 5j' },
    { id: 'RET-7688', order: '#HX-83912', product: 'Clavier Mécanique RGB', reason: 'Changement d\'avis',              status: 'transit',  refund: 129.90, created: 'Il y a 6j' }
  ];

  // =========== Messages acheteurs ===========
  readonly buyerMessages = [
    { id: 'msg-01', buyer: 'Tom Roussel',    subject: 'Délai de livraison',           preview: 'Bonjour, je voulais savoir si la commande #HX-84014 peut arriver avant samedi…', time: '12 min', unread: true,  sla: '23h48' },
    { id: 'msg-02', buyer: 'Claire Martin',  subject: 'Produit compatible ?',          preview: 'Est-ce que le chargeur est compatible iPhone 15 Pro Max ?',                       time: '1h',     unread: true,  sla: '22h58' },
    { id: 'msg-03', buyer: 'Karim Benzarti', subject: 'Facture',                       preview: 'Pourriez-vous m\'envoyer la facture au format PDF s\'il vous plaît ?',             time: '3h',     unread: true,  sla: '20h45' },
    { id: 'msg-04', buyer: 'Léa Bernard',    subject: 'Merci !',                        preview: 'Livraison rapide, emballage nickel. Merci !',                                     time: '1j',     unread: false, sla: '—' }
  ];

  // =========== Ad Campaigns ===========
  readonly adCampaigns = [
    { id: 'c-sp-01',  name: 'Auto — Catalogue général',       type: 'Sponsored Products', status: 'active',   budget: 25,  spent: 18.42, impressions: 12450, clicks: 246, acos: 18.4, sales: 412.30 },
    { id: 'c-sp-02',  name: 'Manuel — Casques audio',         type: 'Sponsored Products', status: 'active',   budget: 40,  spent: 32.18, impressions: 24120, clicks: 512, acos: 14.7, sales: 918.70 },
    { id: 'c-sb-01',  name: 'Bannière — Accessoires tech',    type: 'Sponsored Brands',   status: 'active',   budget: 60,  spent: 48.90, impressions: 54800, clicks: 980, acos: 22.1, sales: 1240.00 },
    { id: 'c-sp-03',  name: 'Défensif — Marque',              type: 'Sponsored Products', status: 'paused',   budget: 15,  spent:  0.00, impressions:     0, clicks:   0, acos: 0.0,  sales:    0.00 },
    { id: 'c-sd-01',  name: 'Display — Retargeting',          type: 'Sponsored Display',  status: 'active',   budget: 30,  spent: 21.75, impressions: 18900, clicks: 210, acos: 19.8, sales: 487.60 }
  ];

  // =========== Sponsored Brands (creatives) ===========
  readonly sbCreatives = [
    { id: 'sb-1', headline: 'Découvrez la collection Aurora',      format: 'Bannière catalogue', status: 'live',     ctr: 2.8, acos: 21.3, reach: '54 800' },
    { id: 'sb-2', headline: 'Travaillez en Pro avec Pulse X2',     format: 'Vidéo 15s',          status: 'in-review', ctr: 0.0, acos: 0.0,  reach: '—' },
    { id: 'sb-3', headline: 'Offrez un son haut de gamme',         format: 'Spotlight produit',  status: 'live',     ctr: 3.4, acos: 17.8, reach: '28 340' }
  ];

  // =========== Flash deals (côté vendeur) ===========
  readonly sellerDeals = [
    { id: 'd1', product: 'Montre connectée Pulse X2', discount: 25, startsIn: '12h14', units: 120, sold: 47, status: 'scheduled', fee: 200 },
    { id: 'd2', product: 'Casque Audio Aurora',       discount: 30, startsIn: 'En cours', units: 80, sold: 64, status: 'live',     fee: 150 },
    { id: 'd3', product: 'Enceinte Bluetooth Waveform', discount: 20, startsIn: 'Dans 3j', units: 150, sold: 0, status: 'draft',   fee: 120 }
  ];

  // =========== HELIGXIAM Programs ===========
  readonly programs = [
    { id: 'vine',    name: 'Programme Vine',               desc: 'Obtenez des avis authentiques auprès de clients vérifiés.',        badge: 'Boostez vos avis',            eligible: true,  enrolled: false, icon: this.Star },
    { id: 'brand',   name: 'Marque enregistrée (Brand)',   desc: 'Protégez votre marque et débloquez le contenu A+.',                badge: 'Protection',                  eligible: true,  enrolled: true,  icon: this.ShieldCheck },
    { id: 'aplus',   name: 'Contenu A+',                   desc: 'Enrichissez vos fiches avec des visuels premium (+20% conv.).',    badge: '+20% de conversion',          eligible: true,  enrolled: true,  icon: this.Sparkles },
    { id: 'climate', name: 'Climate Pledge Friendly',      desc: 'Affichez un label écologique vérifié sur vos fiches.',             badge: 'Éco-responsable',             eligible: true,  enrolled: false, icon: this.Award },
    { id: 'subs',    name: 'Abonnez et économisez',        desc: 'Fidélisez avec des abonnements récurrents (-5% à -15%).',          badge: 'Fidélisation',                eligible: true,  enrolled: false, icon: this.RefreshCw },
    { id: 'hxprime', name: 'HELIGXIAM Prime',              desc: 'Accédez aux clients Prime — livraison 1j et badge Prime.',         badge: 'Clients premium',             eligible: true,  enrolled: true,  icon: this.Rocket }
  ];

  // =========== Marchés internationaux ===========
  readonly internationalMarkets = [
    { code: 'DE', label: 'Allemagne',      flag: '🇩🇪', status: 'active',   sales: 3420,  growth: 24 },
    { code: 'IT', label: 'Italie',         flag: '🇮🇹', status: 'active',   sales: 1820,  growth: 18 },
    { code: 'ES', label: 'Espagne',        flag: '🇪🇸', status: 'eligible', sales: 0,     growth: 0 },
    { code: 'UK', label: 'Royaume-Uni',    flag: '🇬🇧', status: 'eligible', sales: 0,     growth: 0 },
    { code: 'NL', label: 'Pays-Bas',       flag: '🇳🇱', status: 'coming',   sales: 0,     growth: 0 }
  ];

  // =========== Termes de recherche ===========
  readonly searchTerms = [
    { term: 'casque bluetooth sans fil',    impressions: 12450, clicks: 384, conv: 6.8, sales: 1248.50 },
    { term: 'montre connectée sport',        impressions: 9820,  clicks: 260, conv: 5.4, sales: 892.00 },
    { term: 'clavier mécanique rgb silencieux', impressions: 7430, clicks: 198, conv: 4.1, sales: 512.30 },
    { term: 'webcam 4k télétravail',         impressions: 5120,  clicks: 142, conv: 3.2, sales: 298.40 },
    { term: 'chargeur sans fil rapide',      impressions: 4380,  clicks: 120, conv: 2.8, sales: 212.00 }
  ];

  // =========== Évaluations & avis ===========
  readonly sellerFeedback = [
    { id: 'f1', rating: 5, author: 'Pauline R.',   comment: 'Livraison ultra rapide, produit conforme, emballage soigné.',        date: 'Il y a 3j',  product: 'Casque Audio Aurora' },
    { id: 'f2', rating: 5, author: 'Mathieu D.',   comment: 'Excellent vendeur, très réactif sur les messages.',                   date: 'Il y a 5j',  product: 'Montre Pulse X2' },
    { id: 'f3', rating: 4, author: 'Julie L.',     comment: 'Bon produit mais légèrement en retard (2 jours).',                    date: 'Il y a 6j',  product: 'Enceinte Waveform' },
    { id: 'f4', rating: 2, author: 'Karim B.',     comment: 'Produit ok mais le colis est arrivé abîmé.',                         date: 'Il y a 10j', product: 'Clavier RGB' }
  ];

  readonly feedbackDistribution = [
    { stars: 5, percent: 78, count: 115 },
    { stars: 4, percent: 14, count: 21 },
    { stars: 3, percent:  5, count:  7 },
    { stars: 2, percent:  2, count:  3 },
    { stars: 1, percent:  1, count:  1 }
  ];

  // =========== Payouts history ===========
  readonly payoutsHistory = [
    { id: 'pay-2604', date: '12 avr. 2026', amount: 1248.00, status: 'paid',     method: 'Virement SEPA', ref: 'SEPA-202604' },
    { id: 'pay-2603', date: '05 avr. 2026', amount: 1894.20, status: 'paid',     method: 'Virement SEPA', ref: 'SEPA-202603' },
    { id: 'pay-2602', date: '29 mars 2026', amount: 2140.50, status: 'paid',     method: 'Virement SEPA', ref: 'SEPA-202602' },
    { id: 'pay-next', date: '19 avr. 2026', amount: 2487.50, status: 'pending',  method: 'Virement SEPA', ref: '—' }
  ];

  // =========== Factures ===========
  readonly invoices = [
    { id: 'INV-2026-0048', type: 'Commission HX',      period: 'Mars 2026', amount: 342.80, status: 'paid',    download: true },
    { id: 'INV-2026-0047', type: 'Logistique HX',      period: 'Mars 2026', amount: 128.40, status: 'paid',    download: true },
    { id: 'INV-2026-0046', type: 'Publicité',          period: 'Mars 2026', amount: 221.25, status: 'paid',    download: true },
    { id: 'INV-2026-0049', type: 'Commission HX',      period: 'Avril 2026', amount: 189.50, status: 'pending', download: false }
  ];

  // =========== Paramètres boutique ===========
  storeSettings = {
    name: 'Ma boutique HELIGXIAM',
    displayName: 'HXstore',
    language: 'fr',
    currency: 'EUR',
    vat: 'FR12345678901',
    siret: '12345678900012',
    email: 'vendeur@heligxiam.fr',
    phone: '+33 1 23 45 67 89',
    autoAcceptReturns: true,
    lowStockAlerts: true,
    weeklyReport: true,
    smsNotifications: false
  };

  // =========== Bulk upload templates ===========
  readonly csvTemplates = [
    { id: 'cat-elec', label: 'Électronique', cols: 42, samples: 5, updated: '10 avr. 2026' },
    { id: 'cat-mode', label: 'Mode & Accessoires', cols: 38, samples: 5, updated: '10 avr. 2026' },
    { id: 'cat-maison', label: 'Maison & Déco', cols: 36, samples: 5, updated: '10 avr. 2026' },
    { id: 'cat-beaute', label: 'Beauté & Santé', cols: 34, samples: 5, updated: '10 avr. 2026' }
  ];

  readonly bulkHistory = [
    { id: 'u-0812', file: 'catalogue_avril.csv',     items: 142, success: 140, errors: 2,  date: 'Il y a 2h',  status: 'completed' },
    { id: 'u-0811', file: 'prix_mai_2026.csv',        items: 78,  success: 78,  errors: 0,  date: 'Hier',       status: 'completed' },
    { id: 'u-0810', file: 'stock_hebdo.csv',          items: 310, success: 287, errors: 23, date: 'Il y a 3j',  status: 'warning' }
  ];

  // =========== Coupons (promotions page) ===========
  readonly sellerCoupons = [
    { id: 'cp-01', code: 'PRINTEMPS25',  discount: '25%',  scope: 'Catégorie : Audio',      used: 184, max: 500, expires: '30 avr. 2026', status: 'active' },
    { id: 'cp-02', code: 'NEW10',        discount: '10€',  scope: 'Nouveaux clients',       used: 47,  max: 200, expires: '31 mai 2026',  status: 'active' },
    { id: 'cp-03', code: 'FLASH50',      discount: '50%',  scope: '3 produits ciblés',      used: 0,   max: 100, expires: '22 avr. 2026', status: 'scheduled' },
    { id: 'cp-04', code: 'WELCOME5',     discount: '5€',   scope: 'Toute la boutique',      used: 820, max: 820, expires: '15 avr. 2026', status: 'expired' }
  ];

  // =========== Règles de retarification ===========
  readonly pricingRules = [
    { id: 'r1', name: 'Suivre la Buy Box à -1c',   scope: '12 produits',  minMargin: 15, active: true,  last: 'Il y a 12 min' },
    { id: 'r2', name: 'Plancher prix coûtant +10%', scope: '5 produits',   minMargin: 10, active: true,  last: 'Il y a 1h' },
    { id: 'r3', name: 'Match concurrent meilleure note', scope: '3 produits', minMargin: 20, active: false, last: 'Désactivée' }
  ];

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
      case 'scheduled': return 'bg-blue-100 text-blue-700';
      case 'expired':   return 'bg-slate-100 text-slate-500';
      default:          return 'bg-slate-100 text-slate-700';
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
  toggleCampaignStatus(c: any): void {
    c.status = c.status === 'active' ? 'paused' : 'active';
  }

  togglePricingRule(r: any): void {
    r.active = !r.active;
  }

  toggleProgramEnrollment(p: any): void {
    if (p.eligible) p.enrolled = !p.enrolled;
  }

  markAllMessagesRead(): void {
    this.buyerMessages.forEach(m => m.unread = false);
  }

  getOrderTotalPending(): number {
    return this.orders.filter(o => o.status === 'pending').reduce((s, o) => s + o.total, 0);
  }

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.sub.add(
      this.authService.authState$.subscribe(state => {
        this.currentUser = state.user;
      })
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
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

  get onboardingProgress(): number {
    const done = this.onboardingSteps.filter(s => s.done).length;
    return Math.round((done / this.onboardingSteps.length) * 100);
  }

  get currentMarket() {
    return this.markets.find(m => m.code === this.selectedMarket) ?? this.markets[0];
  }

  get notificationsCount(): number {
    return this.notifications.length;
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

  // =========== Actions ===========
  toggleOnboardingStep(id: string): void {
    this.onboardingSteps = this.onboardingSteps.map(s =>
      s.id === id ? { ...s, done: !s.done } : s
    );
  }

  setActiveNav(id: string): void {
    this.activeNav = id;
    this.showMobileSidebar = false;
  }

  toggleSection(label: string): void {
    this.navSections = this.navSections.map(sec =>
      sec.label === label ? { ...sec, collapsed: !sec.collapsed } : sec
    );
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

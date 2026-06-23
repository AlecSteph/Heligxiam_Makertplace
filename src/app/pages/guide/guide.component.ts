import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  LucideAngularModule,
  Truck,
  RotateCcw,
  ShieldCheck,
  CreditCard,
  Package,
  MapPin,
  PhoneCall,
  Gift,
  Smartphone,
  Headphones,
  Tablet,
  Tv,
  BookOpen,
  Home,
  Bike,
  Shirt,
  Gamepad2,
  Sparkles,
  Percent,
  Zap,
  Tag,
  Heart,
  Star,
  Clock,
  CheckCircle2,
  ChevronRight,
  Users,
  Search,
  Store,
  Award,
  Wallet,
  MessageSquare,
  Download,
  Apple,
  Globe,
  Leaf,
  RefreshCw,
  Mail
} from 'lucide-angular';

interface GuideStep {
  num: number;
  title: string;
  description: string;
  icon: any;
  color: string;
}

interface CategoryCard {
  label: string;
  image: string;
  link: string;
  icon: any;
  accent: string;
}

interface ShippingOption {
  title: string;
  subtitle: string;
  icon: any;
  price: string;
  eta: string;
  highlighted?: boolean;
}

interface Device {
  name: string;
  subtitle: string;
  image: string;
  price: string;
  badge?: string;
}

interface BenefitCard {
  icon: any;
  title: string;
  text: string;
  color: string;
}

interface ServiceLink {
  label: string;
  icon: any;
  description: string;
  link?: string;
}

interface FaqItem {
  q: string;
  a: string;
  open?: boolean;
}

@Component({
  selector: 'app-guide',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './guide.component.html',
  styleUrls: ['./guide.component.css']
})
export class GuideComponent {
  // ==== Icons ====
  readonly Truck = Truck;
  readonly RotateCcw = RotateCcw;
  readonly ShieldCheck = ShieldCheck;
  readonly CreditCard = CreditCard;
  readonly Package = Package;
  readonly MapPin = MapPin;
  readonly PhoneCall = PhoneCall;
  readonly Gift = Gift;
  readonly Smartphone = Smartphone;
  readonly Headphones = Headphones;
  readonly Tablet = Tablet;
  readonly Tv = Tv;
  readonly BookOpen = BookOpen;
  readonly Home = Home;
  readonly Bike = Bike;
  readonly Shirt = Shirt;
  readonly Gamepad2 = Gamepad2;
  readonly Sparkles = Sparkles;
  readonly Percent = Percent;
  readonly Zap = Zap;
  readonly Tag = Tag;
  readonly Heart = Heart;
  readonly Star = Star;
  readonly Clock = Clock;
  readonly CheckCircle2 = CheckCircle2;
  readonly ChevronRight = ChevronRight;
  readonly Users = Users;
  readonly Search = Search;
  readonly Store = Store;
  readonly Award = Award;
  readonly Wallet = Wallet;
  readonly MessageSquare = MessageSquare;
  readonly Download = Download;
  readonly Apple = Apple;
  readonly Globe = Globe;
  readonly Leaf = Leaf;
  readonly RefreshCw = RefreshCw;
  readonly Mail = Mail;

  promoCode = 'BIENVENUE10';
  copiedCode = false;

  // ==== Data ====
  readonly heroBullets = [
    'Livraison gratuite dès 25€ d\'achats',
    'Retours faciles sous 60 jours',
    'Garantie A→Z sur tous les produits',
    'Paiement en plusieurs fois sans frais'
  ];

  readonly quickLinks: ServiceLink[] = [
    { label: 'Points de retrait HELIGXIAM Hub', icon: this.MapPin, description: 'Retirez vos colis en sécurité 7j/7', link: '/guide#retrait' },
    { label: 'Ventes Flash', icon: this.Zap, description: 'Des offres limitées dans le temps', link: '/search?promo=flash' },
    { label: 'Outlet', icon: this.Tag, description: 'Jusqu\'à -70% toute l\'année', link: '/search?promo=outlet' },
    { label: 'Coupons', icon: this.Percent, description: 'Activez vos coupons en 1 clic', link: '/guide#coupons' },
    { label: 'Meilleures ventes', icon: this.Star, description: 'Ce que les acheteurs adorent', link: '/search?sort=rating' },
    { label: 'HELIGXIAM Seconde main', icon: this.RefreshCw, description: 'Reconditionné, garanti 1 an', link: '/guide#seconde-main' },
    { label: 'Nos idées cadeaux', icon: this.Gift, description: 'Sélections pour toute occasion', link: '/guide#cadeaux' },
    { label: 'Services HELIGXIAM', icon: this.Sparkles, description: 'Installation, livraison premium…', link: '/guide#services' }
  ];

  readonly heroSteps: GuideStep[] = [
    { num: 1, title: 'Créez votre compte', description: 'Gratuit, en 2 minutes. Renseignez votre numéro de téléphone pour sécuriser vos commandes.', icon: this.Users, color: 'from-indigo-500 to-purple-600' },
    { num: 2, title: 'Explorez le catalogue', description: 'Plus de 2 millions de produits premium sélectionnés auprès de 8 000 vendeurs vérifiés.', icon: this.Search, color: 'from-fuchsia-500 to-pink-600' },
    { num: 3, title: 'Commandez en confiance', description: 'Paiement sécurisé, livraison rapide, et Garantie A→Z si quoi que ce soit ne va pas.', icon: this.ShieldCheck, color: 'from-emerald-500 to-green-600' },
    { num: 4, title: 'Suivez & profitez', description: 'Suivi en temps réel de vos colis, notifications et retours sous 60 jours.', icon: this.Package, color: 'from-amber-500 to-orange-600' }
  ];

  readonly shippingOptions: ShippingOption[] = [
    { title: 'Standard', subtitle: 'Dès 25€ d\'achats', icon: this.Truck, price: 'Gratuite', eta: '3 à 5 jours ouvrés', highlighted: false },
    { title: 'Express 48h', subtitle: 'Livré où vous voulez', icon: this.Zap, price: '4,99€', eta: 'Sous 2 jours', highlighted: false },
    { title: 'Premium (abonnés)', subtitle: 'Livraison gratuite illimitée', icon: this.Sparkles, price: 'Illimité', eta: 'Jour suivant', highlighted: true },
    { title: 'Point relais HELIGXIAM Hub', subtitle: 'Dans plus de 12 000 points', icon: this.MapPin, price: 'Gratuite', eta: '2 à 4 jours' }
  ];

  readonly categoryCards: CategoryCard[] = [
    { label: 'Livres & Ebooks', image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&q=80', link: '/search?q=livre', icon: this.BookOpen, accent: 'from-amber-400 to-orange-500' },
    { label: 'Maison & Cuisine', image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80', link: '/category/maison', icon: this.Home, accent: 'from-teal-400 to-cyan-500' },
    { label: 'Sports & Loisirs', image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&q=80', link: '/category/sport', icon: this.Bike, accent: 'from-lime-400 to-green-500' },
    { label: 'Mode & Accessoires', image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=600&q=80', link: '/category/mode', icon: this.Shirt, accent: 'from-pink-400 to-rose-500' },
    { label: 'Jeux & Jouets', image: 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=600&q=80', link: '/search?q=jouet', icon: this.Gamepad2, accent: 'from-violet-400 to-purple-500' },
    { label: 'Santé & Beauté', image: 'https://images.unsplash.com/photo-1522335789203-aaaa03a4c6d6?w=600&q=80', link: '/category/beaute', icon: this.Heart, accent: 'from-fuchsia-400 to-pink-500' }
  ];

  readonly confidenceItems: BenefitCard[] = [
    { icon: this.ShieldCheck, title: 'Garantie A→Z', text: 'Remboursement intégral si le produit ne correspond pas à la description ou n\'est pas livré.', color: 'from-emerald-500 to-green-600' },
    { icon: this.Truck, title: 'Choisissez votre livraison', text: 'Standard, Express, Premium ou point relais — vous décidez à chaque commande.', color: 'from-indigo-500 to-blue-600' },
    { icon: this.RotateCcw, title: 'Retours faciles 60 jours', text: 'Changez d\'avis sans justification. Bordereau prépayé en 1 clic depuis votre compte.', color: 'from-amber-500 to-orange-600' },
    { icon: this.CreditCard, title: 'Paiement 100% sécurisé', text: 'CB, Apple Pay, PayPal, paiement en 3× ou 4× sans frais. Chiffrement bancaire.', color: 'from-fuchsia-500 to-pink-600' },
    { icon: this.MessageSquare, title: 'Support 7j/7 en français', text: 'Nos conseillers vous répondent en moins de 2 minutes par chat ou téléphone.', color: 'from-cyan-500 to-teal-600' },
    { icon: this.Users, title: 'Gérez facilement votre compte', text: 'Adresses, cartes, commandes, retours, abonnements : tout dans un seul espace.', color: 'from-purple-500 to-violet-600' }
  ];

  readonly devices: Device[] = [
    { name: 'Helix Echo', subtitle: 'Enceinte connectée vocale', image: 'https://images.unsplash.com/photo-1589003077984-894e133dabab?w=600&q=80', price: '89,99€', badge: 'Best-seller' },
    { name: 'Helix Reader', subtitle: 'Liseuse 7" anti-reflets', image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&q=80', price: '129€', badge: 'Nouveau' },
    { name: 'Helix Tab', subtitle: 'Tablette 10" 64 Go', image: 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=600&q=80', price: '199€' },
    { name: 'Helix TV Stick', subtitle: 'Streaming 4K HDR', image: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=600&q=80', price: '49,99€', badge: 'Promo' }
  ];

  readonly premiumBenefits = [
    { icon: this.Truck, label: 'Livraison gratuite illimitée' },
    { icon: this.Tv, label: 'Films & séries en streaming' },
    { icon: this.Headphones, label: '2M titres en musique' },
    { icon: this.BookOpen, label: '1 ebook offert par mois' },
    { icon: this.Gamepad2, label: 'Jeux gratuits tous les mois' },
    { icon: this.Award, label: 'Offres exclusives Premium' }
  ];

  readonly faq: FaqItem[] = [
    { q: 'Combien coûte la livraison ?', a: 'La livraison standard est gratuite dès 25€ d\'achats sur les produits expédiés par HELIGXIAM. Pour les commandes inférieures, elle est de 3,99€. Avec Premium, toutes les livraisons sont gratuites sans minimum.' },
    { q: 'Comment renvoyer un produit ?', a: 'Vous avez 60 jours pour changer d\'avis. Rendez-vous dans Mon compte → Commandes, sélectionnez le produit, choisissez le motif de retour et imprimez le bordereau prépayé. Remboursement sous 5 jours ouvrés.' },
    { q: 'Qu\'est-ce que la Garantie A→Z ?', a: 'La Garantie A→Z vous protège si un produit acheté auprès d\'un vendeur tiers n\'est pas livré ou ne correspond pas à la description. HELIGXIAM vous rembourse intégralement.' },
    { q: 'Puis-je payer en plusieurs fois ?', a: 'Oui, sur toutes les commandes supérieures à 100€, vous pouvez choisir le paiement en 3× ou 4× sans frais par carte bancaire au moment du checkout.' },
    { q: 'Comment contacter le service client ?', a: 'Chat en direct 7j/7 de 8h à minuit, téléphone au 01 70 77 11 22, ou email à support@heligxiam.fr. Temps de réponse moyen : 2 minutes.' },
    { q: 'Où sont mes points fidélité ?', a: 'Vos points HELIGXIAM Rewards apparaissent dans Mon compte → Fidélité. Chaque euro dépensé vous rapporte 1 point. 100 points = 1€ de réduction.' }
  ];

  copyPromo(): void {
    navigator.clipboard?.writeText(this.promoCode).then(() => {
      this.copiedCode = true;
      setTimeout(() => (this.copiedCode = false), 2500);
    }).catch(() => {
      this.copiedCode = true;
      setTimeout(() => (this.copiedCode = false), 2500);
    });
  }

  toggleFaq(i: number): void {
    this.faq[i].open = !this.faq[i].open;
  }
}

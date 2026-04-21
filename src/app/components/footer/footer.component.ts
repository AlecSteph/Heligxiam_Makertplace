import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Linkedin,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Truck,
  ShieldCheck,
  Headphones,
  Leaf,
  ArrowUp,
  Send
} from 'lucide-angular';

interface FooterLink {
  label: string;
  route?: string;
  url?: string;
  queryParams?: any;
  fragment?: string;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent {
  readonly currentYear = new Date().getFullYear();
  newsletterEmail = '';
  newsletterSubmitted = false;

  readonly Facebook = Facebook;
  readonly Instagram = Instagram;
  readonly Twitter = Twitter;
  readonly Youtube = Youtube;
  readonly Linkedin = Linkedin;
  readonly Mail = Mail;
  readonly Phone = Phone;
  readonly MapPin = MapPin;
  readonly CreditCard = CreditCard;
  readonly Truck = Truck;
  readonly ShieldCheck = ShieldCheck;
  readonly Headphones = Headphones;
  readonly Leaf = Leaf;
  readonly ArrowUp = ArrowUp;
  readonly Send = Send;

  readonly trustBadges = [
    { icon: 'Truck', title: 'Livraison express', subtitle: 'Gratuite dès 99€' },
    { icon: 'ShieldCheck', title: 'Paiement sécurisé', subtitle: 'SSL 256-bit' },
    { icon: 'Headphones', title: 'Support 24/7', subtitle: 'Par chat & téléphone' },
    { icon: 'Leaf', title: 'Éco-responsable', subtitle: 'Emballages recyclés' }
  ];

  readonly columns: FooterColumn[] = [
    {
      title: 'HELIGXIAM',
      links: [
        { label: 'À propos', route: '/about' },
        { label: 'Notre histoire', route: '/about' },
        { label: 'Carrières', route: '/careers' },
        { label: 'Presse', route: '/press' },
        { label: 'Blog', route: '/blog' },
        { label: 'Développement durable', route: '/sustainability' }
      ]
    },
    {
      title: 'Service Client',
      links: [
        { label: 'Centre d\'aide', route: '/help' },
        { label: 'Nous contacter', route: '/contact' },
        { label: 'Suivre ma commande', route: '/orders' },
        { label: 'Livraison', route: '/shipping' },
        { label: 'Retours & Remboursements', route: '/returns' },
        { label: 'FAQ', route: '/faq' }
      ]
    },
    {
      title: 'Mon Compte',
      links: [
        { label: 'Se connecter', route: '/account' },
        { label: 'Créer un compte', route: '/account' },
        { label: 'Mon profil', route: '/profile' },
        { label: 'Mes commandes', route: '/orders' },
        { label: 'Ma liste de souhaits', route: '/wishlist' },
        { label: 'Cartes cadeaux', route: '/gift-cards' }
      ]
    },
    {
      title: 'Catégories',
      links: [
        { label: 'High-Tech', route: '/search', queryParams: { category: 'high-tech' } },
        { label: 'Mode', route: '/search', queryParams: { category: 'mode' } },
        { label: 'Maison', route: '/search', queryParams: { category: 'maison' } },
        { label: 'Beauté', route: '/search', queryParams: { category: 'beaute' } },
        { label: 'Sport & Loisirs', route: '/search', queryParams: { category: 'sport' } },
        { label: 'Promotions', route: '/search', queryParams: { promo: 'true' } }
      ]
    },
    {
      title: 'Pro & Vendeurs',
      links: [
        { label: 'Vendre sur Heligxiam', route: '/sell' },
        { label: 'Espace professionnel', route: '/business' },
        { label: 'Programme d\'affiliation', route: '/affiliate' },
        { label: 'API Développeurs', route: '/api-docs' },
        { label: 'Heligxiam Ads', route: '/advertising' },
        { label: 'Partenariats', route: '/partners' }
      ]
    }
  ];

  readonly paymentMethods = [
    'Visa', 'Mastercard', 'Amex', 'PayPal', 'Apple Pay', 'Google Pay', 'Klarna'
  ];

  readonly legalLinks: FooterLink[] = [
    { label: 'Conditions générales', route: '/legal', fragment: 'terms' },
    { label: 'Politique de confidentialité', route: '/legal', fragment: 'privacy' },
    { label: 'Cookies', route: '/legal', fragment: 'cookies' },
    { label: 'Mentions légales', route: '/legal', fragment: 'legal' },
    { label: 'Accessibilité', route: '/guide', fragment: 'aide' },
    { label: 'Plan du site', route: '/guide' }
  ];

  readonly socialLinks = [
    { name: 'Facebook', url: 'https://facebook.com', icon: 'Facebook' },
    { name: 'Instagram', url: 'https://instagram.com', icon: 'Instagram' },
    { name: 'Twitter', url: 'https://twitter.com', icon: 'Twitter' },
    { name: 'YouTube', url: 'https://youtube.com', icon: 'Youtube' },
    { name: 'LinkedIn', url: 'https://linkedin.com', icon: 'Linkedin' }
  ];

  getIcon(name: string): any {
    const map: Record<string, any> = {
      Truck: this.Truck,
      ShieldCheck: this.ShieldCheck,
      Headphones: this.Headphones,
      Leaf: this.Leaf,
      Facebook: this.Facebook,
      Instagram: this.Instagram,
      Twitter: this.Twitter,
      Youtube: this.Youtube,
      Linkedin: this.Linkedin
    };
    return map[name];
  }

  submitNewsletter(): void {
    if (!this.newsletterEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.newsletterEmail)) {
      return;
    }
    this.newsletterSubmitted = true;
    this.newsletterEmail = '';
    setTimeout(() => (this.newsletterSubmitted = false), 4000);
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

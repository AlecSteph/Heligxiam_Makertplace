import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import {
  LucideAngularModule,
  Ticket, Percent, Wallet, Zap, Tag, Gift, Copy, CheckCircle2, Clock,
  ChevronRight, Sparkles, ArrowRight, Flame, TrendingUp, ShieldCheck, Info,
  BadgePercent, Bell, Timer, Store
} from 'lucide-angular';

type OffersSection = 'coupons' | 'bons' | 'cashback' | 'flash';

interface NavEntry {
  id: OffersSection;
  label: string;
  short: string;
  icon: any;
  gradient: string;
  accent: string;
}

interface Coupon {
  code: string;
  label: string;
  discount: string;
  condition: string;
  expires: string;
  category: string;
  hot?: boolean;
}

interface Voucher {
  title: string;
  discount: string;
  category: string;
  seller: string;
  validity: string;
  color: string;
  icon: any;
}

interface FlashDeal {
  name: string;
  image: string;
  category: string;
  price: number;
  oldPrice: number;
  sold: number;
  stock: number;
  endsIn: number; // seconds
}

@Component({
  selector: 'app-offers',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule],
  templateUrl: './offers.component.html',
  styleUrls: ['./offers.component.css']
})
export class OffersComponent implements OnInit, OnDestroy {
  activeSection: OffersSection = 'coupons';
  lastUpdate = new Date();
  copiedCode: string | null = null;

  readonly navEntries: NavEntry[] = [
    { id: 'coupons',  label: 'Codes promo & coupons', short: 'Coupons',  icon: Ticket,  gradient: 'from-pink-500 to-rose-500',     accent: 'text-pink-600' },
    { id: 'bons',     label: 'Bons de réduction',     short: 'Bons',     icon: Percent, gradient: 'from-amber-500 to-orange-500', accent: 'text-orange-600' },
    { id: 'cashback', label: 'Cashback & crédits',    short: 'Cashback', icon: Wallet,  gradient: 'from-emerald-500 to-teal-500', accent: 'text-emerald-600' },
    { id: 'flash',    label: 'Ventes flash & outlet', short: 'Flash',    icon: Zap,     gradient: 'from-red-500 to-pink-600',     accent: 'text-red-600' }
  ];

  readonly coupons: Coupon[] = [
    { code: 'HELIX15', label: '15% sur votre première commande', discount: '-15%', condition: 'Dès 49€ d\'achat', expires: 'Expire dans 3 jours', category: 'Toutes catégories', hot: true },
    { code: 'TECH25',  label: '25% sur l\'électronique',          discount: '-25%', condition: 'Dès 199€',         expires: 'Expire dans 5 jours', category: 'Électronique' },
    { code: 'MODE30',  label: '30% sur la mode premium',          discount: '-30%', condition: 'Dès 89€',          expires: 'Expire dans 2 jours', category: 'Mode & Accessoires', hot: true },
    { code: 'HOME10',  label: '10€ offerts sur Maison & Déco',    discount: '-10€', condition: 'Dès 60€',          expires: 'Expire demain',      category: 'Maison & Déco' },
    { code: 'BEAUTY20',label: '20% sur Beauté & Santé',           discount: '-20%', condition: 'Sans minimum',     expires: 'Expire dans 7 jours',category: 'Beauté & Santé' },
    { code: 'SPORT50', label: '50€ sur les équipements sportifs', discount: '-50€', condition: 'Dès 250€',         expires: 'Expire dans 4 jours',category: 'Sport & Fitness' }
  ];

  readonly vouchers: Voucher[] = [
    { title: 'Bon -20€ Apple',           discount: '-20€', category: 'Électronique', seller: 'Apple Store officiel', validity: 'Valable 14 jours', color: 'from-slate-700 to-slate-900',  icon: Tag },
    { title: 'Bon -15% Nike',            discount: '-15%', category: 'Sport',         seller: 'Nike Flagship',         validity: 'Valable 30 jours', color: 'from-black to-gray-800',       icon: Tag },
    { title: 'Bon -10% Dyson',           discount: '-10%', category: 'Maison',        seller: 'Dyson Official',        validity: 'Valable 21 jours',color: 'from-purple-600 to-pink-600',  icon: Tag },
    { title: 'Bon -25€ Samsung',         discount: '-25€', category: 'Électronique',  seller: 'Samsung Premium',       validity: 'Valable 10 jours',color: 'from-blue-600 to-indigo-700',  icon: Tag },
    { title: 'Bon -30% Sephora',         discount: '-30%', category: 'Beauté',        seller: 'Sephora partenaire',    validity: 'Valable 7 jours', color: 'from-rose-500 to-pink-600',    icon: Tag },
    { title: 'Bon -40€ L\'Occitane',     discount: '-40€', category: 'Beauté',        seller: 'L\'Occitane',           validity: 'Valable 20 jours',color: 'from-amber-500 to-orange-600', icon: Tag }
  ];

  readonly cashbackTiers = [
    { name: 'Standard', rate: '2%',   color: 'from-slate-400 to-slate-600',    perks: ['Sur tous les achats', 'Versement mensuel', 'Aucun minimum'] },
    { name: 'Premium',  rate: '5%',   color: 'from-indigo-500 to-purple-600',  perks: ['Sur toutes catégories', 'Versement hebdo', 'Offres exclusives', 'Livraison prioritaire'] },
    { name: 'VIP',      rate: '8%',   color: 'from-amber-500 to-orange-600',   perks: ['Max sur électronique & luxe', 'Versement instantané', 'Conseiller dédié', 'Accès ventes privées', 'Retours étendus 90 j'] }
  ];

  readonly cashbackBrands = [
    { name: 'Apple',    rate: '3%',  logo: 'bg-slate-900 text-white' },
    { name: 'Nike',     rate: '5%',  logo: 'bg-black text-white' },
    { name: 'Samsung',  rate: '4%',  logo: 'bg-blue-700 text-white' },
    { name: 'Sephora',  rate: '6%',  logo: 'bg-rose-600 text-white' },
    { name: 'Dyson',    rate: '5%',  logo: 'bg-purple-600 text-white' },
    { name: 'Adidas',   rate: '5%',  logo: 'bg-black text-white' },
    { name: 'HP',       rate: '4%',  logo: 'bg-sky-700 text-white' },
    { name: 'Bosch',    rate: '3%',  logo: 'bg-red-700 text-white' }
  ];

  flashDeals: FlashDeal[] = [
    { name: 'AirPods Pro 2 — USB‑C',          image: 'https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=400&auto=format&fit=crop', category: 'Électronique', price: 189,  oldPrice: 279,  sold: 84, stock: 120, endsIn: 3 * 3600 + 45 * 60 },
    { name: 'Nike Air Max 2026',              image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&auto=format&fit=crop', category: 'Sport',        price: 129,  oldPrice: 199,  sold: 156,stock: 200, endsIn: 1 * 3600 + 22 * 60 },
    { name: 'Cafetière Delonghi Auto',        image: 'https://images.unsplash.com/photo-1587080266227-677cc2a4e76e?w=400&auto=format&fit=crop', category: 'Maison',       price: 349,  oldPrice: 499,  sold: 42, stock: 80,  endsIn: 5 * 3600 + 10 * 60 },
    { name: 'Montre Garmin Fenix 8',          image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&auto=format&fit=crop', category: 'Sport',        price: 699,  oldPrice: 899,  sold: 29, stock: 60,  endsIn: 2 * 3600 + 5 * 60 },
    { name: 'Parfum — Coffret premium',       image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&auto=format&fit=crop', category: 'Beauté',       price: 79,   oldPrice: 139,  sold: 312,stock: 400, endsIn: 0 * 3600 + 48 * 60 },
    { name: 'Robot aspirateur iLife Pro',     image: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=400&auto=format&fit=crop', category: 'Maison',       price: 229,  oldPrice: 399,  sold: 68, stock: 150, endsIn: 4 * 3600 + 30 * 60 }
  ];

  // Lucide icons
  readonly Ticket = Ticket;
  readonly Percent = Percent;
  readonly Wallet = Wallet;
  readonly Zap = Zap;
  readonly Tag = Tag;
  readonly Gift = Gift;
  readonly Copy = Copy;
  readonly CheckCircle2 = CheckCircle2;
  readonly Clock = Clock;
  readonly ChevronRight = ChevronRight;
  readonly Sparkles = Sparkles;
  readonly ArrowRight = ArrowRight;
  readonly Flame = Flame;
  readonly TrendingUp = TrendingUp;
  readonly ShieldCheck = ShieldCheck;
  readonly Info = Info;
  readonly BadgePercent = BadgePercent;
  readonly Bell = Bell;
  readonly Timer = Timer;
  readonly Store = Store;

  private routeSub?: Subscription;
  private countdownInterval?: ReturnType<typeof setInterval>;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.routeSub = this.route.fragment.subscribe(fragment => {
      if (this.isOffersSection(fragment)) {
        this.activeSection = fragment;
        setTimeout(() => this.scrollToSection(fragment), 60);
      }
    });

    this.countdownInterval = setInterval(() => {
      this.flashDeals = this.flashDeals.map(d => ({
        ...d,
        endsIn: Math.max(0, d.endsIn - 1)
      }));
    }, 1000);
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    if (this.countdownInterval) clearInterval(this.countdownInterval);
  }

  private isOffersSection(value: string | null): value is OffersSection {
    return value === 'coupons' || value === 'bons' || value === 'cashback' || value === 'flash';
  }

  selectSection(id: OffersSection): void {
    this.activeSection = id;
    this.scrollToSection(id);
  }

  private scrollToSection(id: OffersSection): void {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  @HostListener('window:scroll')
  onScroll(): void {
    const offset = 180;
    const sections: OffersSection[] = ['coupons', 'bons', 'cashback', 'flash'];
    for (let i = sections.length - 1; i >= 0; i--) {
      const el = document.getElementById(sections[i]);
      if (el && el.getBoundingClientRect().top < offset) {
        this.activeSection = sections[i];
        break;
      }
    }
  }

  async copyCode(code: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(code);
      this.copiedCode = code;
      setTimeout(() => { if (this.copiedCode === code) this.copiedCode = null; }, 1800);
    } catch {
      this.copiedCode = code;
    }
  }

  formatTime(totalSeconds: number): string {
    const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  soldPct(d: FlashDeal): number {
    return Math.min(100, Math.round((d.sold / d.stock) * 100));
  }

  savingsPct(d: FlashDeal): number {
    return Math.round(((d.oldPrice - d.price) / d.oldPrice) * 100);
  }
}

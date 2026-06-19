import { Component, HostListener, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { CatalogService } from '../../services/catalog.service';
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
  id: string;
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

  coupons: Coupon[] = [];

  vouchers: Voucher[] = [];

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

  flashDeals: FlashDeal[] = [];

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

  private readonly voucherColors = [
    'from-slate-700 to-slate-900',
    'from-black to-gray-800',
    'from-purple-600 to-pink-600',
    'from-blue-600 to-indigo-700',
    'from-rose-500 to-pink-600',
    'from-amber-500 to-orange-600'
  ];

  constructor(
    private route: ActivatedRoute,
    private catalogService: CatalogService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadPromotions();
    this.catalogService.loadFlashProducts().then((products) => {
      this.flashDeals = products.map((p, i) => ({
        id: p.id,
        name: p.name,
        image: p.image,
        category: p.category,
        price: p.price,
        oldPrice: p.originalPrice ?? p.price,
        sold: 20 + (i * 17) % 120,
        stock: 80 + (i * 13) % 100,
        endsIn: this.secondsUntilPromoEnd(p.promoEndsAt, i)
      }));
      this.cdr.markForCheck();
    });

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

  private loadPromotions(): void {
    this.catalogService.loadPromoCodes().then((rows) => {
      this.coupons = rows.map((r, i) => ({
        code: r.code,
        label: r.label,
        discount: r.discount,
        condition: r.minAmount > 0 ? `Dès ${r.minAmount}€ d'achat` : 'Sans minimum',
        expires: r.expiresLabel || 'Offre limitée',
        category: r.seller ? `${r.category}` : r.category,
        hot: r.source === 'seller' || i < 2
      }));
      this.lastUpdate = new Date();
      this.cdr.markForCheck();
    });
    this.catalogService.loadVendorVouchers().then((rows) => {
      this.vouchers = rows.map((r, i) => ({
        title: r.title,
        discount: r.discount,
        category: r.category,
        seller: r.seller,
        validity: r.validity,
        color: this.voucherColors[i % this.voucherColors.length],
        icon: Tag
      }));
      this.cdr.markForCheck();
    });
  }

  private secondsUntilPromoEnd(promoEndsAt: string | null | undefined, index: number): number {
    if (promoEndsAt) {
      const diff = Math.floor((new Date(promoEndsAt).getTime() - Date.now()) / 1000);
      if (diff > 0) return diff;
    }
    return (3 - (index % 4)) * 3600 + (15 + index * 7) * 60;
  }
}

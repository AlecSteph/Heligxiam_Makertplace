import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { CatalogService } from '../../services/catalog.service';
import { LucideAngularModule, Sparkles, Gift, Ticket, Zap, X, Copy, CheckCircle2, ArrowRight, PartyPopper, Volume2, VolumeX, Timer, Flame } from 'lucide-angular';

interface PromoItem {
  type: 'coupon' | 'flash' | 'cashback' | 'freeship';
  title: string;
  subtitle: string;
  badge: string;
  code?: string;
  gradient: string;
  icon: any;
}

@Component({
  selector: 'app-welcome-promo',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './welcome-promo.component.html',
  styleUrls: ['./welcome-promo.component.css']
})
export class WelcomePromoComponent implements OnInit, OnDestroy {
  visible = false;
  muted = false;
  copiedCode: string | null = null;
  countdown = 60 * 60 * 2 + 37 * 60; // 2h 37min
  stars: { id: number; left: number; top: number; delay: number; size: number; }[] = [];

  promos: PromoItem[] = [];

  // Lucide icons
  readonly Sparkles = Sparkles;
  readonly Gift = Gift;
  readonly Ticket = Ticket;
  readonly Zap = Zap;
  readonly X = X;
  readonly Copy = Copy;
  readonly CheckCircle2 = CheckCircle2;
  readonly ArrowRight = ArrowRight;
  readonly PartyPopper = PartyPopper;
  readonly Volume2 = Volume2;
  readonly VolumeX = VolumeX;
  readonly Timer = Timer;
  readonly Flame = Flame;

  private sub = new Subscription();
  private countdownInterval?: ReturnType<typeof setInterval>;
  private audioCtx?: AudioContext;

  constructor(
    private authService: AuthService,
    private catalogService: CatalogService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    this.loadPromosFromApi();
    // Generate stars once
    for (let i = 0; i < 28; i++) {
      this.stars.push({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: Math.random() * 2.2,
        size: 8 + Math.random() * 18
      });
    }

    // Ecoute l'evenement de VRAI login (emis par AuthService.handleAuthSuccess)
    // Ignore les restaurations de session (F5), ne se declenche qu'a une vraie
    // connexion volontaire — et seulement pour les clients.
    this.sub.add(
      this.authService.loginSuccess$.subscribe(user => {
        if (user?.role === 'client') {
          // Execute dans NgZone pour garantir que la detection de changements
          // se declenche apres le setTimeout, et que le popup soit effectivement
          // rendu par Angular sans attendre une interaction utilisateur.
          this.zone.run(() => {
            setTimeout(() => this.open(), 1400);
          });
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    if (typeof document !== 'undefined') document.body.style.overflow = '';
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {});
    }
  }

  open(): void {
    this.zone.run(() => {
      this.visible = true;
      this.copiedCode = null;

      // Force Angular a rendre l'overlay MAINTENANT, avant tout autre effet.
      // Ceci evite le cas "body overflow:hidden applique mais popup non rendu"
      // qui donnait l'impression que le site etait bloque.
      this.cdr.detectChanges();

      // Maintenant que l'overlay est effectivement dans le DOM, on peut verrouiller
      // le scroll en arriere-plan en toute securite.
      if (typeof document !== 'undefined') {
        document.body.style.overflow = 'hidden';
      }

      this.playBeep();

      if (!this.countdownInterval) {
        this.countdownInterval = setInterval(() => {
          this.zone.run(() => {
            if (this.countdown > 0) this.countdown--;
            this.cdr.markForCheck();
          });
        }, 1000);
      }
    });
  }

  close(): void {
    this.zone.run(() => {
      this.visible = false;
      if (typeof document !== 'undefined') document.body.style.overflow = '';
      if (this.countdownInterval) {
        clearInterval(this.countdownInterval);
        this.countdownInterval = undefined;
      }
      this.cdr.detectChanges();
    });
  }

  /**
   * Joue un petit jingle (3 notes ascendantes) via Web Audio API.
   * - Reuse d'un AudioContext unique (evite les fuites)
   * - Reprise automatique si suspendu (certains navigateurs bloquent hors gesture)
   */
  private playBeep(): void {
    if (this.muted) return;
    try {
      const w = window as any;
      const AudioCtx = w.AudioContext || w.webkitAudioContext;
      if (!AudioCtx) return;

      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        this.audioCtx = new AudioCtx();
      }
      const ctx = this.audioCtx!;

      const playNotes = () => {
        const now = ctx.currentTime;
        const playTone = (freq: number, start: number, dur: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + start);
          gain.gain.setValueAtTime(0.0001, now + start);
          gain.gain.exponentialRampToValueAtTime(0.22, now + start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
          osc.connect(gain).connect(ctx.destination);
          osc.start(now + start);
          osc.stop(now + start + dur + 0.02);
        };
        // Joyeux jingle : A5 - D6 - G6
        playTone(880, 0.00, 0.14);
        playTone(1175, 0.16, 0.14);
        playTone(1568, 0.32, 0.24);
      };

      if (ctx.state === 'suspended') {
        ctx.resume().then(playNotes).catch(() => {});
      } else {
        playNotes();
      }
    } catch {
      // Certains navigateurs bloquent si aucun geste utilisateur recent.
      // On ignore silencieusement — le popup reste visible.
    }
  }

  toggleMute(): void {
    this.muted = !this.muted;
    if (!this.muted) this.playBeep();
  }

  async copyCode(code: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(code);
      this.copiedCode = code;
      setTimeout(() => {
        if (this.copiedCode === code) this.copiedCode = null;
      }, 1800);
    } catch {
      this.copiedCode = code;
    }
  }

  goToPromotions(): void {
    this.close();
    this.router.navigate(['/offres']);
  }

  private loadPromosFromApi(): void {
    Promise.all([
      this.catalogService.loadPromoCodes(),
      this.catalogService.loadFlashProducts()
    ]).then(([codes, flashProducts]) => {
      const items: PromoItem[] = [];
      const primary = codes[0];
      if (primary) {
        items.push({
          type: 'coupon',
          title: primary.label,
          subtitle:
            primary.minAmount > 0
              ? `${primary.category} • Dès ${primary.minAmount}€ d'achat`
              : primary.category,
          badge: primary.seller ? `Vendeur ${primary.seller}` : 'Code exclusif',
          code: primary.code,
          gradient: 'from-pink-500 via-rose-500 to-fuchsia-600',
          icon: Ticket
        });
      }
      if (flashProducts.length) {
        const maxDiscount = flashProducts.reduce((max, p) => {
          if (!p.originalPrice || p.originalPrice <= p.price) return max;
          const pct = Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100);
          return Math.max(max, pct);
        }, 0);
        items.push({
          type: 'flash',
          title: maxDiscount ? `Ventes flash jusqu'à -${maxDiscount}%` : 'Ventes flash en cours',
          subtitle: `${flashProducts.length} produit(s) en promotion limitée`,
          badge: 'Chrono actif',
          gradient: 'from-red-500 via-red-600 to-pink-600',
          icon: Zap
        });
      }
      const freeship = codes.find((c) => c.type === 'livraison');
      if (freeship) {
        items.push({
          type: 'freeship',
          title: freeship.label,
          subtitle:
            freeship.minAmount > 0 ? `Dès ${freeship.minAmount}€ d'achat` : 'Sur la marketplace',
          badge: 'Livraison',
          code: freeship.code,
          gradient: 'from-indigo-500 via-purple-600 to-violet-700',
          icon: Sparkles
        });
      } else {
        items.push({
          type: 'cashback',
          title: '2% de cashback immédiat',
          subtitle: 'Sur tous vos achats éligibles',
          badge: 'Automatique',
          gradient: 'from-emerald-500 via-teal-500 to-cyan-600',
          icon: Gift
        });
      }
      this.promos = items.length ? items : this.defaultPromos();
      this.cdr.markForCheck();
    }).catch(() => {
      this.promos = this.defaultPromos();
    });
  }

  private defaultPromos(): PromoItem[] {
    return [
      {
        type: 'coupon',
        title: 'Offres marketplace',
        subtitle: 'Découvrez les codes promo partenaires',
        badge: 'Catalogue live',
        gradient: 'from-pink-500 via-rose-500 to-fuchsia-600',
        icon: Ticket
      }
    ];
  }

  get countdownLabel(): string {
    const h = Math.floor(this.countdown / 3600).toString().padStart(2, '0');
    const m = Math.floor((this.countdown % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(this.countdown % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  }
}

import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import {
  LucideAngularModule,
  Shield,
  Users,
  LogOut,
  LayoutDashboard,
  Package,
  UserCheck,
  AlertTriangle,
  Scale,
  Building2,
  ShoppingBag,
  CheckCircle2,
  XCircle,
  Eye,
  Search,
  Bell,
  Filter,
  ChevronRight,
  FileCheck,
  ClipboardList,
  Mail,
  MessageSquare,
  LineChart,
  RotateCcw,
  LifeBuoy,
  FileSearch,
  Send,
  Home,
  Sparkles,
  Phone,
  Activity,
  Percent
} from 'lucide-angular';
import { AdminAuthService } from '../../../services/admin-auth.service';

/** Zone d’exploitation (déduite de la route : `/admin/vendeurs`, `/admin/clients`, etc.) */
export type AdminArea = 'vendors' | 'clients' | 'transverse';

export type AdminSection =
  | 'queue-kyc'
  | 'queue-products'
  | 'queue-promotions'
  | 'queue-accounts-seller'
  | 'queue-accounts-client'
  | 'disputes'
  | 'sellers'
  | 'buyers'
  | 'client-orders'
  | 'client-returns'
  | 'client-comms'
  | 'client-insights'
  | 'client-tickets'
  | 'vendor-returns'
  | 'vendor-comms'
  | 'vendor-tickets'
  | 'onboarding-activation'
  | 'onboarding-detail'
  | 'profil-vendeur-verify'
  | 'sante-vendeurs'
  | 'vendor-detail'
  | 'transverse-ops';

export interface KycRequest {
  id: string;
  boutiqueId: number;
  shopName: string;
  owner: string;
  country: string;
  submittedAt: string;
  docs: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface ProductModeration {
  id: string;
  productId: number;
  moderationId?: number | null;
  title: string;
  seller: string;
  category: string;
  flagReason: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface PromotionModerationRow {
  kind: 'coupon' | 'product_promo';
  id: string;
  refId: number;
  shopName: string;
  label?: string;
  code?: string;
  discount?: string;
  productTitle?: string;
  sku?: string;
  promoPrice?: number;
  type?: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface AccountReview {
  id: string;
  email: string;
  type: 'client' | 'vendeur';
  reason: string;
  priority: 'bas' | 'moyen' | 'haut';
  openedAt: string;
  status: 'open' | 'resolved';
}

export interface DisputeRow {
  id: string;
  orderRef: string;
  buyer: string;
  seller: string;
  topic: string;
  amount: string;
  status: 'mediation' | 'résolu' | 'ouvert';
  openedAt: string;
}

export interface OrderLineItem {
  productTitle: string;
  image: string;
  sku: string;
  qty: number;
  lineTotal: string;
}

export interface AdminOrder {
  id: string;
  ref: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  status: 'payée' | 'expédiée' | 'livrée' | 'annulée';
  placedAt: string;
  total: string;
  lines: OrderLineItem[];
}

export type ClientReturnStatus =
  | 'en_attente'
  | 'approuvé'
  | 'rejeté'
  | 'colis_reçu'
  | 'remboursé';

export interface ClientReturnRow {
  id: string;
  orderRef: string;
  customer: string;
  item: string;
  image: string;
  reason: string;
  status: ClientReturnStatus;
  openedAt: string;
}

export interface CommsLogRow {
  id: string;
  channel: 'email' | 'site' | 'sms';
  to: string;
  subject: string;
  preview: string;
  sentAt: string;
  direction: 'sortant' | 'entrant';
  audience: 'client' | 'vendeur';
}

export interface InsightWeek {
  week: string;
  csat: number;
  sessionsK: number;
}

export type TicketAudience = 'client' | 'vendeur';

export interface SupportTicketRow {
  id: string;
  audience: TicketAudience;
  from: string;
  topic: string;
  priority: 'bas' | 'moyen' | 'haut';
  status: 'ouvert' | 'en_cours' | 'fermé';
  updatedAt: string;
}

export interface VendorReturnRow {
  id: string;
  returnRef: string;
  orderRef: string;
  shopName: string;
  buyer: string;
  amount: string;
  charge: 'vendeur' | 'plateforme' | 'partagé';
  status: string;
  updatedAt: string;
}

export type AuditEventKind = 'accès' | 'export' | 'modif' | 'notif';

export interface AuditEventRow {
  id: string;
  at: string;
  adminUser: string;
  kind: AuditEventKind;
  target: string;
  detail: string;
}

export type OnboardingPreuveEtat = 'déposé' | 'manquant' | 'en_cours' | 'refusé' | 'validé';

export interface OnboardingPreuveFichier {
  libelle: string;
  etat: OnboardingPreuveEtat;
  /** Réf. stockage / URL — l’admin ouvre l’aperçu avant de valider l’étape */
  ref?: string;
}

export interface OnboardingStepItem {
  id: string;
  label: string;
  valide: boolean;
  /** Données lues côté API / S3 (à vérifier avant bascule interne) */
  apercu: string;
  preuves?: OnboardingPreuveFichier[];
}

export interface OnboardingBoutiqueSummary {
  boutiqueId: number;
  vendorId: string;
  shopName: string;
  plan: 'particulier' | 'professionnel';
  progressPercent: number;
  statutBoutique: 'brouillon' | 'kyc_en_cours' | 'en_attente_activation' | 'active';
  stepsValides: number;
  stepsTotal: number;
  notes?: string;
}

export interface OnboardingBoutiqueAdminRow extends OnboardingBoutiqueSummary {
  steps: OnboardingStepItem[];
}

export interface AdminSellerRow {
  id: string;
  vendeurId: number;
  boutiqueId: number;
  name: string;
  status: 'actif' | 'surveillé' | 'suspendu' | 'brouillon' | 'kyc_en_cours';
  listings: number;
  health: number;
  lastSync: string;
  email: string;
  phone: string;
  emailVerif: boolean;
  telVerif: boolean;
  plan: 'particulier' | 'professionnel' | '—';
  raisonSociale: string;
  siret: string;
  dernierVersement: string;
  docsRecus: string;
}

export interface AdminNotificationRow {
  id: number;
  type: string;
  title: string;
  text: string;
  time: string;
  read: boolean;
  refType?: string | null;
  refId?: number | null;
}

export interface AdminOperatorThreadSummary {
  ticketId: number;
  boutiqueId: number | null;
  vendeurId: number;
  shopName: string;
  sellerEmail: string;
  subject: string;
  status: string;
  needsReply: boolean;
  lastMessage: string;
  lastFrom: string | null;
  lastAt: string;
}

export interface AdminOperatorMessage {
  id: string;
  from: 'vendeur' | 'operateur' | 'systeme';
  body: string;
  at: string;
}

export interface AdminOperatorThreadDetail {
  ticketId: number;
  boutiqueId: number | null;
  vendeurId: number;
  shopName: string;
  sellerEmail: string;
  subject: string;
  status: string;
  needsReply: boolean;
  messages: AdminOperatorMessage[];
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  readonly Shield = Shield;
  readonly Users = Users;
  readonly LogOut = LogOut;
  readonly LayoutDashboard = LayoutDashboard;
  readonly Package = Package;
  readonly UserCheck = UserCheck;
  readonly AlertTriangle = AlertTriangle;
  readonly Scale = Scale;
  readonly Building2 = Building2;
  readonly ShoppingBag = ShoppingBag;
  readonly CheckCircle2 = CheckCircle2;
  readonly XCircle = XCircle;
  readonly Eye = Eye;
  readonly Search = Search;
  readonly Bell = Bell;
  readonly Filter = Filter;
  readonly ChevronRight = ChevronRight;
  readonly FileCheck = FileCheck;
  readonly ClipboardList = ClipboardList;
  readonly Mail = Mail;
  readonly MessageSquare = MessageSquare;
  readonly LineChart = LineChart;
  readonly RotateCcw = RotateCcw;
  readonly LifeBuoy = LifeBuoy;
  readonly FileSearch = FileSearch;
  readonly Send = Send;
  readonly Home = Home;
  readonly Sparkles = Sparkles;
  readonly Phone = Phone;
  readonly Activity = Activity;
  readonly Percent = Percent;

  /** Contexte d’écran (vendeur / client / transverse) */
  area: AdminArea = 'vendors';
  activeSection: AdminSection = 'queue-kyc';
  searchQuery = '';

  kycQueue: KycRequest[] = [];

  productQueue: ProductModeration[] = [];

  promotionQueue: PromotionModerationRow[] = [];

  accountReviews: AccountReview[] = [];

  disputes: DisputeRow[] = [];

  sellersDirectory: AdminSellerRow[] = [];

  /** File activation 0 % → 100 % (MySQL via /api/admin) */
  onboardingBoutiqueRows: OnboardingBoutiqueSummary[] = [];
  selectedOnboardingRow: OnboardingBoutiqueAdminRow | null = null;
  onboardingApiLoading = false;
  onboardingDetailLoading = false;
  onboardingApiError = '';
  private onboardingLoadId = 0;
  private onboardingDetailLoadId = 0;
  adminNotifications: AdminNotificationRow[] = [];
  adminUnreadCount = 0;
  showAdminNotifications = false;
  private adminNotifPoll?: ReturnType<typeof setInterval>;
  operatorThreads: AdminOperatorThreadSummary[] = [];
  selectedOperatorThread: AdminOperatorThreadDetail | null = null;
  operatorThreadsLoading = false;
  operatorReplyText = '';
  operatorReplySending = false;
  operatorNeedsReplyCount = 0;
  private pendingOperatorTicketId: number | null = null;
  vendorApiLoading = false;
  vendorApiError = '';
  adminActionBusy = false;
  private vendorSectionLoadId = 0;
  private readonly adminApiBase = 'http://localhost:3001/api/admin';

  /** Poids des critères santé (recalcul via API) */
  santeCriteresPoids: {
    delaisExpedition: number;
    odr: number;
    retours: number;
    reponseMessage: number;
    annulations: number;
  } = {
    delaisExpedition: 0.25,
    odr: 0.2,
    retours: 0.2,
    reponseMessage: 0.2,
    annulations: 0.15
  };

  readonly santePoidsFields: {
    k: 'delaisExpedition' | 'odr' | 'retours' | 'reponseMessage' | 'annulations';
    l: string;
  }[] = [
    { k: 'delaisExpedition', l: 'Délais expédition' },
    { k: 'odr', l: 'ODR' },
    { k: 'retours', l: 'Retours' },
    { k: 'reponseMessage', l: 'Réponse msg' },
    { k: 'annulations', l: 'Annulations' }
  ];

  /** Fiche vendeur plein écran */
  selectedVendor: AdminSellerRow | null = null;

  buyersDirectory: {
    id: string;
    email: string;
    orders: number;
    segment: string;
    risk: string;
    country: string;
  }[] = [];

  adminOrders: AdminOrder[] = [];

  clientReturns: ClientReturnRow[] = [];

  commsClient: CommsLogRow[] = [];

  insightWeeks: InsightWeek[] = [];

  supportTickets: SupportTicketRow[] = [];

  vendorReturns: VendorReturnRow[] = [];

  auditLog: AuditEventRow[] = [];

  toast = '';
  private toastTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private adminAuth: AdminAuthService,
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const initial = this.route.snapshot.data['area'] as AdminArea | undefined;
    if (initial) {
      this.area = initial;
    }
    this.applyAreaDefault();

    this.route.data.subscribe(d => {
      const next = d['area'] as AdminArea | undefined;
      if (next && next !== this.area) {
        this.area = next;
        this.applyAreaDefault();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.adminNotifPoll) clearInterval(this.adminNotifPoll);
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  private startAdminNotificationsPoll(): void {
    this.loadAdminNotificationsFromApi();
    if (this.adminNotifPoll) clearInterval(this.adminNotifPoll);
    this.adminNotifPoll = setInterval(() => this.loadAdminNotificationsFromApi(), 45_000);
  }

  private applyAreaDefault(): void {
    this.searchQuery = '';
    if (this.area === 'vendors') {
      this.activeSection = 'queue-kyc';
      this.loadVendorSectionData('queue-kyc');
      this.startAdminNotificationsPoll();
    } else if (this.area === 'clients') {
      this.activeSection = 'queue-accounts-client';
    } else {
      this.activeSection = 'disputes';
    }
  }

  /** Phrase affichée dans la barre latérale */
  areaSubtitle(): string {
    if (this.area === 'vendors') {
      return 'Boutiques, KYC, offres, comptes marchands';
    }
    if (this.area === 'clients') {
      return 'Acheteurs, commandes, retours, CSAT';
    }
    return 'Litiges & conformité (acheteur ↔ vendeur)';
  }

  private isSectionAllowed(s: AdminSection): boolean {
    if (this.area === 'vendors' && (s === 'vendor-detail' || s === 'onboarding-detail')) {
      return true;
    }
    if (this.area === 'vendors') {
      return this.navVendeur.some(n => n.id === s);
    }
    if (this.area === 'clients') {
      return this.navClient.some(n => n.id === s);
    }
    return this.navTransverse.some(n => n.id === s);
  }

  setSection(s: AdminSection): void {
    if (!this.isSectionAllowed(s)) return;
    const reopenSame = this.activeSection === s;
    if (reopenSame && s !== 'onboarding-activation') return;
    if (this.activeSection === 'onboarding-detail' || s === 'onboarding-activation') {
      this.selectedOnboardingRow = null;
      this.onboardingDetailLoading = false;
    }
    this.activeSection = s;
    if (this.area === 'vendors') {
      this.loadVendorSectionData(s);
    }
  }

  private loadVendorSectionData(s: AdminSection): void {
    this.vendorSectionLoadId++;
    switch (s) {
      case 'queue-kyc':
        this.loadKycQueueFromApi();
        break;
      case 'queue-products':
        this.loadProductQueueFromApi();
        break;
      case 'queue-promotions':
        this.loadPromotionQueueFromApi();
        break;
      case 'sellers':
      case 'profil-vendeur-verify':
      case 'sante-vendeurs':
      case 'vendor-detail':
        this.loadSellersFromApi();
        break;
      case 'onboarding-activation':
        this.loadOnboardingBoutiquesFromApi();
        break;
      case 'vendor-comms':
        this.loadOperatorThreadsFromApi();
        break;
      case 'vendor-returns':
        this.loadVendorReturnsFromApi();
        break;
      case 'vendor-tickets':
        this.loadVendorTicketsFromApi();
        break;
      default:
        break;
    }
  }

  loadKycQueueFromApi(): void {
    const loadId = this.vendorSectionLoadId;
    this.vendorApiLoading = true;
    this.vendorApiError = '';
    this.http
      .get<{ success: boolean; data?: { rows: KycRequest[] } }>(`${this.adminApiBase}/kyc-queue`)
      .subscribe({
        next: (res) => {
          if (loadId !== this.vendorSectionLoadId) return;
          this.vendorApiLoading = false;
          if (res.success && res.data?.rows) {
            this.kycQueue = res.data.rows;
          }
        },
        error: () => {
          if (loadId !== this.vendorSectionLoadId) return;
          this.vendorApiLoading = false;
          this.vendorApiError = 'Impossible de charger la file KYC.';
        }
      });
  }

  loadProductQueueFromApi(): void {
    const loadId = this.vendorSectionLoadId;
    this.vendorApiLoading = true;
    this.vendorApiError = '';
    this.http
      .get<{ success: boolean; data?: { rows: ProductModeration[] } }>(
        `${this.adminApiBase}/products-moderation`
      )
      .subscribe({
        next: (res) => {
          if (loadId !== this.vendorSectionLoadId) return;
          this.vendorApiLoading = false;
          if (res.success && res.data?.rows) {
            this.productQueue = res.data.rows;
          }
        },
        error: () => {
          if (loadId !== this.vendorSectionLoadId) return;
          this.vendorApiLoading = false;
          this.vendorApiError = 'Impossible de charger la modération produits.';
        }
      });
  }

  loadPromotionQueueFromApi(): void {
    const loadId = this.vendorSectionLoadId;
    this.vendorApiLoading = true;
    this.vendorApiError = '';
    this.http
      .get<{ success: boolean; data?: { rows: PromotionModerationRow[] } }>(
        `${this.adminApiBase}/promotions-moderation`
      )
      .subscribe({
        next: (res) => {
          if (loadId !== this.vendorSectionLoadId) return;
          this.vendorApiLoading = false;
          if (res.success && res.data?.rows) {
            this.promotionQueue = res.data.rows;
          }
        },
        error: () => {
          if (loadId !== this.vendorSectionLoadId) return;
          this.vendorApiLoading = false;
          this.vendorApiError = 'Impossible de charger les promotions à valider.';
        }
      });
  }

  approvePromotion(row: PromotionModerationRow): void {
    const url =
      row.kind === 'coupon'
        ? `${this.adminApiBase}/promotions-moderation/coupons/${row.refId}`
        : `${this.adminApiBase}/promotions-moderation/products/${row.refId}`;
    this.http.patch<{ success: boolean; message?: string }>(url, { action: 'approve' }).subscribe({
      next: (res) => {
        this.toastMessage(res.message || 'Promotion approuvée.');
        this.loadPromotionQueueFromApi();
      },
      error: () => this.toastMessage('Échec validation promotion.')
    });
  }

  rejectPromotion(row: PromotionModerationRow): void {
    const motif = prompt('Motif du refus (optionnel) :') || '';
    const url =
      row.kind === 'coupon'
        ? `${this.adminApiBase}/promotions-moderation/coupons/${row.refId}`
        : `${this.adminApiBase}/promotions-moderation/products/${row.refId}`;
    this.http.patch<{ success: boolean; message?: string }>(url, { action: 'reject', motif }).subscribe({
      next: (res) => {
        this.toastMessage(res.message || 'Promotion refusée.');
        this.loadPromotionQueueFromApi();
      },
      error: () => this.toastMessage('Échec refus promotion.')
    });
  }

  filteredPromotions(): PromotionModerationRow[] {
    return this.filterRows(this.promotionQueue, (r) =>
      [r.id, r.shopName, r.code, r.label, r.productTitle, r.sku, r.kind].join(' ')
    );
  }

  loadSellersFromApi(): void {
    const loadId = this.vendorSectionLoadId;
    this.vendorApiLoading = true;
    this.vendorApiError = '';
    this.http
      .get<{ success: boolean; data?: { rows: AdminSellerRow[] } }>(`${this.adminApiBase}/sellers`)
      .subscribe({
        next: (res) => {
          if (loadId !== this.vendorSectionLoadId) return;
          this.vendorApiLoading = false;
          if (res.success && res.data?.rows) {
            this.sellersDirectory = res.data.rows;
            if (this.selectedVendor) {
              this.selectedVendor =
                this.sellersDirectory.find((s) => s.vendeurId === this.selectedVendor!.vendeurId) ||
                this.selectedVendor;
            }
          }
        },
        error: () => {
          if (loadId !== this.vendorSectionLoadId) return;
          this.vendorApiLoading = false;
          this.vendorApiError = 'Impossible de charger l’annuaire vendeurs.';
        }
      });
  }

  loadVendorReturnsFromApi(): void {
    this.http
      .get<{ success: boolean; data?: { rows: VendorReturnRow[] } }>(`${this.adminApiBase}/vendor-returns`)
      .subscribe({
        next: (res) => {
          if (res.success && res.data?.rows) {
            this.vendorReturns = res.data.rows;
          }
        },
        error: () => this.toastMessage('Impossible de charger les retours vendeur.')
      });
  }

  loadVendorTicketsFromApi(): void {
    this.http
      .get<{ success: boolean; data?: { rows: SupportTicketRow[] } }>(`${this.adminApiBase}/vendor-tickets`)
      .subscribe({
        next: (res) => {
          if (res.success && res.data?.rows) {
            this.supportTickets = res.data.rows;
          }
        },
        error: () => this.toastMessage('Impossible de charger les tickets vendeur.')
      });
  }

  loadAdminNotificationsFromApi(): void {
    this.http
      .get<{ success: boolean; data?: { rows: AdminNotificationRow[]; unreadCount: number } }>(
        `${this.adminApiBase}/notifications`
      )
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.adminNotifications = res.data.rows || [];
            this.adminUnreadCount = res.data.unreadCount ?? 0;
            this.cdr.markForCheck();
          }
        },
        error: () => {
          /* silencieux — le centre reste utilisable sans poll */
        }
      });
  }

  toggleAdminNotificationsPanel(): void {
    this.showAdminNotifications = !this.showAdminNotifications;
    if (this.showAdminNotifications) {
      this.loadAdminNotificationsFromApi();
    }
  }

  markAllAdminNotificationsRead(): void {
    this.http.patch<{ success: boolean }>(`${this.adminApiBase}/notifications/read-all`, {}).subscribe({
      next: () => {
        this.adminNotifications = this.adminNotifications.map((n) => ({ ...n, read: true }));
        this.adminUnreadCount = 0;
        this.cdr.markForCheck();
      }
    });
  }

  openAdminNotification(n: AdminNotificationRow): void {
    if (!n.read) {
      this.http.patch(`${this.adminApiBase}/notifications/${n.id}/read`, {}).subscribe({
        next: (res: any) => {
          n.read = true;
          if (res?.data?.unreadCount != null) {
            this.adminUnreadCount = res.data.unreadCount;
          } else if (this.adminUnreadCount > 0) {
            this.adminUnreadCount--;
          }
          this.cdr.markForCheck();
        }
      });
    }
    this.showAdminNotifications = false;

    if (n.type === 'onboarding' || n.refType === 'onboarding') {
      if (n.refId) {
        this.loadOnboardingBoutiquesFromApi();
        this.loadOnboardingDetailFromApi(n.refId);
        return;
      }
      this.setSection('onboarding-activation');
      return;
    }
    if (n.type === 'kyc' || n.refType === 'kyc') {
      this.setSection('queue-kyc');
      return;
    }
    if (n.type === 'moderation' || n.refType === 'product') {
      this.setSection('queue-products');
      return;
    }
    if (n.type === 'promotion' || n.refType === 'coupon' || n.refType === 'product_promo') {
      this.setSection('queue-promotions');
      return;
    }
    if (n.type === 'message' || n.refType === 'ticket') {
      if (n.refId) {
        this.pendingOperatorTicketId = n.refId;
      }
      this.setSection('vendor-comms');
      return;
    }
  }

  loadOperatorThreadsFromApi(selectTicketId?: number): void {
    this.operatorThreadsLoading = true;
    this.http
      .get<{
        success: boolean;
        data?: { rows: AdminOperatorThreadSummary[]; needsReplyCount: number };
      }>(`${this.adminApiBase}/operator-threads`)
      .subscribe({
        next: (res) => {
          this.operatorThreadsLoading = false;
          if (res.success && res.data) {
            this.operatorThreads = res.data.rows || [];
            this.operatorNeedsReplyCount = res.data.needsReplyCount ?? 0;
            const pickId = selectTicketId ?? this.pendingOperatorTicketId ?? null;
            if (pickId) {
              this.pendingOperatorTicketId = null;
              this.selectOperatorThread(pickId);
            }
            this.cdr.markForCheck();
          }
        },
        error: () => {
          this.operatorThreadsLoading = false;
          this.toastMessage('Impossible de charger la messagerie vendeur.');
        }
      });
  }

  selectOperatorThread(ticketId: number): void {
    this.operatorThreadsLoading = true;
    this.http
      .get<{ success: boolean; data?: { thread: AdminOperatorThreadDetail } }>(
        `${this.adminApiBase}/operator-threads/${ticketId}`
      )
      .subscribe({
        next: (res) => {
          this.operatorThreadsLoading = false;
          if (res.success && res.data?.thread) {
            this.selectedOperatorThread = res.data.thread;
            this.cdr.markForCheck();
          }
        },
        error: () => {
          this.operatorThreadsLoading = false;
          this.toastMessage('Impossible de charger cette conversation.');
        }
      });
  }

  sendOperatorReply(): void {
    const thread = this.selectedOperatorThread;
    const body = this.operatorReplyText.trim();
    if (!thread || !body || this.operatorReplySending) return;

    this.operatorReplySending = true;
    this.http
      .post<{ success: boolean; message?: string; data?: { thread: AdminOperatorThreadDetail } }>(
        `${this.adminApiBase}/operator-threads/${thread.ticketId}/messages`,
        { body }
      )
      .subscribe({
        next: (res) => {
          this.operatorReplySending = false;
          if (res.data?.thread) {
            this.selectedOperatorThread = res.data.thread;
          }
          this.operatorReplyText = '';
          this.loadOperatorThreadsFromApi(thread.ticketId);
          this.toastMessage(res.message || 'Réponse envoyée.');
        },
        error: (err) => {
          this.operatorReplySending = false;
          this.toastMessage(err.error?.message || 'Envoi impossible.');
        }
      });
  }

  loadOnboardingBoutiquesFromApi(): void {
    const loadId = ++this.onboardingLoadId;
    if (!this.onboardingBoutiqueRows.length) {
      this.onboardingApiLoading = true;
    }
    this.onboardingApiError = '';
    this.http
      .get<{ success: boolean; data?: { rows: OnboardingBoutiqueSummary[] } }>(
        `${this.adminApiBase}/onboarding-boutiques`
      )
      .subscribe({
        next: (res) => {
          if (loadId !== this.onboardingLoadId) return;
          this.onboardingApiLoading = false;
          if (res.success && res.data?.rows) {
            this.onboardingBoutiqueRows = res.data.rows;
          }
          this.cdr.markForCheck();
        },
        error: (err) => {
          if (loadId !== this.onboardingLoadId) return;
          this.onboardingApiLoading = false;
          const status = err.status ?? err.originalError?.status;
          const apiMsg = err.error?.message || err.userMessage;
          if (status === 401) {
            this.onboardingApiError =
              'Session administrateur expirée. Reconnectez-vous via /admin/login.';
          } else if (status === 503) {
            this.onboardingApiError =
              apiMsg || 'MySQL indisponible. Vérifiez MYSQL_HOST dans auth-service/.env et que MySQL tourne.';
          } else if (status === 0 || !status) {
            this.onboardingApiError =
              'auth-service (port 3001) injoignable. Démarrez-le avec : cd auth-service && node server.js';
          } else {
            this.onboardingApiError =
              apiMsg || 'Impossible de charger les dossiers onboarding. Vérifiez auth-service (3001) et MySQL.';
          }
          this.cdr.markForCheck();
        }
      });
  }

  loadOnboardingDetailFromApi(boutiqueId: number): void {
    const loadId = ++this.onboardingDetailLoadId;
    this.onboardingDetailLoading = true;
    this.onboardingApiError = '';
    this.http
      .get<{ success: boolean; data?: { row: OnboardingBoutiqueAdminRow } }>(
        `${this.adminApiBase}/onboarding-boutiques/${boutiqueId}`
      )
      .subscribe({
        next: (res) => {
          if (loadId !== this.onboardingDetailLoadId) return;
          this.onboardingDetailLoading = false;
          if (res.success && res.data?.row) {
            this.selectedOnboardingRow = res.data.row;
            this.patchOnboardingSummary(res.data.row);
          }
          this.cdr.markForCheck();
        },
        error: (err) => {
          if (loadId !== this.onboardingDetailLoadId) return;
          this.onboardingDetailLoading = false;
          this.onboardingApiError =
            err.error?.message || 'Impossible de charger le dossier vendeur.';
          this.cdr.markForCheck();
        }
      });
  }

  private patchOnboardingSummary(updated: OnboardingBoutiqueSummary): void {
    const idx = this.onboardingBoutiqueRows.findIndex((r) => r.boutiqueId === updated.boutiqueId);
    if (idx >= 0) {
      this.onboardingBoutiqueRows[idx] = {
        ...this.onboardingBoutiqueRows[idx],
        ...updated
      };
      this.onboardingBoutiqueRows = [...this.onboardingBoutiqueRows];
    }
  }

  private patchOnboardingRow(updated: OnboardingBoutiqueAdminRow): void {
    this.patchOnboardingSummary(updated);
    if (this.selectedOnboardingRow?.boutiqueId === updated.boutiqueId) {
      this.selectedOnboardingRow = updated;
    }
  }

  filteredOnboardingBoutiques(): OnboardingBoutiqueSummary[] {
    return this.filterRows(this.onboardingBoutiqueRows, (r) =>
      [r.shopName, r.vendorId, r.plan, r.statutBoutique, r.notes || ''].join(' ')
    );
  }

  openOnboardingDossier(row: OnboardingBoutiqueSummary): void {
    this.selectedOnboardingRow = null;
    this.activeSection = 'onboarding-detail';
    this.loadOnboardingDetailFromApi(row.boutiqueId);
  }

  backToOnboardingList(): void {
    this.onboardingDetailLoadId++;
    this.selectedOnboardingRow = null;
    this.onboardingDetailLoading = false;
    this.activeSection = 'onboarding-activation';
    this.loadOnboardingBoutiquesFromApi();
  }

  onboardingStepsValides(row: OnboardingBoutiqueSummary): number {
    if ('steps' in row && Array.isArray((row as OnboardingBoutiqueAdminRow).steps)) {
      return (row as OnboardingBoutiqueAdminRow).steps.filter((s) => s.valide).length;
    }
    return row.stepsValides ?? 0;
  }

  onboardingStepsTotal(row: OnboardingBoutiqueSummary): number {
    if ('steps' in row && Array.isArray((row as OnboardingBoutiqueAdminRow).steps)) {
      return (row as OnboardingBoutiqueAdminRow).steps.length;
    }
    return row.stepsTotal ?? 0;
  }

  statutBoutiqueLabel(statut: OnboardingBoutiqueAdminRow['statutBoutique']): string {
    const labels: Record<OnboardingBoutiqueAdminRow['statutBoutique'], string> = {
      brouillon: 'Brouillon',
      kyc_en_cours: 'KYC en cours',
      en_attente_activation: 'En attente activation',
      active: 'Active'
    };
    return labels[statut] || statut;
  }

  statutBoutiqueClass(statut: OnboardingBoutiqueAdminRow['statutBoutique']): string {
    switch (statut) {
      case 'active':
        return 'bg-emerald-100 text-emerald-800';
      case 'en_attente_activation':
        return 'bg-indigo-100 text-indigo-800';
      case 'kyc_en_cours':
        return 'bg-amber-100 text-amber-900';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  }

  /** Classes nav latérale (évite de répéter de longues chaînes dans le HTML) */
  navBtnClass(id: AdminSection): string {
    const on = this.activeSection === id;
    return (
      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ' +
      (on
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40'
        : 'text-slate-400 hover:text-white hover:bg-slate-800')
    );
  }

  get pendingKyc(): number {
    return this.kycQueue.filter(k => k.status === 'pending').length;
  }
  get pendingProducts(): number {
    return this.productQueue.filter(p => p.status === 'pending').length;
  }
  get openAccounts(): number {
    return this.accountReviews.filter(a => a.status === 'open').length;
  }
  get openAccountsSeller(): number {
    return this.accountReviews.filter(a => a.status === 'open' && a.type === 'vendeur').length;
  }
  get openAccountsClient(): number {
    return this.accountReviews.filter(a => a.status === 'open' && a.type === 'client').length;
  }
  get openDisputes(): number {
    return this.disputes.filter(d => d.status !== 'résolu').length;
  }
  get pendingClientReturnsCount(): number {
    return this.clientReturns.filter(
      r => r.status === 'en_attente' || r.status === 'colis_reçu' || r.status === 'approuvé'
    ).length;
  }
  openTicketsCount(audience: TicketAudience): number {
    return this.supportTickets.filter(t => t.audience === audience && t.status !== 'fermé').length;
  }

  approveKyc(r: KycRequest): void {
    if (this.adminActionBusy) return;
    this.adminActionBusy = true;
    this.http
      .patch<{ success: boolean; message?: string }>(`${this.adminApiBase}/kyc/${r.boutiqueId}`, {
        action: 'approve'
      })
      .subscribe({
        next: (res) => {
          this.adminActionBusy = false;
    r.status = 'approved';
          this.toastMessage(res.message || `Boutique ${r.shopName} : KYC approuvé.`);
          this.loadKycQueueFromApi();
        },
        error: () => {
          this.adminActionBusy = false;
          this.toastMessage('Échec validation KYC.');
        }
      });
  }

  rejectKyc(r: KycRequest): void {
    if (this.adminActionBusy) return;
    this.adminActionBusy = true;
    this.http
      .patch<{ success: boolean; message?: string }>(`${this.adminApiBase}/kyc/${r.boutiqueId}`, {
        action: 'reject'
      })
      .subscribe({
        next: (res) => {
          this.adminActionBusy = false;
    r.status = 'rejected';
          this.toastMessage(res.message || `Boutique ${r.shopName} : KYC refusé.`);
          this.loadKycQueueFromApi();
        },
        error: () => {
          this.adminActionBusy = false;
          this.toastMessage('Échec refus KYC.');
        }
      });
  }

  approveProduct(p: ProductModeration): void {
    this.http
      .patch<{ success: boolean; message?: string }>(
        `${this.adminApiBase}/products-moderation/${p.productId}`,
        { action: 'approve' }
      )
      .subscribe({
        next: (res) => {
    p.status = 'approved';
          this.toastMessage(res.message || `Produit « ${p.title} » validé.`);
          this.loadProductQueueFromApi();
        },
        error: () => this.toastMessage('Échec publication produit.')
      });
  }

  rejectProduct(p: ProductModeration): void {
    this.http
      .patch<{ success: boolean; message?: string }>(
        `${this.adminApiBase}/products-moderation/${p.productId}`,
        { action: 'reject' }
      )
      .subscribe({
        next: (res) => {
    p.status = 'rejected';
          this.toastMessage(res.message || `Produit « ${p.title} » retiré.`);
          this.loadProductQueueFromApi();
        },
        error: () => this.toastMessage('Échec retrait produit.')
      });
  }

  resolveAccount(a: AccountReview): void {
    a.status = 'resolved';
    this.toastMessage(`Dossier ${a.id} marqué comme traité.`);
  }

  closeDispute(d: DisputeRow): void {
    d.status = 'résolu';
    this.toastMessage(`Litige ${d.id} clôturé.`);
  }

  openCase(_label: string, ref: string): void {
    this.toastMessage(`Dossier ${ref} — module à connecter à l’API.`);
  }

  openVendorFiche(s: AdminSellerRow): void {
    this.selectedVendor = s;
    this.activeSection = 'vendor-detail';
  }

  backToSellerDirectory(): void {
    this.selectedVendor = null;
    this.activeSection = 'sellers';
  }

  peutActiverBoutique(row: OnboardingBoutiqueAdminRow): boolean {
    return row.steps.every(st => st.valide) && row.statutBoutique !== 'active';
  }

  activerBoutiqueAdmin(row: OnboardingBoutiqueAdminRow): void {
    if (this.adminActionBusy) return;
    if (!this.peutActiverBoutique(row)) {
      this.toastMessage('Complétez toutes les étapes (ou cochez manuellement en interne) avant activation.');
      return;
    }
    this.adminActionBusy = true;
    this.http
      .post<{ success: boolean; message?: string }>(
        `${this.adminApiBase}/onboarding/${row.boutiqueId}/activate`,
        {}
      )
      .subscribe({
        next: (res) => {
          this.adminActionBusy = false;
          this.onboardingBoutiqueRows = this.onboardingBoutiqueRows.filter(
            (r) => r.boutiqueId !== row.boutiqueId
          );
          this.backToOnboardingList();
          this.toastMessage(res.message || `Boutique « ${row.shopName} » activée.`);
        },
        error: (err) => {
          this.adminActionBusy = false;
          this.toastMessage(err.error?.message || 'Activation impossible.');
        }
      });
  }

  forcerEtapeOnboarding(row: OnboardingBoutiqueAdminRow, stepId: string, val: boolean): void {
    if (this.adminActionBusy) return;
    this.adminActionBusy = true;
    this.http
      .patch<{ success: boolean; message?: string; data?: OnboardingBoutiqueAdminRow }>(
        `${this.adminApiBase}/onboarding/${row.boutiqueId}/steps/${stepId}`,
        { valide: val }
      )
      .subscribe({
        next: (res) => {
          this.adminActionBusy = false;
          if (res.data) {
            this.patchOnboardingRow(res.data);
          }
          this.toastMessage(res.message || `Étape ${val ? 'validée' : 'invalidée'}.`);
        },
        error: (err) => {
          this.adminActionBusy = false;
          this.toastMessage(err.error?.message || 'Mise à jour de l’étape impossible.');
        }
      });
  }

  /** Ouvre la pièce KYC (fetch authentifié → blob URL) */
  ouvrirPreuveOnboarding(_row: OnboardingBoutiqueAdminRow, p: OnboardingPreuveFichier): void {
    if (!p.ref) {
      this.toastMessage(`« ${p.libelle} » : aucun fichier référencé.`);
      return;
    }
    this.http.get(p.ref, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener,noreferrer');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: () => {
        this.toastMessage(`Impossible d’ouvrir « ${p.libelle} ».`);
      }
    });
  }

  etatPreuveClass(etat: OnboardingPreuveEtat): string {
    switch (etat) {
      case 'validé':
      case 'déposé':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'en_cours':
        return 'text-amber-800 bg-amber-50 border-amber-200';
      case 'refusé':
      case 'manquant':
        return 'text-rose-800 bg-rose-50 border-rose-200';
      default:
        return 'text-slate-700 bg-slate-50 border-slate-200';
    }
  }

  forcerVerifEmail(s: AdminSellerRow): void {
    this.http
      .patch<{ success: boolean; message?: string }>(
        `${this.adminApiBase}/sellers/${s.vendeurId}/verify-email`,
        {}
      )
      .subscribe({
        next: (res) => {
    s.emailVerif = true;
          this.toastMessage(res.message || `E-mail ${s.email} marqué vérifié.`);
        },
        error: () => this.toastMessage('Impossible de valider l’e-mail.')
      });
  }

  forcerVerifTelephone(s: AdminSellerRow): void {
    this.http
      .patch<{ success: boolean; message?: string }>(
        `${this.adminApiBase}/sellers/${s.vendeurId}/verify-phone`,
        {}
      )
      .subscribe({
        next: (res) => {
    s.telVerif = true;
          this.toastMessage(res.message || 'Téléphone marqué vérifié.');
        },
        error: () => this.toastMessage('Impossible de valider le téléphone.')
      });
  }

  private applyHealthFormula(s: AdminSellerRow): void {
    const base = 40;
    const e = s.emailVerif ? 15 : 0;
    const t = s.telVerif ? 10 : 0;
    const l = Math.min(25, Math.floor(s.listings / 40));
    const st = s.status === 'actif' ? 10 : s.status === 'surveillé' ? 0 : -15;
    s.health = Math.max(0, Math.min(100, base + e + t + l + st));
  }

  recalculateHealthVendeur(s: AdminSellerRow): void {
    this.http
      .post<{ success: boolean; data?: { rows: AdminSellerRow[] }; message?: string }>(
        `${this.adminApiBase}/sellers/recalculate-health`,
        this.santeCriteresPoids
      )
      .subscribe({
        next: (res) => {
          if (res.data?.rows) {
            this.sellersDirectory = res.data.rows;
            const updated = res.data.rows.find((r) => r.vendeurId === s.vendeurId);
            if (updated) {
              this.toastMessage(`Santé recalculée pour ${s.name} : ${updated.health} %.`);
            }
          }
        },
        error: () => this.toastMessage('Recalcul santé impossible.')
      });
  }

  recalculateAllSanteVendeurs(): void {
    this.http
      .post<{ success: boolean; data?: { rows: AdminSellerRow[] }; message?: string }>(
        `${this.adminApiBase}/sellers/recalculate-health`,
        this.santeCriteresPoids
      )
      .subscribe({
        next: (res) => {
          if (res.data?.rows) {
            this.sellersDirectory = res.data.rows;
          }
          this.toastMessage(res.message || 'Recalcul appliqué à toutes les boutiques.');
        },
        error: () => this.toastMessage('Recalcul santé impossible.')
      });
  }

  getSantePoids(k: (typeof this.santePoidsFields)[number]['k']): number {
    return this.santeCriteresPoids[k];
  }

  onSantePoidsChange(k: (typeof this.santePoidsFields)[number]['k'], v: string | number): void {
    const n = typeof v === 'string' ? parseFloat(v) : v;
    this.santeCriteresPoids = {
      ...this.santeCriteresPoids,
      [k]: Number.isFinite(n) ? n : 0
    };
  }

  showNotificationsPanel(): void {
    this.toggleAdminNotificationsPanel();
  }

  closeTicketRow(t: SupportTicketRow): void {
    t.status = 'fermé';
    this.toastMessage(`Ticket ${t.id} clôturé.`);
  }
  maxCsatForChart(): number {
    return Math.max(1, ...this.insightWeeks.map(w => w.csat));
  }
  maxSessionsForChart(): number {
    return Math.max(0.1, ...this.insightWeeks.map(w => w.sessionsK));
  }
  clientReturnLabel(s: ClientReturnStatus): string {
    const m: Record<ClientReturnStatus, string> = {
      en_attente: 'En attente',
      approuvé: 'Approuvé',
      rejeté: 'Rejeté',
      colis_reçu: 'Colis reçu',
      remboursé: 'Remboursé'
    };
    return m[s];
  }

  sectionTitle(): string {
    const map: Record<AdminSection, string> = {
      'queue-kyc': '[Vendeurs] Validation KYC & ouverture boutique',
      'queue-products': '[Vendeurs] Modération & conformité des offres',
      'queue-promotions': '[Vendeurs] Validation coupons & promotions',
      'queue-accounts-seller': '[Vendeurs] Comptes & signalements marchands',
      'queue-accounts-client': '[Clients] Comptes & signalements acheteurs',
      disputes: '[Transverse] Litiges A à Z & médiation',
      sellers: '[Vendeurs] Annuaire & supervision des boutiques',
      'onboarding-activation': '[Vendeurs] Activation & onboarding — liste vendeurs',
      'onboarding-detail': this.selectedOnboardingRow
        ? `[Vendeurs] Dossier onboarding — ${this.selectedOnboardingRow.shopName}`
        : '[Vendeurs] Dossier onboarding',
      'profil-vendeur-verify': '[Vendeurs] Profil & vérifications (e-mail, téléphone)',
      'sante-vendeurs': '[Vendeurs] Santé du compte — critères & recalcul',
      'vendor-detail': '[Vendeurs] Fiche détail boutique',
      buyers: '[Clients] Annuaire acheteurs & risque',
      'client-orders': '[Clients] Commandes & articles',
      'client-returns': '[Clients] Retours & SAV',
      'client-comms': '[Clients] E-mails, SMS & messages sur le site',
      'client-insights': '[Clients] Satisfaction (CSAT) & sessions',
      'client-tickets': '[Clients] Requêtes & support',
      'vendor-returns': '[Vendeurs] Retours & reversements (admin ↔ vendeur)',
      'vendor-comms': '[Vendeurs] E-mails & notifications pro',
      'vendor-tickets': '[Vendeurs] Demandes, litiges, technique',
      'transverse-ops': '[Transverse] Recherche globale & journal d’audit (RGPD)'
    };
    return map[this.activeSection];
  }

  private toastMessage(msg: string): void {
    this.toast = msg;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => (this.toast = ''), 3200);
  }

  filteredKyc(): KycRequest[] {
    return this.filterRows(this.kycQueue, r => [r.shopName, r.owner, r.id, r.country].join(' '));
  }
  filteredProducts(): ProductModeration[] {
    return this.filterRows(this.productQueue, r => [r.title, r.seller, r.id, r.category].join(' '));
  }
  filteredAccountsSeller(): AccountReview[] {
    return this.filterRows(
      this.accountReviews.filter(a => a.type === 'vendeur'),
      r => [r.email, r.id, r.reason].join(' ')
    );
  }
  filteredAccountsClient(): AccountReview[] {
    return this.filterRows(
      this.accountReviews.filter(a => a.type === 'client'),
      r => [r.email, r.id, r.reason].join(' ')
    );
  }

  filteredSellers() {
    return this.filterRows(this.sellersDirectory, r => [r.id, r.name, r.status, String(r.listings)].join(' '));
  }
  filteredBuyers() {
    return this.filterRows(this.buyersDirectory, r => [r.id, r.email, r.segment, r.risk, r.country].join(' '));
  }
  filteredDisputes() {
    return this.filterRows(this.disputes, r => [r.id, r.orderRef, r.buyer, r.seller, r.topic].join(' '));
  }

  filteredAdminOrders(): AdminOrder[] {
    return this.filterRows(this.adminOrders, o =>
      [o.id, o.ref, o.firstName, o.lastName, o.email, o.status].join(' ')
    );
  }
  filteredClientReturns(): ClientReturnRow[] {
    return this.filterRows(this.clientReturns, r =>
      [r.id, r.orderRef, r.customer, r.item, r.reason, this.clientReturnLabel(r.status)].join(' ')
    );
  }
  filteredCommsClient(): CommsLogRow[] {
    return this.filterRows(this.commsClient, r => [r.id, r.to, r.subject, r.preview].join(' '));
  }
  filteredTicketsClient(): SupportTicketRow[] {
    return this.filterRows(
      this.supportTickets.filter(t => t.audience === 'client'),
      t => [t.id, t.from, t.topic, t.status].join(' ')
    );
  }
  filteredTicketsVendor(): SupportTicketRow[] {
    return this.filterRows(
      this.supportTickets.filter(t => t.audience === 'vendeur'),
      t => [t.id, t.from, t.topic, t.status].join(' ')
    );
  }
  filteredVendorReturns(): VendorReturnRow[] {
    return this.filterRows(this.vendorReturns, v =>
      [v.id, v.returnRef, v.orderRef, v.shopName, v.buyer, v.status].join(' ')
    );
  }
  filteredAuditLog(): AuditEventRow[] {
    return this.filterRows(this.auditLog, a => [a.id, a.adminUser, a.target, a.detail, a.kind].join(' '));
  }
  globalSearchHits(): { cat: string; line: string }[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return [];
    const out: { cat: string; line: string }[] = [];
    for (const v of this.vendorReturns) {
      const line = `${v.id} — ${v.shopName} — ${v.orderRef}`;
      if (line.toLowerCase().includes(q)) out.push({ cat: 'Retour (vendeur)', line });
    }
    for (const s of this.sellersDirectory) {
      if (`${s.id} ${s.name}`.toLowerCase().includes(q)) {
        out.push({ cat: 'Boutique', line: `${s.id} — ${s.name}` });
      }
    }
    for (const k of this.kycQueue) {
      const line = `${k.id} — ${k.shopName} — ${k.owner}`;
      if (line.toLowerCase().includes(q)) out.push({ cat: 'KYC', line });
    }
    for (const p of this.productQueue) {
      const line = `${p.id} — ${p.title} — ${p.seller}`;
      if (line.toLowerCase().includes(q)) out.push({ cat: 'Produit', line });
    }
    for (const t of this.supportTickets) {
      const line = `${t.id} — ${t.from} — ${t.topic}`;
      if (line.toLowerCase().includes(q)) out.push({ cat: 'Ticket', line: `${t.audience} / ${line}` });
    }
    for (const o of this.onboardingBoutiqueRows) {
      const line = `${o.boutiqueId} — ${o.shopName}`;
      if (line.toLowerCase().includes(q)) out.push({ cat: 'Onboarding', line });
    }
    return out.slice(0, 24);
  }

  private filterRows<T>(rows: T[], toStr: (row: T) => string): T[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => toStr(r).toLowerCase().includes(q));
  }

  navVendeur: { id: AdminSection; label: string; icon: any; badge?: string }[] = [
    { id: 'queue-kyc', label: 'KYC & boutiques', icon: UserCheck, badge: 'KYC' },
    { id: 'onboarding-activation', label: 'Activation & onboarding', icon: Sparkles, badge: '%' },
    { id: 'queue-products', label: 'Modération produits', icon: Package, badge: 'P' },
    { id: 'queue-promotions', label: 'Coupons & promos', icon: Percent, badge: '%' },
    { id: 'queue-accounts-seller', label: 'Comptes & alertes', icon: AlertTriangle, badge: 'V' },
    { id: 'sellers', label: 'Annuaire vendeurs', icon: Building2 },
    { id: 'profil-vendeur-verify', label: 'Profil & vérif. contact', icon: Phone, badge: '@' },
    { id: 'sante-vendeurs', label: 'Santé compte (critères)', icon: Activity },
    { id: 'vendor-returns', label: 'Retours & reversements', icon: RotateCcw },
    { id: 'vendor-comms', label: 'Messages vendeurs', icon: Mail, badge: 'M' },
    { id: 'vendor-tickets', label: 'Tickets & demandes', icon: LifeBuoy }
  ];
  navClient: { id: AdminSection; label: string; icon: any; badge?: string }[] = [
    { id: 'queue-accounts-client', label: 'Comptes & alertes', icon: Users, badge: 'C' },
    { id: 'buyers', label: 'Annuaire clients', icon: ShoppingBag },
    { id: 'client-orders', label: 'Commandes', icon: ClipboardList },
    { id: 'client-returns', label: 'Retours & SAV', icon: RotateCcw },
    { id: 'client-comms', label: 'Messages & notifs', icon: MessageSquare },
    { id: 'client-insights', label: 'Satisfaction & activité', icon: LineChart },
    { id: 'client-tickets', label: 'Tickets support', icon: LifeBuoy }
  ];
  navTransverse: { id: AdminSection; label: string; icon: any }[] = [
    { id: 'disputes', label: 'Litiges (A ↔ V)', icon: Scale },
    { id: 'transverse-ops', label: 'Recherche & audit', icon: FileSearch }
  ];

  logout(): void {
    this.adminAuth.logout();
    this.router.navigate(['/admin/login']);
  }
}

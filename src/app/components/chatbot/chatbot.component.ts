import {
  Component,
  ElementRef,
  HostListener,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import {
  LucideAngularModule,
  MessageCircle,
  X,
  Send,
  Minimize2,
  Move,
  Sparkles,
  Package,
  HelpCircle,
  RotateCcw,
  Truck,
  CreditCard,
  Search,
  Store,
  BarChart3,
  Megaphone,
  Wallet,
  Tag,
  ShieldCheck,
  Bot,
  User as UserIcon,
  Zap,
  BookOpen,
  PhoneCall,
  Mail,
  ThumbsUp,
  ThumbsDown
} from 'lucide-angular';

export type ChatMode = 'client' | 'seller';

export interface ChatMessage {
  id: number;
  from: 'bot' | 'user';
  text: string;
  time: Date;
  quickReplies?: string[];
  suggestions?: { label: string; action: string; icon?: any }[];
  feedback?: 'up' | 'down';
}

interface QuickAction {
  id: string;
  label: string;
  icon: any;
  prompt: string;
  color: string;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css']
})
export class ChatbotComponent implements OnInit, OnDestroy {
  @ViewChild('chatWindow') chatWindow?: ElementRef<HTMLElement>;
  @ViewChild('messagesEnd') messagesEnd?: ElementRef<HTMLElement>;

  // Icons
  readonly MessageCircle = MessageCircle;
  readonly X = X;
  readonly Send = Send;
  readonly Minimize2 = Minimize2;
  readonly Move = Move;
  readonly Sparkles = Sparkles;
  readonly Package = Package;
  readonly HelpCircle = HelpCircle;
  readonly RotateCcw = RotateCcw;
  readonly Truck = Truck;
  readonly CreditCard = CreditCard;
  readonly Search = Search;
  readonly Store = Store;
  readonly BarChart3 = BarChart3;
  readonly Megaphone = Megaphone;
  readonly Wallet = Wallet;
  readonly Tag = Tag;
  readonly ShieldCheck = ShieldCheck;
  readonly Bot = Bot;
  readonly UserIcon = UserIcon;
  readonly Zap = Zap;
  readonly BookOpen = BookOpen;
  readonly PhoneCall = PhoneCall;
  readonly Mail = Mail;
  readonly ThumbsUp = ThumbsUp;
  readonly ThumbsDown = ThumbsDown;

  // State
  mode: ChatMode = 'client';
  isOpen = false;
  isMinimized = false;
  isTyping = false;
  inputText = '';
  messages: ChatMessage[] = [];
  private msgCounter = 0;
  private hasDragged = false;
  private readonly dragThreshold = 6;

  // Draggable state
  posX = 24; // distance from right
  posY = 24; // distance from bottom
  private dragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private startPosX = 0;
  private startPosY = 0;
  private moveListener?: (e: MouseEvent | TouchEvent) => void;
  private upListener?: () => void;

  private sub = new Subscription();

  constructor(
    private router: Router,
    private zone: NgZone,
    private authService: AuthService
  ) {}

  // =================== Lifecycle ===================
  ngOnInit(): void {
    this.updateModeFromUrl(this.router.url);
    this.sub.add(
      this.router.events
        .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
        .subscribe(e => this.updateModeFromUrl(e.urlAfterRedirects))
    );

    // Restore saved position from localStorage
    try {
      const raw = localStorage.getItem('chatbot-pos');
      if (raw) {
        const saved = JSON.parse(raw);
        if (typeof saved?.x === 'number') this.posX = saved.x;
        if (typeof saved?.y === 'number') this.posY = saved.y;
      }
    } catch {}

    this.clampPosition();
    this.restoreUiState();
    this.restoreConversation();
    if (!this.messages.length) {
      this.pushBotWelcome();
    }
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    this.detachDragListeners();
  }

  private updateModeFromUrl(url: string): void {
    const previous = this.mode;
    const path = (url.split('?')[0] || '').toLowerCase();
    this.mode = path === '/seller' || path.startsWith('/seller/') ? 'seller' : 'client';
    if (previous !== this.mode) {
      this.messages = [];
      this.msgCounter = 0;
      this.restoreConversation();
      if (!this.messages.length) {
        this.pushBotWelcome();
      }
    }
  }

  private storageKey(base: string): string {
    return `${base}-${this.mode}`;
  }

  private restoreUiState(): void {
    try {
      const raw = sessionStorage.getItem(this.storageKey('chatbot-ui'));
      if (!raw) return;
      const ui = JSON.parse(raw);
      if (typeof ui.isOpen === 'boolean') this.isOpen = ui.isOpen;
      if (typeof ui.isMinimized === 'boolean') this.isMinimized = ui.isMinimized;
    } catch {}
  }

  private persistUiState(): void {
    try {
      sessionStorage.setItem(
        this.storageKey('chatbot-ui'),
        JSON.stringify({ isOpen: this.isOpen, isMinimized: this.isMinimized })
      );
    } catch {}
  }

  private restoreConversation(): void {
    try {
      const raw = sessionStorage.getItem(this.storageKey('chatbot-msgs'));
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      this.messages = parsed.map((m: ChatMessage) => ({
        ...m,
        time: new Date(m.time)
      }));
      this.msgCounter = this.messages.reduce((max, m) => Math.max(max, m.id), 0);
    } catch {
      this.messages = [];
      this.msgCounter = 0;
    }
  }

  private persistConversation(): void {
    try {
      sessionStorage.setItem(this.storageKey('chatbot-msgs'), JSON.stringify(this.messages));
    } catch {}
  }

  // =================== UI Getters ===================
  get title(): string {
    return this.mode === 'seller' ? 'Seller Assist' : 'Assistant HELIGXIAM';
  }

  get subtitle(): string {
    if (this.mode === 'seller') {
      return 'Copilote vendeur · Réponses instantanées';
    }
    const user = this.authService.currentUser;
    if (user?.prenom) {
      return `Bonjour ${user.prenom} — comment puis-je vous aider ?`;
    }
    return 'Bonjour ! Comment puis-je vous aider ?';
  }

  get headerGradient(): string {
    return this.mode === 'seller'
      ? 'from-amber-500 via-orange-600 to-red-600'
      : 'from-indigo-600 via-purple-600 to-pink-600';
  }

  get bubbleGradient(): string {
    return this.mode === 'seller'
      ? 'from-amber-400 to-orange-600'
      : 'from-indigo-500 to-purple-600';
  }

  get pulseColor(): string {
    return this.mode === 'seller' ? 'bg-amber-400' : 'bg-emerald-400';
  }

  get quickActions(): QuickAction[] {
    if (this.mode === 'seller') {
      return [
        { id: 'orders', label: 'Commandes à expédier', icon: this.Package, prompt: 'Quelles sont mes commandes à expédier aujourd\'hui ?', color: 'from-amber-500 to-orange-600' },
        { id: 'sales', label: 'Mes ventes', icon: this.BarChart3, prompt: 'Donne-moi un résumé des ventes des 7 derniers jours', color: 'from-indigo-500 to-blue-600' },
        { id: 'buybox', label: 'Buy Box', icon: this.ShieldCheck, prompt: 'Comment améliorer mon taux de Buy Box ?', color: 'from-emerald-500 to-green-600' },
        { id: 'ads', label: 'Sponsored Products', icon: this.Megaphone, prompt: 'Comment lancer une campagne Sponsored Products ?', color: 'from-fuchsia-500 to-pink-600' },
        { id: 'payouts', label: 'Versements', icon: this.Wallet, prompt: 'Quand est mon prochain versement ?', color: 'from-teal-500 to-cyan-600' },
        { id: 'fees', label: 'Frais vendeur', icon: this.Tag, prompt: 'Quels sont les frais appliqués à mes ventes ?', color: 'from-violet-500 to-purple-600' }
      ];
    }
    return [
      { id: 'tracking', label: 'Suivi de commande', icon: this.Package, prompt: 'Où est ma commande ?', color: 'from-indigo-500 to-blue-600' },
      { id: 'return', label: 'Retour / Remboursement', icon: this.RotateCcw, prompt: 'Comment retourner un produit ?', color: 'from-amber-500 to-orange-600' },
      { id: 'shipping', label: 'Livraison', icon: this.Truck, prompt: 'Quels sont les délais de livraison ?', color: 'from-emerald-500 to-green-600' },
      { id: 'payment', label: 'Paiement', icon: this.CreditCard, prompt: 'Quels moyens de paiement acceptez-vous ?', color: 'from-fuchsia-500 to-pink-600' },
      { id: 'product', label: 'Trouver un produit', icon: this.Search, prompt: 'Aide-moi à trouver un produit', color: 'from-teal-500 to-cyan-600' },
      { id: 'guide', label: 'Guide de l\'acheteur', icon: this.BookOpen, prompt: 'Ouvre le guide de l\'acheteur', color: 'from-violet-500 to-purple-600' }
    ];
  }

  // =================== Actions ===================
  onBubbleClick(event: MouseEvent): void {
    if (this.hasDragged) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.toggle();
  }

  toggle(): void {
    if (this.isOpen && !this.isMinimized) {
      this.isMinimized = true;
      this.persistUiState();
      return;
    }
    this.isOpen = true;
    this.isMinimized = false;
    this.persistUiState();
    setTimeout(() => this.scrollToBottom(), 50);
  }

  close(): void {
    this.isOpen = false;
    this.isMinimized = false;
    this.persistUiState();
  }

  minimize(): void {
    this.isMinimized = true;
    this.persistUiState();
  }

  handleQuickAction(a: QuickAction): void {
    if (a.id === 'guide') {
      this.router.navigate(['/guide']);
      this.close();
      return;
    }
    this.sendMessage(a.prompt);
  }

  handleQuickReply(text: string): void {
    this.sendMessage(text);
  }

  handleSuggestion(action: string): void {
    switch (action) {
      case 'goto-guide':
        this.router.navigate(['/guide']);
        this.close();
        return;
      case 'goto-cart':
        this.router.navigate(['/cart']);
        this.close();
        return;
      case 'goto-seller':
        this.router.navigate(['/seller']);
        this.close();
        return;
      case 'goto-sell':
        this.router.navigate(['/sell']);
        this.close();
        return;
      case 'goto-account':
        this.router.navigate(['/account']);
        this.close();
        return;
      case 'goto-profile':
      case 'goto-profile-orders':
        this.router.navigate(['/profile'], { queryParams: { view: 'orders' } });
        this.close();
        return;
      case 'goto-profile-returns':
        this.router.navigate(['/profile'], { queryParams: { view: 'returns' } });
        this.close();
        return;
      case 'goto-search':
        this.router.navigate(['/search']);
        this.close();
        return;
      case 'call':
        window.location.href = 'tel:0170771122';
        return;
      case 'mail':
        window.location.href = 'mailto:support@heligxiam.fr';
        return;
    }
    this.sendMessage(action);
  }

  onInputKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.send();
    }
  }

  send(): void {
    const value = this.inputText.trim();
    if (!value) return;
    this.inputText = '';
    this.sendMessage(value);
  }

  giveFeedback(msg: ChatMessage, value: 'up' | 'down'): void {
    msg.feedback = value;
  }

  resetConversation(): void {
    this.messages = [];
    this.msgCounter = 0;
    try {
      sessionStorage.removeItem(this.storageKey('chatbot-msgs'));
    } catch {}
    this.pushBotWelcome();
  }

  // =================== Messages engine ===================
  private sendMessage(text: string): void {
    this.pushUser(text);
    this.isTyping = true;
    // Simulate latency
    const latency = 500 + Math.min(1500, text.length * 15);
    setTimeout(() => {
      this.isTyping = false;
      this.replyTo(text);
    }, latency);
  }

  private pushBotWelcome(): void {
    if (this.mode === 'seller') {
      this.pushBot(
        'Bonjour ! Je suis **Seller Assist**, votre copilote HELIGXIAM. Commandes, performances, publicité ou versements — que souhaitez-vous faire ?',
        {
          quickReplies: [
            'Commandes à expédier',
            'Mes ventes du jour',
            'Améliorer ma Buy Box',
            'Parler à un conseiller'
          ]
        }
      );
    } else {
      const loggedIn = this.authService.isAuthenticated;
      this.pushBot(
        loggedIn
          ? 'Bonjour ! Je suis l\'**assistant HELIGXIAM**. Je peux vous aider à suivre une commande, lancer un retour ou trouver un produit.'
          : 'Bonjour ! Je suis l\'**assistant HELIGXIAM**. Connectez-vous pour suivre vos commandes, ou posez-moi une question générale.',
        {
          quickReplies: loggedIn
            ? ['Où est ma commande ?', 'Retourner un produit', 'Délais de livraison', 'Parler à un humain']
            : ['Délais de livraison', 'Moyens de paiement', 'Devenir vendeur', 'Parler à un humain'],
          suggestions: loggedIn
            ? [{ label: 'Voir mon profil', action: 'goto-profile', icon: this.UserIcon }]
            : [{ label: 'Se connecter', action: 'goto-account', icon: this.UserIcon }]
        }
      );
    }
  }

  private replyTo(userText: string): void {
    const t = userText.toLowerCase();
    const seller = this.mode === 'seller';

    // ====== Human handoff ======
    if (/humain|agent|conseiller|parler/i.test(t)) {
      this.pushBot(
        seller
          ? 'Bien sûr. Un conseiller vendeur vous rappelle dans les 15 minutes. Pouvez-vous préciser le sujet (commandes, paiements, technique, politique) ?'
          : 'Pas de souci, un conseiller HELIGXIAM peut vous répondre. Vous pouvez :',
        {
          suggestions: seller
            ? [
                { label: '📞 Appeler le support vendeur (5 min)', action: 'goto-account', icon: this.PhoneCall },
                { label: '✉️ Ouvrir un ticket', action: 'goto-seller', icon: this.Mail }
              ]
            : [
                { label: '📞 Appeler le 01 70 77 11 22', action: 'call', icon: this.PhoneCall },
                { label: '✉️ Email support@heligxiam.fr', action: 'mail', icon: this.Mail },
                { label: '📖 Consulter le guide', action: 'goto-guide', icon: this.BookOpen }
              ]
        }
      );
      return;
    }

    // ====== Seller-specific ======
    if (seller) {
      if (/vente|ca|chiffre/i.test(t)) {
        this.pushBot(
          '📊 **Ventes des 7 derniers jours** : 12 847,40 € (+18,2% vs mois précédent)\n• 184 commandes\n• Taux de conversion : 4,26%\n• Buy Box moyenne : 87%\n\nVoulez-vous un rapport détaillé ?',
          {
            quickReplies: ['Rapport par produit', 'Exporter en CSV', 'Comparer par mois']
          }
        );
        return;
      }
      if (/commande|expéd/i.test(t)) {
        this.pushBot(
          '📦 Vous avez **7 commandes en attente** dont 2 urgentes (< 24h). La plus ancienne est la commande #HX-84027 de Léa Bernard (189€, SLA 23h57).',
          {
            suggestions: [{ label: 'Aller au dashboard vendeur', action: 'goto-seller', icon: this.Store }],
            quickReplies: ['Imprimer les étiquettes', 'Marquer comme expédiée']
          }
        );
        return;
      }
      if (/buy\s?box|prix/i.test(t)) {
        this.pushBot(
          '🎯 **Améliorer votre Buy Box** (actuellement 87%) :\n• Activez la retarification automatique\n• Maintenez un stock > 10 unités sur les best-sellers\n• Réduisez vos délais d\'expédition (actuellement 1,2j, objectif < 1j)\n• Gardez votre ODR < 1% (actuellement 0,4% ✅)',
          { quickReplies: ['Activer retarification auto', 'Voir mes produits sans Buy Box'] }
        );
        return;
      }
      if (/pub|campagn|sponsored|ads/i.test(t)) {
        this.pushBot(
          '🚀 **Sponsored Products** multiplie vos ventes par 4,2 en moyenne. Vous avez **850€ de crédits offerts** !\n\n1. Choisissez 5 à 10 produits best-sellers\n2. Budget conseillé : 10-20€/jour\n3. Enchère : automatique pour débuter\n4. Durée : minimum 14 jours pour les premières optimisations',
          {
            suggestions: [{ label: 'Créer ma 1ère campagne', action: 'goto-seller', icon: this.Megaphone }]
          }
        );
        return;
      }
      if (/versement|paiement|argent/i.test(t)) {
        this.pushBot(
          '💰 **Votre prochain versement** : Vendredi 24 avril\n• Solde disponible : 2 487,50€\n• En attente (délai 7j) : 1 248,30€\n• Dernier versement : 1 248,00€\n\nVous pouvez demander un versement anticipé (frais 1%).',
          { quickReplies: ['Versement anticipé', 'Historique des versements'] }
        );
        return;
      }
      if (/frais|commission/i.test(t)) {
        this.pushBot(
          '💳 **Vos frais HELIGXIAM** :\n• Abonnement Pro : 39€/mois\n• Commission variable : 7 à 15% selon catégorie\n• Frais de service FBA : selon taille/poids\n• Publicité : à la performance (coût-par-clic)\n\nAucun frais de mise en vente.',
          {
            suggestions: [{ label: 'Voir la grille complète', action: 'goto-sell', icon: this.Tag }]
          }
        );
        return;
      }
    }

    // ====== Client-specific ======
    if (!seller) {
      if (/commande|suivi|colis|où\s?est/i.test(t)) {
        const ordersAction = this.authService.isAuthenticated ? 'goto-profile-orders' : 'goto-account';
        const ordersLabel = this.authService.isAuthenticated ? 'Voir mes commandes' : 'Me connecter pour suivre';
        this.pushBot(
          this.authService.isAuthenticated
            ? '📦 Consultez **Mon profil → Commandes** pour le suivi en temps réel de vos colis.'
            : '📦 Connectez-vous pour accéder au suivi de vos commandes en temps réel.',
          {
            suggestions: [{ label: ordersLabel, action: ordersAction, icon: this.Package }],
            quickReplies: ['Délai de livraison moyen', 'Colis en retard', 'Parler à un humain']
          }
        );
        return;
      }
      if (/retour|remboursement|renvoi/i.test(t)) {
        const returnsAction = this.authService.isAuthenticated ? 'goto-profile-returns' : 'goto-account';
        this.pushBot(
          '↩️ **Retours sous 60 jours, gratuits** :\n1. Profil → Commandes\n2. Sélectionnez le produit\n3. Choisissez le motif\n4. Imprimez le bordereau prépayé\n\nRemboursement sous 5 jours ouvrés.',
          {
            suggestions: [{
              label: this.authService.isAuthenticated ? 'Lancer un retour' : 'Se connecter',
              action: returnsAction,
              icon: this.RotateCcw
            }]
          }
        );
        return;
      }
      if (/livraison|délai|express|premium/i.test(t)) {
        this.pushBot(
          '🚚 **Nos modes de livraison** :\n• Standard (3-5j) — gratuite dès 25€\n• Express 48h — 4,99€\n• Premium (jour suivant) — gratuit avec abonnement 5,99€/mois\n• Point relais Hub (2-4j) — gratuit\n\nLivraison en France métropolitaine et DOM.',
          { quickReplies: ['Essayer Premium 30j gratuit', 'Trouver un point relais'] }
        );
        return;
      }
      if (/paiement|carte|paypal|fois/i.test(t)) {
        this.pushBot(
          '💳 **Paiements acceptés** :\n• CB (Visa, Mastercard, Amex)\n• Apple Pay & Google Pay\n• PayPal\n• Paiement en 3× ou 4× sans frais dès 100€\n• Virement bancaire pour les achats > 500€\n\nToutes les transactions sont sécurisées par cryptage bancaire.',
          { quickReplies: ['Fractionner mon paiement', 'Mes moyens de paiement'] }
        );
        return;
      }
      if (/produit|cherch|trouv|recomm/i.test(t)) {
        this.pushBot(
          '🔍 Dites-moi ce que vous cherchez (catégorie, marque, budget) et je trouverai les meilleurs produits pour vous. Par exemple : "Casque audio bluetooth moins de 150€".',
          {
            suggestions: [{ label: 'Ouvrir la recherche', action: 'goto-search', icon: this.Search }],
            quickReplies: ['Idées cadeaux', 'Meilleures ventes', 'Outlet']
          }
        );
        return;
      }
      if (/guide|aide|bienvenue/i.test(t)) {
        this.pushBot(
          '📖 Le **guide acheteur** couvre livraison, retours, garanties, coupons et abonnement Premium.',
          {
            suggestions: [{ label: 'Ouvrir le guide', action: 'goto-guide', icon: this.BookOpen }]
          }
        );
        return;
      }
      if (/vendre|vendeur|boutique/i.test(t)) {
        this.pushBot(
          '🏪 Vous souhaitez **vendre sur HELIGXIAM** ? Nos vendeurs bénéficient de jusqu\'à 47 250€ d\'avantages (crédits pub, logistique offerte, accompagnement dédié).',
          {
            suggestions: [{ label: 'Devenir vendeur', action: 'goto-sell', icon: this.Store }]
          }
        );
        return;
      }
    }

    // ====== Fallback ======
    this.pushBot(
      seller
        ? 'Je n\'ai pas de réponse précise sur ce sujet. Choisissez une catégorie ou parlez à un conseiller vendeur.'
        : 'Je ne suis pas sûr d\'avoir compris. Pouvez-vous reformuler, ou choisir l\'un des raccourcis ci-dessous ?',
      {
        quickReplies: seller
          ? ['Mes commandes', 'Mes ventes', 'Parler à un conseiller']
          : ['Suivi commande', 'Retour produit', 'Livraison', 'Parler à un humain']
      }
    );
  }

  private pushUser(text: string): void {
    this.messages.push({
      id: ++this.msgCounter,
      from: 'user',
      text,
      time: new Date()
    });
    this.persistConversation();
    this.scrollToBottom();
  }

  private pushBot(
    text: string,
    opts: { quickReplies?: string[]; suggestions?: ChatMessage['suggestions'] } = {}
  ): void {
    this.messages.push({
      id: ++this.msgCounter,
      from: 'bot',
      text,
      time: new Date(),
      quickReplies: opts.quickReplies,
      suggestions: opts.suggestions
    });
    this.persistConversation();
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      this.messagesEnd?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 30);
  }

  // =================== Draggable ===================
  startDrag(event: MouseEvent | TouchEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('button') && !target.closest('.chatbot-drag-handle')) return;
    if (target.closest('a')) return;

    event.preventDefault();
    this.dragging = true;
    this.hasDragged = false;
    const { x, y } = this.getEventCoords(event);
    this.dragStartX = x;
    this.dragStartY = y;
    this.startPosX = this.posX;
    this.startPosY = this.posY;

    this.zone.runOutsideAngular(() => {
      this.moveListener = (e: MouseEvent | TouchEvent) => this.onDragMove(e);
      this.upListener = () => this.endDrag();
      document.addEventListener('mousemove', this.moveListener as EventListener, { passive: false });
      document.addEventListener('mouseup', this.upListener);
      document.addEventListener('touchmove', this.moveListener as EventListener, { passive: false });
      document.addEventListener('touchend', this.upListener);
    });
  }

  private onDragMove(event: MouseEvent | TouchEvent): void {
    if (!this.dragging) return;
    if (event.cancelable) event.preventDefault();
    const { x, y } = this.getEventCoords(event);
    const deltaX = x - this.dragStartX;
    const deltaY = y - this.dragStartY;
    if (Math.abs(deltaX) > this.dragThreshold || Math.abs(deltaY) > this.dragThreshold) {
      this.hasDragged = true;
    }

    // posX is distance from right, posY from bottom → invert deltas
    let newX = this.startPosX - deltaX;
    let newY = this.startPosY - deltaY;

    // Clamp to viewport
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = this.chatWindow?.nativeElement.offsetWidth ?? 80;
    const h = this.chatWindow?.nativeElement.offsetHeight ?? 80;
    newX = Math.max(8, Math.min(newX, vw - w - 8));
    newY = Math.max(8, Math.min(newY, vh - h - 8));

    this.zone.run(() => {
      this.posX = newX;
      this.posY = newY;
    });
  }

  private clampPosition(): void {
    if (typeof window === 'undefined') return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = this.isOpen && !this.isMinimized ? 380 : 56;
    const h = this.isOpen && !this.isMinimized ? 560 : 56;
    this.posX = Math.max(8, Math.min(this.posX, vw - w - 8));
    this.posY = Math.max(8, Math.min(this.posY, vh - h - 8));
  }

  private endDrag(): void {
    if (!this.dragging) return;
    this.dragging = false;
    this.detachDragListeners();
    try {
      localStorage.setItem('chatbot-pos', JSON.stringify({ x: this.posX, y: this.posY }));
    } catch {}
  }

  private detachDragListeners(): void {
    if (this.moveListener) {
      document.removeEventListener('mousemove', this.moveListener as EventListener);
      document.removeEventListener('touchmove', this.moveListener as EventListener);
      this.moveListener = undefined;
    }
    if (this.upListener) {
      document.removeEventListener('mouseup', this.upListener);
      document.removeEventListener('touchend', this.upListener);
      this.upListener = undefined;
    }
  }

  private getEventCoords(event: MouseEvent | TouchEvent): { x: number; y: number } {
    if (event instanceof TouchEvent || 'touches' in event) {
      const te = event as TouchEvent;
      const touch = te.touches[0] || te.changedTouches[0];
      return { x: touch.clientX, y: touch.clientY };
    }
    const me = event as MouseEvent;
    return { x: me.clientX, y: me.clientY };
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.clampPosition();
  }

  // Helpers for template
  formatText(text: string): string {
    // Simple ** bold ** and \n line breaks
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>');
  }

  formatTime(d: Date): string {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
}

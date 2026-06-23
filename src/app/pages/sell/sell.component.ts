import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  Store,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Play,
  Package,
  Truck,
  Megaphone,
  TrendingUp,
  Globe,
  Shield,
  Award,
  FileCheck,
  CreditCard,
  Building2,
  Receipt,
  Tag,
  Sparkles,
  DollarSign,
  Users,
  BarChart3,
  Headphones,
  GraduationCap,
  Zap
} from 'lucide-angular';

interface PricingPlan {
  name: string;
  subtitle: string;
  price: string;
  priceUnit: string;
  description: string;
  features: { label: string; included: boolean }[];
  cta: string;
  highlight?: boolean;
  badge?: string;
}

interface Step {
  id: string;
  num: string;
  title: string;
  subtitle: string;
  icon: any;
}

interface FaqItem {
  question: string;
  answer: string;
  open?: boolean;
}

interface CategoryRestriction {
  name: string;
  examples: string;
  authorization: 'open' | 'professional' | 'request' | 'restricted';
}

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  company: string;
  metric: string;
  image: string;
  avatar: string;
}

@Component({
  selector: 'app-sell',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LucideAngularModule],
  templateUrl: './sell.component.html',
  styleUrl: './sell.component.css'
})
export class SellComponent implements OnInit {
  // Icons
  readonly Store = Store;
  readonly Check = Check;
  readonly X = X;
  readonly ChevronDown = ChevronDown;
  readonly ChevronRight = ChevronRight;
  readonly Play = Play;
  readonly Package = Package;
  readonly Truck = Truck;
  readonly Megaphone = Megaphone;
  readonly TrendingUp = TrendingUp;
  readonly Globe = Globe;
  readonly Shield = Shield;
  readonly Award = Award;
  readonly FileCheck = FileCheck;
  readonly CreditCard = CreditCard;
  readonly Building2 = Building2;
  readonly Receipt = Receipt;
  readonly Tag = Tag;
  readonly Sparkles = Sparkles;
  readonly DollarSign = DollarSign;
  readonly Users = Users;
  readonly BarChart3 = BarChart3;
  readonly Headphones = Headphones;
  readonly GraduationCap = GraduationCap;
  readonly Zap = Zap;

  // Active section for sticky sidebar
  activeSection = 'preparez';

  // Revenue calculator
  calcPrice = 49;
  calcShipping = 4.5;
  calcCost = 15;
  calcPlan: 'individuel' | 'pro' = 'pro';

  // Pricing plans
  readonly pricingPlans: PricingPlan[] = [
    {
      name: 'Particulier',
      subtitle: 'Pour tester la vente en ligne',
      price: '0,50€',
      priceUnit: 'par article vendu',
      description: 'Idéal si vous prévoyez de vendre moins de 40 articles par mois.',
      features: [
        { label: 'Jusqu\'à 40 ventes par mois', included: true },
        { label: 'Accès au catalogue HELIGXIAM', included: true },
        { label: 'Expédition par le vendeur', included: true },
        { label: 'Service client HELIGXIAM', included: true },
        { label: 'Publicité sponsorisée', included: false },
        { label: 'Analyses avancées', included: false },
        { label: 'Gestion multi-utilisateurs', included: false },
        { label: 'API de gestion de stock', included: false }
      ],
      cta: 'Choisir Particulier'
    },
    {
      name: 'Professionnel',
      subtitle: 'Pour développer votre activité',
      price: '29€',
      priceUnit: 'par mois (HT) + commission',
      description: 'Recommandé pour plus de 40 ventes par mois. Toutes les fonctionnalités avancées.',
      features: [
        { label: 'Ventes illimitées', included: true },
        { label: 'Accès au catalogue HELIGXIAM', included: true },
        { label: 'Logistique HELIGXIAM (FBA)', included: true },
        { label: 'Service client HELIGXIAM', included: true },
        { label: 'Publicité sponsorisée', included: true },
        { label: 'Analyses avancées en temps réel', included: true },
        { label: 'Gestion multi-utilisateurs', included: true },
        { label: 'API de gestion de stock', included: true }
      ],
      cta: 'Commencer avec Pro',
      highlight: true,
      badge: 'Recommandé'
    }
  ];

  // Steps navigation
  readonly steps: Step[] = [
    { id: 'preparez', num: '01', title: 'Préparez-vous à vendre', subtitle: 'Choisissez votre plan', icon: this.Award },
    { id: 'compte', num: '02', title: 'Créez votre compte', subtitle: 'Documents & vérification', icon: this.FileCheck },
    { id: 'tva', num: '03', title: 'Conformité TVA', subtitle: 'Réglementation française & UE', icon: this.Receipt },
    { id: 'produits', num: '04', title: 'Listez vos produits', subtitle: 'Catalogue & fiches produit', icon: this.Tag },
    { id: 'livraison', num: '05', title: 'Livrez les produits', subtitle: 'Logistique HELIGXIAM ou vendeur', icon: this.Truck },
    { id: 'clients', num: '06', title: 'Attirez des clients', subtitle: 'Publicité & promotions', icon: this.Megaphone },
    { id: 'developpez', num: '07', title: 'Développez-vous', subtitle: 'Europe & outils avancés', icon: this.TrendingUp }
  ];

  // Verification table for step 2
  readonly verificationItems = [
    { type: 'Identité du point de contact', doc: 'Pièce d\'identité en cours de validité (CNI, passeport)', icon: this.Users },
    { type: 'Légitimité de l\'entreprise', doc: 'Extrait Kbis de moins de 3 mois (vendeurs pro)', icon: this.Building2 },
    { type: 'Adresse professionnelle', doc: 'Facture EDF/eau/téléphone ou relevé bancaire récent', icon: this.Package },
    { type: 'Relation commerciale', doc: 'Contrat de travail, certificat d\'actionnaire ou lettre d\'autorisation', icon: this.FileCheck },
    { type: 'Carte bancaire', doc: 'Carte active avec CVV/CVC pour frais d\'abonnement', icon: this.CreditCard },
    { type: 'Compte bancaire', doc: 'RIB/IBAN pour recevoir les versements (relevé si non vérifié auto)', icon: this.DollarSign }
  ];

  // Category restrictions
  readonly categoryRestrictions: CategoryRestriction[] = [
    { name: 'Livres, Musique, Films', examples: 'Romans, vinyles, DVD, Blu-ray', authorization: 'open' },
    { name: 'Informatique & High-Tech', examples: 'Laptops, smartphones, accessoires', authorization: 'open' },
    { name: 'Mode & Accessoires', examples: 'Vêtements, chaussures, bijoux', authorization: 'professional' },
    { name: 'Beauté & Parfumerie', examples: 'Parfums, maquillage, soins', authorization: 'professional' },
    { name: 'Automobile & Motos', examples: 'Pièces, accessoires, outillage', authorization: 'request' },
    { name: 'Produits d\'épicerie', examples: 'Alimentation, boissons, thé', authorization: 'request' },
    { name: 'Santé & Parapharmacie', examples: 'Compléments alimentaires, dispositifs médicaux', authorization: 'request' },
    { name: 'Armes & Armes à feu', examples: 'Toutes armes', authorization: 'restricted' },
    { name: 'Tabac & Alcools forts', examples: 'Produits soumis à accises', authorization: 'restricted' }
  ];

  // Commission rates
  readonly commissionRates = [
    { category: 'Électronique', rate: '7 %', min: '0,30€' },
    { category: 'Informatique', rate: '7 %', min: '0,30€' },
    { category: 'Livres, Musique, Films', rate: '15 %', min: '0,81€' },
    { category: 'Mode & Accessoires', rate: '15 %', min: '0,81€' },
    { category: 'Bijoux', rate: '20 %', min: '0,30€' },
    { category: 'Beauté', rate: '15 %', min: '0,30€' },
    { category: 'Maison & Cuisine', rate: '15 %', min: '0,30€' },
    { category: 'Jouets & Jeux', rate: '15 %', min: '0,30€' },
    { category: 'Sports & Loisirs', rate: '15 %', min: '0,30€' },
    { category: 'Automobile', rate: '12 %', min: '0,30€' }
  ];

  // Testimonials
  readonly testimonials: Testimonial[] = [
    {
      quote: 'Nous avons doublé notre chiffre d\'affaires en 8 mois grâce à la visibilité HELIGXIAM et à la logistique intégrée.',
      author: 'Marie Dubois',
      role: 'Fondatrice',
      company: 'Maison Lumière',
      metric: '+186% de CA en 8 mois',
      image: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=800&q=80',
      avatar: 'https://i.pravatar.cc/100?img=47'
    },
    {
      quote: 'La plateforme nous a permis de toucher toute l\'Europe sans investir dans 5 sites e-commerce différents.',
      author: 'Thomas Laurent',
      role: 'Directeur commercial',
      company: 'Atelier Parisien',
      metric: '22 pays livrés',
      image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80',
      avatar: 'https://i.pravatar.cc/100?img=12'
    },
    {
      quote: 'Les outils publicitaires et les analyses en temps réel ont transformé notre stratégie. On sait exactement où investir.',
      author: 'Sophie Martin',
      role: 'CEO',
      company: 'Beauté Bio Paris',
      metric: '4,2× ROI publicité',
      image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80',
      avatar: 'https://i.pravatar.cc/100?img=44'
    }
  ];

  // Stats
  readonly stats = [
    { value: '15 000+', label: 'produits référencés' },
    { value: '800K+', label: 'visiteurs uniques / mois' },
    { value: '4,6/5', label: 'satisfaction client' },
    { value: '48h', label: 'délai moyen de versement' }
  ];

  // Benefits grid
  readonly benefits = [
    { icon: this.Users, title: 'Une audience qualifiée', text: '800K+ visiteurs uniques par mois, des clients prêts à acheter.' },
    { icon: this.Truck, title: 'Logistique clé en main', text: 'Stockage, préparation, expédition et retours gérés par nos équipes.' },
    { icon: this.Globe, title: 'Vendez dans toute l\'Europe', text: 'Un compte unique pour FR, DE, IT, ES et UK.' },
    { icon: this.Shield, title: 'Paiements sécurisés', text: 'Versements automatiques toutes les 2 semaines, protection vendeur.' },
    { icon: this.BarChart3, title: 'Analyses en temps réel', text: 'Tableau de bord avec ventes, conversions, audiences et stocks.' },
    { icon: this.Headphones, title: 'Support dédié 7j/7', text: 'Une équipe d\'experts accompagne les nouveaux vendeurs 90 jours.' },
    { icon: this.GraduationCap, title: 'HELIGXIAM Academy', text: 'Des dizaines de tutos vidéo pour apprendre à vendre mieux.' },
    { icon: this.Sparkles, title: '47 250€ d\'avantages', text: 'Primes de bienvenue cumulées sur votre première année.' }
  ];

  // FAQ
  faqItems: FaqItem[] = [
    {
      question: 'Quel type de produits puis-je vendre sur HELIGXIAM ?',
      answer: 'Tous les produits neufs conformes à la réglementation française et européenne : électronique, mode, maison, beauté, sport, automobile… Les marques protégées nécessitent une autorisation du propriétaire. Les produits contrefaits, dangereux ou interdits par la loi sont strictement interdits.'
    },
    {
      question: 'Pourquoi vendre sur HELIGXIAM plutôt qu\'ailleurs ?',
      answer: 'Des frais 30% inférieurs aux grandes marketplaces, une audience française qualifiée de 800K+ visiteurs uniques par mois, une logistique intégrée, des primes de bienvenue allant jusqu\'à 47 250€ et un accompagnement humain 90 jours.'
    },
    {
      question: 'Quelles sont les erreurs à éviter quand on débute ?',
      answer: 'Les 5 erreurs les plus fréquentes : des photos de mauvaise qualité, un titre produit mal structuré (pas optimisé pour la recherche), un prix mal positionné par rapport à la concurrence, un stock insuffisant avant un pic de demande, et ne pas répondre aux avis clients. Notre équipe onboarding vous aide à les éviter.'
    },
    {
      question: 'Quelles sont les primes pour les nouveaux vendeurs ?',
      answer: 'Jusqu\'à 47 250€ cumulés sur votre première année : 10% de cashback sur les 45 000 premiers euros de ventes (puis 5% jusqu\'à 900 000€), 90€ de crédit frais d\'expédition, 850€ de crédits pour la publicité sponsorisée, et 45€ de crédit pour créer des bons de réduction.'
    },
    {
      question: 'Combien coûtent les frais de vente ?',
      answer: 'Les commissions varient de 7% (Électronique, Informatique) à 20% (Bijoux) selon la catégorie, avec un minimum fixe de 0,30€ à 0,81€ par transaction. Aucune commission sur les produits non vendus. La grille complète est dans la section "Préparez-vous" ci-dessus.'
    },
    {
      question: 'Combien de temps pour ouvrir un compte vendeur ?',
      answer: 'Le formulaire prend 10 à 15 minutes. La vérification des documents (pièce d\'identité, Kbis, RIB) dure en général 24 à 72h ouvrées. Une fois validé, vous pouvez lister vos premiers produits immédiatement.'
    },
    {
      question: 'Puis-je vendre dans d\'autres pays européens ?',
      answer: 'Oui. Avec un seul compte HELIGXIAM, vous pouvez lister et vendre sur heligxiam.fr, .de, .it, .es et .co.uk. La logistique pan-européenne prend en charge les envois depuis nos 12 centres de distribution en Europe.'
    },
    {
      question: 'Comment suis-je payé ?',
      answer: 'Les versements sont automatiques toutes les 2 semaines sur le compte bancaire renseigné à l\'inscription. Vous pouvez aussi demander un virement anticipé via le tableau de bord (sous conditions).'
    }
  ];

  ngOnInit(): void {
    // Smooth scroll to hash on load
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      setTimeout(() => this.scrollToSection(hash), 100);
    }
  }

  scrollToSection(id: string): void {
    const el = document.getElementById(id);
    if (!el) return;
    const offset = 100;
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
    this.activeSection = id;
  }

  toggleFaq(index: number): void {
    this.faqItems = this.faqItems.map((item, i) =>
      i === index ? { ...item, open: !item.open } : item
    );
  }

  @HostListener('window:scroll')
  onScroll(): void {
    let current = this.activeSection;
    for (const step of this.steps) {
      const el = document.getElementById(step.id);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (rect.top <= 150) {
        current = step.id;
      }
    }
    if (current !== this.activeSection) {
      this.activeSection = current;
    }
  }

  // Revenue calculator
  get calcSubtotal(): number {
    return this.calcPrice + this.calcShipping;
  }

  get calcCommissionRate(): number {
    return 0.12;
  }

  get calcCommissionAmount(): number {
    return +(this.calcSubtotal * this.calcCommissionRate).toFixed(2);
  }

  get calcFbaFee(): number {
    return this.calcPlan === 'pro' ? 3.5 : 0;
  }

  get calcMonthlyFee(): number {
    return this.calcPlan === 'pro' ? 29 : 0;
  }

  get calcPerItemFee(): number {
    return this.calcPlan === 'individuel' ? 0.5 : 0;
  }

  get calcNetRevenue(): number {
    return +(
      this.calcSubtotal - this.calcCommissionAmount - this.calcFbaFee - this.calcPerItemFee - this.calcCost
    ).toFixed(2);
  }

  get calcMargin(): number {
    if (this.calcPrice === 0) return 0;
    return +((this.calcNetRevenue / this.calcPrice) * 100).toFixed(1);
  }

  get calcBreakEvenVolume(): number {
    if (this.calcNetRevenue <= 0) return 0;
    return Math.ceil(29 / this.calcNetRevenue);
  }

  getAuthorizationLabel(auth: CategoryRestriction['authorization']): string {
    switch (auth) {
      case 'open': return 'Ouverte à tous';
      case 'professional': return 'Compte Pro requis';
      case 'request': return 'Sur demande';
      case 'restricted': return 'Interdite';
    }
  }

  getAuthorizationColor(auth: CategoryRestriction['authorization']): string {
    switch (auth) {
      case 'open': return 'bg-green-100 text-green-700 border-green-200';
      case 'professional': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'request': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'restricted': return 'bg-red-100 text-red-700 border-red-200';
    }
  }
}

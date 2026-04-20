import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/auth.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ProfileComponent implements OnInit, OnDestroy {
  currentView: 'dashboard' | 'orders' | 'purchases' | 'wishlist' | 'addresses' | 'payments' | 'reviews' | 'messages' | 'settings' | 'security' | 'help' = 'dashboard';

  private authSubscription?: Subscription;

  // Données utilisateur (alimentées par l'AuthService après connexion)
  userInfo = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    avatar: '/assets/images/default-avatar.png',
    memberSince: new Date(),
    userType: 'client',
    verified: true,
    level: 'Gold'
  };

  // Statistiques
  stats = {
    totalOrders: 24,
    totalPurchases: 18,
    totalSpent: 2847.50,
    savedItems: 12,
    reviews: 8,
    averageRating: 4.5
  };

  // Commandes récentes
  recentOrders = [
    {
      id: 'CMD-2024-001',
      date: new Date('2024-03-10'),
      status: 'delivered',
      total: 125.99,
      items: 3,
      seller: 'TechStore Pro'
    },
    {
      id: 'CMD-2024-002', 
      date: new Date('2024-03-08'),
      status: 'shipped',
      total: 89.50,
      items: 2,
      seller: 'Fashion Hub'
    },
    {
      id: 'CMD-2024-003',
      date: new Date('2024-03-05'),
      status: 'processing',
      total: 234.75,
      items: 5,
      seller: 'ElectroMarket'
    }
  ];

  // Adresses
  addresses = [
    {
      id: 1,
      type: 'principal',
      name: 'Domicile',
      street: '123 Avenue des Champs-Élysées',
      city: 'Paris',
      postalCode: '75008',
      country: 'France',
      phone: '0612345678'
    },
    {
      id: 2,
      type: 'secondary',
      name: 'Bureau',
      street: '45 Rue de la Paix',
      city: 'Lyon',
      postalCode: '69000',
      country: 'France',
      phone: '0612345678'
    }
  ];

  // Méthodes de paiement
  paymentMethods = [
    {
      id: 1,
      type: 'card',
      name: 'Carte Visa',
      last4: '4242',
      expiry: '12/25',
      isDefault: true
    },
    {
      id: 2,
      type: 'card',
      name: 'Carte Mastercard',
      last4: '8888',
      expiry: '08/24',
      isDefault: false
    },
    {
      id: 3,
      type: 'paypal',
      name: 'PayPal',
      email: 'jean.dupont@email.com',
      isDefault: false
    }
  ];

  // Liste de souhaits
  wishlist = [
    {
      id: 1,
      name: 'iPhone 15 Pro Max',
      price: 1299.99,
      seller: 'TechStore Pro',
      rating: 4.8,
      image: '/assets/products/iphone15.jpg',
      discount: 10
    },
    {
      id: 2,
      name: 'MacBook Air M2',
      price: 999.99,
      seller: 'Apple Store',
      rating: 4.9,
      image: '/assets/products/macbook.jpg',
      discount: 0
    }
  ];

  // Messages
  messages = [
    {
      id: 1,
      sender: 'TechStore Pro',
      subject: 'Votre commande CMD-2024-001 a été expédiée',
      date: new Date('2024-03-10'),
      read: false,
      type: 'order'
    },
    {
      id: 2,
      sender: 'Fashion Hub',
      subject: 'Promotion spéciale -30% sur tout le site',
      date: new Date('2024-03-09'),
      read: true,
      type: 'promo'
    }
  ];

  // Formulaires
  profileForm: FormGroup = new FormGroup({});
  addressForm: FormGroup = new FormGroup({});
  paymentForm: FormGroup = new FormGroup({});

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    if (!this.authService.isAuthenticated) {
      this.router.navigate(['/account']);
      return;
    }

    this.authSubscription = this.authService.authState$.subscribe(state => {
      if (!state.isAuthenticated) {
        this.router.navigate(['/account']);
        return;
      }
      if (state.user) {
        this.syncUserInfo(state.user);
      }
    });
  }

  ngOnDestroy(): void {
    this.authSubscription?.unsubscribe();
  }

  private syncUserInfo(user: User): void {
    this.userInfo = {
      ...this.userInfo,
      firstName: user.prenom,
      lastName: user.nom,
      email: user.email,
      memberSince: user.created_at ? new Date(user.created_at) : new Date(),
      userType: user.role
    };

    this.profileForm.patchValue({
      firstName: user.prenom,
      lastName: user.nom,
      email: user.email
    });
  }

  initializeForms(): void {
    this.profileForm = this.fb.group({
      firstName: [this.userInfo.firstName, Validators.required],
      lastName: [this.userInfo.lastName, Validators.required],
      email: [this.userInfo.email, [Validators.required, Validators.email]],
      phone: [this.userInfo.phone, Validators.pattern('^[0-9]{10}$')],
      bio: ['']
    });

    this.addressForm = this.fb.group({
      name: ['', Validators.required],
      street: ['', Validators.required],
      city: ['', Validators.required],
      postalCode: ['', Validators.required],
      country: ['', Validators.required],
      phone: ['', Validators.pattern('^[0-9]{10}$')]
    });

    this.paymentForm = this.fb.group({
      cardNumber: ['', [Validators.required, Validators.pattern('^[0-9]{16}$')]],
      cardName: ['', Validators.required],
      expiry: ['', Validators.required],
      cvv: ['', [Validators.required, Validators.pattern('^[0-9]{3}$')]]
    });
  }

  switchView(view: typeof this.currentView): void {
    this.currentView = view;
  }

  saveProfile(): void {
    if (this.profileForm.valid) {
      console.log('Profil sauvegardé:', this.profileForm.value);
      // Logique de sauvegarde
    }
  }

  addAddress(): void {
    if (this.addressForm.valid) {
      console.log('Adresse ajoutée:', this.addressForm.value);
      // Logique d'ajout d'adresse
      this.addressForm.reset();
    }
  }

  addPaymentMethod(): void {
    if (this.paymentForm.valid) {
      console.log('Méthode de paiement ajoutée:', this.paymentForm.value);
      // Logique d'ajout de paiement
      this.paymentForm.reset();
    }
  }

  removeFromWishlist(itemId: number): void {
    this.wishlist = this.wishlist.filter(item => item.id !== itemId);
  }

  markMessageAsRead(messageId: number): void {
    const message = this.messages.find(m => m.id === messageId);
    if (message) {
      message.read = true;
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'delivered': return 'text-green-600 bg-green-100';
      case 'shipped': return 'text-blue-600 bg-blue-100';
      case 'processing': return 'text-yellow-600 bg-yellow-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'delivered': return 'Livré';
      case 'shipped': return 'Expédié';
      case 'processing': return 'En traitement';
      case 'cancelled': return 'Annulé';
      default: return status;
    }
  }

  logout(): void {
    this.authService.logout();
  }
}

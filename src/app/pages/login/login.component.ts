import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Observable, of } from 'rxjs';
import { finalize, catchError } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { LoginRequest, RegisterRequest, ChallengeResponse, UserRole } from '../../models/auth.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit {
  currentView: 'login' | 'register' | 'forgot-password' | 'privacy' = 'login';
  today: Date = new Date();
  
  loginForm: FormGroup = new FormGroup({});
  registerForm: FormGroup = new FormGroup({});
  forgotPasswordForm: FormGroup = new FormGroup({});
  
  showPassword: boolean = false;
  showRegisterPassword: boolean = false;
  showConfirmPassword: boolean = false;
  
  loginError: string = '';
  registerError: string = '';
  forgotPasswordSuccess: string = '';
  forgotPasswordError: string = '';

  // Popup de succès d'inscription
  showRegisterSuccessModal: boolean = false;
  registeredUserName: string = '';
  /** Rôle réellement soumis (le modal ne doit pas dépendre d’un changement ultérieur de sellerMode). */
  registerSuccessWasVendeur = false;

  // Mode vendeur (pré-rempli via query param ?role=seller)
  sellerMode: boolean = false;

  isLoading: boolean = false;
  
  // Proof of Work
  currentChallenge: string = '';
  challengeDifficulty: number = 4;
  isCalculatingProof: boolean = false;
  
  // Password strength
  passwordStrength: 'weak' | 'medium' | 'strong' = 'weak';
  
  // Captcha properties pour compatibilité avec le template
  captchaText: string = '';
  generatedCaptcha: string = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {
    this.initializeForms();
    this.generateCaptcha();
  }

  ngOnInit(): void {
    // Écouter les erreurs d'authentification
    this.authService.authState$.subscribe(state => {
      if (state.error) {
        if (this.currentView === 'login') {
          this.loginError = state.error;
        } else if (this.currentView === 'register') {
          this.registerError = state.error;
        }
        this.cdr.detectChanges();
      }
    });

    // Lecture des query params : ?mode=register&role=seller
    this.route.queryParamMap.subscribe(params => {
      const mode = params.get('mode');
      const role = params.get('role');

      if (mode === 'register') {
        this.currentView = 'register';
      }

      if (role === 'seller' || role === 'vendeur') {
        this.sellerMode = true;
        this.currentView = 'register';
      } else {
        this.sellerMode = false;
      }
    });
  }

  initializeForms(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      captcha: ['', [Validators.required]],
      rememberMe: [false]
    });

    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.pattern('^[0-9]{10}$')]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.pattern('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[A-Za-z\\d@$!%*?&]{8,}$')]],
      confirmPassword: ['', [Validators.required]],
      captcha: ['', [Validators.required]],
      acceptTerms: [false, [Validators.requiredTrue]],
      acceptPrivacy: [false, [Validators.requiredTrue]]
    }, { validators: this.passwordMatchValidator });

    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  passwordMatchValidator(form: FormGroup): ValidationErrors | null {
    const passwordCtrl = form.get('password');
    const confirmCtrl = form.get('confirmPassword');
    if (!passwordCtrl || !confirmCtrl) return null;

    if (confirmCtrl.value && passwordCtrl.value !== confirmCtrl.value) {
      const existing = confirmCtrl.errors || {};
      confirmCtrl.setErrors({ ...existing, passwordMismatch: true });
      return { passwordMismatch: true };
    }

    if (confirmCtrl.errors) {
      const { passwordMismatch, ...rest } = confirmCtrl.errors;
      confirmCtrl.setErrors(Object.keys(rest).length ? rest : null);
    }
    return null;
  }

  // Générer un captcha simple pour compatibilité avec le template
  generateCaptcha(): void {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    this.generatedCaptcha = '';
    for (let i = 0; i < 6; i++) {
      this.generatedCaptcha += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.captchaText = this.generatedCaptcha;
    
    // Obtenir le challenge Proof of Work du backend
    this.getChallenge();
  }

  // Obtenir un challenge Proof of Work
  getChallenge(): void {
    this.authService.getChallenge().pipe(
      finalize(() => this.isCalculatingProof = false)
    ).subscribe({
      next: (response: ChallengeResponse) => {
        this.currentChallenge = response.challenge;
        this.challengeDifficulty = response.difficulty;
      },
      error: (error) => {
        console.error('Erreur lors de l\'obtention du challenge:', error);
        this.loginError = 'Erreur de connexion au serveur';
        this.cdr.detectChanges();
      }
    });
  }

  // Calculer la preuve de travail
  private calculateProofOfWork(challenge: string, difficulty: number): string {
    let nonce = 0;
    while (true) {
      const hash = this.sha256(challenge + nonce.toString());
      if (hash.startsWith('0'.repeat(difficulty))) {
        return nonce.toString();
      }
      nonce++;
      if (nonce > 1000000) { // Protection contre boucle infinie
        throw new Error('Preuve de travail impossible à calculer');
      }
    }
  }

  // Hash SHA256 simplifié (en production, utiliser une librairie crypto)
  private sha256(str: string): string {
    // Pour l'instant, simulation simple. En production, utiliser crypto-js ou Web Crypto API
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
  }

  switchView(view: 'login' | 'register' | 'forgot-password' | 'privacy') {
    this.currentView = view;
    this.loginError = '';
    this.registerError = '';
    this.forgotPasswordSuccess = '';
    this.forgotPasswordError = '';
    
    // Obtenir un nouveau challenge pour les vues login/register
    if (view === 'login' || view === 'register') {
      this.getChallenge();
    }
  }

  togglePassword(field: 'login' | 'register' | 'confirm') {
    if (field === 'login') {
      this.showPassword = !this.showPassword;
    } else if (field === 'register') {
      this.showRegisterPassword = !this.showRegisterPassword;
    } else {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  // Vérifier la force du mot de passe
  checkPasswordStrength(password: string): void {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[@$!%*?&]/.test(password)) score++;

    if (score < 3) this.passwordStrength = 'weak';
    else if (score < 5) this.passwordStrength = 'medium';
    else this.passwordStrength = 'strong';
  }

  onLogin(): void {
    this.loginError = '';

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.loginForm.updateValueAndValidity({ onlySelf: false, emitEvent: true });
      this.loginError = 'Veuillez remplir tous les champs obligatoires correctement.';
      this.cdr.detectChanges();
      return;
    }

    if (this.loginForm.value.captcha.toLowerCase() !== this.generatedCaptcha.toLowerCase()) {
      this.loginError = 'Le captcha est incorrect';
      this.generateCaptcha();
      this.loginForm.patchValue({ captcha: '' });
      this.cdr.detectChanges();
      return;
    }

    this.isLoading = true;
    this.loginError = '';

    try {
      // Calculer la preuve de travail
      const nonce = this.calculateProofOfWork(this.currentChallenge, this.challengeDifficulty);
      
      const loginData: LoginRequest = {
        email: this.loginForm.value.email,
        password: this.loginForm.value.password,
        challenge: this.currentChallenge,
        nonce: nonce
      };

      this.authService.login(loginData).pipe(
        finalize(() => this.isLoading = false)
      ).subscribe({
        next: () => {
          // Redirection selon le rôle de l'utilisateur
          const userRole = this.authService.currentUserRole;
          if (userRole === UserRole.VENDEUR) {
            this.router.navigate(['/seller']);
          } else if (userRole === UserRole.ADMIN) {
            this.router.navigate(['/admin']);
          } else {
            this.router.navigate(['/profile']);
          }
        },
        error: (error) => {
          console.error('Erreur de connexion:', error);
          this.loginError = error?.message || error?.userMessage || 'Erreur de connexion';
          this.cdr.detectChanges();
        }
      });
    } catch (error) {
      this.loginError = 'Erreur lors du calcul de la preuve de travail';
      this.isLoading = false;
    }
  }

  onRegister(): void {
    this.registerError = '';

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.registerForm.updateValueAndValidity({ onlySelf: false, emitEvent: true });
      this.registerError = 'Veuillez corriger les champs en rouge avant de continuer.';
      this.cdr.detectChanges();
      return;
    }

    if (this.registerForm.value.captcha.toLowerCase() !== this.generatedCaptcha.toLowerCase()) {
      this.registerError = 'Le captcha est incorrect';
      this.generateCaptcha();
      this.registerForm.patchValue({ captcha: '' });
      this.cdr.detectChanges();
      return;
    }

    this.isLoading = true;
    this.registerError = '';

    try {
      // Calculer la preuve de travail
      const nonce = this.calculateProofOfWork(this.currentChallenge, this.challengeDifficulty);
      
      const registerData: RegisterRequest = {
        nom: this.registerForm.value.lastName,
        prenom: this.registerForm.value.firstName,
        email: this.registerForm.value.email,
        password: this.registerForm.value.password,
        role: this.sellerMode ? UserRole.VENDEUR : UserRole.CLIENT,
        challenge: this.currentChallenge,
        nonce: nonce
      };

      this.authService.register(registerData).pipe(
        finalize(() => this.isLoading = false)
      ).subscribe({
        next: () => {
          this.registerError = '';
          this.registeredUserName = `${registerData.prenom} ${registerData.nom}`.trim();
          this.registerSuccessWasVendeur = registerData.role === UserRole.VENDEUR;
          this.showRegisterSuccessModal = true;
          // Force un rendu immédiat du modal de confirmation
          // (évite d'attendre une interaction utilisateur supplémentaire).
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Erreur d\'inscription:', error);
          this.registerError = error?.message || error?.userMessage || 'Erreur lors de l\'inscription';
          this.cdr.detectChanges();
        }
      });
    } catch (error) {
      this.registerError = 'Erreur lors du calcul de la preuve de travail';
      this.isLoading = false;
    }
  }

  closeRegisterSuccessModal(goToLogin: boolean = true): void {
    this.showRegisterSuccessModal = false;
    this.registerForm.reset();
    if (goToLogin) {
      this.switchView('login');
    }
  }

  onForgotPassword() {
    if (this.forgotPasswordForm.invalid) {
      this.forgotPasswordForm.markAllAsTouched();
      return;
    }

    // Simulation de mot de passe oublié
    console.log('Demande de réinitialisation:', this.forgotPasswordForm.value);
    this.forgotPasswordSuccess = 'Un email de réinitialisation a été envoyé à votre adresse.';
    this.forgotPasswordError = '';
  }

  getErrorMessage(form: FormGroup, field: string): string {
    const control = form.get(field);
    if (control?.errors && control.touched) {
      if (control.errors['required']) return 'Ce champ est obligatoire';
      if (control.errors['email']) return 'Veuillez entrer une adresse email valide';
      if (control.errors['minlength']) return `Minimum ${control.errors['minlength'].requiredLength} caractères`;
      if (control.errors['passwordMismatch']) return 'Les mots de passe ne correspondent pas';
      if (control.errors['pattern']) {
        if (field === 'phone') return 'Veuillez entrer un numéro de téléphone valide (10 chiffres)';
        if (field === 'password') return 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre';
        return 'Format invalide';
      }
    }
    return '';
  }
}

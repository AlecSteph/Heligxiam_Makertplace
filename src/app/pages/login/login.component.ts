import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { finalize, catchError } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { LoginRequest, RegisterRequest, ChallengeResponse, UserRole } from '../../models/auth.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
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
    private router: Router
  ) {
    this.initializeForms();
    this.generateCaptcha();
  }

  ngOnInit(): void {
    // Écouter les erreurs d'authentification
    this.authService.authState$.subscribe(state => {
      if (state.error) {
        this.loginError = state.error;
        this.registerError = state.error;
      }
    });
  }

  initializeForms(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      captcha: ['', [Validators.required]],
      userType: ['', [Validators.required]],
      rememberMe: [false]
    });

    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.pattern('^[0-9]{10}$')]],
      userType: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.pattern('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$')]],
      confirmPassword: ['', [Validators.required]],
      captcha: ['', [Validators.required]],
      acceptTerms: [false, [Validators.requiredTrue]],
      acceptPrivacy: [false, [Validators.requiredTrue]]
    }, { validator: this.passwordMatchValidator });

    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  passwordMatchValidator(form: FormGroup): ValidationErrors | null {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
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
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    if (this.loginForm.value.captcha.toLowerCase() !== this.generatedCaptcha.toLowerCase()) {
      this.loginError = 'Le captcha est incorrect';
      this.generateCaptcha();
      this.loginForm.patchValue({ captcha: '' });
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
          if (userRole === UserRole.CLIENT) {
            this.router.navigate(['/profile']);
          } else if (userRole === UserRole.VENDEUR) {
            this.loginError = 'Espace vendeur en cours de développement';
          } else if (userRole === UserRole.ADMIN) {
            this.loginError = 'Espace admin en cours de développement';
          }
        },
        error: (error) => {
          console.error('Erreur de connexion:', error);
          // L'erreur est déjà gérée par l'AuthService
        }
      });
    } catch (error) {
      this.loginError = 'Erreur lors du calcul de la preuve de travail';
      this.isLoading = false;
    }
  }

  onRegister(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    if (this.registerForm.value.captcha.toLowerCase() !== this.generatedCaptcha.toLowerCase()) {
      this.registerError = 'Le captcha est incorrect';
      this.generateCaptcha();
      this.registerForm.patchValue({ captcha: '' });
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
        role: (this.registerForm.value.userType === 'vendeur' ? UserRole.VENDEUR : UserRole.CLIENT),
        challenge: this.currentChallenge,
        nonce: nonce
      };

      this.authService.register(registerData).pipe(
        finalize(() => this.isLoading = false)
      ).subscribe({
        next: () => {
          this.registerError = '';
          this.switchView('login');
        },
        error: (error) => {
          console.error('Erreur d\'inscription:', error);
          // L'erreur est déjà gérée par l'AuthService
        }
      });
    } catch (error) {
      this.registerError = 'Erreur lors du calcul de la preuve de travail';
      this.isLoading = false;
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
      if (control.errors['pattern']) return 'Veuillez entrer un numéro de téléphone valide';
    }
    return '';
  }
}

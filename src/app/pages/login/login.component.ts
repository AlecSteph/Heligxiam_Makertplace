import { ChangeDetectorRef, Component, AfterViewInit, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { filter, finalize, take } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { RecaptchaService } from '../../services/recaptcha.service';
import { LogoComponent } from '../../components/logo/logo.component';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { PASSWORD_PATTERN, PASSWORD_HINT } from '../../utils/password.util';
import { LoginRequest, RegisterRequest, UserRole } from '../../models/auth.model';
import { LucideAngularModule, Mail, Lock, Eye, EyeOff, User, Phone, ShieldCheck, Store, ShoppingBag, ArrowRight, CheckCircle2 } from 'lucide-angular';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, LucideAngularModule, LogoComponent, TranslatePipe],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit, AfterViewInit, OnDestroy {
  currentView: 'login' | 'register' | 'forgot-password' = 'login';
  recaptchaEnabled = false;
  recaptchaLoading = true;
  recaptchaReady = false;
  recaptchaLoadError = '';

  loginForm: FormGroup = new FormGroup({});
  registerForm: FormGroup = new FormGroup({});
  forgotPasswordForm: FormGroup = new FormGroup({});

  showPassword = false;
  showRegisterPassword = false;
  showConfirmPassword = false;

  loginError = '';
  registerError = '';
  forgotPasswordSuccess = '';
  forgotPasswordError = '';
  isForgotPasswordLoading = false;
  isLoading = false;

  showRegisterSuccessModal = false;
  registeredUserName = '';
  registerSuccessWasVendeur = false;
  sellerMode = false;
  passwordStrength: 'weak' | 'medium' | 'strong' = 'weak';

  private returnUrl = '/profile';
  private readonly rememberEmailKey = 'heligxiam-remember-email';

  readonly Mail = Mail;
  readonly Lock = Lock;
  readonly Eye = Eye;
  readonly EyeOff = EyeOff;
  readonly User = User;
  readonly Phone = Phone;
  readonly ShieldCheck = ShieldCheck;
  readonly Store = Store;
  readonly ShoppingBag = ShoppingBag;
  readonly ArrowRight = ArrowRight;
  readonly CheckCircle2 = CheckCircle2;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private recaptchaService: RecaptchaService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.authService.sessionReady$
      .pipe(filter((ready) => ready), take(1))
      .subscribe(() => {
        if (this.authService.isAuthenticated) {
          this.router.navigateByUrl(this.returnUrl);
        }
      });

    this.route.queryParamMap.subscribe((params) => {
      const mode = params.get('mode');
      const role = params.get('role');
      const returnUrl = params.get('returnUrl') || params.get('redirect');
      if (returnUrl?.startsWith('/')) {
        this.returnUrl = returnUrl;
      }
      if (mode === 'register') this.currentView = 'register';
      if (role === 'seller' || role === 'vendeur') {
        this.sellerMode = true;
        this.currentView = 'register';
      }
    });

    this.loadRememberedEmail();
  }

  ngAfterViewInit(): void {
    void this.initRecaptcha();
  }

  ngOnDestroy(): void {
    this.recaptchaService.unmount(this.getRecaptchaHostElement() ?? undefined);
  }

  private getRecaptchaHostElement(): HTMLElement | null {
    const ids: Record<string, string> = {
      login: 'recaptcha-login-host',
      register: 'recaptcha-register-host',
      'forgot-password': 'recaptcha-forgot-host'
    };
    const id = ids[this.currentView];
    return id ? document.getElementById(id) : null;
  }

  private async initRecaptcha(): Promise<void> {
    this.recaptchaLoading = true;
    this.recaptchaLoadError = '';
    try {
      await this.recaptchaService.loadConfig();
      this.recaptchaEnabled = this.recaptchaService.isEnabled();
      this.cdr.detectChanges();
      if (this.recaptchaEnabled) {
        await this.mountRecaptcha();
      }
    } catch {
      this.recaptchaEnabled = false;
      this.recaptchaLoadError = 'Impossible de charger le reCAPTCHA. Réessayez ou contactez le support.';
    } finally {
      this.recaptchaLoading = false;
      this.cdr.detectChanges();
    }
  }

  private async mountRecaptcha(): Promise<void> {
    if (!this.recaptchaEnabled) return;
    this.recaptchaReady = false;
    const host = this.getRecaptchaHostElement();
    if (!host) return;
    const submitBtn = host.closest('form')?.querySelector<HTMLElement>('[data-recaptcha-submit]') ?? null;
    try {
      await this.recaptchaService.mount(host, submitBtn);
      this.recaptchaLoadError = '';
      this.recaptchaReady = true;
      this.cdr.detectChanges();
    } catch {
      this.recaptchaEnabled = false;
      this.recaptchaReady = false;
      this.recaptchaLoadError = 'Le widget reCAPTCHA n\'a pas pu s\'afficher.';
      this.cdr.detectChanges();
    }
  }

  private getRecaptchaToken(): string | undefined {
    if (!this.recaptchaEnabled) return undefined;
    const token = this.recaptchaService.getToken();
    if (!token) return undefined;
    return token;
  }

  private handleRecaptchaRequired(): boolean {
    if (!this.recaptchaEnabled) return true;
    if (this.getRecaptchaToken()) return true;
    return false;
  }

  private resetRecaptchaOnError(): void {
    this.recaptchaService.reset();
  }

  initializeForms(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      rememberMe: [false]
    });

    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.pattern('^[0-9]{10}$')]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(PASSWORD_PATTERN)]],
      confirmPassword: ['', [Validators.required]],
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
      confirmCtrl.setErrors({ ...(confirmCtrl.errors || {}), passwordMismatch: true });
      return { passwordMismatch: true };
    }
    if (confirmCtrl.errors?.['passwordMismatch']) {
      const { passwordMismatch, ...rest } = confirmCtrl.errors;
      confirmCtrl.setErrors(Object.keys(rest).length ? rest : null);
    }
    return null;
  }

  private loadRememberedEmail(): void {
    try {
      const saved = localStorage.getItem(this.rememberEmailKey);
      if (saved) {
        this.loginForm.patchValue({ email: saved, rememberMe: true });
      }
    } catch {}
  }

  private persistRememberEmail(email: string, remember: boolean): void {
    try {
      if (remember) {
        localStorage.setItem(this.rememberEmailKey, email);
      } else {
        localStorage.removeItem(this.rememberEmailKey);
      }
    } catch {}
  }

  switchView(view: 'login' | 'register' | 'forgot-password'): void {
    this.currentView = view;
    this.loginError = '';
    this.registerError = '';
    this.forgotPasswordSuccess = '';
    this.forgotPasswordError = '';
    this.recaptchaService.clearWidget();
    this.recaptchaReady = false;
    this.cdr.detectChanges();
    void this.mountRecaptcha();
  }

  setAccountType(seller: boolean): void {
    this.sellerMode = seller;
  }

  togglePassword(field: 'login' | 'register' | 'confirm'): void {
    if (field === 'login') this.showPassword = !this.showPassword;
    else if (field === 'register') this.showRegisterPassword = !this.showRegisterPassword;
    else this.showConfirmPassword = !this.showConfirmPassword;
  }

  checkPasswordStrength(password: string): void {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[@$!%*?&]/.test(password)) score++;
    this.passwordStrength = score < 3 ? 'weak' : score < 5 ? 'medium' : 'strong';
  }

  get passwordStrengthLabel(): string {
    return this.passwordStrength === 'weak' ? 'Faible' : this.passwordStrength === 'medium' ? 'Moyen' : 'Fort';
  }

  get passwordStrengthWidth(): string {
    return this.passwordStrength === 'weak' ? '33%' : this.passwordStrength === 'medium' ? '66%' : '100%';
  }

  onLogin(): void {
    this.loginError = '';
    if (this.recaptchaLoading) {
      this.loginError = 'Chargement du reCAPTCHA en cours…';
      return;
    }
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.loginError = 'Veuillez corriger les champs indiqués.';
      return;
    }

    if (!this.handleRecaptchaRequired()) {
      this.loginError = 'Veuillez cocher « Je ne suis pas un robot ».';
      return;
    }

    this.isLoading = true;
    const loginData: LoginRequest = {
      email: this.loginForm.value.email.trim(),
      password: this.loginForm.value.password,
      recaptchaToken: this.getRecaptchaToken()
    };

    this.authService.login(loginData).pipe(
      finalize(() => { this.isLoading = false; this.cdr.detectChanges(); })
    ).subscribe({
      next: () => {
        this.persistRememberEmail(loginData.email, !!this.loginForm.value.rememberMe);
        const role = this.authService.currentUserRole;
        if (role === UserRole.VENDEUR) this.router.navigateByUrl('/seller');
        else if (role === UserRole.ADMIN) this.router.navigateByUrl('/admin');
        else this.router.navigateByUrl(this.returnUrl || '/profile');
      },
      error: (error) => {
        this.loginError = error?.message || 'Identifiants incorrects. Vérifiez votre email et mot de passe.';
        this.resetRecaptchaOnError();
      }
    });
  }

  onRegister(): void {
    this.registerError = '';
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.registerError = 'Veuillez corriger les champs indiqués.';
      return;
    }

    if (!this.handleRecaptchaRequired()) {
      this.registerError = 'Veuillez cocher « Je ne suis pas un robot ».';
      return;
    }

    this.isLoading = true;
    const registerData: RegisterRequest = {
      nom: this.registerForm.value.lastName,
      prenom: this.registerForm.value.firstName,
      email: this.registerForm.value.email.trim(),
      password: this.registerForm.value.password,
      role: this.sellerMode ? UserRole.VENDEUR : UserRole.CLIENT,
      recaptchaToken: this.getRecaptchaToken()
    };

    this.authService.register(registerData).pipe(
      finalize(() => { this.isLoading = false; this.cdr.detectChanges(); })
    ).subscribe({
      next: () => {
        this.registeredUserName = `${registerData.prenom} ${registerData.nom}`.trim();
        this.registerSuccessWasVendeur = registerData.role === UserRole.VENDEUR;
        this.showRegisterSuccessModal = true;
      },
      error: (error) => {
        this.registerError = error?.message || 'Impossible de créer le compte. Réessayez.';
        this.resetRecaptchaOnError();
      }
    });
  }

  closeRegisterSuccessModal(): void {
    this.showRegisterSuccessModal = false;
    this.registerForm.reset();
    this.switchView('login');
  }

  onForgotPassword(): void {
    if (this.forgotPasswordForm.invalid) {
      this.forgotPasswordForm.markAllAsTouched();
      return;
    }

    if (!this.handleRecaptchaRequired()) {
      this.forgotPasswordError = 'Veuillez cocher « Je ne suis pas un robot ».';
      return;
    }

    this.isForgotPasswordLoading = true;
    this.forgotPasswordSuccess = '';
    this.forgotPasswordError = '';

    this.authService.forgotPassword({
      email: this.forgotPasswordForm.value.email.trim(),
      recaptchaToken: this.getRecaptchaToken()
    }).pipe(
      finalize(() => {
        this.isForgotPasswordLoading = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (res) => { this.forgotPasswordSuccess = res.message; },
      error: (err: Error) => {
        this.forgotPasswordError = err.message || 'Impossible d\'envoyer la demande.';
        this.resetRecaptchaOnError();
      }
    });
  }

  getErrorMessage(form: FormGroup, field: string): string {
    const control = form.get(field);
    if (!control?.errors || !control.touched) return '';
    if (control.errors['required']) return 'Ce champ est obligatoire';
    if (control.errors['email']) return 'Adresse email invalide';
    if (control.errors['minlength']) return `Minimum ${control.errors['minlength'].requiredLength} caractères`;
    if (control.errors['passwordMismatch']) return 'Les mots de passe ne correspondent pas';
    if (control.errors['pattern']) {
      if (field === 'phone') return 'Numéro à 10 chiffres requis';
      if (field === 'password') return PASSWORD_HINT;
      return 'Format invalide';
    }
    return '';
  }
}

import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject, throwError, timer, of } from 'rxjs';
import { map, catchError, tap, finalize, switchMap, shareReplay } from 'rxjs/operators';
import { Router } from '@angular/router';
import { 
  User, 
  AuthResponse, 
  LoginRequest, 
  RegisterRequest, 
  ChallengeResponse,
  ProfileUpdateRequest,
  PasswordChangeRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  MessageResponse,
  AuthState,
  UserRole
} from '../models/auth.model';
import { isValidPassword, PASSWORD_HINT } from '../utils/password.util';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = 'http://localhost:3001/api/auth';
  private readonly TOKEN_KEY = 'auth_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly USER_KEY = 'user_data';
  
  // Rate limiting côté client
  private loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

  private authStateSubject = new BehaviorSubject<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null,
    refreshToken: null,
    isLoading: false,
    error: null
  });

  public authState$ = this.authStateSubject.asObservable();

  // Evenement emis uniquement lors d'un VRAI login/register (pas sur restauration session)
  private loginSuccessSubject = new Subject<User>();
  public loginSuccess$ = this.loginSuccessSubject.asObservable();

  /** Évite appels /me parallèles (guard + dashboard + init storage). */
  private sessionValidation$: Observable<boolean> | null = null;
  private readonly sessionReadySubject = new BehaviorSubject<boolean>(false);
  readonly sessionReady$ = this.sessionReadySubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.initializeAuthFromStorage();
  }

  // Initialiser l'auth depuis le localStorage
  private initializeAuthFromStorage(): void {
    try {
      const token = localStorage.getItem(this.TOKEN_KEY);
      const refreshToken = localStorage.getItem(this.REFRESH_TOKEN_KEY);
      const userData = localStorage.getItem(this.USER_KEY);

      if (token && userData) {
        const user: User = JSON.parse(userData);
        this.authStateSubject.next({
          isAuthenticated: true,
          user,
          token,
          refreshToken,
          isLoading: false,
          error: null
        });
        // La validation API est faite par SellerGuard / AuthGuard — pas ici (évite clearSession prématuré).
      }
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de l\'auth:', error);
      this.clearStorage();
    }
  }

  /**
   * Valide la session au démarrage de l'app (APP_INITIALIZER).
   * Évite le flash connecté puis déconnexion brutale au refresh.
   */
  bootstrapSession(): Observable<boolean> {
    if (!this.getToken()) {
      this.sessionReadySubject.next(true);
      return of(false);
    }

    this.authStateSubject.next({
      ...this.authStateSubject.value,
      isLoading: true
    });

    return this.validateSession().pipe(
      tap((valid) => {
        if (!valid) {
          this.clearSession();
        }
      }),
      finalize(() => {
        this.sessionReadySubject.next(true);
        this.authStateSubject.next({
          ...this.authStateSubject.value,
          isLoading: false
        });
      })
    );
  }

  // Validation email (même logique que backend)
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  // Validation mot de passe (même logique que backend)
  private validatePassword(password: string): boolean {
    return isValidPassword(password);
  }

  // Rate limiting pour les tentatives de connexion
  private isLoginAllowed(email: string): boolean {
    const key = email.toLowerCase();
    const now = Date.now();
    const attempts = this.loginAttempts.get(key);

    if (!attempts) {
      this.loginAttempts.set(key, { count: 1, lastAttempt: now });
      return true;
    }

    if (now - attempts.lastAttempt > this.LOGIN_WINDOW_MS) {
      // Réinitialiser après la fenêtre de temps
      this.loginAttempts.set(key, { count: 1, lastAttempt: now });
      return true;
    }

    if (attempts.count >= this.MAX_LOGIN_ATTEMPTS) {
      return false;
    }

    attempts.count++;
    attempts.lastAttempt = now;
    return true;
  }

  // Obtenir un challenge Proof of Work
  getChallenge(): Observable<ChallengeResponse> {
    return this.http.get<ChallengeResponse>(`${this.API_URL}/challenge`).pipe(
      catchError(this.handleError)
    );
  }

  // Inscription
  register(registerData: RegisterRequest): Observable<AuthResponse> {
    // Validation côté client
    if (!this.isValidEmail(registerData.email)) {
      return throwError(() => new Error('Format d\'email invalide'));
    }

    if (!this.validatePassword(registerData.password)) {
      return throwError(() => new Error(PASSWORD_HINT));
    }

    this.clearError();
    this.setLoading(true);

    return this.http.post<AuthResponse>(`${this.API_URL}/register`, registerData).pipe(
      // Important: l'inscription ne doit pas authentifier automatiquement.
      // L'utilisateur doit passer explicitement par la connexion.
      catchError(this.handleError),
      finalize(() => this.setLoading(false))
    );
  }

  // Connexion
  login(loginData: LoginRequest): Observable<AuthResponse> {
    // Validation côté client
    if (!this.isValidEmail(loginData.email)) {
      return throwError(() => new Error('Format d\'email invalide'));
    }

    // Rate limiting
    if (!this.isLoginAllowed(loginData.email)) {
      return throwError(() => new Error('Trop de tentatives de connexion. Réessayez dans 15 minutes.'));
    }

    this.clearError();
    this.setLoading(true);

    return this.http.post<AuthResponse>(`${this.API_URL}/login`, loginData).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.handleAuthSuccess(response.data, true);
          // Réinitialiser les tentatives en cas de succès
          this.loginAttempts.delete(loginData.email.toLowerCase());
        }
      }),
      catchError(this.handleError),
      finalize(() => this.setLoading(false))
    );
  }

  // Rafraîchir le token
  refreshToken(): Observable<AuthResponse> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('Refresh token non disponible'));
    }

    return this.http.post<AuthResponse>(`${this.API_URL}/refresh-token`, { refreshToken }).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.updateTokens(response.data.token, response.data.refreshToken);
        }
      }),
      catchError(error => {
        this.clearSession();
        return this.handleError(error);
      })
    );
  }

  // Obtenir le profil utilisateur
  getProfile(): Observable<User> {
    return this.http.get<{ success: boolean; data: User }>(`${this.API_URL}/me`).pipe(
      map(response => response.data),
      catchError(this.handleError)
    );
  }

  /**
   * Vérifie le JWT / refresh token auprès de l’API.
   * Invalide la session locale si le compte n’existe plus (purge BDD, etc.).
   */
  validateSession(): Observable<boolean> {
    if (!this.getToken()) {
      return of(false);
    }
    if (!this.sessionValidation$) {
      this.sessionValidation$ = this.runValidateSession().pipe(
        shareReplay(1),
        finalize(() => {
          this.sessionValidation$ = null;
        })
      );
    }
    return this.sessionValidation$;
  }

  private runValidateSession(): Observable<boolean> {
    return this.http.get<{ success: boolean; data: User }>(`${this.API_URL}/me`).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.applyUserFromServer(response.data);
          this.sessionReadySubject.next(true);
        }
      }),
      map(() => true),
      catchError(() => this.tryRefreshAndValidate())
    );
  }

  private tryRefreshAndValidate(): Observable<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.clearSession();
      return of(false);
    }

    return this.http
      .post<AuthResponse>(`${this.API_URL}/refresh-token`, { refreshToken })
      .pipe(
        tap((response) => {
          if (response.success && response.data) {
            this.updateTokens(response.data.token, response.data.refreshToken);
          }
        }),
        switchMap(() =>
          this.http.get<{ success: boolean; data: User }>(`${this.API_URL}/me`)
        ),
        tap((response) => {
          if (response.success && response.data) {
            this.applyUserFromServer(response.data);
            this.sessionReadySubject.next(true);
          }
        }),
        map(() => true),
        catchError(() => {
          this.sessionReadySubject.next(false);
          this.clearSession();
          return of(false);
        })
      );
  }

  private normalizeUserFromServer(user: User): User {
    return {
      ...user,
      identifiant_vendeur:
        user.identifiant_vendeur != null ? Number(user.identifiant_vendeur) : undefined,
      identifiant_boutique:
        user.identifiant_boutique != null ? Number(user.identifiant_boutique) : undefined
    };
  }

  private applyUserFromServer(user: User): void {
    const normalized = this.normalizeUserFromServer(user);
    const currentState = this.authStateSubject.value;
    this.authStateSubject.next({
      ...currentState,
      isAuthenticated: true,
      user: normalized,
      token: this.getToken(),
      refreshToken: this.getRefreshToken(),
      isLoading: false,
      error: null
    });
    localStorage.setItem(this.USER_KEY, JSON.stringify(normalized));
  }

  // Mettre à jour le profil
  updateProfile(updateData: ProfileUpdateRequest): Observable<User> {
    if (updateData.email && !this.isValidEmail(updateData.email)) {
      return throwError(() => new Error('Format d\'email invalide'));
    }

    return this.http.put<{ success: boolean; data: User }>(`${this.API_URL}/user/${this.getCurrentUserId()}`, updateData).pipe(
      map(response => response.data),
      tap(user => {
        // Mettre à jour l'utilisateur dans le state
        const currentState = this.authStateSubject.value;
        this.authStateSubject.next({
          ...currentState,
          user
        });
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      }),
      catchError(this.handleError)
    );
  }

  // Changer le mot de passe (connecté)
  changePassword(passwordData: PasswordChangeRequest): Observable<MessageResponse> {
    if (!this.validatePassword(passwordData.newPassword)) {
      return throwError(() => new Error(PASSWORD_HINT));
    }

    return this.http.put<MessageResponse>(`${this.API_URL}/change-password`, passwordData).pipe(
      catchError(this.handleError)
    );
  }

  // Mot de passe oublié
  forgotPassword(data: ForgotPasswordRequest): Observable<MessageResponse> {
    if (!this.isValidEmail(data.email)) {
      return throwError(() => new Error('Format d\'email invalide'));
    }

    return this.http.post<MessageResponse>(`${this.API_URL}/forgot-password`, data).pipe(
      catchError(this.handleError)
    );
  }

  // Réinitialiser le mot de passe via token e-mail
  resetPassword(data: ResetPasswordRequest): Observable<MessageResponse> {
    if (!this.validatePassword(data.password)) {
      return throwError(() => new Error(PASSWORD_HINT));
    }

    return this.http.post<MessageResponse>(`${this.API_URL}/reset-password`, data).pipe(
      catchError(this.handleError)
    );
  }

  // Déconnexion
  logout(navigate = true): void {
    const currentToken = this.getToken();
    if (currentToken) {
      this.http.post(`${this.API_URL}/logout`, {}).subscribe();
    }

    this.clearSession();
    if (navigate) {
      this.router.navigate(['/account']);
    }
  }

  /** Efface la session locale sans redirection (validation silencieuse). */
  clearSession(): void {
    this.sessionReadySubject.next(false);
    this.clearStorage();
    this.authStateSubject.next({
      isAuthenticated: false,
      user: null,
      token: null,
      refreshToken: null,
      isLoading: false,
      error: null
    });
  }

  // Gestion du succès d'authentification
  private handleAuthSuccess(
    authData: { user: User; token: string; refreshToken: string },
    emitLoginEvent: boolean = true
  ): void {
    this.updateTokens(authData.token, authData.refreshToken);
    this.applyUserFromServer(authData.user);
    this.sessionReadySubject.next(true);

    if (emitLoginEvent && this.authStateSubject.value.user) {
      this.loginSuccessSubject.next(this.authStateSubject.value.user);
    }
  }

  // Mettre à jour les tokens
  private updateTokens(token: string, refreshToken: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    
    const currentState = this.authStateSubject.value;
    this.authStateSubject.next({
      ...currentState,
      token,
      refreshToken
    });
  }

  // Nettoyer le stockage
  private clearStorage(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  // Gestion des erreurs
  private handleError = (error: HttpErrorResponse): Observable<never> => {
    let errorMessage = 'Une erreur est survenue';

    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.status === 0) {
      errorMessage = 'Impossible de joindre le serveur (vérifiez que auth-service tourne sur le port 3001).';
    } else if (error.status === 401) {
      errorMessage = 'Email ou mot de passe incorrect';
    } else if (error.status === 429) {
      errorMessage = 'Trop de requêtes. Veuillez réessayer plus tard.';
    } else if (error.status === 500) {
      errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.';
    }

    this.authStateSubject.next({
      ...this.authStateSubject.value,
      error: errorMessage
    });

    return throwError(() => new Error(errorMessage));
  };

  // État de chargement
  private setLoading(isLoading: boolean): void {
    this.authStateSubject.next({
      ...this.authStateSubject.value,
      isLoading
    });
  }

  private clearError(): void {
    this.authStateSubject.next({
      ...this.authStateSubject.value,
      error: null
    });
  }

  // Getters publics
  get isAuthenticated(): boolean {
    return this.authStateSubject.value.isAuthenticated;
  }

  get currentUser(): User | null {
    return this.authStateSubject.value.user;
  }

  get currentUserRole(): UserRole | null {
    const role = this.authStateSubject.value.user?.role;
    return role ? (role as UserRole) : null;
  }

  get token(): string | null {
    return this.getToken();
  }

  // Méthodes utilitaires
  private getToken(): string | null {
    return this.authStateSubject.value.token || localStorage.getItem(this.TOKEN_KEY);
  }

  private getRefreshToken(): string | null {
    return this.authStateSubject.value.refreshToken || localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  private getCurrentUserId(): string | null {
    return this.currentUser?.id_user || null;
  }

  // Vérifier les rôles
  hasRole(role: UserRole): boolean {
    return this.currentUserRole === role;
  }

  hasAnyRole(roles: UserRole[]): boolean {
    return roles.includes(this.currentUserRole as UserRole);
  }

  isAdmin(): boolean {
    return this.hasRole(UserRole.ADMIN);
  }

  isVendeur(): boolean {
    return this.hasRole(UserRole.VENDEUR);
  }

  isClient(): boolean {
    return this.hasRole(UserRole.CLIENT);
  }
}

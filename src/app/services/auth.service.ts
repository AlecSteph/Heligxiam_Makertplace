import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject, throwError, timer } from 'rxjs';
import { map, catchError, tap, finalize } from 'rxjs/operators';
import { Router } from '@angular/router';
import { 
  User, 
  AuthResponse, 
  LoginRequest, 
  RegisterRequest, 
  ChallengeResponse,
  ProfileUpdateRequest,
  PasswordChangeRequest,
  AuthState,
  UserRole
} from '../models/auth.model';

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
      }
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de l\'auth:', error);
      this.clearStorage();
    }
  }

  // Validation email (même logique que backend)
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  // Validation mot de passe (même logique que backend)
  private validatePassword(password: string): boolean {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }

  // Vérifier la force du mot de passe
  private getPasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[@$!%*?&]/.test(password)) score++;

    if (score < 3) return 'weak';
    if (score < 5) return 'medium';
    return 'strong';
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
      return throwError(() => new Error('Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre'));
    }

    this.setLoading(true);

    return this.http.post<AuthResponse>(`${this.API_URL}/register`, registerData).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.handleAuthSuccess(response.data);
        }
      }),
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

    this.setLoading(true);

    return this.http.post<AuthResponse>(`${this.API_URL}/login`, loginData).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.handleAuthSuccess(response.data);
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
        // En cas d'erreur, déconnecter l'utilisateur
        this.logout();
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

  // Changer le mot de passe
  changePassword(passwordData: PasswordChangeRequest): Observable<any> {
    if (!this.validatePassword(passwordData.newPassword)) {
      return throwError(() => new Error('Le nouveau mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre'));
    }

    return this.http.put(`${this.API_URL}/change-password`, passwordData).pipe(
      catchError(this.handleError)
    );
  }

  // Déconnexion
  logout(): void {
    const currentToken = this.getToken();
    if (currentToken) {
      // Appeler l'API de logout (optionnel)
      this.http.post(`${this.API_URL}/logout`, {}).subscribe();
    }

    this.clearStorage();
    this.authStateSubject.next({
      isAuthenticated: false,
      user: null,
      token: null,
      refreshToken: null,
      isLoading: false,
      error: null
    });

    this.router.navigate(['/account']);
  }

  // Gestion du succès d'authentification
  private handleAuthSuccess(authData: { user: User; token: string; refreshToken: string }): void {
    this.updateTokens(authData.token, authData.refreshToken);
    
    const currentState = this.authStateSubject.value;
    this.authStateSubject.next({
      ...currentState,
      isAuthenticated: true,
      user: authData.user,
      error: null
    });

    localStorage.setItem(this.USER_KEY, JSON.stringify(authData.user));

    // Emettre l'evenement de login/register reussi (uniquement sur action utilisateur,
    // pas sur restauration depuis localStorage)
    this.loginSuccessSubject.next(authData.user);
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

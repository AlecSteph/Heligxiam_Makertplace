import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, switchMap, filter, take, finalize } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Ne pas intercepter les requêtes vers l'authentification (login/register)
    if (this.isAuthRequest(req.url)) {
      return next.handle(req);
    }

    // Ajouter le token aux requêtes authentifiées
    let authReq = this.addTokenToRequest(req);

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        // Gérer les erreurs 401 (token expiré)
        if (error.status === 401 && !this.isRefreshing) {
          return this.handle401Error(authReq, next);
        }

        // Gérer les erreurs 403 (accès refusé)
        if (error.status === 403) {
          this.handle403Error(error);
        }

        // Gérer les erreurs 429 (rate limiting)
        if (error.status === 429) {
          this.handle429Error(error);
        }

        return throwError(() => error);
      }),
      finalize(() => {
        // Log des requêtes (optionnel, pour le debug)
        this.logRequest(req);
      })
    );
  }

  private isAuthRequest(url: string): boolean {
    return url.includes('/api/auth/login') || 
           url.includes('/api/auth/register') || 
           url.includes('/api/auth/challenge') ||
           url.includes('/api/auth/refresh-token');
  }

  private addTokenToRequest(req: HttpRequest<any>): HttpRequest<any> {
    const token = this.authService.token;
    
    if (token) {
      return req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    }

    return req;
  }

  private handle401Error(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    this.isRefreshing = true;
    this.refreshTokenSubject.next(null);

    return this.authService.refreshToken().pipe(
      switchMap((response) => {
        this.isRefreshing = false;
        this.refreshTokenSubject.next(response.data?.refreshToken);
        
        // Réessayer la requête originale avec le nouveau token
        return next.handle(this.addTokenToRequest(request));
      }),
      catchError((error) => {
        this.isRefreshing = false;
        
        // Si le refresh échoue, déconnecter l'utilisateur
        this.authService.logout();
        
        return throwError(() => error);
      })
    );
  }

  private handle403Error(error: HttpErrorResponse): void {
    console.error('Accès refusé:', error);
    
    // Optionnel: afficher une notification à l'utilisateur
    // this.notificationService.showError('Accès refusé. Permissions insuffisantes.');
    
    // Rediriger vers la page d'accueil si nécessaire
    if (error.error?.message === 'Accès administrateur requis') {
      // L'utilisateur essaie d'accéder à une page admin sans les droits
      window.location.href = '/';
    }
  }

  private handle429Error(error: HttpErrorResponse): void {
    console.error('Rate limit dépassé:', error);
    
    // Optionnel: afficher une notification
    // this.notificationService.showError('Trop de requêtes. Veuillez réessayer plus tard.');
  }

  private logRequest(req: HttpRequest<any>): void {
    // Log uniquement en développement
    const logData = {
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString()
    };
    
    console.log('HTTP Request:', logData);
  }
}

// Interceptor pour gérer les erreurs globales
@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        let errorMessage = 'Une erreur est survenue';

        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.status === 0) {
          errorMessage = 'Impossible de se connecter au serveur';
        } else if (error.status === 500) {
          errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.';
        } else if (error.status === 404) {
          errorMessage = 'Ressource non trouvée';
        } else if (error.status === 400) {
          errorMessage = 'Requête invalide';
        }

        // Créer une erreur plus descriptive
        const enhancedError = {
          ...error,
          userMessage: errorMessage,
          originalError: error
        };

        return throwError(() => enhancedError);
      })
    );
  }
}

// Interceptor pour le logging des performances
@Injectable()
export class LoggingInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const startTime = Date.now();
    
    return next.handle(req).pipe(
      finalize(() => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Log des requêtes lentes (> 2 secondes)
        if (duration > 2000) {
          console.warn(`Requête lente détectée: ${req.method} ${req.url} - ${duration}ms`);
        }
      })
    );
  }
}

// Interceptor pour la mise en cache des réponses GET
@Injectable()
export class CacheInterceptor implements HttpInterceptor {
  private cache = new Map<string, HttpResponse<any>>();
  private cacheMaxAge = 5 * 60 * 1000; // 5 minutes

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Mettre en cache uniquement les requêtes GET
    if (req.method !== 'GET') {
      return next.handle(req);
    }

    const cacheKey = req.urlWithParams;
    const cachedResponse = this.cache.get(cacheKey);

    if (cachedResponse && !this.isCacheExpired(cachedResponse)) {
      return new Observable(observer => {
        observer.next(cachedResponse.clone());
        observer.complete();
      });
    }

    return next.handle(req);
  }

  private isCacheExpired(response: HttpResponse<any>): boolean {
    const cachedTime = response.headers.get('cached-time');
    if (!cachedTime) return true;
    
    return Date.now() - parseInt(cachedTime) > this.cacheMaxAge;
  }
}

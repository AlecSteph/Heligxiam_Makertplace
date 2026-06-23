import { Injectable } from '@angular/core';
import { CanActivate, CanActivateChild, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, switchMap, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate, CanActivateChild {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    return this.checkAuth(route, state);
  }

  canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    return this.checkAuth(route, state);
  }

  private checkAuth(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    // Vérifier si l'utilisateur est authentifié
    if (!this.authService.isAuthenticated) {
      this.router.navigate(['/account'], { 
        queryParams: { returnUrl: state.url } 
      });
      return of(false);
    }

    // Vérifier les rôles requis
    const requiredRoles = route.data['roles'] as UserRole[] | undefined;
    
    if (requiredRoles && requiredRoles.length > 0) {
      const userRole = this.authService.currentUserRole;
      
      if (!userRole || !requiredRoles.includes(userRole)) {
        // Rediriger selon le rôle de l'utilisateur
        this.redirectByRole(userRole);
        return of(false);
      }
    }

    // Vérifier si le token est valide (optionnel: rafraîchir si nécessaire)
    return this.validateToken().pipe(
      map(isValid => {
        if (!isValid) {
          this.router.navigate(['/account'], { 
            queryParams: { returnUrl: state.url } 
          });
          return false;
        }
        return true;
      }),
      catchError(() => {
        this.router.navigate(['/account'], { 
          queryParams: { returnUrl: state.url } 
        });
        return of(false);
      })
    );
  }

  private validateToken(): Observable<boolean> {
    if (!this.authService.isAuthenticated) {
      return of(false);
    }
    return of(true);
  }

  private redirectByRole(userRole: UserRole | null): void {
    switch (userRole) {
      case UserRole.CLIENT:
        this.router.navigate(['/']);
        break;
      case UserRole.VENDEUR:
        this.router.navigate(['/vendor-dashboard']); // À créer
        break;
      case UserRole.ADMIN:
        this.router.navigate(['/admin-dashboard']); // À créer
        break;
      default:
        this.router.navigate(['/account']);
    }
  }
}

// Guard spécifique pour les admins
@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    if (!this.authService.isAuthenticated) {
      this.router.navigate(['/account']);
      return of(false);
    }

    if (!this.authService.isAdmin()) {
      this.router.navigate(['/']);
      return of(false);
    }

    return of(true);
  }
}

// Guard spécifique pour les vendeurs
@Injectable({
  providedIn: 'root'
})
export class SellerGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    return this.authService.validateSession().pipe(
      map((valid) => {
        if (!valid) {
          this.router.navigate(['/account']);
          return false;
        }
        if (!this.authService.hasAnyRole([UserRole.VENDEUR, UserRole.ADMIN])) {
          this.router.navigate(['/']);
          return false;
        }
        return true;
      })
    );
  }
}

// Guard pour les clients uniquement
@Injectable({
  providedIn: 'root'
})
export class ClientGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    if (!this.authService.isAuthenticated) {
      this.router.navigate(['/account']);
      return of(false);
    }

    if (!this.authService.isClient()) {
      this.router.navigate(['/']);
      return of(false);
    }

    return of(true);
  }
}

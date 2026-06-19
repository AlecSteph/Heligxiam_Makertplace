import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

const STORAGE_KEY = 'heligxiam-admin-session';
const TOKEN_KEY = 'heligxiam-admin-token';

@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  private readonly API_URL = 'http://localhost:3001/api/admin';
  private readonly loggedIn$ = new BehaviorSubject<boolean>(this.readStorage());

  constructor(private http: HttpClient) {
    if (typeof window !== 'undefined' && this.readStorage()) {
      this.loggedIn$.next(true);
    }
  }

  private readStorage(): boolean {
    if (typeof sessionStorage === 'undefined') return false;
    return sessionStorage.getItem(STORAGE_KEY) === '1' && !!sessionStorage.getItem(TOKEN_KEY);
  }

  get token(): string | null {
    if (typeof sessionStorage === 'undefined') return null;
    return sessionStorage.getItem(TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    return this.loggedIn$.value;
  }

  get session$() {
    return this.loggedIn$.asObservable();
  }

  login(email: string, password: string): Observable<boolean> {
    return this.http
      .post<{ success: boolean; data?: { token: string } }>(`${this.API_URL}/login`, {
        email,
        password
      })
      .pipe(
        tap((res) => {
          if (res.success && res.data?.token && typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem(STORAGE_KEY, '1');
            sessionStorage.setItem(TOKEN_KEY, res.data.token);
            this.loggedIn$.next(true);
          }
        }),
        map((res) => Boolean(res.success && res.data?.token)),
        catchError(() => of(false))
      );
  }

  logout(): void {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
    }
    this.loggedIn$.next(false);
  }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, firstValueFrom, map, tap, catchError, of } from 'rxjs';
import { Product } from '../models/product.model';

export interface CatalogCategory {
  slug: string;
  name: string;
  productCount: number;
}

export interface PromoCode {
  code: string;
  label: string;
  type: string;
  value: number;
  minAmount: number;
  category: string;
  discount: string;
  expiresAt?: string | null;
  expiresLabel?: string;
  source?: string;
  seller?: string | null;
}

export interface VendorVoucher {
  title: string;
  discount: string;
  category: string;
  seller: string;
  validity: string;
  code?: string | null;
}

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly apiBase = 'http://localhost:3001/api/catalog';
  private readonly productsSubject = new BehaviorSubject<Product[]>([]);
  readonly products$ = this.productsSubject.asObservable();
  private readonly loadingSubject = new BehaviorSubject<boolean>(false);
  readonly loading$ = this.loadingSubject.asObservable();
  private loadPromise: Promise<Product[]> | null = null;
  private lastLoadFailed = false;

  constructor(private http: HttpClient) {}

  /** Charge tous les produits publiés (cache en mémoire). */
  loadProducts(force = false): Promise<Product[]> {
    const cached = this.productsSubject.value;
    if (!force && cached.length && !this.lastLoadFailed) {
      return Promise.resolve(cached);
    }
    if (!force && this.loadPromise) {
      return this.loadPromise;
    }

    this.loadingSubject.next(true);
    this.loadPromise = firstValueFrom(
      this.http.get<{ success: boolean; data?: { rows: Product[] } }>(`${this.apiBase}/products`)
    )
      .then((res) => {
        const rows = res.success && res.data?.rows ? res.data.rows : [];
        this.lastLoadFailed = false;
        this.productsSubject.next(rows);
        return rows;
      })
      .catch(() => {
        this.lastLoadFailed = true;
        return this.productsSubject.value;
      })
      .finally(() => {
        this.loadingSubject.next(false);
        this.loadPromise = null;
      });

    return this.loadPromise;
  }

  getProductsSnapshot(): Product[] {
    return this.productsSubject.value;
  }

  /** Recherche locale par identifiant MySQL ou référence SKU (P001…). */
  findProductInCache(id: string): Product | undefined {
    const key = String(id);
    return this.productsSubject.value.find(
      (p) => String(p.id) === key || (p.sku != null && String(p.sku) === key)
    );
  }

  getProductById(id: string): Observable<Product | null> {
    const normalized = String(id);
    const cached = this.findProductInCache(normalized);
    if (cached) {
      return of(cached);
    }
    return this.http
      .get<{ success: boolean; data?: { row: Product } }>(
        `${this.apiBase}/products/${encodeURIComponent(normalized)}`
      )
      .pipe(
        map((res) => (res.success && res.data?.row ? res.data.row : null)),
        tap((row) => {
          if (row) {
            const merged = new Map(this.productsSubject.value.map((p) => [String(p.id), p]));
            merged.set(String(row.id), row);
            this.productsSubject.next([...merged.values()]);
          }
        }),
        catchError(() => of(null))
      );
  }

  loadByCategorySlug(slug: string): Promise<Product[]> {
    return firstValueFrom(
      this.http
        .get<{ success: boolean; data?: { rows: Product[] } }>(
          `${this.apiBase}/products?category=${encodeURIComponent(slug)}`
        )
        .pipe(
          map((res) => (res.success && res.data?.rows ? res.data.rows : [])),
          tap((rows) => {
            if (rows.length) {
              const merged = new Map(this.productsSubject.value.map((p) => [String(p.id), p]));
              for (const row of rows) merged.set(String(row.id), row);
              this.productsSubject.next([...merged.values()]);
            }
          })
        )
    ).catch(() => []);
  }

  loadFlashProducts(): Promise<Product[]> {
    return firstValueFrom(
      this.http
        .get<{ success: boolean; data?: { rows: Product[] } }>(`${this.apiBase}/products?flash=1`)
        .pipe(map((res) => (res.success && res.data?.rows ? res.data.rows : [])))
    ).catch(() => []);
  }

  loadCategories(): Promise<CatalogCategory[]> {
    return firstValueFrom(
      this.http
        .get<{ success: boolean; data?: { rows: CatalogCategory[] } }>(`${this.apiBase}/categories`)
        .pipe(map((res) => (res.success && res.data?.rows ? res.data.rows : [])))
    ).catch(() => []);
  }

  loadPromoCodes(): Promise<PromoCode[]> {
    return firstValueFrom(
      this.http
        .get<{ success: boolean; data?: { rows: PromoCode[] } }>(`${this.apiBase}/promotions/codes`)
        .pipe(map((res) => (res.success && res.data?.rows ? res.data.rows : [])))
    ).catch(() => []);
  }

  loadVendorVouchers(): Promise<VendorVoucher[]> {
    return firstValueFrom(
      this.http
        .get<{ success: boolean; data?: { rows: VendorVoucher[] } }>(
          `${this.apiBase}/promotions/vouchers`
        )
        .pipe(map((res) => (res.success && res.data?.rows ? res.data.rows : [])))
    ).catch(() => []);
  }

  invalidateCache(): void {
    this.lastLoadFailed = false;
    this.loadPromise = null;
    this.productsSubject.next([]);
  }
}

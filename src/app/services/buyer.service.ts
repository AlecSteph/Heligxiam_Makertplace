import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface BuyerOrder {
  id: string;
  date: string;
  status: 'delivered' | 'shipped' | 'processing' | 'cancelled' | 'preparing';
  total: number;
  items: number;
  seller: string;
  products: { name: string; image: string; qty: number }[];
}

export interface BuyerCoupon {
  code: string;
  label: string;
  type: string;
  value: number;
  minAmount: number;
  category: string;
  discount: string;
}

@Injectable({ providedIn: 'root' })
export class BuyerService {
  private readonly apiBase = 'http://localhost:3001/api/buyer';

  constructor(private http: HttpClient) {}

  loadOrders(): Promise<BuyerOrder[]> {
    return firstValueFrom(
      this.http.get<{ success: boolean; data?: { rows: BuyerOrder[] } }>(`${this.apiBase}/orders`)
    ).then((res) => (res.success && res.data?.rows ? res.data.rows : []));
  }

  loadCoupons(): Promise<BuyerCoupon[]> {
    return firstValueFrom(
      this.http.get<{ success: boolean; data?: { rows: BuyerCoupon[] } }>(`${this.apiBase}/coupons`)
    ).then((res) => (res.success && res.data?.rows ? res.data.rows : []));
  }
}

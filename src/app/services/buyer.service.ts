import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface BuyerOrderProduct {
  lineId?: string;
  name: string;
  image: string;
  qty: number;
  price?: number;
}

export interface BuyerOrder {
  id: string;
  orderId?: string;
  date: string;
  status: 'delivered' | 'shipped' | 'processing' | 'cancelled' | 'preparing';
  total: number;
  items: number;
  seller: string;
  products: BuyerOrderProduct[];
  tracking?: string;
  eta?: string;
  progress?: number;
  qrToken?: string;
}

export interface BuyerReturn {
  id: string;
  order: string;
  product: string;
  reason: string;
  status: string;
  refund: number;
  created: string;
}

export interface CheckoutItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  sellerName?: string;
}

export interface CheckoutPayload {
  items: CheckoutItem[];
  delivery: string;
  shipping: number;
  promoCode?: string;
  promoDiscount?: number;
  address: {
    line1: string;
    city: string;
    postalCode: string;
    country: string;
  };
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
  private readonly apiBase = 'http://localhost:3004/api/buyer';

  constructor(private http: HttpClient) {}

  loadOrders(): Promise<BuyerOrder[]> {
    return firstValueFrom(
      this.http.get<{ success: boolean; data?: { rows: BuyerOrder[] } }>(`${this.apiBase}/orders`)
    ).then((res) => (res.success && res.data?.rows ? res.data.rows : []));
  }

  checkout(payload: CheckoutPayload): Promise<BuyerOrder> {
    return firstValueFrom(
      this.http.post<{ success: boolean; data?: { order: BuyerOrder }; message?: string }>(
        `${this.apiBase}/orders/checkout`,
        payload
      )
    ).then((res) => {
      if (!res.success || !res.data?.order) {
        throw new Error(res.message || 'Checkout échoué');
      }
      return res.data.order;
    });
  }

  cancelOrder(orderRef: string): Promise<void> {
    return firstValueFrom(
      this.http.patch<{ success: boolean; message?: string }>(
        `${this.apiBase}/orders/${encodeURIComponent(orderRef)}/cancel`,
        {}
      )
    ).then((res) => {
      if (!res.success) throw new Error(res.message || 'Annulation impossible');
    });
  }

  downloadReceipt(orderRef: string): Promise<void> {
    return firstValueFrom(
      this.http.get(`${this.apiBase}/orders/${encodeURIComponent(orderRef)}/receipt`, {
        responseType: 'blob'
      })
    ).then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recu-${orderRef}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  fetchQrImage(orderRef: string): Promise<string> {
    return firstValueFrom(
      this.http.get(`${this.apiBase}/orders/${encodeURIComponent(orderRef)}/qrcode`, {
        responseType: 'blob'
      })
    ).then((blob) => URL.createObjectURL(blob));
  }

  qrCodeUrl(_orderRef: string): string {
    return '';
  }

  loadReturns(): Promise<BuyerReturn[]> {
    return firstValueFrom(
      this.http.get<{ success: boolean; data?: { rows: BuyerReturn[] } }>(`${this.apiBase}/returns`)
    ).then((res) => (res.success && res.data?.rows ? res.data.rows : []));
  }

  requestReturn(orderRef: string, motif: string, lineId?: string): Promise<BuyerReturn> {
    return firstValueFrom(
      this.http.post<{ success: boolean; data?: { return: BuyerReturn }; message?: string }>(
        `${this.apiBase}/returns`,
        { orderRef, motif, lineId }
      )
    ).then((res) => {
      if (!res.success || !res.data?.return) {
        throw new Error(res.message || 'Retour impossible');
      }
      return res.data.return;
    });
  }

  loadCoupons(): Promise<BuyerCoupon[]> {
    return firstValueFrom(
      this.http.get<{ success: boolean; data?: { rows: BuyerCoupon[] } }>(`${this.apiBase}/coupons`)
    ).then((res) => (res.success && res.data?.rows ? res.data.rows : []));
  }
}

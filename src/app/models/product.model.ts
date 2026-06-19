export interface Product {
  id: string;
  sku?: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  categorySlug?: string;
  rating: number;
  reviews: number;
  inStock: boolean;
  badge?: string;
  brand?: string;
  isFlash?: boolean;
  /** Fin de promotion (ISO) — promotions produit validées admin */
  promoEndsAt?: string | null;
  /** Vendeur marketplace (catalogue MySQL) */
  sellerId?: string;
  sellerName?: string;
  sellerSlug?: string;
  boutiqueId?: number;
  sellerLogo?: string | null;
}

export interface CartItem extends Product {
  quantity: number;
}

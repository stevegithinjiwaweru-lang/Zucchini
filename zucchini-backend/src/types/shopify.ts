export interface ShopifyAccessTokenResponse {
  access_token: string;
  scope?: string;
  expires_in?: number;
}

export interface ShopifyOrderPayload {
  id: number | string;
  name?: string; // e.g. "#1001"
  email?: string;
  customer?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    email?: string;
  };
  phone?: string;
  total_price?: string;
  financial_status?: string;
  shipping_address?: {
    address1?: string;
    address2?: string;
    city?: string;
    province?: string;
    country?: string;
    phone?: string;
    latitude?: number;
    longitude?: number;
  };
  line_items?: Array<{ title?: string; quantity?: number }>;
  created_at?: string;
}

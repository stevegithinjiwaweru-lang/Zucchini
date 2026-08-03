export interface ShopifyAccessTokenResponse {
  access_token: string;
  scope?: string;
  expires_in?: number;
}

export interface ShopifyOrderPayload {
  id: number;
  name: string; // e.g. "#1001"
  customer?: { first_name?: string; last_name?: string; phone?: string };
  phone?: string;
  total_price?: string;
  financial_status?: string;
  shipping_address?: {
    address1?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
}

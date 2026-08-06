export type Role = "admin" | "dispatcher" | "rider";

export type User = {
  id: string;
  name: string;
  role: Role;
};

export type MerchantConnector = "CSV" | "API" | "APP";
export type MerchantStatus = "CONNECTED" | "DISCONNECTED";

export type Merchant = {
  id: string;
  name: string;
  connector: MerchantConnector;
  status: MerchantStatus;
  lastSyncAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type OrderStatus =
  | "NEW"
  | "ASSIGNED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "FAILED"
  | "RETURNED";

export type PaymentType = "COD" | "PREPAID";

export type Order = {
  id: string;
  /** externalId: the manually-entered or externally-provided order identifier */
  externalId?: string | null;
  merchantId?: string | null; // made optional to match back-end
  merchant?: Merchant;
  customerName: string;
  phone: string;
  address: string;
  destination?: string;
  distance?: number;
  scheduledAt?: string | null;
  lat?: number | null;
  lng?: number | null;
  amount?: number;
  paymentType?: PaymentType;
  status: OrderStatus;
  riderId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  deliveredAt?: string | null;
  notes?: string | null;
};

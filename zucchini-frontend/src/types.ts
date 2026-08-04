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
  externalId?: string | null; // dispatcher-provided order number (shown to users instead of the system id)
  merchantId?: string | null; // made optional to match backend changes
  merchant?: Merchant;
  customerName: string;
  phone: string;
  address: string;
  destination?: string;
  distance?: number;
  scheduledAt?: string | null;
  lat?: number;
  lng?: number;
  amount: number;
  paymentType: PaymentType;
  status: OrderStatus;
  riderId?: string | null;
  createdAt: string;
  updatedAt?: string;
  deliveredAt?: string | null;
};

export type RiderStatus =
  | "AVAILABLE"
  | "BUSY"
  | "OFFLINE"
  | "SUSPENDED"
  | "IN_DELIVERY";

export type RiderLocation = {
  lat: number;
  lng: number;
  timestamp: string;
};

export type Rider = {
  id: string;
  name: string;
  phone: string;
  nationalId?: string;
  drivingLicenceNo?: string;
  bikeReg?: string;
  vehicleType?: string;
  branch?: string;
  status: RiderStatus;
  activeOrders?: number;
  lastActiveAt?: string | null;
  lastLocation?: RiderLocation;
  userId?: string;
};

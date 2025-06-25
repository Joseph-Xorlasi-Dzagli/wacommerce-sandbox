// functions/src/types/entities.ts

export interface WhatsAppConfig {
  phone_number_id: string;
  business_account_id: string;
  catalog_id: string;
  access_token: string;
  active: boolean;
  webhook_verify_token?: string;
  created_at?: any;
  updated_at?: any;
}

export interface Product {
  id: string;
  business_id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  whatsapp_image_id?: string;
  stock_quantity: number;
  sync_status: "pending" | "synced" | "error";
  sync_error?: string;
  category_name?: string;
  retailer_id?: string;
  last_synced?: any;
  created_at?: any;
  updated_at?: any;
}

export interface Order {
  id: string;
  business_id: string;
  customer: {
    name: string;
    phone: string;
    whatsapp_number?: string;
    email?: string;
  };
  status: string;
  total: number;
  source: "web" | "whatsapp" | "mobile";
  items?: OrderItem[];
  payment_status?: string;
  shipping_address?: Address;
  last_notification_sent?: any;
  last_notification_type?: string;
  created_at?: any;
  updated_at?: any;
}

export interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface Business {
  id: string;
  name: string;
  owner_id: string;
  members?: string[];
  admins?: string[];
  phone?: string;
  email?: string;
  address?: Address;
  active: boolean;
  created_at?: any;
  updated_at?: any;
}

export interface MediaMetadata {
  id: string;
  business_id: string;
  whatsapp_media_id: string;
  original_url: string;
  type: "image" | "video" | "audio" | "document";
  purpose: string;
  reference_id: string;
  reference_type: string;
  file_size: number;
  mime_type: string;
  upload_status: "uploaded" | "expired" | "failed";
  uploaded_at?: any;
  expires_at?: any;
  created_at?: any;
  updated_at?: any;
}

export interface Notification {
  id: string;
  business_id: string;
  order_id: string;
  notification_type: string;
  message: string;
  delivery_status: "sent" | "delivered" | "failed" | "read";
  message_id?: string;
  error_info?: any;
  created_at?: any;
  delivered_at?: any;
  read_at?: any;
}

export interface AnalyticsEvent {
  id: string;
  business_id: string;
  event_type: string;
  data: Record<string, any>;
  timestamp?: any;
}

export interface IncomingMessage {
  id: string;
  whatsapp_message_id: string;
  from: string;
  type: string;
  content: string;
  timestamp: Date;
  processed: boolean;
  business_id?: string;
  created_at?: any;
}

// types/entities.ts

export interface WhatsAppConfig {
  phone_number_id: string;
  business_account_id: string;
  catalog_id: string;
  access_token: string;
  active: boolean;
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
}

export interface Order {
  id: string;
  business_id: string;
  customer: {
    name: string;
    phone: string;
    whatsapp_number?: string;
  };
  status: string;
  total: number;
  source: "web" | "whatsapp";
}

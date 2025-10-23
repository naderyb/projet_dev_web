import { Pool } from "pg";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || "postgresql://localhost:5432/tbib_el_jou3",
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

export default pool;

// Database schema types
export interface User {
  id: number;
  email: string;
  name: string;
  role: "client" | "admin" | "livreur";
  phone?: string;
  address?: string;
  created_at: Date;
}

export interface Restaurant {
  id: number;
  name: string;
  description: string;
  image: string;
  cuisine_type: string;
  rating: number;
  delivery_fee: number;
  min_order: number;
  delivery_time: string;
  city: string;
  is_active: boolean;
  admin_id: number;
}

export interface MenuItem {
  id: number;
  restaurant_id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  is_available: boolean;
}

export interface Order {
  id: number;
  client_id: number;
  restaurant_id: number;
  livreur_id?: number;
  status:
    | "pending"
    | "confirmed"
    | "preparing"
    | "ready"
    | "on_way"
    | "delivered"
    | "cancelled";
  total_amount: number;
  delivery_fee: number;
  delivery_address: string;
  phone: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface OrderItem {
  id: number;
  order_id: number;
  menu_item_id: number;
  quantity: number;
  price: number;
}

export interface MenuImage {
  id: number;
  image: string;
}

export interface Promotion {
  id: number;
  name: string;
  discount: number | null;
  is_active: boolean;
  is_currently_active: boolean;
  start_date: string;
  end_date: string;
}

export interface MenuItem {
  id: number;
  title: string;
  description: string;
  restaurant: number;
  restaurant_name?: string;
  category: number;
  category_name?: string;
  price: string;
  discounted_price: number;
  is_available: boolean;
  is_featured: boolean;
  prep_time_minutes: number | null;
  allergens: string;
  promotions: Promotion[];
  images: MenuImage[];
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  description: string;
  restaurant: number;
  restaurant_name?: string;
  position: number;
  is_active: boolean;
  items_count: number;
  category_image?: MenuImage[];
}

export interface MenuItemPayload {
  title: string;
  description: string;
  category: number;
  price: string;
  is_available: boolean;
  is_featured: boolean;
  prep_time_minutes?: number | null;
  allergens?: string;
}

export interface CategoryPayload {
  name: string;
  description: string;
  position: number;
  is_active: boolean;
}
export interface RestaurantOpeningHours {
  Opening?: string;
  Closing?: string;
  [key: string]: string | undefined;
}

export interface Restaurant {
  id: number;
  restaurant_name: string;
  business_license: string;
  address: string;
  image: string | null;
  logo: string | null;
  opening_hours: RestaurantOpeningHours | null;
  rating: string;
  avg_rating: string;
  is_approved: boolean;
  is_active: boolean;
  menu_items_count: number;
  categories_count: number;
  owner_name: string;
  phone: string | null;
}

export interface RestaurantPayload {
  restaurant_name?: string;
  business_license?: string;
  address?: string;
  phone?: string | null;
  opening_hours?: RestaurantOpeningHours;
  is_active?: boolean;
}

export interface Promotion {
  id: number;
  restaurant: number;
  restaurant_name?: string;
  name: string;
  description: string;
  banner: string | null;
  discount: number | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_currently_active: boolean;
  created_at: string;
}

export interface PromotionPayload {
  name: string;
  description: string;
  discount: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  restaurant?: number;
}

export interface Review {
  id: number;
  customer?: number;
  customer_name?: string;
  restaurant?: number;
  restaurant_name?: string;
  menu_item?: number | null;
  menu_item_name?: string | null;
  order?: number | null;
  rating: number;
  comment: string;
  response?: string | null;
  responded_at?: string | null;
  created_at: string;
  updated_at?: string;
}

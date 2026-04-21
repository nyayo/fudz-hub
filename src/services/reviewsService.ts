import { api } from "@/lib/api";
import type { Paginated } from "@/types/orders";
import type { Review } from "@/types/reviews";

export interface ReviewListParams {
  page?: number;
  search?: string;
  rating?: number | "all";
}

export async function listReviews(params: ReviewListParams = {}): Promise<Paginated<Review>> {
  const { data } = await api.get<Paginated<Review>>("/reviews/", {
    params: {
      page: params.page,
      ...(params.search ? { search: params.search } : {}),
      ...(params.rating && params.rating !== "all" ? { rating: params.rating } : {}),
    },
  });
  return data;
}

export async function respondToReview(id: number, response: string): Promise<Review> {
  const { data } = await api.patch<Review>(`/reviews/${id}/`, { response });
  return data;
}

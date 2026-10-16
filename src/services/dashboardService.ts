import { extractApiError } from "@/lib/api";
import { listOrders } from "@/services/ordersService";
import type { Order, Paginated } from "@/types/orders";

const ORDER_SAMPLE_PAGES = 3;

export interface OrderSample {
  pages: Paginated<Order>[];
  partialError?: string;
}

/** Load a bounded recent sample without requesting nonexistent later pages. */
export async function loadOrderSample(): Promise<OrderSample> {
  const pages: Paginated<Order>[] = [];

  for (let page = 1; page <= ORDER_SAMPLE_PAGES; page += 1) {
    let result: Paginated<Order>;
    try {
      result = await listOrders({ page });
    } catch (error) {
      if (pages.length === 0) throw error;
      return {
        pages,
        partialError: extractApiError(error, "Older order pages could not be loaded."),
      };
    }

    pages.push(result);
    // Follow DRF's `next` link state instead of guessing how many pages exist.
    if (!result.next || result.results.length === 0) break;
  }

  return { pages };
}

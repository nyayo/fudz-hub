import { beforeEach, describe, expect, it, vi } from "vitest";
import { listOrders } from "@/services/ordersService";
import type { Order, Paginated } from "@/types/orders";
import { loadOrderSample } from "@/services/dashboardService";

vi.mock("@/services/ordersService", () => ({
  listOrders: vi.fn(),
}));

const mockedListOrders = vi.mocked(listOrders);

function page(count: number, next: string | null, resultCount = 0): Paginated<Order> {
  return {
    count,
    next,
    previous: null,
    results: Array.from({ length: resultCount }, () => ({} as Order)),
  };
}

describe("loadOrderSample", () => {
  beforeEach(() => {
    mockedListOrders.mockReset();
  });

  it("does not request pages beyond the last page", async () => {
    mockedListOrders.mockResolvedValueOnce(page(11, null, 11));

    const sample = await loadOrderSample();

    expect(mockedListOrders).toHaveBeenCalledTimes(1);
    expect(mockedListOrders).toHaveBeenCalledWith({ page: 1 });
    expect(sample.pages).toHaveLength(1);
    expect(sample.partialError).toBeUndefined();
  });

  it("continues only while the API provides a next page", async () => {
    mockedListOrders
      .mockResolvedValueOnce(page(21, "/orders/?page=2", 20))
      .mockResolvedValueOnce(page(21, null, 1));

    const sample = await loadOrderSample();

    expect(mockedListOrders.mock.calls).toEqual([[{ page: 1 }], [{ page: 2 }]]);
    expect(sample.pages).toHaveLength(2);
  });

  it("keeps successfully loaded pages when a later page fails", async () => {
    mockedListOrders
      .mockResolvedValueOnce(page(35, "/orders/?page=2", 20))
      .mockRejectedValueOnce(new Error("temporary failure"));

    const sample = await loadOrderSample();

    expect(sample.pages).toHaveLength(1);
    expect(sample.partialError).toBe("Older order pages could not be loaded.");
  });

  it("surfaces an error when the first page fails", async () => {
    mockedListOrders.mockRejectedValueOnce(new Error("service unavailable"));

    await expect(loadOrderSample()).rejects.toThrow("service unavailable");
  });
});

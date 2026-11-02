/** Keep operational data current without polling hidden browser tabs. */
export const OPERATIONAL_QUERY_OPTIONS = {
  refetchInterval: 20_000,
  refetchIntervalInBackground: false,
  refetchOnWindowFocus: true,
  refetchOnReconnect: "always",
} as const;

/** The API's PageNumberPagination contract; never infer this from a final page. */
export const API_PAGE_SIZE = 20;
export function pageCount(count = 0): number {
  return Math.max(1, Math.ceil(count / API_PAGE_SIZE));
}

import axios from "axios";

export function apiFieldErrors(error: unknown): Record<string, string> {
  if (!axios.isAxiosError(error)) return {};
  const data = error.response?.data;
  const details = data?.error?.details ?? data;
  if (!details || typeof details !== "object" || Array.isArray(details)) return {};
  return Object.fromEntries(Object.entries(details).flatMap(([field, value]) => {
    if (Array.isArray(value)) return [[field, value.filter(v => typeof v === "string").join(" ")]];
    if (typeof value === "string") return [[field, value]];
    return [];
  }));
}

export function focusApiError(error: unknown, form: HTMLFormElement | null) {
  if (!form) return;
  const keys = Object.keys(apiFieldErrors(error));
  const field = Array.from(form.querySelectorAll<HTMLElement>("[name], [data-field]")).find(el =>
    keys.includes(el.getAttribute("name") ?? el.getAttribute("data-field") ?? "") && el.getClientRects().length > 0,
  );
  field?.focus();
}

import { extractApiError } from "@/lib/api";

export function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p id={id} className="form-field-error">{message}</p> : null;
}

export function FormError({ error }: { error: unknown }) {
  return error ? <p className="form-error" role="alert">{extractApiError(error, "Please check the form and try again.")}</p> : null;
}

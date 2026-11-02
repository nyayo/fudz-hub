import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { extractApiError } from "@/lib/api";

export function QueryError({ title, error, onRetry }: { title: string; error: unknown; onRetry: () => void }) {
  return <div className="query-error" role="alert">
    <AlertCircle size={20} aria-hidden="true" />
    <div><strong>{title}</strong><p>{extractApiError(error, "Please check your connection and try again.")}</p></div>
    <Button variant="outline" size="sm" onClick={onRetry}>Try again</Button>
  </div>;
}

export function QueryFreshness({ updatedAt, isFetching, isError, onRefresh, label = "data" }: {
  updatedAt: number; isFetching: boolean; isError: boolean; onRefresh: () => void; label?: string;
}) {
  return <div className={`query-freshness${isError ? " is-stale" : ""}`}>
    <span>{isError ? "Couldn't refresh. Showing the last loaded data." : isFetching ? "Updating…" : updatedAt ? <>Updated <time dateTime={new Date(updatedAt).toISOString()}>{new Date(updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time></> : "Loading…"}</span>
    <Button variant="outline" size="sm" aria-label={`Refresh ${label}`} onClick={onRefresh} disabled={isFetching}>
      <RefreshCw size={14} aria-hidden="true" className={isFetching ? "animate-spin" : ""} />Refresh
    </Button>
  </div>;
}

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { extractApiError } from "@/lib/api";
import { listReviews, respondToReview } from "@/services/reviewsService";
import type { Review } from "@/types/reviews";
import { Search, Star } from "lucide-react";
import { cn } from "@/lib/utils";

function Stars({ value }: { value: number }) {
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            "h-4 w-4",
            n <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40",
          )}
        />
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const qc = useQueryClient();
  const [response, setResponse] = useState(review.response ?? "");
  const [editing, setEditing] = useState(!review.response);

  const mutation = useMutation({
    mutationFn: () => respondToReview(review.id, response),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reviews"] });
      toast({ title: "Response saved" });
      setEditing(false);
    },
    onError: (err) =>
      toast({ title: "Error", description: extractApiError(err), variant: "destructive" }),
  });

  const initials = (review.customer_name ?? "U").slice(0, 2).toUpperCase();

  return (
    <Card>
      <CardHeader className="flex flex-row items-start gap-3 pb-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">{review.customer_name ?? `Customer #${review.customer ?? "?"}`}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(review.created_at).toLocaleDateString()}
                {review.menu_item_name && ` · ${review.menu_item_name}`}
              </div>
            </div>
            <Stars value={review.rating} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm">{review.comment || <span className="text-muted-foreground italic">No comment</span>}</p>
        <div className="rounded-md border bg-muted/30 p-3 space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Restaurant response</div>
          {editing ? (
            <>
              <Textarea
                rows={2}
                placeholder="Thank the customer or address their feedback..."
                value={response}
                onChange={(e) => setResponse(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                {review.response && (
                  <Button variant="ghost" size="sm" onClick={() => { setResponse(review.response ?? ""); setEditing(false); }}>
                    Cancel
                  </Button>
                )}
                <Button size="sm" onClick={() => mutation.mutate()} disabled={!response.trim() || mutation.isPending}>
                  {mutation.isPending ? "Saving..." : "Send response"}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm">{review.response}</p>
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>Edit</Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Reviews() {
  const [search, setSearch] = useState("");
  const [rating, setRating] = useState<number | "all">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["reviews", search, rating],
    queryFn: () => listReviews({ search, rating }),
  });

  const avg =
    data?.results.length
      ? (data.results.reduce((s, r) => s + r.rating, 0) / data.results.length).toFixed(1)
      : "—";

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Reviews</h1>
          <p className="text-muted-foreground">What customers are saying.</p>
        </div>
        <div className="flex items-center gap-2 rounded-md border bg-card px-4 py-2">
          <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
          <div>
            <div className="text-lg font-semibold leading-none">{avg}</div>
            <div className="text-xs text-muted-foreground">{data?.count ?? 0} reviews</div>
          </div>
        </div>
      </div>

      <Card className="p-4 space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search reviews..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={String(rating)} onValueChange={(v) => setRating(v === "all" ? "all" : Number(v))}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            {[5, 4, 3, 2, 1].map((n) => (
              <TabsTrigger key={n} value={String(n)}>{n}★</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      ) : !data?.results.length ? (
        <Card className="p-12 text-center text-muted-foreground">No reviews yet.</Card>
      ) : (
        <div className="grid gap-4">
          {data.results.map((r) => <ReviewCard key={r.id} review={r} />)}
        </div>
      )}
    </div>
  );
}

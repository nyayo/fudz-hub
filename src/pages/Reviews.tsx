import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { extractApiError } from "@/lib/api";
import { listReviews, respondToReview } from "@/services/reviewsService";
import type { Review } from "@/types/reviews";
import { Search, Star, ChevronLeft, ChevronRight, MessageSquareText, Send, Sparkles, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

function Stars({ value, size = 15 }: { value: number; size?: number }) {
  return <div className="review-stars" aria-label={`${value} out of 5 stars`}>{[1,2,3,4,5].map(n=><Star key={n} style={{width:size,height:size}} className={cn(n<=value?"fill-amber-400 text-amber-400":"text-amber-300/50")}/>)}</div>;
}

function ReviewCard({ review }: { review: Review }) {
  const qc = useQueryClient();
  const [response, setResponse] = useState(review.response ?? "");
  const [editing, setEditing] = useState(!review.response);
  const mutation = useMutation({
    mutationFn: () => respondToReview(review.id,response),
    onSuccess: () => { qc.invalidateQueries({queryKey:["reviews"]}); toast({title:"Response saved"}); setEditing(false); },
    onError: err => toast({title:"Could not save response",description:extractApiError(err),variant:"destructive"}),
  });
  const name=review.customer_name||"Customer";
  const initials=name.split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase();
  return <Card className="review-card"><CardContent className="review-card-content">
    <div className="review-card-top"><Avatar className="review-avatar"><AvatarFallback>{initials||"C"}</AvatarFallback></Avatar><div className="review-author"><strong>{name}</strong><span>{new Date(review.created_at).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"})}</span></div><div className="review-rating-block"><Stars value={review.rating}/><span>{review.rating}.0</span></div></div>
    {review.menu_item_name&&<Badge variant="secondary" className="review-item-tag">{review.menu_item_name}</Badge>}
    <p className="review-comment">{review.comment||<span className="text-muted-foreground italic">No written comment</span>}</p>
    <div className="review-reply-box"><div className="review-reply-heading"><span><MessageSquareText size={14}/>{review.response?"Your response":"Reply to this review"}</span>{review.response&&!editing&&<Button variant="ghost" size="sm" onClick={()=>setEditing(true)}>Edit reply</Button>}</div>
      {editing?<><Textarea rows={3} maxLength={2000} placeholder="Thank the customer or address their feedback thoughtfully…" value={response} onChange={e=>setResponse(e.target.value)}/><div className="review-reply-footer"><span>{response.length}/2000</span><div className="flex gap-2">{review.response&&<Button variant="outline" size="sm" onClick={()=>{setResponse(review.response??"");setEditing(false);}}>Cancel</Button>}<Button size="sm" onClick={()=>mutation.mutate()} disabled={!response.trim()||mutation.isPending}>{mutation.isPending?<span className="animate-pulse">Sending…</span>:<><Send size={13}/>Send reply</>}</Button></div></div></>:<p className="review-existing-reply">{review.response}</p>}
    </div>
  </CardContent></Card>;
}

export default function Reviews() {
  const [search,setSearch]=useState("");
  const [rating,setRating]=useState<number|"all">("all");
  const [page,setPage]=useState(1);
  const {data,isLoading,isError,error}=useQuery({queryKey:["reviews",search,rating,page],queryFn:()=>listReviews({search,rating,page})});
  const results=useMemo(()=>data?.results??[],[data?.results]);
  const average=useMemo(()=>results.length?(results.reduce((sum,r)=>sum+r.rating,0)/results.length).toFixed(1):"—",[results]);
  const ratingCounts=[5,4,3,2,1].map(n=>({rating:n,count:results.filter(r=>r.rating===n).length}));
  const replied=results.filter(r=>Boolean(r.response)).length;
  return <div className="page-stack max-w-7xl reviews-page">
    <header className="page-heading"><div><p className="eyebrow">GUEST EXPERIENCE</p><h1>Reviews</h1><p>Listen, learn, and close the feedback loop with every customer.</p></div><Badge variant="secondary">{data?.count??"—"} total reviews</Badge></header>
    <section className="reviews-overview"><Card className="reviews-score-card"><CardContent><div className="reviews-score-label"><span className="review-score-icon"><Sparkles size={17}/></span><span>Customer sentiment<small>Current page overview</small></span></div><div className="reviews-score-value">{average}<span>/ 5</span></div><Stars value={Number(average)||0} size={18}/><div className="reviews-score-foot"><TrendingUp size={14}/>{data?.count??0} reviews across all pages</div></CardContent></Card>
      <Card className="reviews-distribution"><CardHeader><div><p className="eyebrow">RATING MIX</p><CardTitle>Ratings breakdown</CardTitle></div></CardHeader><CardContent className="reviews-rating-bars">{ratingCounts.map(item=><div className="reviews-rating-row" key={item.rating}><span>{item.rating}<Star size={11} className="fill-amber-400 text-amber-400"/></span><div className="reviews-rating-track"><span style={{width:`${results.length?item.count/results.length*100:0}%`}}/></div><small>{item.count}</small></div>)}</CardContent></Card>
      <Card className="reviews-reply-stat"><CardContent><span className="review-reply-stat-icon"><MessageSquareText size={18}/></span><small>Replied on this page</small><strong>{replied}<span> / {results.length}</span></strong><p>Thoughtful replies build trust and bring guests back.</p></CardContent></Card>
    </section>
    <Card className="reviews-filter-panel"><div className="reviews-filter-search"><Search size={16}/><Input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Search comments, guests, or menu items…" aria-label="Search reviews"/></div><Tabs value={String(rating)} onValueChange={v=>{setRating(v==="all"?"all":Number(v));setPage(1);}}><TabsList className="reviews-rating-tabs"><TabsTrigger value="all">All ratings</TabsTrigger>{[5,4,3,2,1].map(n=><TabsTrigger key={n} value={String(n)}>{n} <Star size={11} className="fill-current"/></TabsTrigger>)}</TabsList></Tabs></Card>
    <div className="reviews-list-heading"><div><p className="eyebrow">RECENT FEEDBACK</p><h2>{rating==="all"?"Customer reviews":`${rating}-star reviews`}</h2></div><span>{data?.count??0} results · page {page}</span></div>
    {isLoading?<div className="reviews-list-grid">{[0,1,2].map(i=><Skeleton key={i} className="h-64 rounded-2xl"/>)}</div>:isError?<Card className="reviews-empty-state text-destructive">{extractApiError(error)}</Card>:results.length===0?<Card className="reviews-empty-state"><span className="review-empty-icon"><MessageSquareText size={22}/></span><strong>No reviews match those filters</strong><span>Try another rating or search term.</span></Card>:<div className="reviews-list-grid">{results.map(r=><ReviewCard key={r.id} review={r}/>)}</div>}
    {data&&data.count>results.length&&<div className="flex items-center justify-between text-sm text-muted-foreground"><span>{data.count} reviews · page {page}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={!data.previous} onClick={()=>setPage(n=>Math.max(1,n-1))}><ChevronLeft size={16}/>Previous</Button><Button variant="outline" size="sm" disabled={!data.next} onClick={()=>setPage(n=>n+1)}>Next<ChevronRight size={16}/></Button></div></div>}
  </div>;
}

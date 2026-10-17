import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ORDER_STATUS_LABEL, type OrderStatus } from "@/types/orders";

const STYLES: Record<OrderStatus, string> = {
  placed: "bg-warning/20 text-amber-800 hover:bg-warning/20",
  accepted: "bg-violet-100 text-violet-800 hover:bg-violet-100",
  ready: "bg-accent text-accent-foreground hover:bg-accent",
  picked_up: "bg-secondary text-secondary-foreground hover:bg-secondary",
  delivered: "bg-success/15 text-success hover:bg-success/15",
  cancelled: "bg-destructive/15 text-destructive hover:bg-destructive/15",
};

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <Badge variant="secondary" className={cn("border-0 font-medium", STYLES[status], className)}>
      {ORDER_STATUS_LABEL[status]}
    </Badge>
  );
}
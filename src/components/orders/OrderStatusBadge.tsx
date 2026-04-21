import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ORDER_STATUS_LABEL, type OrderStatus } from "@/types/orders";

const STYLES: Record<OrderStatus, string> = {
  placed: "bg-warning/15 text-warning hover:bg-warning/15",
  accepted: "bg-primary/15 text-primary hover:bg-primary/15",
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

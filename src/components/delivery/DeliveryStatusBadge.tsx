import { Badge } from "@/components/ui/badge";
import { DELIVERY_STATUS_LABEL, type DeliveryStatus } from "@/types/delivery";
import { cn } from "@/lib/utils";

const variants: Record<DeliveryStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  assigned: "bg-secondary text-secondary-foreground",
  accepted: "bg-primary/15 text-primary",
  declined: "bg-destructive/15 text-destructive",
  picked_up: "bg-primary/15 text-primary",
  delivered: "bg-emerald-500/15 text-emerald-700",
  cancelled: "bg-destructive/15 text-destructive",
};

export function DeliveryStatusBadge({ status }: { status: DeliveryStatus }) {
  return (
    <Badge variant="outline" className={cn("border-transparent font-medium", variants[status])}>
      {DELIVERY_STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { listMenuItems } from "@/services/menuService";
import { cn } from "@/lib/utils";

interface Props {
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
}

export function MenuItemMultiSelect({ selectedIds, onChange, disabled }: Props) {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["menu-items", "all-for-promo"],
    queryFn: () => listMenuItems({ page: 1 }),
  });

  const items = data?.results ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        (i.category_name ?? "").toLowerCase().includes(q),
    );
  }, [items, search]);

  const selected = new Set(selectedIds);

  const toggle = (id: number) => {
    if (disabled) return;
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    onChange(Array.from(next));
  };

  const selectedItems = items.filter((i) => selected.has(i.id));

  return (
    <div className="space-y-2">
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedItems.map((i) => (
            <Badge key={i.id} variant="secondary" className="gap-1 pr-1">
              {i.title}
              <button
                type="button"
                onClick={() => toggle(i.id)}
                className="rounded-sm hover:bg-muted-foreground/20 p-0.5"
                aria-label={`Remove ${i.title}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search menu items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          disabled={disabled}
        />
      </div>

      <ScrollArea className="h-48 rounded-md border">
        {isLoading ? (
          <div className="p-2 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            {items.length === 0 ? "No menu items yet." : "No items match your search."}
          </div>
        ) : (
          <ul className="p-1">
            {filtered.map((i) => {
              const isOn = selected.has(i.id);
              return (
                <li key={i.id}>
                  <button
                    type="button"
                    onClick={() => toggle(i.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                      isOn && "bg-accent/50",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded-sm border",
                        isOn
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-input",
                      )}
                    >
                      {isOn && <Check className="h-3 w-3" />}
                    </div>
                    <span className="flex-1 truncate">{i.title}</span>
                    {i.category_name && (
                      <span className="text-xs text-muted-foreground">
                        {i.category_name}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>
      <p className="text-xs text-muted-foreground">
        {selectedItems.length} item{selectedItems.length === 1 ? "" : "s"} selected
      </p>
    </div>
  );
}
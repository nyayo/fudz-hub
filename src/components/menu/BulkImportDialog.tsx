import { useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { bulkCreateMenuItems, listCategories } from "@/services/menuService";
import type { MenuItemPayload } from "@/types/menu";
import { Upload, FileText, AlertCircle, CheckCircle2, Download } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

interface ParsedRow {
  rowNumber: number;
  payload?: MenuItemPayload;
  error?: string;
  raw: Record<string, string>;
}

const REQUIRED_COLUMNS = ["title", "category", "price"] as const;
const TEMPLATE_HEADERS = [
  "title",
  "description",
  "category",
  "price",
  "is_available",
  "is_featured",
  "prep_time_minutes",
  "allergens",
];

const TEMPLATE_CSV = `${TEMPLATE_HEADERS.join(",")}\nMargherita Pizza,Classic tomato & mozzarella,Pizzas,12.50,true,false,15,gluten;dairy\nCaesar Salad,Romaine with parmesan,Salads,8.00,true,false,5,dairy;eggs\n`;

function parseBool(v: string | undefined, fallback = true): boolean {
  if (v === undefined || v === "") return fallback;
  return ["1", "true", "yes", "y"].includes(v.trim().toLowerCase());
}

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "menu-items-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function BulkImportDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<{ ok: number; failed: number; errors: string[] } | null>(null);

  const { data: categoriesData } = useQuery({
    queryKey: ["categories", "all"],
    queryFn: () => listCategories(),
    enabled: open,
  });

  const categoryMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of categoriesData?.results ?? []) {
      map.set(c.name.toLowerCase().trim(), c.id);
      map.set(String(c.id), c.id);
    }
    return map;
  }, [categoriesData]);

  const reset = () => {
    setFileName("");
    setRows([]);
    setProgress({ done: 0, total: 0 });
    setResults(null);
  };

  const handleFile = (file: File) => {
    setFileName(file.name);
    setResults(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (parsed) => {
        const missing = REQUIRED_COLUMNS.filter((c) => !parsed.meta.fields?.includes(c));
        if (missing.length) {
          toast({
            title: "Missing columns",
            description: `Required columns: ${missing.join(", ")}`,
            variant: "destructive",
          });
          setRows([]);
          return;
        }
        const mapped: ParsedRow[] = parsed.data.map((raw, idx) => {
          const rowNumber = idx + 2; // header is row 1
          const title = (raw.title ?? "").trim();
          const categoryRaw = (raw.category ?? "").trim();
          const priceRaw = (raw.price ?? "").trim();

          if (!title) return { rowNumber, raw, error: "Missing title" };
          if (!categoryRaw) return { rowNumber, raw, error: "Missing category" };
          if (!priceRaw) return { rowNumber, raw, error: "Missing price" };

          const categoryId = categoryMap.get(categoryRaw.toLowerCase());
          if (!categoryId) return { rowNumber, raw, error: `Unknown category "${categoryRaw}"` };

          const priceNum = Number(priceRaw);
          if (Number.isNaN(priceNum) || priceNum < 0) {
            return { rowNumber, raw, error: `Invalid price "${priceRaw}"` };
          }

          const prepRaw = (raw.prep_time_minutes ?? "").trim();
          const prep = prepRaw ? Number(prepRaw) : null;

          const payload: MenuItemPayload = {
            title: title.slice(0, 255),
            description: (raw.description ?? "").trim(),
            category: categoryId,
            price: priceNum.toFixed(2),
            is_available: parseBool(raw.is_available, true),
            is_featured: parseBool(raw.is_featured, false),
            prep_time_minutes: Number.isFinite(prep as number) ? (prep as number) : null,
            allergens: (raw.allergens ?? "").trim(),
          };
          return { rowNumber, raw, payload };
        });
        setRows(mapped);
      },
      error: (err) => {
        toast({ title: "Couldn't read file", description: err.message, variant: "destructive" });
      },
    });
  };

  const validRows = rows.filter((r) => r.payload);
  const invalidRows = rows.filter((r) => r.error);

  const startImport = async () => {
    if (!validRows.length) return;
    setImporting(true);
    setProgress({ done: 0, total: validRows.length });
    const res = await bulkCreateMenuItems(
      validRows.map((r) => r.payload!),
      (done, total) => setProgress({ done, total }),
    );
    const ok = res.filter((r) => r.ok).length;
    const failed = res.filter((r) => !r.ok);
    setResults({
      ok,
      failed: failed.length,
      errors: failed.map((r) => `${r.title}: ${r.error}`),
    });
    setImporting(false);
    qc.invalidateQueries({ queryKey: ["menu-items"] });
    toast({
      title: "Import finished",
      description: `${ok} created${failed.length ? `, ${failed.length} failed` : ""}.`,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && !importing) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk import menu items</DialogTitle>
          <DialogDescription>
            Upload a CSV to create many items at once. Categories are matched by name (case-insensitive) or ID.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4" /> Download template
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInput.current?.click()}
              disabled={importing}
            >
              <Upload className="h-4 w-4" /> Choose CSV file
            </Button>
            {fileName && (
              <span className="text-sm text-muted-foreground inline-flex items-center gap-1.5">
                <FileText className="h-4 w-4" />
                {fileName}
              </span>
            )}
            <input
              ref={fileInput}
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
          </div>

          {rows.length > 0 && !results && (
            <>
              <div className="flex gap-2 text-sm">
                <Badge variant="secondary">{validRows.length} ready</Badge>
                {invalidRows.length > 0 && (
                  <Badge variant="destructive">{invalidRows.length} with errors</Badge>
                )}
              </div>

              {invalidRows.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Some rows will be skipped</AlertTitle>
                  <AlertDescription>
                    <ScrollArea className="h-24 mt-2">
                      <ul className="text-xs space-y-1">
                        {invalidRows.slice(0, 50).map((r) => (
                          <li key={r.rowNumber}>
                            Row {r.rowNumber}: {r.error}
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  </AlertDescription>
                </Alert>
              )}

              <ScrollArea className="h-48 rounded-md border">
                <div className="p-2 text-sm">
                  {validRows.slice(0, 100).map((r) => (
                    <div key={r.rowNumber} className="flex justify-between gap-2 py-1 border-b last:border-0">
                      <span className="truncate">{r.payload!.title}</span>
                      <span className="text-muted-foreground">${r.payload!.price}</span>
                    </div>
                  ))}
                  {validRows.length > 100 && (
                    <div className="pt-2 text-xs text-muted-foreground">
                      …and {validRows.length - 100} more
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          )}

          {importing && (
            <div className="space-y-2">
              <Progress value={(progress.done / Math.max(progress.total, 1)) * 100} />
              <p className="text-xs text-muted-foreground text-center">
                Importing {progress.done} of {progress.total}…
              </p>
            </div>
          )}

          {results && (
            <Alert variant={results.failed ? "destructive" : "default"}>
              {results.failed ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              <AlertTitle>
                {results.ok} created{results.failed ? `, ${results.failed} failed` : ""}
              </AlertTitle>
              {results.errors.length > 0 && (
                <AlertDescription>
                  <ScrollArea className="h-24 mt-2">
                    <ul className="text-xs space-y-1">
                      {results.errors.slice(0, 50).map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </ScrollArea>
                </AlertDescription>
              )}
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>
            {results ? "Close" : "Cancel"}
          </Button>
          {!results && (
            <Button onClick={startImport} disabled={!validRows.length || importing}>
              {importing
                ? "Importing…"
                : `Import ${validRows.length} item${validRows.length === 1 ? "" : "s"}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
import { useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import type JSZipType from "jszip";
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
import { bulkUpsertMenuItems, listCategories } from "@/services/menuService";
import type { BulkImportRowResult, BulkMenuItemPayload } from "@/services/menuService";
import { uploadMenuItemImage } from "@/services/restaurantService";
import { extractApiError } from "@/lib/api";
import { Upload, FileText, AlertCircle, CheckCircle2, Download } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  restaurantId?: number;
}

interface ParsedRow {
  rowNumber: number;
  payload?: BulkMenuItemPayload;
  imagePath?: string;
  error?: string;
  raw: Record<string, string>;
}

interface ImportResults {
  created: number;
  updated: number;
  failed: number;
  imageFailures: number;
  errors: string[];
}

const REQUIRED_COLUMNS = ["title", "category", "price"] as const;
const TEMPLATE_HEADERS = [
  "id",
  "title",
  "description",
  "category",
  "price",
  "is_available",
  "is_featured",
  "prep_time_minutes",
  "allergens",
  "image",
];
const TEMPLATE_CSV = `${TEMPLATE_HEADERS.join(",")}\n,Margherita Pizza,Classic tomato & mozzarella,Pizzas,12.50,true,false,15,gluten;dairy,\n,Caesar Salad,Romaine with parmesan,Salads,8.00,true,false,5,dairy;eggs,\n`;

const MAX_ARCHIVE_BYTES = 50 * 1024 * 1024;
const MAX_ARCHIVE_UNCOMPRESSED_BYTES = 100 * 1024 * 1024;
const MAX_ARCHIVE_FILES = 550;
const MAX_CSV_BYTES = 2 * 1024 * 1024;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_ROWS = 500;
const IMAGE_MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function getUncompressedSize(entry: unknown): number | undefined {
  return (entry as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize;
}

function getImageMimeType(path: string): string {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_MIME_TYPES[extension] ?? "application/octet-stream";
}

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

export function BulkImportDialog({ open, onOpenChange, restaurantId }: Props) {
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [archive, setArchive] = useState<JSZipType | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<ImportResults | null>(null);

  const { data: categoriesData } = useQuery({
    queryKey: ["categories", "all", restaurantId],
    queryFn: () => listCategories({ restaurant_id: restaurantId }),
    enabled: open,
  });

  const categoryMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const category of categoriesData?.results ?? []) {
      map.set(category.name.toLowerCase().trim(), category.id);
      map.set(String(category.id), category.id);
    }
    return map;
  }, [categoriesData]);

  const reset = () => {
    setFileName("");
    setRows([]);
    setArchive(null);
    setProgress({ done: 0, total: 0 });
    setResults(null);
  };

  const closeDialog = () => {
    if (!importing) reset();
    onOpenChange(false);
  };

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setResults(null);
    setRows([]);
    setArchive(null);

    try {
      const lowerName = file.name.toLowerCase();
      const isZip = lowerName.endsWith(".zip");
      if (!isZip && !lowerName.endsWith(".csv")) {
        throw new Error("Choose a CSV file or a ZIP archive containing one CSV file.");
      }
      if (!categoriesData) {
        throw new Error("Categories are still loading. Please wait a moment and choose the file again.");
      }

      let loadedArchive: JSZipType | null = null;
      let csvText: string;

      if (isZip) {
        if (file.size > MAX_ARCHIVE_BYTES) {
          throw new Error("The ZIP file must be 50 MB or smaller.");
        }
        const { default: JSZip } = await import("jszip");
        loadedArchive = await JSZip.loadAsync(file);
        const archiveFiles = Object.values(loadedArchive.files).filter((entry) => !entry.dir);
        if (archiveFiles.length > MAX_ARCHIVE_FILES) {
          throw new Error(`The ZIP may contain at most ${MAX_ARCHIVE_FILES} files.`);
        }
        const totalUncompressedSize = archiveFiles.reduce(
          (total, entry) => total + (getUncompressedSize(entry) ?? 0),
          0,
        );
        if (totalUncompressedSize > MAX_ARCHIVE_UNCOMPRESSED_BYTES) {
          throw new Error("The extracted ZIP contents must total 100 MB or less.");
        }

        const csvEntries = archiveFiles.filter((entry) => entry.name.toLowerCase().endsWith(".csv"));
        if (csvEntries.length !== 1) {
          throw new Error("The ZIP must contain exactly one CSV file.");
        }
        const csvSize = getUncompressedSize(csvEntries[0]);
        if (csvSize !== undefined && csvSize > MAX_CSV_BYTES) {
          throw new Error("The CSV inside the ZIP must be 2 MB or smaller.");
        }
        csvText = await csvEntries[0].async("string");
      } else {
        if (file.size > MAX_CSV_BYTES) {
          throw new Error("The CSV file must be 2 MB or smaller.");
        }
        csvText = await file.text();
      }

      const parsed = Papa.parse<Record<string, string>>(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim().toLowerCase(),
      });
      if (parsed.errors.length > 0) {
        const firstError = parsed.errors[0];
        throw new Error(`CSV parse error${firstError.row !== undefined ? ` near row ${firstError.row + 2}` : ""}: ${firstError.message}`);
      }
      const missing = REQUIRED_COLUMNS.filter((column) => !parsed.meta.fields?.includes(column));
      if (missing.length) {
        throw new Error(`Required columns: ${missing.join(", ")}`);
      }
      if (parsed.data.length > MAX_ROWS) {
        throw new Error(`A single import may contain at most ${MAX_ROWS} rows.`);
      }
      if (parsed.data.length === 0) {
        throw new Error("The CSV has a header but no menu item rows.");
      }

      const mapped: ParsedRow[] = parsed.data.map((raw, index) => {
        const rowNumber = index + 2;
        const title = (raw.title ?? "").trim();
        const categoryRaw = (raw.category ?? "").trim();
        const priceRaw = (raw.price ?? "").trim();
        const idRaw = (raw.id ?? "").trim();
        const itemId = idRaw ? Number(idRaw) : undefined;

        if (!title) return { rowNumber, raw, error: "Missing title" };
        if (!categoryRaw) return { rowNumber, raw, error: "Missing category" };
        if (!priceRaw) return { rowNumber, raw, error: "Missing price" };
        if (idRaw && (!Number.isInteger(itemId) || (itemId ?? 0) < 1)) {
          return { rowNumber, raw, error: `Invalid item ID "${idRaw}"` };
        }

        const categoryId = categoryMap.get(categoryRaw.toLowerCase());
        if (!categoryId) return { rowNumber, raw, error: `Unknown category "${categoryRaw}"` };

        const priceNum = Number(priceRaw);
        if (Number.isNaN(priceNum) || priceNum < 0) {
          return { rowNumber, raw, error: `Invalid price "${priceRaw}"` };
        }

        let imagePath = (raw.image ?? "").trim();
        if (imagePath) {
          imagePath = imagePath.replace(/\\/g, "/");
          if (!loadedArchive) {
            return { rowNumber, raw, error: "Image paths require a ZIP archive containing the CSV and images." };
          }
          if (imagePath.includes(";") || imagePath.includes("|")) {
            return { rowNumber, raw, error: "Use one image path per item row." };
          }
          if (imagePath.startsWith("/") || imagePath.split("/").some((part) => !part || part === "..")) {
            return { rowNumber, raw, error: "Image path must be a safe path relative to the ZIP root." };
          }
          if (!/\.(jpe?g|png|webp)$/i.test(imagePath)) {
            return { rowNumber, raw, error: "Images must be JPG, PNG or WebP files." };
          }
          const imageEntry = loadedArchive.file(imagePath);
          if (!imageEntry || imageEntry.dir) {
            return { rowNumber, raw, error: `Image file "${imagePath}" was not found in the ZIP.` };
          }
          const imageSize = getUncompressedSize(imageEntry);
          if (imageSize !== undefined && imageSize > MAX_IMAGE_BYTES) {
            return { rowNumber, raw, error: `Image "${imagePath}" exceeds the 8 MB limit.` };
          }
        }

        const prepRaw = (raw.prep_time_minutes ?? "").trim();
        const prep = prepRaw ? Number(prepRaw) : null;
        const payload: BulkMenuItemPayload = {
          ...(itemId ? { id: itemId } : {}),
          title: title.slice(0, 255),
          description: (raw.description ?? "").trim(),
          category: categoryId,
          price: priceNum.toFixed(2),
          is_available: parseBool(raw.is_available, true),
          is_featured: parseBool(raw.is_featured, false),
          prep_time_minutes: Number.isFinite(prep as number) ? (prep as number) : null,
          allergens: (raw.allergens ?? "").trim(),
        };
        return { rowNumber, raw, payload, imagePath: imagePath || undefined };
      });

      setArchive(loadedArchive);
      setRows(mapped);
    } catch (error) {
      toast({
        title: "Couldn't read import file",
        description: error instanceof Error ? error.message : extractApiError(error),
        variant: "destructive",
      });
    }
  };

  const validRows = rows.filter((row) => row.payload);
  const invalidRows = rows.filter((row) => row.error);

  const startImport = async () => {
    if (!validRows.length) return;
    setImporting(true);
    setProgress({ done: 0, total: validRows.length });
    try {
      const importResults = await bulkUpsertMenuItems(
        validRows.map((row) => row.payload!),
        (done, total) => setProgress({ done, total }),
        restaurantId,
      );

      const created = importResults.filter((row) => row.ok && row.action === "created").length;
      const updated = importResults.filter((row) => row.ok && row.action === "updated").length;
      const failedItems = importResults.filter((row) => !row.ok);
      const imageRows = importResults.filter((result) =>
        result.ok && Boolean(validRows[result.index]?.imagePath) && Boolean(result.item?.id),
      );
      const imageErrors: string[] = [];

      if (imageRows.length > 0 && archive) {
        let nextIndex = 0;
        let uploadedCount = 0;
        setProgress({ done: validRows.length, total: validRows.length + imageRows.length });

        const uploadWorker = async () => {
          while (nextIndex < imageRows.length) {
            const resultIndex = nextIndex++;
            const result: BulkImportRowResult = imageRows[resultIndex];
            const sourceRow = validRows[result.index];
            const imagePath = sourceRow?.imagePath;
            const itemId = result.item?.id;

            if (!imagePath || !itemId) continue;
            try {
              const imageEntry = archive.file(imagePath);
              if (!imageEntry || imageEntry.dir) throw new Error(`Image "${imagePath}" is missing from the ZIP.`);
              const imageBlob = await imageEntry.async("blob");
              if (imageBlob.size === 0) throw new Error("Image file is empty.");
              if (imageBlob.size > MAX_IMAGE_BYTES) throw new Error("Image exceeds the 8 MB limit.");
              const fileName = imagePath.split("/").pop() || "menu-item-image";
              const imageFile = new File([imageBlob], fileName, { type: getImageMimeType(imagePath) });
              await uploadMenuItemImage(itemId, imageFile);
            } catch (error) {
              const detail = error instanceof Error ? error.message : extractApiError(error);
              imageErrors.push(`${result.title} (${imagePath}): ${detail}`);
            }

            uploadedCount += 1;
            setProgress({ done: validRows.length + uploadedCount, total: validRows.length + imageRows.length });
          }
        };

        await Promise.all(Array.from({ length: Math.min(3, imageRows.length) }, () => uploadWorker()));
      } else if (imageRows.length > 0) {
        imageErrors.push("Images could not be attached because the ZIP archive is no longer available. Re-select the ZIP and retry.");
      }

      const errors = [
        ...failedItems.map((row) => `${row.title}: ${row.error ?? "Import failed"}`),
        ...imageErrors,
      ];
      setResults({
        created,
        updated,
        failed: failedItems.length,
        imageFailures: imageErrors.length,
        errors,
      });
      qc.invalidateQueries({ queryKey: ["menu-items"] });
      toast({
        title: "Import finished",
        description: `${created} created, ${updated} updated${failedItems.length ? `, ${failedItems.length} item rows failed` : ""}${imageErrors.length ? `, ${imageErrors.length} image uploads failed` : ""}.`,
        variant: imageErrors.length || failedItems.length ? "destructive" : "default",
      });
    } catch (error) {
      toast({ title: "Import failed", description: extractApiError(error), variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value && !importing) reset();
        onOpenChange(value);
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk import menu items</DialogTitle>
          <DialogDescription>
            Import a CSV or a ZIP containing one CSV and its image files. An ID updates that exact item; without an ID, an exact title match is updated or a new item is created. Categories match by name (case-insensitive) or ID.
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
              <Upload className="h-4 w-4" /> Choose CSV or ZIP file
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
              accept=".csv,.zip,text/csv,application/zip"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
                event.target.value = "";
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            For images, ZIP one CSV with the referenced JPG, PNG or WebP files. Add an optional <code>image</code> column containing each file path relative to the ZIP root (for example, <code>images/pizza.jpg</code>). One image per item; uploaded images are added to existing items, not substituted for their current images. CSV-only imports remain supported.
          </p>

          {rows.length > 0 && !results && (
            <>
              <div className="flex gap-2 text-sm">
                <Badge variant="secondary">{validRows.length} ready</Badge>
                {invalidRows.length > 0 && <Badge variant="destructive">{invalidRows.length} with errors</Badge>}
                {validRows.some((row) => row.imagePath) && <Badge variant="outline">Images included</Badge>}
              </div>

              {invalidRows.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Some rows will be skipped</AlertTitle>
                  <AlertDescription>
                    <ScrollArea className="h-24 mt-2">
                      <ul className="text-xs space-y-1">
                        {invalidRows.slice(0, 50).map((row) => (
                          <li key={row.rowNumber}>Row {row.rowNumber}: {row.error}</li>
                        ))}
                      </ul>
                    </ScrollArea>
                  </AlertDescription>
                </Alert>
              )}

              <ScrollArea className="h-48 rounded-md border">
                <div className="p-2 text-sm">
                  {validRows.slice(0, 100).map((row) => (
                    <div key={row.rowNumber} className="flex justify-between gap-2 py-1 border-b last:border-0">
                      <span className="truncate">
                        {row.payload!.id ? `Update #${row.payload!.id} · ` : "Create or match · "}
                        {row.payload!.title}{row.imagePath ? " · image" : ""}
                      </span>
                      <span className="text-muted-foreground">Ush{row.payload!.price}</span>
                    </div>
                  ))}
                  {validRows.length > 100 && (
                    <div className="pt-2 text-xs text-muted-foreground">…and {validRows.length - 100} more</div>
                  )}
                </div>
              </ScrollArea>
            </>
          )}

          {importing && (
            <div className="space-y-2">
              <Progress value={(progress.done / Math.max(progress.total, 1)) * 100} />
              <p className="text-xs text-muted-foreground text-center">
                Importing {progress.done} of {progress.total} item/image tasks…
              </p>
            </div>
          )}

          {results && (
            <Alert variant={results.failed || results.imageFailures ? "destructive" : "default"}>
              {results.failed || results.imageFailures ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              <AlertTitle>
                {results.created} created, {results.updated} updated{results.failed ? `, ${results.failed} item rows failed` : ""}{results.imageFailures ? ` · ${results.imageFailures} image uploads failed` : ""}
              </AlertTitle>
              {results.errors.length > 0 && (
                <AlertDescription>
                  <ScrollArea className="h-24 mt-2">
                    <ul className="text-xs space-y-1">
                      {results.errors.slice(0, 50).map((error, index) => <li key={index}>{error}</li>)}
                    </ul>
                  </ScrollArea>
                </AlertDescription>
              )}
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={closeDialog} disabled={importing}>
            {results ? "Close" : "Cancel"}
          </Button>
          {!results && (
            <Button onClick={startImport} disabled={!validRows.length || importing}>
              {importing ? "Importing…" : `Import ${validRows.length} item${validRows.length === 1 ? "" : "s"}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

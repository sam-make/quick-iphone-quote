import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import { QRCodeSVG } from "qrcode.react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type LabelFormat = "54x25" | "54x70";

interface RepairLabelPrintProps {
  reference: string;
  deviceLabel: string;
  customerFirstName: string;
  depositDate: string;
  issue: string;
  /** Internal repair sheet URL — requires sign-in, never bypasses auth. */
  internalUrl: string;
  triggerLabel?: string;
}

function Barcode({ value, height }: { value: string; height: number }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    JsBarcode(ref.current, value, {
      format: "CODE128",
      displayValue: false,
      height,
      margin: 0,
      width: 1.4,
    });
  }, [value, height]);
  return <svg ref={ref} className="max-w-full" />;
}

/**
 * Thermal label (Dymo / Brother) with a Code 128 barcode of the repair
 * reference. Two formats: 54 × 25 mm and 54 × 70 mm. Printed in pure
 * black & white through the global @media print rules (.print-sheet).
 */
export function RepairLabelPrint({
  reference,
  deviceLabel,
  customerFirstName,
  depositDate,
  issue,
  internalUrl,
  triggerLabel = "Imprimer l'étiquette",
}: RepairLabelPrintProps) {
  const [format, setFormat] = useState<LabelFormat>("54x25");
  const [open, setOpen] = useState(false);
  const small = format === "54x25";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Printer className="size-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Étiquette thermique</DialogTitle>
          <DialogDescription>
            Choisissez le format de votre imprimante (Dymo, Brother), puis lancez l'impression.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          {(["54x25", "54x70"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFormat(value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                format === value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-surface-2",
              )}
            >
              {value === "54x25" ? "54 × 25 mm" : "54 × 70 mm"}
            </button>
          ))}
        </div>

        {/* Preview + print sheet (only this area is printed) */}
        <div className="overflow-auto rounded-xl border border-border bg-white p-4">
          <div
            className="print-sheet mx-auto flex flex-col bg-white text-black"
            style={{
              width: "54mm",
              height: small ? "25mm" : "70mm",
              padding: "1.5mm",
              fontFamily: "Arial, sans-serif",
            }}
          >
            <p
              className="font-bold leading-tight"
              style={{ fontSize: small ? "9pt" : "12pt" }}
            >
              {reference}
            </p>
            <div style={{ height: small ? "8mm" : "14mm" }}>
              <Barcode value={reference} height={small ? 26 : 44} />
            </div>
            <p className="leading-tight" style={{ fontSize: small ? "6pt" : "8pt" }}>
              {deviceLabel}
            </p>
            <p className="leading-tight" style={{ fontSize: small ? "6pt" : "8pt" }}>
              {customerFirstName} · {depositDate}
            </p>
            {!small && (
              <>
                <p className="mt-1 leading-tight" style={{ fontSize: "7pt" }}>
                  {issue}
                </p>
                <div className="mt-auto flex items-end justify-between">
                  <p style={{ fontSize: "5.5pt" }}>Fiche interne (connexion requise)</p>
                  <QRCodeSVG value={internalUrl} size={52} level="M" />
                </div>
              </>
            )}
          </div>
        </div>

        <Button onClick={() => window.print()}>
          <Printer className="size-4" />
          Imprimer
        </Button>
      </DialogContent>
    </Dialog>
  );
}

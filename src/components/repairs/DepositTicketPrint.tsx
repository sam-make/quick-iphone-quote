import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Printer, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { regenerateTrackingToken } from "@/lib/repairs.functions";
import { formatEuro } from "@/lib/pricing";

interface DepositTicketPrintProps {
  repairId: string;
  reference: string;
  deviceLabel: string;
  issue: string;
  totalPrice: number;
  depositDate: string;
  trackingToken: string;
  shop: {
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
  };
  onTokenRegenerated?: (newToken: string) => void;
}

/**
 * 80 mm thermal deposit ticket handed to the customer. Carries the public
 * tracking QR code (/suivi/:token) — never the internal reference alone.
 * Only data actually stored is printed; missing shop details are flagged
 * instead of invented.
 */
export function DepositTicketPrint({
  repairId,
  reference,
  deviceLabel,
  issue,
  totalPrice,
  depositDate,
  trackingToken,
  shop,
  onTokenRegenerated,
}: DepositTicketPrintProps) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState(trackingToken);
  const regenerate = useServerFn(regenerateTrackingToken);
  const [regenerating, setRegenerating] = useState(false);

  const trackingUrl = `${window.location.origin}/suivi/${token}`;
  const missing = [
    !shop.address && "adresse",
    !shop.phone && "téléphone",
    !shop.email && "e-mail",
  ].filter(Boolean) as string[];

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const result = await regenerate({ data: { repairId } });
      setToken(result.trackingToken);
      onTokenRegenerated?.(result.trackingToken);
      toast.success("Lien de suivi régénéré : l'ancien QR code ne fonctionne plus.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Régénération impossible.");
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Printer className="size-4" />
          Imprimer le ticket de dépôt
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ticket de dépôt client (80 mm)</DialogTitle>
          <DialogDescription>
            Remettez ce ticket au client : il lui permet de suivre sa réparation en scannant le QR code.
          </DialogDescription>
        </DialogHeader>

        {missing.length > 0 && (
          <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
            Coordonnées boutique à compléter dans Administration → Boutique : {missing.join(", ")}.
            Les horaires d'ouverture ne sont pas encore enregistrés dans l'application.
          </p>
        )}

        <div className="overflow-auto rounded-xl border border-border bg-white p-4">
          <div
            className="print-sheet mx-auto bg-white text-black"
            style={{ width: "72mm", padding: "2mm", fontFamily: "Arial, sans-serif" }}
          >
            <div className="text-center">
              <p className="font-bold" style={{ fontSize: "11pt" }}>
                {shop.name}
              </p>
              {shop.address && <p style={{ fontSize: "7.5pt" }}>{shop.address}</p>}
              {shop.phone && <p style={{ fontSize: "7.5pt" }}>Tél. {shop.phone}</p>}
              {shop.email && <p style={{ fontSize: "7.5pt" }}>{shop.email}</p>}
            </div>

            <hr className="my-2 border-t border-dashed border-black" />

            <p className="text-center font-bold" style={{ fontSize: "10pt" }}>
              Ticket de dépôt
            </p>
            <p className="text-center font-bold" style={{ fontSize: "10pt" }}>
              {reference}
            </p>

            <div className="mt-2 space-y-1" style={{ fontSize: "8pt" }}>
              <p>Appareil : {deviceLabel}</p>
              <p>Motif : {issue || "—"}</p>
              <p>Montant estimé : {formatEuro(totalPrice)}</p>
              <p>Déposé le : {depositDate}</p>
            </div>

            <hr className="my-2 border-t border-dashed border-black" />

            <div className="flex flex-col items-center gap-1">
              <QRCodeSVG value={trackingUrl} size={140} level="M" />
              <p className="text-center" style={{ fontSize: "7.5pt" }}>
                Scannez ce QR Code avec votre smartphone pour suivre l'état de votre réparation en
                temps réel.
              </p>
            </div>

            <hr className="my-2 border-t border-dashed border-black" />
            <p className="text-center" style={{ fontSize: "7pt" }}>
              Merci de votre confiance. Conservez ce ticket pour le retrait de votre appareil.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => window.print()}>
            <Printer className="size-4" />
            Imprimer
          </Button>
          <Button variant="ghost" size="sm" disabled={regenerating} onClick={handleRegenerate}>
            <RefreshCw className="size-4" />
            {regenerating ? "Régénération…" : "Révoquer et régénérer le lien de suivi"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

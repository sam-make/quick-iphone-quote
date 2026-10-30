import { useState, type KeyboardEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ScanBarcode } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { findRepairByReference } from "@/lib/repairs.functions";
import { isValidReference, normalizeReference } from "@/lib/tracking";

/**
 * Counter scan bar: a USB/Bluetooth scanner emulates a keyboard and ends with
 * Enter. The reference is normalized, validated, then the repair sheet opens
 * automatically. Manual typing/pasting works the same way. Keystrokes in other
 * form fields are never intercepted — only this input is listened to.
 */
export function ScanSearch() {
  const navigate = useNavigate();
  const find = useServerFn(findRepairByReference);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const reference = normalizeReference(value);
    if (!reference) return;
    if (!isValidReference(reference)) {
      toast.error(`« ${reference} » n'est pas une référence de dossier valide (ex. REP-2026-0001).`);
      return;
    }
    setBusy(true);
    try {
      const result = await find({ data: { reference } });
      setValue("");
      navigate({ to: "/reparations/$id", params: { id: result.id } });
    } catch {
      toast.error(`Aucun dossier ${reference} dans votre boutique.`);
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <div className="relative">
      <ScanBarcode className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        className="pl-9"
        placeholder="Scanner ou saisir une référence (REP-2026-0001)…"
        value={value}
        disabled={busy}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={onKeyDown}
        aria-label="Scan rapide d'un dossier de réparation"
        autoComplete="off"
        spellCheck={false}
      />
    </div>
  );
}

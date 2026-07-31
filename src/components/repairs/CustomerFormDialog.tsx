import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { saveCustomer } from "@/lib/repairs.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface CustomerDraft {
  id?: string | null;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

const EMPTY: CustomerDraft = { firstName: "", lastName: "", phone: "", email: "", address: "", notes: "" };

/** Shared create/edit customer form; the server refuses phone duplicates. */
export function CustomerFormDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  initial?: Partial<CustomerDraft>;
  onSaved?: (customer: { id: string; first_name: string; last_name: string; phone: string }) => void;
}) {
  const [draft, setDraft] = useState<CustomerDraft>({ ...EMPTY, ...initial });
  const save = useServerFn(saveCustomer);

  useEffect(() => {
    if (open) setDraft({ ...EMPTY, ...initial });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const mutation = useMutation({
    mutationFn: async () =>
      save({
        data: {
          id: draft.id ?? null,
          firstName: draft.firstName,
          lastName: draft.lastName,
          phone: draft.phone,
          email: draft.email || null,
          address: draft.address || null,
          notes: draft.notes || null,
        },
      }),
    onSuccess: (result) => {
      if (result.duplicate) toast.info("Ce numéro existe déjà : la fiche existante a été réutilisée.");
      else toast.success(draft.id ? "Fiche mise à jour." : "Client créé.");
      onSaved?.(result.customer as { id: string; first_name: string; last_name: string; phone: string });
      onOpenChange(false);
    },
    onError: () => toast.error("Enregistrement impossible."),
  });

  const set = (key: keyof CustomerDraft) => (event: { target: { value: string } }) =>
    setDraft((prev) => ({ ...prev, [key]: event.target.value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{draft.id ? "Modifier le client" : "Nouveau client"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="c-first">Prénom</Label>
            <Input id="c-first" value={draft.firstName} onChange={set("firstName")} maxLength={80} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-last">Nom</Label>
            <Input id="c-last" value={draft.lastName} onChange={set("lastName")} maxLength={80} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-phone">Téléphone</Label>
            <Input id="c-phone" value={draft.phone} onChange={set("phone")} maxLength={30} placeholder="06 12 34 56 78" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-email">E-mail (facultatif)</Label>
            <Input id="c-email" type="email" value={draft.email} onChange={set("email")} maxLength={255} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="c-address">Adresse (facultative)</Label>
            <Input id="c-address" value={draft.address} onChange={set("address")} maxLength={300} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="c-notes">Notes internes</Label>
            <Textarea id="c-notes" value={draft.notes} onChange={set("notes")} maxLength={2000} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={draft.phone.trim().length < 4 || mutation.isPending}>
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

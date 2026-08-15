import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nouveau mot de passe — ReprisePro" },
      { name: "description", content: "Définissez un nouveau mot de passe pour votre compte ReprisePro." },
      { property: "og:title", content: "Nouveau mot de passe — ReprisePro" },
      { property: "og:description", content: "Choisissez un nouveau mot de passe sécurisé." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"checking" | "ready" | "invalid">("checking");

  // The recovery link can arrive as ?code=..., ?token_hash=...&type=recovery,
  // or as an implicit #access_token=... fragment. Establish the recovery
  // session BEFORE allowing updateUser, otherwise it always fails.
  useEffect(() => {
    let cancelled = false;

    async function establishSession() {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const tokenHash = url.searchParams.get("token_hash");
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
      } else if (tokenHash) {
        await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
      } else if (hash.get("access_token") && hash.get("refresh_token")) {
        await supabase.auth.setSession({
          access_token: hash.get("access_token")!,
          refresh_token: hash.get("refresh_token")!,
        });
      }

      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setStatus(data.session ? "ready" : "invalid");
    }

    void establishSession();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 8) {
      toast.error("8 caractères minimum");
      return;
    }
    if (password !== confirm) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      const message = error.message.toLowerCase();
      if (message.includes("weak") || message.includes("pwned")) {
        toast.error("Ce mot de passe figure dans des fuites connues. Choisissez-en un autre.");
      } else {
        toast.error(error.message);
      }
      return;
    }
    toast.success("Mot de passe mis à jour.");
    navigate({ to: "/tableau-de-bord", replace: true });
  }

  return (
    <AuthLayout title="Nouveau mot de passe" subtitle="Choisissez un mot de passe sécurisé.">
      {status === "checking" ? (
        <p className="rounded-xl bg-secondary p-4 text-sm text-secondary-foreground">
          Vérification du lien de réinitialisation…
        </p>
      ) : status === "invalid" ? (
        <div className="space-y-3">
          <p className="rounded-xl bg-secondary p-4 text-sm text-secondary-foreground">
            Ce lien de réinitialisation est expiré ou déjà utilisé. Demandez-en un nouveau.
          </p>
          <Button className="w-full" size="lg" onClick={() => navigate({ to: "/mot-de-passe-oublie" })}>
            Nouvelle demande
          </Button>
        </div>
      ) : (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">Nouveau mot de passe</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirmation</Label>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            required
          />
        </div>
        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
          {submitting ? "Enregistrement…" : "Mettre à jour"}
        </Button>
      </form>
      )}
    </AuthLayout>
  );
}
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/connexion")({
  head: () => ({
    meta: [
      { title: "Connexion — ReprisePro" },
      { name: "description", content: "Connectez-vous à l'espace sécurisé de votre boutique ReprisePro." },
      { property: "og:title", content: "Connexion — ReprisePro" },
      { property: "og:description", content: "Accédez à l'espace de votre boutique de reprise iPhone." },
    ],
  }),
  component: LoginPage,
});

const schema = z.object({
  email: z.string().trim().email("Adresse e-mail invalide").max(255),
  password: z.string().min(6, "6 caractères minimum").max(72),
});

function LoginPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/tableau-de-bord", replace: true });
  }, [session, loading, navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setSubmitting(false);
    if (error) {
      toast.error("Connexion impossible : identifiants incorrects.");
      return;
    }
    navigate({ to: "/tableau-de-bord", replace: true });
  }

  return (
    <AuthLayout
      title="Connexion"
      subtitle="Accédez à l'espace sécurisé de votre boutique."
      footer={
        <>
          Pas encore de compte ?{" "}
          <Link to="/inscription" className="font-medium text-primary hover:underline">
            Créer un espace boutique
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Adresse e-mail</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="vous@boutique.fr"
            required
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Mot de passe</Label>
            <Link to="/mot-de-passe-oublie" className="text-xs text-primary hover:underline">
              Mot de passe oublié ?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>
        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
          {submitting ? "Connexion…" : "Se connecter"}
        </Button>
      </form>
    </AuthLayout>
  );
}
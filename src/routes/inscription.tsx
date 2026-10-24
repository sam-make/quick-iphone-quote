import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/inscription")({
  head: () => ({
    meta: [
      { title: "Créer un espace boutique — ReprisePro" },
      {
        name: "description",
        content: "Créez l'espace sécurisé de votre boutique de réparation et lancez vos estimations iPhone.",
      },
      { property: "og:title", content: "Créer un espace boutique — ReprisePro" },
      { property: "og:description", content: "Ouvrez l'espace de votre boutique en moins d'une minute." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SignupPage,
});

const schema = z.object({
  shopName: z.string().trim().min(2, "Nom de boutique requis").max(120),
  address: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().email("Adresse e-mail invalide").max(255),
  adminName: z.string().trim().min(2, "Nom de l'administrateur requis").max(120),
  password: z.string().min(8, "8 caractères minimum").max(72),
});

function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    shopName: "",
    address: "",
    phone: "",
    email: "",
    adminName: "",
    password: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/tableau-de-bord`,
        data: {
          shop_name: parsed.data.shopName,
          shop_address: parsed.data.address ?? null,
          shop_phone: parsed.data.phone ?? null,
          shop_email: parsed.data.email,
          full_name: parsed.data.adminName,
        },
      },
    });
    setSubmitting(false);

    if (error) {
      const message = error.message.toLowerCase();
      if (message.includes("already registered")) {
        toast.error("Un compte existe déjà avec cette adresse. Connectez-vous.");
      } else if (message.includes("weak") || message.includes("pwned")) {
        toast.error(
          "Ce mot de passe figure dans des fuites de données connues. Choisissez-en un autre, plus unique.",
        );
      } else if (message.includes("invalid") && message.includes("email")) {
        toast.error("Adresse e-mail refusée par le service d'authentification.");
      } else if (error.status === 429) {
        toast.error("Trop de tentatives. Patientez quelques minutes.");
      } else {
        toast.error(error.message);
      }
      return;
    }

    // Supabase renvoie un utilisateur sans identité quand l'adresse est déjà
    // enregistrée (anti-énumération) : aucun compte n'est créé, aucun mot de
    // passe n'est modifié. On oriente vers connexion / réinitialisation.
    if (data.user && (data.user.identities?.length ?? 0) === 0) {
      toast.error(
        "Cette adresse a déjà un espace boutique. Connectez-vous ou réinitialisez votre mot de passe.",
      );
      navigate({ to: "/connexion", replace: true });
      return;
    }

    if (data.session) {
      toast.success("Espace boutique créé.");
      navigate({ to: "/tableau-de-bord", replace: true });
      return;
    }

    toast.success("Compte créé — confirmez votre adresse e-mail pour accéder à votre espace.");
    navigate({ to: "/connexion", replace: true });
  }

  return (
    <AuthLayout
      title="Créer un espace boutique"
      subtitle="Votre boutique, ses règles, ses prix. Isolée et sécurisée."
      footer={
        <>
          Vous avez déjà un compte ?{" "}
          <Link to="/connexion" className="font-medium text-primary hover:underline">
            Se connecter
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="shopName">Nom de la boutique</Label>
          <Input id="shopName" value={form.shopName} onChange={update("shopName")} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Adresse</Label>
          <Input id="address" value={form.address} onChange={update("address")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input id="phone" value={form.phone} onChange={update("phone")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adminName">Administrateur</Label>
            <Input id="adminName" value={form.adminName} onChange={update("adminName")} required />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Adresse e-mail</Label>
          <Input id="email" type="email" autoComplete="email" value={form.email} onChange={update("email")} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={update("password")}
            required
          />
        </div>
        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
          {submitting ? "Création…" : "Créer mon espace"}
        </Button>
      </form>
    </AuthLayout>
  );
}
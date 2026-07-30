import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Building2,
  Gauge,
  History,
  Lock,
  ShieldCheck,
  Smartphone,
  SlidersHorizontal,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import dashboardShot from "@/assets/screen-dashboard.jpg";
import estimationShot from "@/assets/screen-estimation.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ReprisePro — Logiciel d'estimation de reprise iPhone" },
      {
        name: "description",
        content:
          "Estimez la reprise d'un iPhone en moins de 2 minutes. Règles de déduction 100 % personnalisables, historique complet, espace sécurisé par boutique.",
      },
      { property: "og:title", content: "ReprisePro — Logiciel d'estimation de reprise iPhone" },
      {
        property: "og:description",
        content: "Estimez la reprise d'un iPhone en moins de 2 minutes. Règles de déduction 100 % personnalisables, historique complet, espace sécurisé par boutique.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: Gauge,
    title: "Estimation en 2 minutes",
    text: "Modèle, couleur, capacité, diagnostic complet : le prix final se recalcule instantanément à chaque clic.",
  },
  {
    icon: SlidersHorizontal,
    title: "Règles 100 % personnalisables",
    text: "Chaque boutique crée, modifie, active ou désactive ses propres déductions. Aucune règle n'est codée en dur.",
  },
  {
    icon: Lock,
    title: "Détection des blocages",
    text: "iCloud, Activation Lock, compte Apple, SS06 : les blocages stoppent automatiquement la reprise.",
  },
  {
    icon: Smartphone,
    title: "Catalogue iPhone complet",
    text: "De l'iPhone X au 16 Pro Max, avec uniquement les couleurs et capacités officielles de chaque modèle.",
  },
  {
    icon: History,
    title: "Historique traçable",
    text: "Chaque estimation est archivée : date, employé, appareil, défauts retenus et prix proposé.",
  },
  {
    icon: Building2,
    title: "Multi-boutiques",
    text: "Espace sécurisé et isolé par boutique, avec ses paramètres, ses prix et ses permissions.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a className="transition-colors hover:text-foreground" href="#fonctionnalites">
              Fonctionnalités
            </a>
            <a className="transition-colors hover:text-foreground" href="#apercu">
              Aperçu
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/connexion">Se connecter</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/inscription">Créer un compte</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="hero-glow relative overflow-hidden">
          <div className="mx-auto max-w-6xl px-5 pb-20 pt-20 text-center md:pt-28">
            <span className="animate-rise inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-[var(--shadow-xs)]">
              <ShieldCheck className="size-3.5 text-primary" />
              Pensé par un réparateur, pour des réparateurs
            </span>
            <h1 className="animate-rise mx-auto mt-7 max-w-3xl text-4xl font-semibold leading-[1.05] text-ink md:text-6xl">
              L'estimation de reprise iPhone,
              <span className="text-gradient"> enfin sans appeler le responsable.</span>
            </h1>
            <p className="animate-rise mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
              ReprisePro donne à vos vendeurs un prix de reprise fiable en moins de deux minutes, calculé
              automatiquement à partir des règles de déduction que vous définissez vous-même.
            </p>
            <div className="animate-rise mt-9 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg">
                <Link to="/inscription">
                  Créer l'espace de ma boutique
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/connexion">Se connecter</Link>
              </Button>
            </div>

            <div className="animate-rise mx-auto mt-16 max-w-5xl">
              <div className="surface-card overflow-hidden p-2 shadow-[var(--shadow-float)]">
                <img
                  src={dashboardShot}
                  alt="Aperçu du tableau de bord ReprisePro avec le prix de reprise calculé"
                  width={1600}
                  height={1008}
                  className="w-full rounded-[calc(var(--radius-xl)-4px)]"
                />
              </div>
            </div>
          </div>
        </section>

        <section id="fonctionnalites" className="border-t border-border/70 bg-surface-2/60 py-20">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="max-w-2xl text-3xl font-semibold text-ink md:text-4xl">
              Tout ce qu'il faut au comptoir, rien de plus.
            </h2>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              Un module d'estimation guidé, un moteur de prix instantané et un panneau d'administration
              complet pour piloter votre grille de reprise.
            </p>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <article
                  key={feature.title}
                  className="surface-card group p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-float)]"
                >
                  <span className="grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <feature.icon className="size-5" />
                  </span>
                  <h3 className="mt-5 text-base font-semibold text-ink">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="apercu" className="py-20">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-semibold text-ink md:text-4xl">Un diagnostic guidé, pas un formulaire.</h2>
              <p className="mt-4 text-muted-foreground">
                Le vendeur parcourt l'état esthétique, les vérifications techniques puis les blocages. Chaque
                critère coché applique immédiatement la déduction configurée par la boutique.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  "Prix de base associé à la combinaison modèle + couleur + capacité",
                  "Déductions appliquées en temps réel, sans rechargement",
                  "Blocage automatique de la reprise en cas d'iCloud ou d'Activation Lock",
                ].map((item) => (
                  <li key={item} className="flex gap-3 text-sm text-foreground">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="surface-card overflow-hidden p-2">
              <img
                src={estimationShot}
                alt="Aperçu du module de diagnostic technique de ReprisePro"
                loading="lazy"
                width={1600}
                height={1008}
                className="w-full rounded-[calc(var(--radius-xl)-4px)]"
              />
            </div>
          </div>
        </section>

        <section className="px-5 pb-24">
          <div className="mx-auto max-w-5xl rounded-3xl bg-[image:var(--gradient-primary)] px-8 py-14 text-center text-primary-foreground shadow-[var(--shadow-float)]">
            <h2 className="text-3xl font-semibold md:text-4xl">Prêt à fiabiliser vos reprises&nbsp;?</h2>
            <p className="mx-auto mt-4 max-w-xl text-primary-foreground/80">
              Créez l'espace de votre boutique, importez vos règles de déduction et lancez votre première
              estimation dans la foulée.
            </p>
            <Button asChild size="lg" variant="secondary" className="mt-8">
              <Link to="/inscription">
                Démarrer maintenant
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/70 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 text-sm text-muted-foreground sm:flex-row">
          <Logo />
          <p>© {new Date().getFullYear()} ReprisePro. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}

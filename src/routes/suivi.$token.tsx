import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, MapPin, Phone, Smartphone, Store } from "lucide-react";
import { getPublicTracking } from "@/lib/repairs.functions";
import { PUBLIC_STEP_LABELS, type PublicTrackingDto } from "@/lib/tracking";
import { formatDateTime } from "@/lib/repairs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/suivi/$token")({
  head: () => ({
    meta: [
      { title: "Suivi de votre réparation — Trade-In Pro" },
      { name: "description", content: "Suivez l'avancement de votre réparation en temps réel." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PublicTrackingPage,
});

/**
 * Public, account-free follow-up page. The secret token in the URL is the
 * only credential; the server answers with a whitelisted DTO or null.
 * Refresh: secure periodic polling (30 s) — no Realtime, so no permission
 * widening on private tables.
 */
function PublicTrackingPage() {
  const { token } = Route.useParams();
  const fetchTracking = useServerFn(getPublicTracking);

  const { data, isLoading } = useQuery({
    queryKey: ["public-tracking", token],
    queryFn: () => fetchTracking({ data: { token } }),
    refetchInterval: 30_000,
    retry: false,
  });

  if (isLoading) {
    return (
      <Shell>
        <p className="text-center text-sm text-muted-foreground">Chargement du suivi…</p>
      </Shell>
    );
  }

  // Neutral message for invalid, revoked or unknown tokens — never reveals
  // whether a repair or customer exists.
  if (!data) {
    return (
      <Shell>
        <div className="surface-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Ce lien de suivi est invalide ou n'est plus actif. Contactez votre boutique pour obtenir
            un nouveau lien.
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <TrackingContent data={data} />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-md space-y-5">{children}</div>
    </div>
  );
}

function TrackingContent({ data }: { data: PublicTrackingDto }) {
  const mapsUrl = data.shop.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${data.shop.name} ${data.shop.address}`,
      )}`
    : null;

  return (
    <>
      <header className="text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Suivi de réparation
        </p>
        <h1 className="mt-1 text-xl font-semibold text-ink">{data.reference}</h1>
      </header>

      <section className="surface-card flex items-center gap-3 p-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Smartphone className="size-5" />
        </span>
        <div>
          <p className="font-medium text-ink">
            {data.device.brand} {data.device.model}
          </p>
          <p className="text-xs text-muted-foreground">
            {[data.device.storage, data.device.color].filter(Boolean).join(" · ") || " "}
          </p>
        </div>
      </section>

      <section className="surface-card p-5">
        <h2 className="text-sm font-semibold text-ink">Avancement</h2>
        {data.cancelled && (
          <p className="mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
            Ce dossier a été annulé. Contactez votre boutique pour plus d'informations.
          </p>
        )}
        <ol className="mt-4 space-y-0">
          {data.timeline.map((entry, index) => {
            const reached = Boolean(entry.reachedAt);
            const current = data.currentStep === entry.step;
            const last = index === data.timeline.length - 1;
            return (
              <li key={entry.step} className="relative flex gap-3 pb-5 last:pb-0">
                {!last && (
                  <span
                    aria-hidden
                    className={cn(
                      "absolute left-[11px] top-6 h-full w-0.5",
                      reached ? "bg-primary" : "bg-border",
                    )}
                  />
                )}
                <span
                  className={cn(
                    "z-10 flex size-6 shrink-0 items-center justify-center rounded-full border",
                    reached
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground",
                    current && "ring-2 ring-primary/30",
                  )}
                >
                  {reached && <Check className="size-3.5" />}
                </span>
                <div className="pt-0.5">
                  <p
                    className={cn(
                      "text-sm",
                      current ? "font-semibold text-ink" : reached ? "text-ink" : "text-muted-foreground",
                    )}
                  >
                    {PUBLIC_STEP_LABELS[entry.step]}
                    {current && !data.cancelled && (
                      <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        Étape actuelle
                      </span>
                    )}
                  </p>
                  {entry.reachedAt && (
                    <p className="text-xs text-muted-foreground">{formatDateTime(entry.reachedAt)}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="surface-card p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Store className="size-4" />
          Votre boutique
        </h2>
        <p className="mt-2 font-medium text-ink">{data.shop.name}</p>
        {data.shop.address && <p className="text-sm text-muted-foreground">{data.shop.address}</p>}
        {data.shop.phone && <p className="text-sm text-muted-foreground">{data.shop.phone}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          {data.shop.phone && (
            <a
              href={`tel:${data.shop.phone.replace(/\s/g, "")}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
            >
              <Phone className="size-3.5" />
              Appeler
            </a>
          )}
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-ink"
            >
              <MapPin className="size-3.5" />
              Itinéraire
            </a>
          )}
        </div>
      </section>

      <p className="text-center text-xs text-muted-foreground">
        Page actualisée automatiquement toutes les 30 secondes.
      </p>
    </>
  );
}

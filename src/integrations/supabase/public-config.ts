export type PublicSupabaseConfig = {
  url: string;
  publishableKey: string;
};

export function resolvePublicSupabaseConfig(
  runtime: Partial<PublicSupabaseConfig>,
  build: Partial<PublicSupabaseConfig>,
): PublicSupabaseConfig {
  return {
    url: runtime.url || build.url || "",
    publishableKey: runtime.publishableKey || build.publishableKey || "",
  };
}

function readPublicMeta(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  return document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content;
}

/**
 * The Worker publishes only the URL and publishable key in HTML metadata.
 * The service_role key must never appear in this module or the browser.
 */
export function getPublicSupabaseConfig(): PublicSupabaseConfig {
  const server = typeof document === "undefined";
  const runtime = server
    ? {
        url: typeof process === "undefined" ? undefined : process.env.SUPABASE_URL,
        publishableKey:
          typeof process === "undefined" ? undefined : process.env.SUPABASE_PUBLISHABLE_KEY,
      }
    : {
        url: readPublicMeta("trade-in-supabase-url"),
        publishableKey: readPublicMeta("trade-in-supabase-publishable-key"),
      };

  return resolvePublicSupabaseConfig(runtime, {
    url: import.meta.env.VITE_SUPABASE_URL,
    publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  });
}

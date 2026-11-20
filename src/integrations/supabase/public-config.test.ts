import { describe, expect, it } from "vitest";
import { resolvePublicSupabaseConfig } from "./public-config";

describe("Supabase configuration publique", () => {
  it("uses the runtime configuration before the build configuration", () => {
    expect(
      resolvePublicSupabaseConfig(
        { url: "https://staging.example", publishableKey: "public-staging" },
        { url: "https://old.example", publishableKey: "public-old" },
      ),
    ).toEqual({ url: "https://staging.example", publishableKey: "public-staging" });
  });

  it("falls back to public build settings in local development", () => {
    expect(
      resolvePublicSupabaseConfig(
        {},
        { url: "https://local.example", publishableKey: "public-local" },
      ),
    ).toEqual({ url: "https://local.example", publishableKey: "public-local" });
  });

  it("leaves missing values empty so the caller can show a clear error", () => {
    expect(resolvePublicSupabaseConfig({}, {})).toEqual({ url: "", publishableKey: "" });
  });
});

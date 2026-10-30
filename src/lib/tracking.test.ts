import { describe, expect, it } from "vitest";
import {
  buildPublicTimeline,
  buildPublicTrackingDto,
  currentPublicStep,
  isValidReference,
  isValidTrackingToken,
  normalizeReference,
  toPublicStep,
} from "./tracking";

describe("tracking token validation", () => {
  it("accepts a 48-char lowercase hex token", () => {
    expect(isValidTrackingToken("a".repeat(48))).toBe(true);
    expect(isValidTrackingToken("0123456789abcdef".repeat(3))).toBe(true);
  });

  it("rejects short, long, uppercase or non-hex tokens", () => {
    expect(isValidTrackingToken("a".repeat(47))).toBe(false);
    expect(isValidTrackingToken("a".repeat(49))).toBe(false);
    expect(isValidTrackingToken("A".repeat(48))).toBe(false);
    expect(isValidTrackingToken("g".repeat(48))).toBe(false);
    expect(isValidTrackingToken("")).toBe(false);
    expect(isValidTrackingToken("REP-2026-0001")).toBe(false);
  });
});

describe("reference normalization (scan au comptoir)", () => {
  it("normalizes case, spaces and underscores", () => {
    expect(normalizeReference("  rep-2026-0001 ")).toBe("REP-2026-0001");
    expect(normalizeReference("rep 2026 0001")).toBe("REP-2026-0001");
    expect(normalizeReference("REP--2026--0001")).toBe("REP-2026-0001");
  });

  it("validates only real repair references", () => {
    expect(isValidReference("REP-2026-0001")).toBe(true);
    expect(isValidReference("rep-2026-0001")).toBe(true);
    expect(isValidReference("FA-2026-0001")).toBe(false);
    expect(isValidReference("REP-2026")).toBe(false);
    expect(isValidReference("bonjour")).toBe(false);
    expect(isValidReference("")).toBe(false);
  });
});

describe("public step mapping", () => {
  it("maps every internal status explicitly", () => {
    expect(toPublicStep("recu")).toBe("recu");
    expect(toPublicStep("diagnostic")).toBe("diagnostic");
    expect(toPublicStep("attente_validation")).toBe("en_cours");
    expect(toPublicStep("attente_piece")).toBe("en_cours");
    expect(toPublicStep("en_reparation")).toBe("en_cours");
    expect(toPublicStep("tests")).toBe("en_cours");
    expect(toPublicStep("termine")).toBe("pret");
    expect(toPublicStep("restitue")).toBe("restitue");
    expect(toPublicStep("annule")).toBe("annule");
  });
});

describe("public timeline", () => {
  it("marks only steps that really happened, with their earliest timestamp", () => {
    const timeline = buildPublicTimeline([
      { status: "recu", created_at: "2026-10-01T10:00:00Z" },
      { status: "en_reparation", created_at: "2026-10-02T09:00:00Z" },
      { status: "tests", created_at: "2026-10-03T09:00:00Z" },
    ]);
    expect(timeline).toEqual([
      { step: "recu", reachedAt: "2026-10-01T10:00:00Z" },
      { step: "diagnostic", reachedAt: null },
      { step: "en_cours", reachedAt: "2026-10-02T09:00:00Z" },
      { step: "pret", reachedAt: null },
      { step: "restitue", reachedAt: null },
    ]);
    expect(currentPublicStep(timeline)).toBe("en_cours");
  });

  it("ignores annule and unknown statuses without inventing progress", () => {
    const timeline = buildPublicTimeline([
      { status: "recu", created_at: "2026-10-01T10:00:00Z" },
      { status: "annule", created_at: "2026-10-02T10:00:00Z" },
      { status: "statut_inconnu", created_at: "2026-10-03T10:00:00Z" },
    ]);
    expect(timeline.filter((entry) => entry.reachedAt)).toHaveLength(1);
    expect(currentPublicStep(timeline)).toBe("recu");
  });

  it("returns an empty progress when there is no history", () => {
    const timeline = buildPublicTimeline([]);
    expect(timeline.every((entry) => entry.reachedAt === null)).toBe(true);
    expect(currentPublicStep(timeline)).toBeNull();
  });
});

describe("public payload whitelist", () => {
  it("never exposes IMEI, customer identity, notes or internal ids", () => {
    const dto = buildPublicTrackingDto({
      repair: {
        reference: "REP-2026-0001",
        status: "en_reparation",
        brand: "Apple",
        model: "iPhone 13",
        storage: "256 Go",
        color: "Noir",
        // Private fields that must NOT leak:
        imei: "356789104512345",
        unlock_code: "1234",
        issue: "note interne",
        customer_id: "uuid-client",
        shop_id: "uuid-boutique",
        total_price: 129,
      } as never,
      history: [{ status: "recu", created_at: "2026-10-01T10:00:00Z" }],
      shop: { name: "Boutique Test", address: "1 rue de la Paix", phone: "0102030405" },
    });

    expect(dto.reference).toBe("REP-2026-0001");
    expect(dto.device).toEqual({ brand: "Apple", model: "iPhone 13", storage: "256 Go", color: "Noir" });
    expect(dto.shop).toEqual({ name: "Boutique Test", address: "1 rue de la Paix", phone: "0102030405" });

    const serialized = JSON.stringify(dto);
    expect(serialized).not.toContain("356789104512345");
    expect(serialized).not.toContain("1234");
    expect(serialized).not.toContain("note interne");
    expect(serialized).not.toContain("uuid-client");
    expect(serialized).not.toContain("uuid-boutique");
    expect(serialized).not.toContain("129");
    expect(serialized).not.toContain("imei");
  });

  it("flags a cancelled repair without faking a timeline", () => {
    const dto = buildPublicTrackingDto({
      repair: { reference: "REP-2026-0002", status: "annule", brand: "Apple", model: "iPhone 12", storage: null, color: null },
      history: [
        { status: "recu", created_at: "2026-10-01T10:00:00Z" },
        { status: "annule", created_at: "2026-10-02T10:00:00Z" },
      ],
      shop: { name: "Boutique", address: null, phone: null },
    });
    expect(dto.cancelled).toBe(true);
    expect(dto.currentStep).toBe("recu");
  });
});

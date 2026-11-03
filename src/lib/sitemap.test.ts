import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import { isSitemapRouteIncluded, sitemapStaticPaths, sitemapXML } from "./sitemap";

function inventory() {
  const root = createRootRoute({ staticData: { sitemap: false } });
  const home = createRoute({ getParentRoute: () => root, path: "/", staticData: { sitemap: true } });
  const legal = createRoute({ getParentRoute: () => root, path: "/mentions-legales", staticData: { sitemap: true } });
  const privateLayout = createRoute({ getParentRoute: () => root, id: "private", staticData: { sitemap: "exclude-subtree" } });
  const dashboard = createRoute({ getParentRoute: () => privateLayout, path: "/tableau-de-bord", staticData: { sitemap: true } });
  const tracking = createRoute({ getParentRoute: () => root, path: "/suivi/$token", staticData: { sitemap: false } });
  const reset = createRoute({ getParentRoute: () => root, path: "/reset-password", staticData: { sitemap: false } });
  const router = createRouter({ routeTree: root.addChildren([home, legal, privateLayout.addChildren([dashboard]), tracking, reset]) });
  return { router, dashboard, tracking, reset };
}

describe("public sitemap", () => {
  it("derives public URLs while respecting excluded ancestors and secret/recovery pages", () => {
    const { router, dashboard, tracking, reset } = inventory();
    expect(sitemapStaticPaths(router)).toEqual(["/", "/mentions-legales"]);
    expect(isSitemapRouteIncluded(dashboard)).toBe(false);
    expect(isSitemapRouteIncluded(tracking)).toBe(false);
    expect(isSitemapRouteIncluded(reset)).toBe(false);
  });

  it("uses the published origin, deduplicates URLs and omits unsupported lastmod", () => {
    const xml = sitemapXML("https://trade-in-pro-iphone.lovable.app", [{ path: "/" }, { path: "/" }]);
    expect(xml).toContain("<loc>https://trade-in-pro-iphone.lovable.app/</loc>");
    expect(xml.match(/<url>/g)).toHaveLength(1);
    expect(xml).not.toContain("lastmod");
  });

  it("rejects nonlocal paths and non-origin base URLs", () => {
    expect(() => sitemapXML("https://trade-in-pro-iphone.lovable.app", [{ path: "//other.example/private" }])).toThrow();
    expect(() => sitemapXML("https://trade-in-pro-iphone.lovable.app/subpath", [{ path: "/" }])).toThrow();
  });
});
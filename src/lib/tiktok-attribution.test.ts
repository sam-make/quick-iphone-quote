import { describe, expect, it } from "vitest";
import { tiktokVideo } from "./tiktok-attribution";

describe("TikTok video attribution", () => {
  it("attributes the existing TikTok bio link", () => {
    expect(tiktokVideo("?utm_source=tiktok&utm_medium=social&utm_campaign=bio")).toBe("bio");
  });
  it.each(["estimation", "scan", "reparation"])("attributes the %s video", (video) => {
    expect(tiktokVideo(`?utm_source=tiktok&utm_content=${video}`)).toBe(video);
  });
  it("does not attribute unrelated visits", () => {
    expect(tiktokVideo("?utm_source=instagram&utm_content=scan")).toBeNull();
    expect(tiktokVideo("")).toBeNull();
  });
  it("does not collect arbitrary or personal query values", () => {
    expect(tiktokVideo("?utm_source=tiktok&utm_content=private%40example.com")).toBe("unknown");
  });
});
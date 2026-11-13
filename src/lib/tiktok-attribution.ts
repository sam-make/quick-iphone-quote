/** Only public campaign labels are collected; arbitrary query text is discarded. */
export function tiktokVideo(search: string) {
  const params = new URLSearchParams(search);
  if (params.get("utm_source")?.toLowerCase() !== "tiktok") return null;
  const video = params.get("utm_content") ?? "bio";
  return ["bio", "estimation", "scan", "reparation"].includes(video) ? video : "unknown";
}
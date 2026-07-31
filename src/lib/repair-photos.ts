import { supabase } from "@/integrations/supabase/client";
import type { PhotoPhase } from "./repairs";

export const PHOTO_BUCKET = "repair-photos";

/** Uploads photos into the shop-scoped folder and registers them on the repair. */
export async function uploadRepairPhotos(
  shopId: string,
  repairId: string,
  files: File[],
  phase: PhotoPhase,
): Promise<number> {
  let uploaded = 0;
  for (const file of files) {
    const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${shopId}/${repairId}/${phase}-${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, { upsert: false });
    if (error) continue;
    const { error: rowError } = await supabase
      .from("repair_photos")
      .insert({ repair_id: repairId, storage_path: path, phase });
    if (!rowError) uploaded += 1;
  }
  return uploaded;
}

export async function signedPhotoUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

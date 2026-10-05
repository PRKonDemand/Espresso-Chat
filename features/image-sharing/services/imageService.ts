import imageCompression from "browser-image-compression";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

const BUCKET = "chat-media";
const MAX_DIMENSION = 1600;

export interface UploadedImage {
  path: string;
  width: number;
  height: number;
}

/**
 * Compress + resize on the client before upload. The original is intentionally
 * NOT uploaded — Espresso does not need to preserve it (spec §9).
 */
export async function compressImage(file: File): Promise<File> {
  return imageCompression(file, {
    maxWidthOrHeight: MAX_DIMENSION,
    useWebWorker: true,
    fileType: "image/webp",
    initialQuality: 0.82
  });
}

async function readDimensions(file: File): Promise<{ width: number; height: number }> {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = reject;
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function uploadImage(
  client: Client,
  chatId: string,
  userId: string,
  file: File
): Promise<UploadedImage> {
  const compressed = await compressImage(file);
  const { width, height } = await readDimensions(compressed);
  const ext = compressed.type === "image/webp" ? "webp" : "jpg";
  const path = `${chatId}/${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await client.storage
    .from(BUCKET)
    .upload(path, compressed, { contentType: compressed.type, upsert: false });
  if (error) throw error;

  return { path, width, height };
}

/** Private bucket -> short-lived signed URL for rendering. */
export async function getSignedUrl(client: Client, path: string, expiresIn = 3600) {
  const { data, error } = await client.storage.from(BUCKET).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getSignedUrl } from "../services/imageService";

/**
 * Resolve a private storage path to a temporary signed URL.
 * Blob/HTTP URLs (optimistic previews) pass through untouched.
 */
export function useSignedUrl(path: string | null | undefined) {
  const supabase = useMemo(() => createClient(), []);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!path) {
      setUrl(null);
      return;
    }
    if (path.startsWith("blob:") || path.startsWith("http")) {
      setUrl(path);
      return;
    }
    let active = true;
    getSignedUrl(supabase, path)
      .then((signed) => active && setUrl(signed))
      .catch(() => active && setUrl(null));
    return () => {
      active = false;
    };
  }, [path, supabase]);

  return url;
}

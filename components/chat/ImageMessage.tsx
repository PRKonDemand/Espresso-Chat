"use client";

import { useState } from "react";
import { useSignedUrl } from "@/features/image-sharing/hooks/useSignedUrl";
import { Modal } from "@/components/ui/Modal";

export function ImageMessage({ path, alt }: { path: string; alt?: string }) {
  const url = useSignedUrl(path);
  const [open, setOpen] = useState(false);

  if (!url) {
    return <div className="h-40 w-52 animate-pulse rounded-xl bg-black/10" aria-hidden />;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block overflow-hidden rounded-xl focus:outline-none"
        aria-label="Open image"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={alt ?? "Shared image"} className="max-h-72 w-auto max-w-full object-cover" loading="lazy" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} className="max-w-3xl border-0 bg-transparent p-0 shadow-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={alt ?? "Shared image"} className="max-h-[80vh] w-full rounded-xl object-contain" />
      </Modal>
    </>
  );
}

"use client";

import { mapsLink } from "@/features/location-sharing/services/locationService";

export function LocationMessage({
  latitude,
  longitude,
  label
}: {
  latitude: number;
  longitude: number;
  label?: string | null;
}) {
  return (
    <a
      href={mapsLink(latitude, longitude)}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-xl bg-black/5 p-2.5 no-underline"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-accent">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{label?.trim() || "Shared location"}</span>
        <span className="block truncate text-xs opacity-70">
          {latitude.toFixed(4)}, {longitude.toFixed(4)} · Open in Maps
        </span>
      </span>
    </a>
  );
}

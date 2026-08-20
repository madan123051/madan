"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { CheckCircle2, Download, Filter, KeyRound, LoaderCircle, Share2 } from "lucide-react";
import { enableFirebaseAnalytics } from "@/lib/firebase-client";
import type { FirebaseBrowserConfig } from "@/lib/firebase-config";
import type { GalleryPhoto, GalleryRecord } from "@/lib/gallery-types";

type GalleryAccessProps = {
  config: FirebaseBrowserConfig | null;
  compact?: boolean;
};

type GalleryPayload = {
  gallery: Record<string, unknown> & { id: string };
  photos: Array<Record<string, unknown> & { id: string }>;
  expiresAt: string;
  error?: string;
};

const fallbackFilters = ["Year", "Month", "Event", "Country"];

function normalizeCode(value: string) {
  return value.trim().toUpperCase();
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => b.localeCompare(a));
}

function asText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function mapGallery(data: Record<string, unknown> & { id: string }): GalleryRecord {
  const eventDate = asText(data.eventDate);
  return {
    id: data.id,
    title: asText(data.title, "Private gallery"),
    country: asText(data.country),
    eventDate,
    year: asText(data.year) || (eventDate ? String(new Date(eventDate).getFullYear()) : ""),
    month: asText(data.month) || (eventDate ? new Date(eventDate).toLocaleString("en", { month: "long" }) : ""),
  };
}

function mapPhoto(data: Record<string, unknown> & { id: string }, gallery: GalleryRecord): GalleryPhoto | null {
  const url = asText(data.url);
  if (!url) return null;
  return {
    id: data.id,
    url,
    downloadUrl: asText(data.downloadUrl),
    filename: asText(data.filename, `${data.id}.webp`),
    title: asText(data.title, asText(data.filename, "Photo")),
    year: asText(data.year, gallery.year),
    month: asText(data.month, gallery.month),
    event: asText(data.event, gallery.title),
    country: asText(data.country, gallery.country),
    capturedBy: asText(data.capturedBy, "Captured by madan.wildsaura.com"),
    storagePath: asText(data.storagePath),
  };
}

export function GalleryAccess({ config, compact = false }: GalleryAccessProps) {
  const [accessCode, setAccessCode] = useState("");
  const [gallery, setGallery] = useState<GalleryRecord | null>(null);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expiresAt, setExpiresAt] = useState("");
  const [filters, setFilters] = useState({ year: "", month: "", event: "", country: "" });
  const [message, setMessage] = useState(
    config ? "Enter a 24-hour event code to unlock a private gallery." : "Firebase env is missing from this deployment.",
  );
  const [loading, setLoading] = useState(false);
  const loadedCodeFromUrl = useRef(false);

  useEffect(() => { void enableFirebaseAnalytics(config); }, [config]);

  const filteredPhotos = photos.filter((photo) =>
    (!filters.year || photo.year === filters.year) &&
    (!filters.month || photo.month === filters.month) &&
    (!filters.event || photo.event === filters.event) &&
    (!filters.country || photo.country === filters.country),
  );

  const filterOptions = {
    year: unique(photos.map((photo) => photo.year)),
    month: unique(photos.map((photo) => photo.month)),
    event: unique(photos.map((photo) => photo.event)),
    country: unique(photos.map((photo) => photo.country)),
  };

  const unlockGallery = useCallback(async (codeOverride?: string) => {
    const code = normalizeCode(codeOverride ?? accessCode);
    if (!code) return setMessage("Please enter an event code.");

    setLoading(true);
    setMessage("Checking gallery access...");
    try {
      const response = await fetch(`/api/gallery?code=${encodeURIComponent(code)}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(25_000),
      });
      const payload = (await response.json().catch(() => ({}))) as GalleryPayload;
      if (!response.ok) throw new Error(payload.error || "Unable to unlock this gallery.");

      const nextGallery = mapGallery(payload.gallery);
      const nextPhotos = payload.photos
        .map((photo) => mapPhoto(photo, nextGallery))
        .filter((photo): photo is GalleryPhoto => Boolean(photo));

      setGallery(nextGallery);
      setPhotos(nextPhotos);
      setExpiresAt(payload.expiresAt);
      setSelected(new Set());
      setFilters({ year: "", month: "", event: "", country: "" });
      setMessage(nextPhotos.length ? `${nextPhotos.length} photo${nextPhotos.length === 1 ? "" : "s"} unlocked.` : "Gallery unlocked, but no photos have been uploaded yet.");
    } catch (error) {
      setGallery(null);
      setPhotos([]);
      setExpiresAt("");
      setMessage(error instanceof Error ? error.message : "Unable to unlock this gallery.");
    } finally {
      setLoading(false);
    }
  }, [accessCode]);

  useEffect(() => {
    if (loadedCodeFromUrl.current) return;
    const codeFromUrl = new URLSearchParams(window.location.search).get("code");
    if (!codeFromUrl) return;
    loadedCodeFromUrl.current = true;
    const timeout = window.setTimeout(() => {
      setAccessCode(codeFromUrl);
      void unlockGallery(codeFromUrl);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [unlockGallery]);

  function togglePhoto(photoId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  }

  async function downloadSelected() {
    const chosenPhotos = photos.filter((photo) => selected.has(photo.id));
    if (!chosenPhotos.length) return setMessage("Select at least one photo to download.");

    setMessage(`Starting ${chosenPhotos.length} download${chosenPhotos.length === 1 ? "" : "s"}...`);
    for (const photo of chosenPhotos) {
      const link = document.createElement("a");
      link.href = photo.downloadUrl || photo.url;
      link.download = photo.filename;
      link.target = "_blank";
      link.rel = "noreferrer";
      document.body.append(link);
      link.click();
      link.remove();
    }
    setMessage("Download started.");
  }

  async function shareGallery() {
    if (!gallery) return setMessage("Unlock a gallery before sharing it.");
    const url = `${window.location.origin}/gallery?code=${encodeURIComponent(normalizeCode(accessCode))}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: gallery.title, text: "Private gallery by Madan Wilds Aura", url });
        setMessage("Private gallery link shared.");
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await navigator.clipboard.writeText(url);
    setMessage("Private gallery link copied.");
  }

  return (
    <div className={compact ? "gallery-console" : "gallery-console gallery-console-full"}>
      <div className="console-topbar">
        <span><KeyRound aria-hidden="true" /> {gallery ? gallery.title : "Client access"}</span>
        <strong>{expiresAt ? `Valid until ${new Date(expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "24-hour codes"}</strong>
      </div>

      <div className="access-form">
        <label htmlFor={compact ? "event-code" : "event-code-page"}>Event code or private link</label>
        <div>
          <input
            id={compact ? "event-code" : "event-code-page"}
            name="event-code"
            type="text"
            value={accessCode}
            placeholder="MADAN-EVENT-2026"
            aria-describedby={compact ? "event-code-note" : "event-code-note-page"}
            onChange={(event) => setAccessCode(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") void unlockGallery(); }}
          />
          <button type="button" disabled={loading} onClick={() => void unlockGallery()}>{loading ? <LoaderCircle className="spin" aria-hidden="true" /> : <KeyRound aria-hidden="true" />}{loading ? "Checking" : "Unlock"}</button>
        </div>
        <p id={compact ? "event-code-note" : "event-code-note-page"}>{message}</p>
      </div>

      {photos.length > 0 ? (
        <>
          <div className="filter-controls" aria-label="Gallery filters">
            {(["year", "month", "event", "country"] as const).map((key) => (
              <label key={key}><span>{key}</span><select value={filters[key]} onChange={(event) => setFilters((current) => ({ ...current, [key]: event.target.value }))}><option value="">All {key}</option>{filterOptions[key].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
            ))}
          </div>
          <div className="gallery-toolbar">
            <span><Filter aria-hidden="true" /> {filteredPhotos.length} visible / {selected.size} selected</span>
            <div>
              <button type="button" onClick={() => setSelected(new Set(filteredPhotos.map((photo) => photo.id)))}><CheckCircle2 aria-hidden="true" /> Select all</button>
              <button type="button" onClick={() => void shareGallery()}><Share2 aria-hidden="true" /> Share</button>
              <button className="toolbar-primary" type="button" disabled={!selected.size} onClick={() => void downloadSelected()}><Download aria-hidden="true" /> Download selected</button>
            </div>
          </div>
          <div className="photo-grid" aria-label="Unlocked gallery photos">
            {filteredPhotos.map((photo) => (
              <figure className={selected.has(photo.id) ? "photo-card selected" : "photo-card"} key={photo.id}>
                <button type="button" onClick={() => togglePhoto(photo.id)}><Image src={photo.url} alt={photo.title} width={800} height={600} sizes="(max-width: 620px) 100vw, (max-width: 980px) 50vw, 33vw" unoptimized /><span>{selected.has(photo.id) ? "Selected" : "Select"}</span></button>
                <figcaption><strong>{photo.title}</strong><span>&copy; {photo.capturedBy}</span></figcaption>
              </figure>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="filter-row" aria-label="Gallery filters">{fallbackFilters.map((filter) => <span key={filter}>{filter}</span>)}</div>
          <div className="preview-grid" aria-label="Gallery layout preview">{["Event set", "Portraits", "Travel", "Wildlife"].map((item) => <figure key={item}><div /><figcaption><strong>{item}</strong><span>&copy; Captured by madan.wildsaura.com</span></figcaption></figure>)}</div>
        </>
      )}
    </div>
  );
}

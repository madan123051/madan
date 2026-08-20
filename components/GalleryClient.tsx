"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore";
import { getFirebaseServices, hasFirebaseConfig } from "@/lib/firebase";

type Photo = {
  id: string;
  url: string;
  downloadUrl?: string;
  filename?: string;
  title?: string;
  year?: string;
  month?: string;
  event?: string;
  country?: string;
  capturedBy?: string;
};

type Gallery = {
  id: string;
  title?: string;
  country?: string;
  eventDate?: string;
  year?: string;
  month?: string;
  published?: boolean;
};

const captureLine = "Captured by madan.wildsaura.com";

function valueOf(input: unknown) {
  return typeof input === "string" ? input : "";
}

function uniqueValues(photos: Photo[], key: keyof Photo) {
  return Array.from(new Set(photos.map((photo) => valueOf(photo[key])).filter(Boolean))).sort();
}

export function GalleryClient() {
  const [code, setCode] = useState("");
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({ year: "", month: "", event: "", country: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const loadGallery = useCallback(async (incomingCode?: string) => {
    const lookup = (incomingCode ?? code).trim();
    const services = getFirebaseServices();

    if (!services) {
      setMessage("Firebase env missing. Add NEXT_PUBLIC_FIREBASE_* values first.");
      return;
    }

    if (!lookup) {
      setMessage("Please enter the event code.");
      return;
    }

    setLoading(true);
    setMessage("");
    setSelected(new Set());

    try {
      let galleryId = lookup;
      let galleryData: Gallery | null = null;
      const direct = await getDoc(doc(services.db, "galleries", lookup));

      if (direct.exists()) {
        galleryData = { id: direct.id, ...(direct.data() as Omit<Gallery, "id">) };
      } else {
        const byCode = await getDocs(
          query(collection(services.db, "galleries"), where("accessCodes", "array-contains", lookup), limit(1)),
        );
        if (!byCode.empty) {
          const match = byCode.docs[0];
          galleryId = match.id;
          galleryData = { id: match.id, ...(match.data() as Omit<Gallery, "id">) };
        }
      }

      if (!galleryData || galleryData.published === false) {
        setGallery(null);
        setPhotos([]);
        setMessage("No published gallery found for this code.");
        return;
      }

      const photoSnap = await getDocs(collection(services.db, "galleries", galleryId, "photos"));
      const nextPhotos = photoSnap.docs.map((photoDoc) => {
        const data = photoDoc.data() as Omit<Photo, "id">;
        return { id: photoDoc.id, ...data };
      });

      setGallery(galleryData);
      setPhotos(nextPhotos);
      setMessage(nextPhotos.length ? "" : "Gallery found, but no photos are uploaded yet.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load gallery.");
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    const urlCode = new URLSearchParams(window.location.search).get("code");
    if (urlCode) {
      setCode(urlCode);
      void loadGallery(urlCode);
    }
  }, [loadGallery]);

  const visiblePhotos = useMemo(() => {
    return photos.filter((photo) => {
      return (!filters.year || photo.year === filters.year) &&
        (!filters.month || photo.month === filters.month) &&
        (!filters.event || photo.event === filters.event) &&
        (!filters.country || photo.country === filters.country);
    });
  }, [filters, photos]);

  function toggleSelected(photoId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  }

  function downloadPhoto(photo: Photo) {
    const url = photo.downloadUrl || photo.url;
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = photo.filename || "madan-photo.jpg";
    link.target = "_blank";
    link.rel = "noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function downloadSelected() {
    photos.filter((photo) => selected.has(photo.id)).forEach(downloadPhoto);
  }

  if (!hasFirebaseConfig()) {
    return <section className="access-card"><h2>Firebase not connected</h2><p>Add the Firebase env values in Vercel before using private galleries.</p></section>;
  }

  return (
    <section className="access-card">
      <div className="access-form">
        <label htmlFor="gallery-code">Event code or gallery ID</label>
        <div className="inline-form">
          <input id="gallery-code" value={code} onChange={(event) => setCode(event.target.value)} placeholder="MADAN-EVENT-2026" />
          <button className="button primary" type="button" onClick={() => void loadGallery()} disabled={loading}>{loading ? "Loading" : "Open"}</button>
        </div>
        {message ? <p className="form-message">{message}</p> : null}
      </div>

      {gallery ? (
        <>
          <div className="gallery-title"><p className="eyebrow">Unlocked gallery</p><h2>{gallery.title || gallery.id}</h2><span>{gallery.country} {gallery.eventDate}</span></div>
          <div className="filter-grid">
            {(["year", "month", "event", "country"] as const).map((key) => (
              <label key={key}>{key}<select value={filters[key]} onChange={(event) => setFilters((current) => ({ ...current, [key]: event.target.value }))}><option value="">All</option>{uniqueValues(photos, key).map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
            ))}
          </div>
          <div className="gallery-actions"><button className="button dark" type="button" onClick={downloadSelected} disabled={!selected.size}>Download selected ({selected.size})</button></div>
          <div className="photo-grid">
            {visiblePhotos.map((photo) => (
              <article className="photo-card" key={photo.id}>
                <img src={photo.url} alt={photo.title || photo.filename || "Madan Wilds Aura gallery photo"} />
                <label><input type="checkbox" checked={selected.has(photo.id)} onChange={() => toggleSelected(photo.id)} /> Select</label>
                <div><strong>{photo.title || photo.filename || "Gallery photo"}</strong><span>{photo.event} {photo.country}</span><small>{photo.capturedBy || captureLine}</small></div>
                <button type="button" onClick={() => downloadPhoto(photo)}>Download</button>
              </article>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

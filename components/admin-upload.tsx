"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import NextImage from "next/image";
import {
  ArrowUpRight,
  Check,
  Copy,
  ImagePlus,
  Images,
  KeyRound,
  LayoutDashboard,
  Link2,
  LoaderCircle,
  LogIn,
  LogOut,
  MonitorUp,
  Share2,
  Trash2,
  UploadCloud,
} from "lucide-react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { enableFirebaseAnalytics, getFirebaseServices } from "@/lib/firebase-client";
import type { FirebaseBrowserConfig } from "@/lib/firebase-config";

type AdminUploadProps = { config: FirebaseBrowserConfig | null };
type AdminTab = "gallery" | "library" | "access" | "hero";

type AdminPhoto = {
  id: string;
  url: string;
  storagePath?: string;
  filename?: string;
  originalFilename?: string;
  title?: string;
  size?: number;
  createdAt?: string;
};

type GalleryOption = {
  id: string;
  title: string;
  country?: string;
  eventDate?: string;
  year?: string;
  month?: string;
  photos?: AdminPhoto[];
};

type HeroImage = { url: string; storagePath: string; alt: string };

type QueueItem = {
  id: string;
  name: string;
  status: "waiting" | "processing" | "uploading" | "saving" | "done" | "error";
  error?: string;
};

type ProcessedPhoto = {
  blob: Blob;
  filename: string;
  height: number;
  originalName: string;
  title: string;
  width: number;
};

const copyrightText = "Captured by madan.wildsaura.com";
const maxUploadBytes = 10 * 1024 * 1024;
const storageTimeoutMs = 120_000;

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-");
}

function baseFileName(name: string) {
  return safeFileName(name.replace(/\.[^.]+$/, "")) || "madan-photo";
}

function monthName(dateValue: string) {
  if (!dateValue) return "";
  return new Date(`${dateValue}T00:00:00`).toLocaleString("en", { month: "long" });
}

function randomCodeBlock() {
  const bytes = new Uint8Array(3);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
}

function generateAccessCode(gallery?: GalleryOption) {
  const datePart = gallery?.eventDate?.replaceAll("-", "") || "GALLERY";
  const titlePart = slugify(gallery?.title || "event").replaceAll("-", "").slice(0, 10).toUpperCase();
  return ["MADAN", datePart, titlePart || "PHOTO", randomCodeBlock()].join("-");
}

function withTimeout<T>(task: Promise<T>, timeoutMs: number, message: string) {
  return new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error(message)), timeoutMs);
    task.then(resolve, reject).finally(() => window.clearTimeout(timeout));
  });
}

function loadImage(file: File) {
  return new Promise<{ image: HTMLImageElement; release: () => void }>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => resolve({ image, release: () => URL.revokeObjectURL(objectUrl) });
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Could not read ${file.name}.`));
    };
    image.src = objectUrl;
  });
}

function canvasToWebp(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Browser could not create WebP image."))),
      "image/webp",
      quality,
    );
  });
}

async function processImage(file: File, addCopyrightStrip: boolean): Promise<ProcessedPhoto> {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name} is not an image file.`);

  const { image, release } = await loadImage(file);
  const maxSide = addCopyrightStrip ? 2800 : 4200;

  try {
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    let width = Math.max(1, Math.round(image.naturalWidth * scale));
    let height = Math.max(1, Math.round(image.naturalHeight * scale));
    let quality = addCopyrightStrip ? 0.88 : 0.92;
    let blob: Blob | null = null;

    for (let attempt = 0; attempt < 14; attempt += 1) {
      const stripHeight = addCopyrightStrip ? Math.max(52, Math.round(width * 0.055)) : 0;
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Browser canvas is unavailable.");

      canvas.width = width;
      canvas.height = height + stripHeight;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, width, height);

      if (addCopyrightStrip) {
        const padding = Math.max(18, Math.round(width * 0.025));
        context.fillStyle = "#ffffff";
        context.fillRect(0, height, width, stripHeight);
        context.fillStyle = "#0f281a";
        context.font = `700 ${Math.max(14, Math.round(stripHeight * 0.3))}px Arial, Helvetica, sans-serif`;
        context.textBaseline = "middle";
        context.fillText(copyrightText, padding, height + stripHeight / 2);
      }

      blob = await withTimeout(canvasToWebp(canvas, quality), 60_000, `Image processing timed out for ${file.name}.`);
      if (blob.size <= maxUploadBytes) break;
      if (quality > 0.58) quality -= 0.08;
      else {
        width = Math.max(1, Math.round(width * 0.86));
        height = Math.max(1, Math.round(height * 0.86));
      }
    }

    if (!blob || blob.size > maxUploadBytes) throw new Error(`${file.name} is still above 10MB after compression.`);

    return {
      blob,
      filename: `${baseFileName(file.name)}.webp`,
      height,
      originalName: file.name,
      title: file.name.replace(/\.[^.]+$/, ""),
      width,
    };
  } finally {
    release();
  }
}

async function adminRequest<T>(user: User, init: RequestInit = {}) {
  const token = await user.getIdToken();
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${token}`);
  if (init.body) headers.set("content-type", "application/json");
  const response = await fetch("/api/admin", { ...init, headers });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "Admin request failed.");
  return payload;
}

async function uploadAuthenticatedBlob(
  user: User,
  config: FirebaseBrowserConfig,
  path: string,
  blob: Blob,
  customMetadata: Record<string, string> = {},
) {
  const token = await user.getIdToken();
  const boundary = `firebase-${crypto.randomUUID()}`;
  const metadata = JSON.stringify({
    name: path,
    contentType: "image/webp",
    metadata: customMetadata,
  });
  const body = new Blob(
    [
      `--${boundary}\r\nContent-Type: application/json; charset=utf-8\r\n\r\n${metadata}\r\n`,
      `--${boundary}\r\nContent-Type: image/webp\r\n\r\n`,
      blob,
      `\r\n--${boundary}--`,
    ],
    { type: `multipart/related; boundary=${boundary}` },
  );
  const endpoint = new URL(
    `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(config.storageBucket)}/o`,
  );
  endpoint.searchParams.set("name", path);

  const response = await withTimeout(
    fetch(endpoint, {
      method: "POST",
      headers: {
        authorization: `Firebase ${token}`,
        "content-type": `multipart/related; boundary=${boundary}`,
        "x-firebase-gmpid": config.appId,
        "x-goog-upload-protocol": "multipart",
      },
      body,
    }),
    storageTimeoutMs,
    `Storage upload timed out for ${path.split("/").at(-1) ?? "image"}.`,
  );

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    const detail = payload.error?.message || `Storage returned HTTP ${response.status}.`;
    throw new Error(
      response.status === 401
        ? `Firebase rejected the admin login token. Sign out, sign in again, and retry. ${detail}`
        : detail,
    );
  }

  return `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(config.storageBucket)}/o/${encodeURIComponent(path)}?alt=media`;
}

function galleryShareLink(code: string) {
  return `${window.location.origin}/gallery?code=${encodeURIComponent(code)}`;
}

export function AdminUpload({ config }: AdminUploadProps) {
  const services = useMemo(() => getFirebaseServices(config), [config]);
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState<AdminTab>("gallery");
  const [title, setTitle] = useState("");
  const [country, setCountry] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [galleries, setGalleries] = useState<GalleryOption[]>([]);
  const [selectedGalleryId, setSelectedGalleryId] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [heroImages, setHeroImages] = useState<HeroImage[]>([]);
  const [heroFiles, setHeroFiles] = useState<File[]>([]);
  const [message, setMessage] = useState(config ? "Sign in to manage galleries." : "Firebase env is missing from this deployment.");
  const [busy, setBusy] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [deletingId, setDeletingId] = useState("");

  useEffect(() => { void enableFirebaseAnalytics(config); }, [config]);

  const loadDashboard = useCallback(async (nextUser: User) => {
    try {
      const [galleryPayload, heroResponse] = await Promise.all([
        adminRequest<{ galleries: GalleryOption[] }>(nextUser),
        fetch("/api/hero", { cache: "no-store" }),
      ]);
      const heroPayload = (await heroResponse.json().catch(() => ({}))) as { images?: HeroImage[]; error?: string };
      if (!heroResponse.ok) throw new Error(heroPayload.error || "Could not load hero images.");

      const nextGalleries = [...galleryPayload.galleries].sort((a, b) =>
        `${b.eventDate ?? ""}${b.title}`.localeCompare(`${a.eventDate ?? ""}${a.title}`),
      );
      setGalleries(nextGalleries);
      setHeroImages((heroPayload.images ?? []).slice(0, 5));
      setSelectedGalleryId((current) => current || nextGalleries[0]?.id || "");
      setMessage("Dashboard ready.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load dashboard data.");
    }
  }, []);

  useEffect(() => {
    if (!services) return;
    return onAuthStateChanged(services.auth, (nextUser) => {
      setUser(nextUser);
      if (nextUser) void loadDashboard(nextUser);
    });
  }, [loadDashboard, services]);

  function selectedGallery() {
    return galleries.find((gallery) => gallery.id === selectedGalleryId);
  }

  function updateQueue(id: string, patch: Partial<QueueItem>) {
    setQueue((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!services) return setMessage("Firebase is not configured yet.");
    setBusy(true);
    setMessage("Signing in...");
    try {
      await signInWithEmailAndPassword(services.auth, email.trim(), password);
      setPassword("");
      setMessage("Signed in. Loading dashboard...");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGalleryUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!services || !user || !config) return setMessage("Sign in before uploading.");
    if (!title.trim()) return setMessage("Add an event title.");
    if (files.length === 0) return setMessage("Choose one or more photos.");

    const firebaseConfig = config;
    const galleryTitle = title.trim();
    const galleryId = slugify(`${eventDate || "gallery"}-${galleryTitle}`) || crypto.randomUUID();
    const year = eventDate ? String(new Date(`${eventDate}T00:00:00`).getFullYear()) : "";
    const month = monthName(eventDate);
    const countryValue = country.trim();
    const items = files.map((file, index) => ({ id: `${file.name}-${file.lastModified}-${index}`, name: file.name, status: "waiting" as const }));

    setQueue(items);
    setBusy(true);
    setMessage("Creating gallery...");

    try {
      await adminRequest(user, {
        method: "POST",
        body: JSON.stringify({ action: "saveGallery", galleryId, title: galleryTitle, country: countryValue, eventDate, year, month }),
      });

      let cursor = 0;
      let completed = 0;
      const failures: string[] = [];
      const workers = Array.from({ length: Math.min(2, files.length) }, async () => {
        while (cursor < files.length) {
          const index = cursor;
          cursor += 1;
          const file = files[index];
          const item = items[index];

          try {
            updateQueue(item.id, { status: "processing" });
            const processed = await processImage(file, true);
            const path = `galleries/${galleryId}/${Date.now()}-${crypto.randomUUID()}-${processed.filename}`;

            updateQueue(item.id, { status: "uploading" });
            const url = await uploadAuthenticatedBlob(
              user,
              firebaseConfig,
              path,
              processed.blob,
              {
                capturedBy: "madan.wildsaura.com",
                galleryId,
                originalName: processed.originalName,
              },
            );

            updateQueue(item.id, { status: "saving" });
            await adminRequest(user, {
              method: "POST",
              body: JSON.stringify({
                action: "savePhoto", galleryId, url, downloadUrl: url, storagePath: path,
                filename: processed.filename, originalFilename: processed.originalName, title: processed.title,
                year, month, event: galleryTitle, country: countryValue, height: processed.height,
                size: processed.blob.size, width: processed.width,
              }),
            });
            completed += 1;
            updateQueue(item.id, { status: "done" });
            setMessage(`Uploaded ${completed} of ${files.length} photos.`);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Upload failed.";
            failures.push(`${file.name}: ${errorMessage}`);
            updateQueue(item.id, { status: "error", error: errorMessage });
          }
        }
      });

      await Promise.all(workers);
      await loadDashboard(user);
      setSelectedGalleryId(galleryId);

      if (failures.length) setMessage(`${completed} uploaded, ${failures.length} failed. ${failures[0]}`);
      else {
        setMessage(`${completed} photos uploaded. Create a 24-hour code only when you are ready to share.`);
        setFiles([]);
        setFileInputKey((current) => current + 1);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gallery upload failed.");
    } finally {
      setBusy(false);
    }
  }

  function handleGenerateCode() {
    const nextCode = generateAccessCode(selectedGallery());
    setAccessCode(nextCode);
    setShareLink("");
    setExpiresAt("");
    setMessage("New code generated. Save it to start the 24-hour access window.");
  }

  async function handleSaveCode() {
    const gallery = selectedGallery();
    if (!user || !gallery || !accessCode.trim()) return setMessage("Choose a gallery and generate a code first.");

    setBusy(true);
    setMessage("Activating 24-hour access...");
    try {
      const payload = await adminRequest<{ expiresAt: string; accessCode: string }>(user, {
        method: "POST",
        body: JSON.stringify({ action: "createCode", galleryId: gallery.id, title: gallery.title, accessCode: accessCode.trim().toUpperCase() }),
      });
      const link = galleryShareLink(payload.accessCode);
      setAccessCode(payload.accessCode);
      setShareLink(link);
      setExpiresAt(payload.expiresAt);
      setMessage("Access code is active for 24 hours.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save access code.");
    } finally {
      setBusy(false);
    }
  }

  async function copyShareLink() {
    if (!shareLink) return setMessage("Save the code before copying its link.");
    try {
      await navigator.clipboard.writeText(shareLink);
      setMessage("24-hour gallery link copied.");
    } catch {
      setMessage(`Gallery link: ${shareLink}`);
    }
  }

  async function shareGalleryLink() {
    if (!shareLink) return setMessage("Save the code before sharing its link.");
    const gallery = selectedGallery();
    if (navigator.share) {
      try {
        await navigator.share({
          title: gallery?.title || "Madan Wilds Aura private gallery",
          text: `Private gallery access code: ${accessCode}`,
          url: shareLink,
        });
        setMessage("Gallery link shared.");
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await copyShareLink();
  }

  async function deletePhoto(gallery: GalleryOption, photo: AdminPhoto) {
    if (!user) return;
    const confirmed = window.confirm(`Delete ${photo.title || photo.originalFilename || "this photo"} permanently?`);
    if (!confirmed) return;

    const itemId = `${gallery.id}/${photo.id}`;
    setDeletingId(itemId);
    setMessage("Deleting photo from Firebase...");
    try {
      await adminRequest(user, {
        method: "POST",
        body: JSON.stringify({ action: "deletePhoto", galleryId: gallery.id, photoId: photo.id }),
      });
      await loadDashboard(user);
      setMessage("Photo permanently deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete photo.");
    } finally {
      setDeletingId("");
    }
  }

  async function deleteGallery(gallery: GalleryOption) {
    if (!user) return;
    const count = gallery.photos?.length ?? 0;
    const confirmed = window.confirm(
      `Delete “${gallery.title}” and all ${count} photo${count === 1 ? "" : "s"} permanently? This cannot be undone.`,
    );
    if (!confirmed) return;

    setDeletingId(gallery.id);
    setMessage("Deleting gallery and stored photos...");
    try {
      await adminRequest(user, {
        method: "POST",
        body: JSON.stringify({ action: "deleteGallery", galleryId: gallery.id }),
      });
      await loadDashboard(user);
      setMessage(`“${gallery.title}” deleted.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete gallery.");
    } finally {
      setDeletingId("");
    }
  }

  async function handleHeroUpload() {
    if (!services || !user || !config) return setMessage("Sign in before uploading hero images.");
    if (!heroFiles.length) return setMessage("Choose at least one hero image.");
    if (heroImages.length + heroFiles.length > 5) return setMessage(`You can keep up to 5 hero images. Remove ${heroImages.length + heroFiles.length - 5} first.`);

    const firebaseConfig = config;
    setBusy(true);
    const nextImages = [...heroImages];
    try {
      for (let index = 0; index < heroFiles.length; index += 1) {
        const file = heroFiles[index];
        setMessage(`Preparing hero image ${index + 1} of ${heroFiles.length}...`);
        const processed = await processImage(file, false);
        const path = `hero/${Date.now()}-${crypto.randomUUID()}-${processed.filename}`;
        const url = await uploadAuthenticatedBlob(user, firebaseConfig, path, processed.blob, {
          capturedBy: "madan.wildsaura.com",
          originalName: processed.originalName,
        });
        nextImages.push({ url, storagePath: path, alt: processed.title });
      }

      const payload = await adminRequest<{ heroImages: HeroImage[] }>(user, {
        method: "POST",
        body: JSON.stringify({ action: "saveHero", heroImages: nextImages }),
      });
      setHeroImages(payload.heroImages);
      setHeroFiles([]);
      setMessage(`${payload.heroImages.length} hero image${payload.heroImages.length === 1 ? "" : "s"} saved. Landing rotation is live.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Hero upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function removeHero(index: number) {
    if (!user) return;
    if (!window.confirm("Remove this hero image permanently?")) return;
    const removedImage = heroImages[index];
    const nextImages = heroImages.filter((_, itemIndex) => itemIndex !== index);
    setBusy(true);
    try {
      const payload = await adminRequest<{ heroImages: HeroImage[] }>(user, {
        method: "POST",
        body: JSON.stringify({ action: "deleteHero", storagePath: removedImage.storagePath, heroImages: nextImages }),
      });
      setHeroImages(payload.heroImages);
      setMessage("Hero image removed from rotation.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update hero rotation.");
    } finally {
      setBusy(false);
    }
  }

  if (!config) return <section className="admin-dashboard admin-empty">Firebase environment variables are missing.</section>;

  return (
    <section className="admin-dashboard">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-intro">
          <span className="admin-sidebar-icon"><LayoutDashboard aria-hidden="true" /></span>
          <p className="eyebrow">Studio control</p>
          <h1>Madan Admin</h1>
          <p>Upload, organize, deliver, and curate every photograph from one private workspace.</p>
        </div>
        {user ? (
          <nav className="admin-tabs" aria-label="Admin sections">
            <button className={tab === "gallery" ? "active" : ""} type="button" onClick={() => setTab("gallery")}><UploadCloud aria-hidden="true" /><span><small>01</small> Upload</span></button>
            <button className={tab === "library" ? "active" : ""} type="button" onClick={() => setTab("library")}><Images aria-hidden="true" /><span><small>02</small> Library</span></button>
            <button className={tab === "access" ? "active" : ""} type="button" onClick={() => setTab("access")}><KeyRound aria-hidden="true" /><span><small>03</small> 24-hour access</span></button>
            <button className={tab === "hero" ? "active" : ""} type="button" onClick={() => setTab("hero")}><MonitorUp aria-hidden="true" /><span><small>04</small> Hero rotation</span></button>
          </nav>
        ) : null}
        <div className="admin-account">
          <span>{user ? user.email : "Admin sign in required"}</span>
          {user ? <button type="button" onClick={() => services && void signOut(services.auth)}><LogOut aria-hidden="true" /> Sign out</button> : null}
        </div>
      </aside>

      <div className="admin-workspace">
        {!user ? (
          <form className="admin-login" onSubmit={(event) => void handleLogin(event)}>
            <span className="section-icon"><LogIn aria-hidden="true" /></span>
            <p className="eyebrow">Secure access</p><h2>Sign in to your studio.</h2>
            <label><span>Email</span><input autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
            <label><span>Password</span><input autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
            <button type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" aria-hidden="true" /> : <LogIn aria-hidden="true" />}{busy ? "Signing in..." : "Sign in"}</button>
          </form>
        ) : null}

        {user && tab === "gallery" ? (
          <div className="admin-section">
            <header><span className="section-icon"><UploadCloud aria-hidden="true" /></span><p className="eyebrow">Bulk upload</p><h2>Create once. Upload the full event together.</h2><span>Photos are compressed to WebP, kept below 10MB, and stamped before upload. No access code is needed here.</span></header>
            <form className="admin-form-modern" onSubmit={(event) => void handleGalleryUpload(event)}>
              <label className="field-wide"><span>Event title</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Tokyo portrait session" required /></label>
              <label><span>Event date</span><input type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} /></label>
              <label><span>Country</span><input value={country} onChange={(event) => setCountry(event.target.value)} placeholder="Japan" /></label>
              <label className="upload-drop field-wide"><ImagePlus aria-hidden="true" /><span>Photos</span><strong>{files.length ? `${files.length} photos selected` : "Choose photos in bulk"}</strong><small>JPG, PNG, HEIC or WebP. Every output receives the white copyright strip.</small><input key={fileInputKey} accept="image/*" multiple type="file" onChange={(event) => setFiles(Array.from(event.target.files ?? []))} required /></label>
              <button className="admin-primary field-wide" type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" aria-hidden="true" /> : <UploadCloud aria-hidden="true" />}{busy ? "Uploading gallery..." : `Upload ${files.length || ""} photo${files.length === 1 ? "" : "s"}`}</button>
            </form>
            {queue.length ? <div className="upload-queue" aria-label="Upload progress">{queue.map((item) => <div key={item.id} className={item.status === "error" ? "error" : ""}><span>{item.name}</span><strong>{item.status === "done" ? <Check aria-hidden="true" /> : null}{item.status}</strong></div>)}</div> : null}
          </div>
        ) : null}

        {user && tab === "library" ? (
          <div className="admin-section admin-library-section">
            <header><span className="section-icon"><Images aria-hidden="true" /></span><p className="eyebrow">Photo library</p><h2>Every uploaded gallery, ready to manage.</h2><span>{galleries.length} galler{galleries.length === 1 ? "y" : "ies"} and {galleries.reduce((total, gallery) => total + (gallery.photos?.length ?? 0), 0)} stored photos.</span></header>
            {galleries.length ? (
              <div className="gallery-library">
                {galleries.map((gallery) => (
                  <article className="library-gallery" key={gallery.id}>
                    <div className="library-gallery-head">
                      <div><span>{gallery.eventDate || "Undated event"}{gallery.country ? ` / ${gallery.country}` : ""}</span><h3>{gallery.title}</h3><p>{gallery.photos?.length ?? 0} photo{gallery.photos?.length === 1 ? "" : "s"}</p></div>
                      <div className="library-gallery-actions">
                        <button type="button" onClick={() => { setSelectedGalleryId(gallery.id); setTab("access"); }}><Link2 aria-hidden="true" /> Create access</button>
                        <button className="danger-button" type="button" disabled={Boolean(deletingId)} onClick={() => void deleteGallery(gallery)}>{deletingId === gallery.id ? <LoaderCircle className="spin" aria-hidden="true" /> : <Trash2 aria-hidden="true" />} Delete gallery</button>
                      </div>
                    </div>
                    {gallery.photos?.length ? (
                      <div className="admin-photo-grid">
                        {gallery.photos.map((photo) => (
                          <figure key={photo.id}>
                            <NextImage src={photo.url} alt={photo.title || photo.filename || "Uploaded gallery photo"} width={640} height={480} sizes="(max-width: 720px) 50vw, 240px" unoptimized />
                            <figcaption><strong>{photo.title || photo.originalFilename || "Untitled photo"}</strong><span>{photo.size ? `${(photo.size / 1024 / 1024).toFixed(1)} MB WebP` : "WebP"}</span></figcaption>
                            <button className="photo-delete" aria-label={`Delete ${photo.title || photo.filename || "photo"}`} title="Delete photo" type="button" disabled={Boolean(deletingId)} onClick={() => void deletePhoto(gallery, photo)}>{deletingId === `${gallery.id}/${photo.id}` ? <LoaderCircle className="spin" aria-hidden="true" /> : <Trash2 aria-hidden="true" />}</button>
                          </figure>
                        ))}
                      </div>
                    ) : <div className="library-empty"><Images aria-hidden="true" /><span>This gallery has no uploaded photos yet.</span></div>}
                  </article>
                ))}
              </div>
            ) : <div className="library-empty large"><Images aria-hidden="true" /><strong>Your library is ready.</strong><span>Upload your first gallery and it will appear here.</span><button type="button" onClick={() => setTab("gallery")}>Start upload <ArrowUpRight aria-hidden="true" /></button></div>}
          </div>
        ) : null}

        {user && tab === "access" ? (
          <div className="admin-section">
            <header><span className="section-icon"><KeyRound aria-hidden="true" /></span><p className="eyebrow">Client delivery</p><h2>Create access only when the gallery is ready.</h2><span>Every saved code expires automatically after 24 hours. Uploading never requires a code.</span></header>
            <div className="access-builder">
              <label><span>Choose gallery</span><select value={selectedGalleryId} onChange={(event) => { setSelectedGalleryId(event.target.value); setAccessCode(""); setShareLink(""); setExpiresAt(""); }}><option value="">Select a gallery</option>{galleries.map((gallery) => <option key={gallery.id} value={gallery.id}>{gallery.title}{gallery.eventDate ? ` - ${gallery.eventDate}` : ""}</option>)}</select></label>
              <div className="code-display"><KeyRound aria-hidden="true" /><span>Private code</span><strong>{accessCode || "Generate when ready"}</strong></div>
              <div className="admin-actions"><button type="button" onClick={handleGenerateCode} disabled={!selectedGalleryId || busy}><KeyRound aria-hidden="true" /> Generate code</button><button className="admin-primary" type="button" onClick={() => void handleSaveCode()} disabled={!accessCode || busy}><Check aria-hidden="true" /> Activate 24 hours</button><button type="button" onClick={() => void copyShareLink()} disabled={!shareLink}><Copy aria-hidden="true" /> Copy link</button><button type="button" onClick={() => void shareGalleryLink()} disabled={!shareLink}><Share2 aria-hidden="true" /> Share</button></div>
              {shareLink ? <div className="share-result"><div><strong>Active share link</strong><span>{shareLink}</span></div>{expiresAt ? <small>Expires {new Date(expiresAt).toLocaleString()}</small> : null}</div> : null}
            </div>
          </div>
        ) : null}

        {user && tab === "hero" ? (
          <div className="admin-section">
            <header><span className="section-icon"><MonitorUp aria-hidden="true" /></span><p className="eyebrow">Landing page</p><h2>Direct the first impression.</h2><span>Keep up to 5 sharp images. The homepage rotates them automatically without blurring the original files.</span></header>
            <div className="hero-manager-grid">
              {heroImages.map((image, index) => <figure key={image.storagePath || image.url}><NextImage src={image.url} alt={image.alt || `Hero image ${index + 1}`} width={720} height={450} sizes="(max-width: 620px) 100vw, 33vw" unoptimized /><figcaption><span>Frame {String(index + 1).padStart(2, "0")}</span><button type="button" disabled={busy} onClick={() => void removeHero(index)}><Trash2 aria-hidden="true" /> Remove</button></figcaption></figure>)}
              {heroImages.length === 0 ? <div className="hero-empty">Current profile photo stays as fallback until hero images are saved.</div> : null}
            </div>
            <div className="hero-upload-row"><label><ImagePlus aria-hidden="true" /><span>Add hero images</span><input accept="image/*" multiple type="file" onChange={(event) => setHeroFiles(Array.from(event.target.files ?? []).slice(0, 5))} /></label><button className="admin-primary" type="button" disabled={busy || !heroFiles.length || heroImages.length + heroFiles.length > 5} onClick={() => void handleHeroUpload()}>{busy ? <LoaderCircle className="spin" aria-hidden="true" /> : <UploadCloud aria-hidden="true" />}{busy ? "Saving..." : `Add ${heroFiles.length || ""} image${heroFiles.length === 1 ? "" : "s"}`}</button></div>
          </div>
        ) : null}

        <div className="admin-status" role="status"><span className={busy ? "pulse" : ""} />{message}</div>
      </div>
    </section>
  );
}

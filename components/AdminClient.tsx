"use client";

import { useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { addDoc, collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getFirebaseServices, hasFirebaseConfig } from "@/lib/firebase";

const captureLine = "Captured by madan.wildsaura.com";

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function AdminClient() {
  const services = getFirebaseServices();
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [galleryId, setGalleryId] = useState("");
  const [title, setTitle] = useState("");
  const [eventName, setEventName] = useState("");
  const [country, setCountry] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useState(() => {
    if (!services) return;
    return onAuthStateChanged(services.auth, setUser);
  });

  async function login() {
    if (!services) return;
    setBusy(true);
    setMessage("");
    try {
      await signInWithEmailAndPassword(services.auth, email, password);
      setMessage("Admin login successful.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadGallery() {
    if (!services || !user) return;
    const resolvedGalleryId = slugify(galleryId || title || eventName || accessCode);
    const selectedFiles = Array.from(files ?? []);
    if (!resolvedGalleryId || !title || !accessCode || !eventDate || !selectedFiles.length) {
      setMessage("Gallery ID, title, access code, event date, and photos are required.");
      return;
    }

    const date = new Date(eventDate);
    const year = String(date.getFullYear());
    const month = String(date.getMonth() + 1).padStart(2, "0");

    setBusy(true);
    setMessage("Uploading photos...");
    try {
      await setDoc(doc(services.db, "galleries", resolvedGalleryId), {
        title,
        country,
        eventDate,
        year,
        month,
        accessCodes: [accessCode.trim()],
        published: true,
        capturedBy: captureLine,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      for (const file of selectedFiles) {
        const safeName = `${Date.now()}-${slugify(file.name) || "photo"}`;
        const storagePath = `galleries/${resolvedGalleryId}/${safeName}`;
        const storageRef = ref(services.storage, storagePath);
        await uploadBytes(storageRef, file, { contentType: file.type });
        const url = await getDownloadURL(storageRef);
        await addDoc(collection(services.db, "galleries", resolvedGalleryId, "photos"), {
          url,
          downloadUrl: url,
          storagePath,
          filename: file.name,
          title: file.name.replace(/\.[^.]+$/, ""),
          year,
          month,
          event: eventName || title,
          country,
          capturedBy: captureLine,
          copyright: `Copyright ${new Date().getFullYear()} Madan Wilds Aura`,
          createdAt: serverTimestamp(),
        });
      }

      setMessage(`Uploaded ${selectedFiles.length} photos to ${resolvedGalleryId}. Share code: ${accessCode}`);
      setFiles(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!hasFirebaseConfig()) {
    return <section className="access-card"><h1>Firebase not connected</h1><p>Add the Firebase env values in Vercel before using admin upload.</p></section>;
  }

  return (
    <section className="access-card admin-card">
      <div className="gallery-title"><p className="eyebrow">Admin upload</p><h1>Protected photo uploader</h1><span>Only Firebase Auth admins should be allowed by Firestore and Storage rules.</span></div>
      {!user ? (
        <div className="form-grid two">
          <label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" /></label>
          <label>Password<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" /></label>
          <button className="button primary" type="button" onClick={login} disabled={busy}>Login</button>
        </div>
      ) : (
        <>
          <div className="admin-user"><span>Signed in as {user.email}</span><button type="button" onClick={() => services && void signOut(services.auth)}>Sign out</button></div>
          <div className="form-grid">
            <label>Gallery ID<input value={galleryId} onChange={(event) => setGalleryId(event.target.value)} placeholder="tokyo-event-2026" /></label>
            <label>Gallery title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Tokyo Cultural Event" /></label>
            <label>Event name<input value={eventName} onChange={(event) => setEventName(event.target.value)} placeholder="Event name" /></label>
            <label>Country<input value={country} onChange={(event) => setCountry(event.target.value)} placeholder="Japan" /></label>
            <label>Event date<input value={eventDate} onChange={(event) => setEventDate(event.target.value)} type="date" /></label>
            <label>Access code<input value={accessCode} onChange={(event) => setAccessCode(event.target.value)} placeholder="MADAN-EVENT-2026" /></label>
            <label className="wide">Photos<input type="file" accept="image/*" multiple onChange={(event) => setFiles(event.target.files)} /></label>
          </div>
          <button className="button primary" type="button" onClick={uploadGallery} disabled={busy}>{busy ? "Working" : "Upload gallery"}</button>
        </>
      )}
      {message ? <p className="form-message">{message}</p> : null}
    </section>
  );
}

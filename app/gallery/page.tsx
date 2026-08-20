import type { Metadata } from "next";
import Link from "next/link";
import { GalleryClient } from "@/components/GalleryClient";

export const metadata: Metadata = {
  title: "Private Gallery | Madan Wilds Aura",
  description: "Private event gallery access for Madan Wilds Aura clients.",
  robots: { index: false, follow: false },
};

export default function GalleryPage() {
  return (
    <main className="subpage-shell">
      <header className="subpage-header">
        <Link className="brand-mark light" href="/" aria-label="Madan Wilds Aura home">
          <span>MW</span>
          <strong>Madan Wilds Aura</strong>
        </Link>
        <Link className="button dark" href="/admin">Admin upload</Link>
      </header>
      <section className="subpage-hero">
        <p className="eyebrow">Private gallery</p>
        <h1>Unlock event photos with your code.</h1>
        <p>Enter the access code shared by Madan to view, filter, select, and download photos from a private event gallery.</p>
      </section>
      <GalleryClient />
    </main>
  );
}

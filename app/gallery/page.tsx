import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { GalleryAccess } from "@/components/gallery-access";
import { getFirebaseConfigFromEnv } from "@/lib/firebase-config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Private Gallery | Madan Wilds Aura",
  description: "Private event gallery access for Madan Wilds Aura clients.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function GalleryPage() {
  const firebaseConfig = getFirebaseConfigFromEnv();

  return (
    <main className="subpage-shell">
      <header className="subpage-header">
        <BrandLogo className="light" />
        <Link className="button button-dark" href="/admin">
          Admin upload
        </Link>
      </header>

      <section className="subpage-hero">
        <p className="eyebrow">Private gallery</p>
        <h1>Unlock event photos with your code.</h1>
        <p>
          Enter the access code shared by Madan to view, filter, select, and
          download photos from a private event gallery.
        </p>
      </section>

      <GalleryAccess config={firebaseConfig} />
    </main>
  );
}

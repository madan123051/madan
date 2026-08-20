import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, LockKeyhole, ShieldCheck } from "lucide-react";
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
        <div className="subpage-nav"><Link href="/"><ArrowLeft aria-hidden="true" /> Portfolio</Link><Link className="button button-dark" href="/admin"><ShieldCheck aria-hidden="true" /> Admin</Link></div>
      </header>

      <section className="subpage-hero">
        <span className="section-icon"><LockKeyhole aria-hidden="true" /></span>
        <p className="eyebrow">Private delivery</p>
        <h1>Your event, kept between us.</h1>
        <p>
          Enter the 24-hour access code shared by Madan. View the full set,
          filter it, select your photographs, and download directly.
        </p>
      </section>

      <GalleryAccess config={firebaseConfig} />
    </main>
  );
}

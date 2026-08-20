import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Images } from "lucide-react";
import { AdminUpload } from "@/components/admin-upload";
import { BrandLogo } from "@/components/brand-logo";
import { getFirebaseConfigFromEnv } from "@/lib/firebase-config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Upload | Madan Wilds Aura",
  description: "Admin-only photo upload for Madan Wilds Aura private galleries.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPage() {
  const firebaseConfig = getFirebaseConfigFromEnv();

  return (
    <main className="subpage-shell admin-shell">
      <header className="subpage-header">
        <BrandLogo className="light" />
        <div className="subpage-nav"><Link href="/"><ArrowLeft aria-hidden="true" /> Portfolio</Link><Link className="button button-dark" href="/gallery"><Images aria-hidden="true" /> Gallery access</Link></div>
      </header>

      <AdminUpload config={firebaseConfig} />
    </main>
  );
}

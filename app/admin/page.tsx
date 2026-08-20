import type { Metadata } from "next";
import Link from "next/link";
import { AdminClient } from "@/components/AdminClient";

export const metadata: Metadata = {
  title: "Admin Upload | Madan Wilds Aura",
  description: "Admin-only photo upload for Madan Wilds Aura private galleries.",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <main className="subpage-shell admin-shell">
      <header className="subpage-header">
        <Link className="brand-mark light" href="/" aria-label="Madan Wilds Aura home">
          <span>MW</span>
          <strong>Madan Wilds Aura</strong>
        </Link>
        <Link className="button dark" href="/gallery">Gallery access</Link>
      </header>
      <AdminClient />
    </main>
  );
}

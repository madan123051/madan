import {
  ArrowDown,
  ArrowUpRight,
  Camera,
  Download,
  Images,
  LockKeyhole,
  MoveUpRight,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { GalleryAccess } from "@/components/gallery-access";
import { HeroRotator } from "@/components/hero-rotator";
import { ShareButton } from "@/components/share-button";
import { getFirebaseConfigFromEnv } from "@/lib/firebase-config";

export const dynamic = "force-dynamic";

const workLinks = [
  {
    title: "Wilds Aura",
    label: "Wildlife and nature",
    description: "Conservation-minded wildlife photography, birds, macro details, landscapes, field notes, and films.",
    href: "https://www.wildsaura.com/",
    cta: "View Wilds Aura",
    number: "01",
  },
  {
    title: "Luma Gallery",
    label: "Published collections",
    description: "A considered viewing space for selected series, visual sets, and client-facing stories.",
    href: "https://luma.wildsaura.com/",
    cta: "Open Luma",
    number: "02",
  },
  {
    title: "Private Archive",
    label: "Event delivery",
    description: "Protected event, portrait, and travel galleries with selection and direct downloads.",
    href: "/gallery",
    cta: "Enter private gallery",
    number: "03",
  },
];

const socialLinks = [
  { label: "Wilds Aura", href: "https://www.wildsaura.com/" },
  { label: "Luma", href: "https://luma.wildsaura.com/" },
  { label: "Instagram", href: "#contact" },
  { label: "YouTube", href: "#contact" },
  { label: "Contact", href: "https://www.wildsaura.com/contact" },
  { label: "Admin", href: "/admin" },
];

export default function Home() {
  const firebaseConfig = getFirebaseConfigFromEnv();

  return (
    <main>
      <header className="site-header" aria-label="Primary navigation">
        <BrandLogo href="#top" />
        <nav className="nav-links" aria-label="Page sections">
          <a href="#work">Work</a>
          <a href="/gallery">Gallery</a>
          <a href="#contact">Contact</a>
          <ShareButton className="header-share" label="Share" />
        </nav>
      </header>

      <section id="top" className="hero" aria-label="Madan Shrestha photography">
        <HeroRotator />
        <div className="hero-overlay" aria-hidden="true" />
        <div className="hero-content">
          <p className="eyebrow"><Camera aria-hidden="true" /> Independent photographer / Japan</p>
          <h1>Madan<br />Shrestha</h1>
          <p className="hero-copy">Wildlife, people, events, and places held with patience. A personal portfolio with private delivery built directly into the experience.</p>
          <div className="hero-actions">
            <a className="button button-primary" href="/gallery"><LockKeyhole aria-hidden="true" /> Private gallery</a>
            <a className="button button-ghost" href="#work">Explore my work <ArrowDown aria-hidden="true" /></a>
          </div>
        </div>
        <aside className="hero-caption" aria-label="Photo credit"><span>Captured by</span><strong>madan.wildsaura.com</strong></aside>
      </section>

      <section className="intro-band" aria-label="Portfolio focus">
        <div><Camera aria-hidden="true" /><strong>Wildlife storytelling</strong><p>Nature, birds, macro, landscapes, and conservation-led visual stories.</p></div>
        <div><Images aria-hidden="true" /><strong>Events and portraits</strong><p>Human moments organized by date, place, country, and event.</p></div>
        <div><Download aria-hidden="true" /><strong>Private delivery</strong><p>24-hour links, access codes, selection, and direct downloads.</p></div>
      </section>

      <section id="work" className="section">
        <div className="section-heading">
          <p className="eyebrow"><MoveUpRight aria-hidden="true" /> Connected portfolio</p>
          <h2>Three doors into one body of work.</h2>
          <p>Explore long-form wildlife stories, selected visual collections, or enter a protected client archive made for direct delivery.</p>
        </div>
        <div className="work-list">
          {workLinks.map((item) => (
            <article className="work-row" key={item.title}>
              <span className="work-number">{item.number}</span>
              <div><p>{item.label}</p><h3>{item.title}</h3></div>
              <span className="work-description">{item.description}</span>
              <a href={item.href} target={item.href.startsWith("http") ? "_blank" : undefined} rel={item.href.startsWith("http") ? "noreferrer" : undefined}>{item.cta} <ArrowUpRight aria-hidden="true" /></a>
            </article>
          ))}
        </div>
      </section>

      <section id="gallery" className="gallery-section">
        <div className="gallery-copy">
          <p className="eyebrow"><LockKeyhole aria-hidden="true" /> Private gallery system</p>
          <h2>Your photographs, delivered quietly and securely.</h2>
          <p>Use the 24-hour code or private link shared by Madan. Filter an event, select the frames you love, and download them directly.</p>
          <a className="text-link" href="/gallery">Open full gallery experience <ArrowUpRight aria-hidden="true" /></a>
        </div>
        <GalleryAccess config={firebaseConfig} compact />
      </section>

      <section className="admin-note" aria-label="Private gallery features">
        <div><p className="eyebrow"><Images aria-hidden="true" /> Built for delivery</p><h2>Every detail remains attached to the image.</h2></div>
        <ul>
          <li><strong>01</strong><span>Automatic white copyright strip on every uploaded gallery photo.</span></li>
          <li><strong>02</strong><span>Private pages excluded from public search-engine indexing.</span></li>
          <li><strong>03</strong><span>Organized by year, month, event, and country for fast selection.</span></li>
          <li><strong>04</strong><span>Protected access through expiring code or direct share link.</span></li>
        </ul>
      </section>

      <footer id="contact" className="site-footer">
        <div><p className="eyebrow">Connect</p><h2>Let&apos;s make something worth remembering.</h2><p>Personal photography, wildlife stories, event galleries, and private downloads.</p></div>
        <nav className="footer-links" aria-label="External links">{socialLinks.map((link) => <a key={link.label} href={link.href}>{link.label}<ArrowUpRight aria-hidden="true" /></a>)}</nav>
      </footer>
    </main>
  );
}

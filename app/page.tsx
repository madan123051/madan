import { GalleryAccess } from "@/components/gallery-access";
import { BrandLogo } from "@/components/brand-logo";
import { HeroRotator } from "@/components/hero-rotator";
import { getFirebaseConfigFromEnv } from "@/lib/firebase-config";

export const dynamic = "force-dynamic";

const workLinks = [
  {
    title: "Wilds Aura",
    label: "Wildlife and nature",
    description:
      "Conservation-minded wildlife photos, bird portraits, macro details, landscapes, stories, and videos by Madan Shrestha.",
    href: "https://www.wildsaura.com/",
    cta: "View Wilds Aura",
  },
  {
    title: "Luma Gallery",
    label: "Published collections",
    description:
      "A refined viewing space for selected photo work, visual sets, and client-facing image stories from the Wilds Aura world.",
    href: "https://luma.wildsaura.com/",
    cta: "Open Luma",
  },
  {
    title: "Private Archive",
    label: "Event downloads",
    description:
      "A Firebase-powered private gallery area for events, portraits, travel sets, and protected downloads.",
    href: "/gallery",
    cta: "Open private gallery",
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
        </nav>
      </header>

      <section id="top" className="hero" aria-label="Madan Shrestha photography">
        <HeroRotator />
        <div className="hero-overlay" aria-hidden="true" />

        <div className="hero-content">
          <p className="eyebrow">Photographer and visual storyteller</p>
          <h1>Madan Shrestha</h1>
          <p className="hero-copy">
            A personal photography home for wildlife, events, portraits, travel
            stories, and private client galleries. Public first impression,
            protected photo access.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="/gallery">
              Private gallery access
            </a>
            <a className="button button-ghost" href="#work">
              Explore my work
            </a>
          </div>
        </div>

        <aside className="hero-caption" aria-label="Photo credit">
          <span>Captured by</span>
          <strong>madan.wildsaura.com</strong>
        </aside>
      </section>

      <section className="intro-band" aria-label="Portfolio focus">
        <div>
          <span>01</span>
          <strong>Wildlife storytelling</strong>
          <p>Nature, birds, macro, landscapes, and conservation stories.</p>
        </div>
        <div>
          <span>02</span>
          <strong>Event archives</strong>
          <p>Organized galleries by date, place, country, and event name.</p>
        </div>
        <div>
          <span>03</span>
          <strong>Private downloads</strong>
          <p>Shareable links, event codes, and protected download access.</p>
        </div>
      </section>

      <section id="work" className="section">
        <div className="section-heading">
          <p className="eyebrow">Connected portfolio</p>
          <h2>One personal hub for every side of the work.</h2>
          <p>
            The landing page gives visitors a quick look at Madan&apos;s photography
            while routing serious viewers to Wilds Aura, Luma, and private
            gallery access.
          </p>
        </div>

        <div className="work-grid">
          {workLinks.map((item) => (
            <article className="work-card" key={item.title}>
              <p>{item.label}</p>
              <h3>{item.title}</h3>
              <span>{item.description}</span>
              <a
                href={item.href}
                target={item.href.startsWith("http") ? "_blank" : undefined}
                rel={item.href.startsWith("http") ? "noreferrer" : undefined}
              >
                {item.cta}
              </a>
            </article>
          ))}
        </div>
      </section>

      <section id="gallery" className="gallery-section">
        <div className="gallery-copy">
          <p className="eyebrow">Private gallery system</p>
          <h2>Ready for Firebase login, uploads, and event downloads.</h2>
          <p>
            Once Firebase is connected, this area can unlock private photo sets
            with an event code or share link. Visitors will be able to filter
            by year, month, event, and country, then select photos for download.
          </p>
        </div>

        <GalleryAccess config={firebaseConfig} compact />
      </section>

      <section className="admin-note" aria-label="Admin upload plan">
        <div>
          <p className="eyebrow">Admin-only upload flow</p>
          <h2>Upload once. Organize clearly. Share safely.</h2>
        </div>
        <ul>
          <li>Admin login for photo uploads and event creation.</li>
          <li>Automatic copyright line under every gallery photo.</li>
          <li>No public Google indexing for private gallery pages.</li>
          <li>Share by QR code, direct link, or one-time event code.</li>
        </ul>
      </section>

      <footer id="contact" className="site-footer">
        <div>
          <p className="eyebrow">Connect</p>
          <h2>Madan Wilds Aura</h2>
          <p>
            Personal photography, wildlife stories, event galleries, and private
            downloads in one calm, professional home.
          </p>
        </div>

        <nav className="footer-links" aria-label="External links">
          {socialLinks.map((link) => (
            <a key={link.label} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
      </footer>
    </main>
  );
}

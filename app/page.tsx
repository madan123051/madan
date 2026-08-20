const profileImage =
  "https://madan-wilds-aura.breezy-knoll-5462.chatgpt.site/images/madan-profile.webp";

const workLinks = [
  {
    title: "Wilds Aura",
    eyebrow: "Wildlife and nature",
    text: "Wildlife photos, bird portraits, macro details, landscapes, stories, and videos.",
    href: "https://www.wildsaura.com/",
  },
  {
    title: "Luma Gallery",
    eyebrow: "Published collections",
    text: "A refined viewing space for selected photo work and client-facing image stories.",
    href: "https://luma.wildsaura.com/",
  },
  {
    title: "Private Archive",
    eyebrow: "Event downloads",
    text: "Protected galleries for events, portraits, travel sets, and download access.",
    href: "/gallery",
  },
];

const socialLinks = [
  ["Wilds Aura", "https://www.wildsaura.com/"],
  ["Luma", "https://luma.wildsaura.com/"],
  ["Instagram", "#contact"],
  ["YouTube", "#contact"],
  ["Contact", "https://www.wildsaura.com/contact"],
  ["Admin", "/admin"],
];

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="brand-mark" href="#top" aria-label="Madan Wilds Aura home">
          <span>MW</span>
          <strong>Madan Wilds Aura</strong>
        </a>
        <nav className="nav-links" aria-label="Page sections">
          <a href="#work">Work</a>
          <a href="/gallery">Gallery</a>
          <a href="#contact">Contact</a>
        </nav>
      </header>

      <section id="top" className="hero" aria-label="Madan Shrestha photography">
        <img
          className="hero-image"
          src={profileImage}
          alt="Portrait of Madan Shrestha, photographer behind Madan Wilds Aura"
        />
        <div className="hero-overlay" aria-hidden="true" />
        <div className="hero-content">
          <p className="eyebrow">Photographer and visual storyteller</p>
          <h1>Madan Shrestha</h1>
          <p>
            A personal photography home for wildlife, events, portraits, travel
            stories, and private client galleries. Public first impression,
            protected photo access.
          </p>
          <div className="hero-actions">
            <a className="button primary" href="/gallery">Private gallery access</a>
            <a className="button ghost" href="#work">Explore my work</a>
          </div>
        </div>
        <aside className="hero-caption">
          <span>Captured by</span>
          <strong>madan.wildsaura.com</strong>
        </aside>
      </section>

      <section className="intro-band">
        <div><span>01</span><strong>Wildlife storytelling</strong><p>Nature, birds, macro, landscapes, and conservation stories.</p></div>
        <div><span>02</span><strong>Event archives</strong><p>Organized galleries by date, place, country, and event name.</p></div>
        <div><span>03</span><strong>Private downloads</strong><p>Shareable links, event codes, and protected download access.</p></div>
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
              <p>{item.eyebrow}</p>
              <h3>{item.title}</h3>
              <span>{item.text}</span>
              <a href={item.href}>{item.href.startsWith("http") ? "Open" : "Enter"}</a>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-note">
        <div>
          <p className="eyebrow">Admin-only upload flow</p>
          <h2>Upload once. Organize clearly. Share safely.</h2>
        </div>
        <ul>
          <li>Admin login for photo uploads and event creation.</li>
          <li>Automatic copyright line under every gallery photo.</li>
          <li>No public Google indexing for private gallery pages.</li>
          <li>Share by QR code, direct link, or event code.</li>
        </ul>
      </section>

      <footer id="contact" className="site-footer">
        <div>
          <p className="eyebrow">Connect</p>
          <h2>Madan Wilds Aura</h2>
          <p>Personal photography, wildlife stories, event galleries, and private downloads in one professional home.</p>
        </div>
        <nav className="footer-links" aria-label="External links">
          {socialLinks.map(([label, href]) => <a key={label} href={href}>{label}</a>)}
        </nav>
      </footer>
    </main>
  );
}

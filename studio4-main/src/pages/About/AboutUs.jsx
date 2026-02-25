// Public About page featuring company story, metrics, and team highlights.
import React from "react";
import NavigationBar from "../../components/NavigationBar";
import CountUpOnView from "../../components/CountUpOnView";
import "./AboutUs.css";

const metrics = [
  { value: 50000, suffix: "+", decimals: 0, label: "Bookings stewarded across homes and offices" },
  { value: 4.8, suffix: "/5", decimals: 1, label: "Average CSAT across priority services" },
  { value: 120, suffix: "+", decimals: 0, label: "Active service categories and formats" },
  { value: 12, suffix: " min", decimals: 0, label: "Median first response from concierge" },
];

const values = [
  {
    title: "Trust is designed, not assumed",
    copy: "We verify every provider with ID, right-to-work, and insurance checks, then publish real job photos and feedback.",
  },
  {
    title: "Calm, quiet technology",
    copy: "Automated nudges handle scheduling, scope confirmations, and receipts so updates stay clear without noisy threads.",
  },
  {
    title: "Care for both sides",
    copy: "Providers earn more when they hit CSAT and on-time targets; ops coaches jump in to prevent escalations early.",
  },
];

const testimonials = [
  {
    quote: "We keep the thread human while software does the heavy lifting.",
    name: "Sahana - Concierge Lead",
  },
  {
    quote:
      "Concierge teams monitor live work, step in when priorities shift, and keep communication calm and clear.",
    name: "Live operations",
  },
  {
    quote:
      "Providers earn more when they delight customers; ops coaches help them deliver premium experiences every time.",
    name: "Provider coaching",
  },
];

const ctaCards = [
  {
    title: "Start a request",
    copy: "Tell us what you need and our concierge will share curated providers in less than an hour.",
    link: "/get-started",
    action: "Start a request",
  },
  {
    title: "Talk to support",
    copy: "Concierge teams monitor live work, step in when priorities shift, and keep communication calm and clear.",
    link: "/support",
    action: "Talk to support",
  },
  {
    title: "Join as Professional",
    copy: "Providers earn more when they delight customers; ops coaches help them deliver premium experiences every time.",
    link: "/provider/register",
    action: "Join as Professional",
  },
];

// ---------------------- New GALLERY IMAGES ----------------------
const GALLERY_IMAGES = [
  {
    src: "https://plus.unsplash.com/premium_photo-1661662878810-67afdda3ef6f?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTd8fGNsZWFuZXJ8ZW58MHx8MHx8fDA%3D",
    alt: "Customer support team assisting a client",
  },
  {
    src: "https://images.unsplash.com/photo-1613844044163-1ad2f2d0b152?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8aG91c2UlMjBwYWludGVyfGVufDB8fDB8fHww",
    alt: "Painter preparing for a home service",
  },
  {
    src: "https://plus.unsplash.com/premium_photo-1682097066897-209d0d9e9ae5?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8cGhvdG9ncmFwaGVyfGVufDB8fDB8fHww",
    alt: "Cleaner ready for a booking",
  },
  {
    src: "https://plus.unsplash.com/premium_photo-1661342434748-e8d1486582f9?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8ZXZlbnQlMjBwbGFubmVyfGVufDB8fDB8fHww",
    alt: "City service in snowy conditions",
  },
];

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1580893246395-52aead8960dc?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTh8fHNoYWtlJTIwaGFuZHxlbnwwfHwwfHx8MA%3D%3D";

const STORY_IMAGE =
  "https://images.unsplash.com/photo-1562322140-8baeececf3df?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8aGFpciUyMGRyZXNzZXJ8ZW58MHx8MHx8fDA%3D";

const ABOUT_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80";

export default function AboutUs() {
  const handleImageError = (event) => {
    if (!event?.currentTarget) return;
    if (event.currentTarget.dataset.fallbackApplied === "true") return;
    event.currentTarget.dataset.fallbackApplied = "true";
    event.currentTarget.src = ABOUT_FALLBACK_IMAGE;
  };

  return (
    <div className="about-page">
      <NavigationBar />

      <main className="about-main" aria-labelledby="about-hero-title">
        {/* ---------------- STATS (TOP) ---------------- */}
        <section className="about-section about-stats">
          <div className="about-section-inner">
            <span className="about-pill soft">Proof Points</span>
            <h2>Allora by the Numbers</h2>
            <p className="about-section-subtitle">
              Every request blends concierge judgment with transparent data.
            </p>

            <div className="about-stats-grid">
              {metrics.map((item, index) => (
                <article key={item.label} className="about-stat-card">
                  <span className="about-stat-value">
                    <CountUpOnView
                      target={item.value}
                      suffix={item.suffix}
                      decimals={item.decimals}
                      duration={1400}
                    />
                  </span>
                  <p className="about-stat-label">{item.label}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------- HERO ---------------- */}
        <section className="about-hero">
          <div className="about-hero-inner">
            <div className="about-hero-text">
              <span className="about-pill">About Allora</span>
              <h1 id="about-hero-title">Concierge-grade service for every booking.</h1>
              <p className="about-hero-lede">
                Allora combines curated professionals, live collaboration, and real people who stay on call so everyday
                services feel effortless and reliable.
              </p>

              <div className="about-hero-actions">
                <a className="about-btn primary" href="/get-started">Start a request</a>
                <a className="about-btn ghost" href="/support">Talk to support</a>
              </div>
            </div>

            <div className="about-hero-visual">
              <div className="about-hero-image-card">
                <img src={HERO_IMAGE} alt="Allora concierge and provider collaborating" onError={handleImageError} />
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- STORY ---------------- */}
        <section className="about-section about-story">
          <div className="about-section-inner story-grid">
            <div className="about-story-copy">
              <span className="about-pill soft">Our Story</span>
              <h2>We built Allora after coordinating repairs for our own buildings.</h2>
              <p>
                The early days were just neighbours, trusted pros, and handwritten checklists. We digitised that warmth
                and rigour so more people could rely on it without chasing updates.
              </p>

              <div className="about-story-bullets">
                <div className="about-bullet">
                  <span className="about-point-dot" />
                  <p>Started as a hallway notice board in Bengaluru, expanded through word of mouth.</p>
                </div>
                <div className="about-bullet">
                  <span className="about-point-dot" />
                  <p>Concierge hosts and ops engineers co-design tools they use with customers daily.</p>
                </div>
                <div className="about-bullet">
                  <span className="about-point-dot" />
                  <p>Every new service category runs live pilots before launch.</p>
                </div>
              </div>
            </div>

            <div className="about-story-visual">
              <div className="about-story-image-card">
                <img src={STORY_IMAGE} alt="Allora team" onError={handleImageError} />
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- VALUES ---------------- */}
        <section className="about-section about-values">
          <div className="about-section-inner">
            <span className="about-pill soft">Operating System</span>
            <h2>The beliefs that shape every interaction.</h2>

            <div className="about-values-grid">
              {values.map((item) => (
                <article key={item.title} className="about-value-card">
                  <h3>{item.title}</h3>
                  <p>{item.copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------- GALLERY (NEW) ---------------- */}
        <section className="about-section about-gallery">
          <div className="about-section-inner">
            <h2>Inside the Allora Story</h2>
            <p className="about-section-subtitle">
              Behind every interaction is a team refining playbooks and improving services.
            </p>

            <div className="about-gallery-grid">
              {GALLERY_IMAGES.map((img) => (
                <figure key={img.src} className="about-gallery-card">
                  <img src={img.src} alt={img.alt} onError={handleImageError} />
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------- TESTIMONIALS ---------------- */}
        <section className="about-section about-testimonials">
          <div className="about-section-inner">
            <h2>What Our Customers Say</h2>

            <div className="about-testimonial-grid">
              {testimonials.map((item) => (
                <article key={item.quote} className="about-testimonial-card">
                  <p className="about-quote">“{item.quote}”</p>
                  <p className="about-quote-name">{item.name}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------- CTA GRID ---------------- */}
        <section className="about-section about-cta-grid">
          <div className="about-section-inner">
            <h2>Growing Better with Allora</h2>

            <div className="about-cta-cards">
              {ctaCards.map((item) => (
                <article key={item.title} className="about-cta-card">
                  <div className="about-cta-icon" />
                  <h3>{item.title}</h3>
                  <p>{item.copy}</p>
                  <a className="about-link" href={item.link}>
                    {item.action}
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

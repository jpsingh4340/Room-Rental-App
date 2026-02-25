// Customer About page outlining Allora's value propositions and team highlights.
import React from "react";
import NavigationBar from "../../components/NavigationBar";
import "./About.css";

const heroPoints = [
  {
    title: "Curated partners",
    copy: "Local specialists vet every professional, maintain their playbooks, and review photo updates before they ship.",
  },
  {
    title: "One shared thread",
    copy: "Quotes, approvals, and progress shots live in a single timeline for customers, providers, and support.",
  },
  {
    title: "Human escalations",
    copy: "Concierge teams monitor live work, step in when priorities shift, and keep communication calm and clear.",
  },
];

const metrics = [
  { value: "50K+", label: "Bookings stewarded across homes and offices" },
  { value: "4.8/5", label: "Average CSAT across priority services" },
  { value: "120+", label: "Active service categories and formats" },
  { value: "12 min", label: "Median first response from concierge" },
];

const values = [
  {
    title: "Trust is designed, not assumed",
    copy: "We start with neighbourhood-style referrals, then layer verification, insurance, and transparent communication.",
  },
  {
    title: "Calm, quiet technology",
    copy: "Automation handles reminders, scheduling, and routing so the human conversations stay thoughtful.",
  },
  {
    title: "Care for both sides",
    copy: "Providers earn more when they delight customers; ops coaches help them deliver premium experiences every time.",
  },
];

const journey = [
  { year: "2019", text: "A hallway notice board in Bengaluru becomes a digital concierge for neighbours." },
  { year: "2021", text: "We onboard our first cohort of curated providers and launch live service timelines." },
  { year: "2023", text: "Service Hub merges customer updates, pro tooling, and support escalation in one canvas." },
  { year: "2025", text: "12 cities, 120+ categories, and 24/7 concierge coverage across India and New Zealand." },
];

const opsHighlights = [
  { title: "Concierge coverage", detail: "24/7 support line with regional specialists for after-hours requests." },
  {
    title: "Service canvas",
    detail: "Visual boards for quotes, approvals, schedules, and photo updates keep everyone aligned.",
  },
  { title: "Partner coaching", detail: "Playbooks by trade help providers operate like premium boutique brands." },
];

const coverageCities = ["Bengaluru", "Delhi NCR", "Hyderabad", "Pune", "Mumbai", "Chennai", "Auckland", "Wellington"];

const heroImage =
  "https://images.unsplash.com/photo-1580894894513-541e068a3e2b?auto=format&fit=crop&w=1200&q=80";

const storyImage =
  "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1100&q=80";

const opsImage =
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1100&q=80";

const ABOUT_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80";

export default function About() {
  const handleAboutImageError = (event) => {
    if (!event?.currentTarget) return;
    if (event.currentTarget.dataset.fallbackApplied === "true") return;
    event.currentTarget.dataset.fallbackApplied = "true";
    event.currentTarget.src = ABOUT_FALLBACK_IMAGE;
  };

  return (
    <div className="about-page">
      <div className="about-blob about-blob-one" aria-hidden="true" />
      <div className="about-blob about-blob-two" aria-hidden="true" />
      <NavigationBar />

      <main className="about-shell">
        <section className="about-hero-band">
          <div className="about-hero-copy">
            <p className="about-tag">About Allora</p>
            <h1>Concierge-grade service for every booking.</h1>
            <p className="about-lede">
              Allora combines curated professionals, live collaboration, and real people who stay on call so everyday
              services feel effortless and reliable.
            </p>

            <div className="about-hero-actions">
              <a className="about-btn primary" href="/get-started">
                Start a request
              </a>
              <a className="about-btn ghost" href="/support">
                Talk to support
              </a>
            </div>

            <div className="about-pillars">
              {heroPoints.map((point) => (
                <article key={point.title} className="about-pillar">
                  <span className="about-point-dot" aria-hidden="true" />
                  <div>
                    <p className="about-point-title">{point.title}</p>
                    <p className="about-point-copy">{point.copy}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="about-hero-panel">
            <div className="about-glass-card about-live-card">
              <div className="about-card-head">
                <p className="about-tag subtle">Live operations</p>
                <span className="about-badge">Active</span>
              </div>
              <div className="about-live-stats">
                <div>
                  <p className="about-metric-value">12 min</p>
                  <p className="about-metric-label">Median response</p>
                </div>
                <div>
                  <p className="about-metric-value">24/7</p>
                  <p className="about-metric-label">Coverage</p>
                </div>
                <div>
                  <p className="about-metric-value">50K+</p>
                  <p className="about-metric-label">Bookings monitored</p>
                </div>
              </div>
              <div className="about-footprint">
                <p className="about-footprint-label">City footprint</p>
                <div className="about-chip-row">
                  {coverageCities.map((city) => (
                    <span key={city} className="about-chip">
                      {city}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="about-hero-visual">
              <img
                src={heroImage}
                alt="Allora concierge and provider on a call"
                loading="lazy"
                onError={handleAboutImageError}
              />
              <div className="about-hero-chip">
                <p>"We keep the thread human while software does the heavy lifting."</p>
                <span>Sahana - Concierge Lead</span>
              </div>
            </div>
          </div>
        </section>

        <section className="about-proof">
          <div className="about-section-header narrow">
            <p className="about-tag subtle">Proof points</p>
            <h2>Numbers that anchor how we work.</h2>
            <p>
              Every request blends concierge judgment with transparent data. These signals guide how we serve customers
              and partners daily.
            </p>
          </div>
          <div className="about-metrics-grid">
            {metrics.map((item) => (
              <article key={item.label} className="about-metric-card">
                <span className="about-metric-value">{item.value}</span>
                <p className="about-metric-label">{item.label}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="about-story-block">
          <div className="about-story-media">
            <img
              src={storyImage}
              alt="Allora team planning a service rollout"
              loading="lazy"
              onError={handleAboutImageError}
            />
          </div>
          <div className="about-story-copy">
            <p className="about-tag subtle">Our story</p>
            <h2>We built Allora after coordinating repairs for our own buildings.</h2>
            <p>
              The early days were just neighbours, trusted pros, and handwritten checklists. We digitised that warmth and
              rigour so more people could rely on it without chasing updates.
            </p>
            <div className="about-bullets">
              <div className="about-bullet">
                <span className="about-point-dot" aria-hidden="true" />
                <p>Started as a hallway notice board in Bengaluru, expanded through word of mouth.</p>
              </div>
              <div className="about-bullet">
                <span className="about-point-dot" aria-hidden="true" />
                <p>Concierge hosts and ops engineers co-design tools they use with customers daily.</p>
              </div>
              <div className="about-bullet">
                <span className="about-point-dot" aria-hidden="true" />
                <p>Every new service category runs live pilots before we launch it to the wider community.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="about-operating">
          <div className="about-values-panel">
            <div className="about-section-header">
              <p className="about-tag subtle">Operating system</p>
              <h2>The beliefs that shape every interaction.</h2>
              <p>Simple principles keep Allora warm, dependable, and clear - whether you are booking or fulfilling.</p>
            </div>
            <div className="about-values-grid">
              {values.map((item) => (
                <article key={item.title} className="about-value-card">
                  <h3>{item.title}</h3>
                  <p>{item.copy}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="about-ops-panel">
            <div className="about-ops-text">
              <p className="about-tag subtle">How we operate</p>
              <h2>Concierge hearts with an operator's discipline.</h2>
              <p>
                Every ticket blends human judgment with a reliable playbook. The result: predictable outcomes without
                losing the warmth of a trusted neighbourhood referral.
              </p>
              <div className="about-ops-grid">
                {opsHighlights.map((item) => (
                  <div key={item.title} className="about-ops-item">
                    <p className="about-ops-title">{item.title}</p>
                    <p className="about-ops-copy">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="about-ops-media">
              <img
                src={opsImage}
                alt="Ops team reviewing live service timelines"
                loading="lazy"
                onError={handleAboutImageError}
              />
              <div className="about-ops-meter">
                <div className="about-ops-meter-head">
                  <p>Service health</p>
                  <span>Live</span>
                </div>
                <div className="about-ops-meter-bar">
                  <span style={{ width: "86%" }} />
                </div>
                <p className="about-ops-meter-copy">Concierge team resolves 86% of issues without escalations.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="about-journey-band">
          <div className="about-section-header center">
            <p className="about-tag subtle">Milestones</p>
            <h2>From hallway experiments to a national platform.</h2>
          </div>
          <div className="about-journey-timeline">
            {journey.map((item) => (
              <article key={item.year} className="about-journey-stop">
                <span className="about-journey-year">{item.year}</span>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="about-footprint-band">
          <div className="about-footprint-card">
            <div className="about-footprint-text">
              <p className="about-tag subtle">Coverage</p>
              <h2>Where concierge teams are live.</h2>
              <p>Concierge coverage stays 24/7 with regional specialists who keep every request moving.</p>
            </div>
            <div className="about-footprint-grid">
              <div className="about-footprint-list">
                {coverageCities.map((city) => (
                  <span key={city} className="about-chip">
                    {city}
                  </span>
                ))}
              </div>
              <div className="about-footprint-meta">
                <div>
                  <p className="about-metric-value">12 min</p>
                  <p className="about-metric-label">Median response</p>
                </div>
                <div>
                  <p className="about-metric-value">24/7</p>
                  <p className="about-metric-label">Concierge line</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="about-cta">
          <div className="about-cta-card">
            <div>
              <p className="about-tag subtle">Next step</p>
              <h2>Bring your next project to Allora.</h2>
              <p>Tell us what you need and our concierge will share curated providers in less than an hour.</p>
            </div>
            <div className="about-actions">
              <a className="about-btn primary" href="/get-started">
                Start a request
              </a>
              <a className="about-btn ghost" href="/support">
                Talk to support
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

// Marketing landing page highlighting sample services and guiding users to start booking.
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NavigationBar from "../../components/NavigationBar";
import { ReactComponent as InfinityLogo } from "../../assets/infinity-logo.svg";
import "./CustomerDashboard.css";

const demoServices = [
  {
    title: "House Cleaning",
    description: "Trusted cleaners rated by local customers.",
    image:
      "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80",
    category: "Home Services",
  },
  {
    title: "Web Design Sprint",
    description: "Launch-ready web experiences crafted in a week.",
    image:
      "https://images.unsplash.com/photo-1509395176047-4a66953fd231?auto=format&fit=crop&w=800&q=80",
    category: "Digital Services",
  },
  {
    title: "Personal Trainers",
    description: "Find specialists to keep your goals on track.",
    image:
      "https://images.unsplash.com/photo-1554284126-aa88f22d8b74?auto=format&fit=crop&w=800&q=80",
    category: "Health & Wellness",
  },
  {
    title: "Garden Care",
    description: "Skilled gardeners for tidy, healthy outdoor spaces.",
    image:
      "https://images.unsplash.com/photo-1472145246862-b24cf25c4a36?auto=format&fit=crop&w=800&q=80",
    category: "Outdoor Services",
  },
  {
    title: "Event Photography",
    description: "Capture celebrations with cinematic storytelling.",
    image:
      "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=900&q=80",
    category: "Events & Entertainment",
  },
  {
    title: "Mobile Car Grooming",
    description: "Detailing pros that come direct to your driveway.",
    image:
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80",
    category: "Automotive",
  },
];

const popularSearches = ["House Cleaning", "Web Design", "Personal Trainers"];

const SERVICE_TYPES = [
  "Plumbers",
  "Renovations",
  "Electricians",
  "Builders",
  "Website",
  "Mobile App",
  "Painters",
  "Pest Control",
  "Concreting",
  "Glazing",
  "Appliance Repair",
  "Dog Walker",
];

const FALLBACK_SERVICE_IMAGE =
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=900&q=80";

const journeySteps = [
  {
    title: "Share your job",
    copy: "Add location, timing, and budget (or drop photos). Intake takes under a minute.",
    visual: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=900&q=80",
    note: "Intake under 60 seconds",
  },
  {
    title: "Review vetted pros",
    copy: "Within an hour we send 3-5 verified providers with pricing, reviews, and availability.",
    visual: "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=900&q=80",
    note: "Shortlist arrives in under an hour",
  },
  {
    title: "Book, track, and pay",
    copy: "Approve milestones, chat in one thread, and pay once work is done - Allora monitors the timeline.",
    visual: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80",
    note: "Concierge tracks until close-out",
  },
];

export default function DiscoverLanding() {
  const [activeSection, setActiveSection] = useState("discover");
  const [selectedService, setSelectedService] = useState(SERVICE_TYPES[0]);
  const [city, setCity] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // Small debug helper: log elements that create vertical scrollbars
    const t = setTimeout(() => {
      try {
        [...document.querySelectorAll("*")].forEach((el) => {
          const s = getComputedStyle(el);
          if ((s.overflowY === "auto" || s.overflowY === "scroll") && el.scrollHeight > el.clientHeight) {
            console.log("SCROLLABLE:", el, el.className || el.id || el.tagName);
          }
        });
      } catch (e) {
        console.warn("scroll debug failed", e);
      }
    }, 300);
    return () => clearTimeout(t);
  }, []);

  const handleSectionChange = (section) => {
    setActiveSection(section);
    const target = document.getElementById(section);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleServiceTypeSelect = (serviceType) => {
    navigate("/services", { state: { prefill: serviceType } });
  };

  const handleServiceImageError = (event) => {
    if (!event?.currentTarget) return;
    if (event.currentTarget.dataset.fallbackApplied === "true") return;
    event.currentTarget.dataset.fallbackApplied = "true";
    event.currentTarget.src = FALLBACK_SERVICE_IMAGE;
  };

  const handleHeroSubmit = (event) => {
    event.preventDefault();
    handleServiceTypeSelect(selectedService);
  };

  return (
    <div className="customer-page">
      <div className="dashboard-page clean-dashboard">
        <div className="dashboard-circle circle-top" aria-hidden="true" />
        <div className="dashboard-circle circle-bottom" aria-hidden="true" />

        <NavigationBar activeSection={activeSection} onSectionSelect={handleSectionChange} />

        <main className="clean-main">
          <section className="clean-hero" id="discover">
            <div className="clean-hero-left">
              <h1>Find trusted professionals without scrolling through noise.</h1>
              <p>
                Allora pairs neighbourhood expertise with modern tooling so you can browse, book, and track services from
                one calm dashboard.
              </p>
              <div className="clean-popular">
                <span>Popular now</span>
                <div className="clean-popular-tags">
                  {popularSearches.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              </div>
            </div>
            <form className="clean-hero-form" onSubmit={handleHeroSubmit}>
              <div className="clean-form-field">
                <label htmlFor="hero-service">Service</label>
                <select
                  id="hero-service"
                  value={selectedService}
                  onChange={(event) => setSelectedService(event.target.value)}
                >
                  {SERVICE_TYPES.map((service) => (
                    <option key={service} value={service}>
                      {service}
                    </option>
                  ))}
                </select>
              </div>
              <div className="clean-form-field">
                <label htmlFor="hero-city">City</label>
                <input
                  id="hero-city"
                  type="text"
                  placeholder="e.g., Bengaluru"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                />
              </div>
              <div className="clean-form-field">
                <label htmlFor="hero-notes">Notes (optional)</label>
                <textarea id="hero-notes" placeholder="Share timing, style, or budget cues." rows={3} />
              </div>
              <button type="submit" className="nav-cta">See curated providers</button>
            </form>
          </section>

          <section className="modern-steps" aria-label="How Allora works">
            <div className="modern-steps-shell">
              <InfinityLogo className="modern-steps-logo" aria-hidden="true" />
              <div className="modern-steps-header">
                <p className="modern-steps-kicker">How it works</p>
                <h2>From request to done</h2>
                <p>Track a simple path with Allora watching every milestone.</p>
              </div>
              <div className="modern-steps-stack" role="list">
                {journeySteps.map((step, index) => (
                  <article key={step.title} className="compact-step" role="listitem">
                    <div className="compact-step-header">
                      <span className="compact-step-number">{`0${index + 1}`}</span>
                      <div>
                        <h3>{step.title}</h3>
                        <p className="compact-step-note">{step.note}</p>
                      </div>
                    </div>
                    <p className="compact-step-copy">{step.copy}</p>
                  </article>
                ))}
              </div>

              <div className="modern-steps-actions">
                <button type="button" className="ghost" onClick={() => navigate("/get-started")}>
                  Start a request
                </button>
                <button type="button" className="nav-cta" onClick={() => navigate("/services")}>
                  Hire a provider
                </button>
              </div>
            </div>
          </section>

          <section className="clean-services" aria-label="Featured services">
            <div className="clean-section-heading">
              <h2>Fresh from the concierge desk</h2>
              <p>Scene-setting packages curated with photos, pricing, and availability.</p>
            </div>
            <div className="clean-services-grid">
              {demoServices.map((service) => (
                <article key={service.title} className="clean-service-card">
                  <img
                    src={service.image}
                    alt={service.title}
                    loading="lazy"
                    onError={handleServiceImageError}
                  />
                  <div className="clean-service-body">
                    <span>{service.category}</span>
                    <h3>{service.title}</h3>
                    <p>{service.description}</p>
                    <button type="button" onClick={() => handleServiceTypeSelect(service.title)}>
                      Book now
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="clean-cta" aria-label="Get started">
            <div className="clean-cta-card">
              <div>
                <p className="clean-label">Ready in minutes</p>
                <h2>Create your request and let Allora handle the follow-up.</h2>
                <p>
                  From quotes to check-ins, everything lives inside one workspace. Customers stay informed and providers
                  stay focused on the craft.
                </p>
              </div>
              <div className="clean-actions">
                <button type="button" className="nav-cta" onClick={() => navigate("/get-started")}>
                  Start a request
                </button>
                <button type="button" className="ghost" onClick={() => navigate("/support")}>
                  Talk to support
                </button>
              </div>
            </div>
          </section>

          
        </main>
      </div>
    </div>
  );
}


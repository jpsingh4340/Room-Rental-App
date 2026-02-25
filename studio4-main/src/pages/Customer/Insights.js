// Customer insights and FAQ page presenting curated questions and resources.
import React, { useState } from "react";
import NavigationBar from "../../components/NavigationBar";
import "./CustomerDashboard.css";

const FAQS = [
  {
    id: 1,
    category: "Matching & Quotes",
    question: "How long does it take to receive quotes?",
    answer:
      "Most customers hear from three vetted professionals within the first hour. We pre-filter every pro so you only see relevant options.",
  },
  {
    id: 2,
    category: "Trust & Safety",
    question: "Are the professionals background checked?",
    answer:
      "Yes. Every provider on Allora must pass an ID check, reference verification, and ongoing quality reviews from the community.",
  },
  {
    id: 3,
    category: "Payments",
    question: "Do I have to pay to request a service?",
    answer:
      "Requesting is completely free. You only hire and pay once you approve a proposal that fits your budget and timeline.",
  },
];

const CUSTOMER_STORIES = [
  {
    id: 1,
    name: "Sienna - Auckland",
    title: "I booked cleaners in minutes.",
    summary:
      "Allora matched me with two nearby teams. I picked my favourite and now they visit every fortnight without any admin stress.",
    service: "House Cleaning",
  },
  {
    id: 2,
    name: "Mason - Wellington",
    title: "Our website launched ahead of schedule.",
    summary:
      "The design sprint kit gave me three quotes with detailed timelines. We went from idea to pixel-perfect in just 10 days.",
    service: "Web Design Sprint",
  },
  {
    id: 3,
    name: "Ari - Christchurch",
    title: "Support felt like a concierge.",
    summary:
      "Whenever I had a change request, the Allora team relayed it instantly to the provider. Communication was seamless.",
    service: "Customer Support",
  },
];

export default function Insights() {
  const [openFaqId, setOpenFaqId] = useState(FAQS[0].id);

  return (
    <div className="insights-page">
      <NavigationBar />
      <main>
        <section className="faq-hero">
          <span className="faq-pill">Customer Care</span>
          <h1>Frequently Asked Questions</h1>
          <p>
            These are the answers we give the most. If you can't find what you need,{" "}
            <a href="mailto:support@allora.com">contact our concierge team</a> and we'll jump in.
          </p>
        </section>

        <section className="faq-board">
          <div className="faq-notice" role="alert">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
                d="M12 8v4m0 4h.01M12 2.75l9.25 16H2.75z"
              />
            </svg>
            <p>
              Response times may be slightly longer during peak booking periods, but we still respond within a few hours.
            </p>
          </div>

          <div className="faq-accordion">
            {FAQS.map((faq) => {
              const isOpen = openFaqId === faq.id;
              return (
                <article key={faq.id} className={`faq-row${isOpen ? " open" : ""}`}>
                  <button
                    type="button"
                    className="faq-row-trigger"
                    onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                    aria-expanded={isOpen}
                  >
                    <span className="faq-row-category">{faq.category}</span>
                    <span className="faq-row-question">{faq.question}</span>
                    <span className="faq-row-icon" aria-hidden="true">
                      {isOpen ? "-" : "+"}
                    </span>
                  </button>
                  <div className="faq-row-panel" hidden={!isOpen}>
                    <p>{faq.answer}</p>
                  </div>
                </article>
              );
            })}
          </div>

          <aside className="story-column">
            <p className="story-column-eyebrow">Customer stories</p>
            <h2>How people use Allora</h2>
            <p>
              Real quotes from Allora customers who matched with service professionals the same day they posted a request.
            </p>
            <div className="story-stack">
              {CUSTOMER_STORIES.map((story) => (
                <article className="story-card" key={story.id}>
                  <p className="story-service">{story.service}</p>
                  <h3>{story.title}</h3>
                  <p className="story-copy">{story.summary}</p>
                  <p className="story-name">{story.name}</p>
                </article>
              ))}
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}



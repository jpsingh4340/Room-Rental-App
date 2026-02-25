// Registration form that signs up service providers and seeds their profile records.
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { ReactComponent as InfinityLogo } from "../../assets/infinity-logo.svg";
import { addServiceProvider } from "../../serviceProviderCRUD";
import "../Customer/Login.css";
import { auth, db, isFirebaseConfigured } from "../../firebase";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:4000";

export default function ProviderRegistration() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    businessName: "",
    ownerName: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    category: "Home Services",
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    if (!formData.businessName || !formData.ownerName || !formData.email || !formData.password) {
      setMessage("Please complete the required fields.");
      return;
    }

    try {
      setSubmitting(true);

      const { password, ...safeFormData } = formData;
      const providerId = `SP-${Date.now()}`;
      const normalizedEmail = formData.email.trim().toLowerCase();

      if (isFirebaseConfigured && auth && db) {
        // Create auth user for the provider.
        const credential = await createUserWithEmailAndPassword(
          auth,
          normalizedEmail,
          formData.password
        );

        // Create provider record (includes admin notification)
        await addServiceProvider({
          ...safeFormData,
          email: normalizedEmail,
          status: "Pending",
          providerId,
          userId: credential.user.uid,
        });

        // Store provider user profile in /users
        await setDoc(doc(db, "users", credential.user.uid), {
          email: normalizedEmail,
          role: "Service Provider",
          status: "Pending",
          joinedAt: serverTimestamp(),
        });
      } else {
        // Non-Firebase demo path
        await addServiceProvider({
          ...safeFormData,
          email: normalizedEmail,
          status: "Pending",
          providerId,
        });
      }

      // Fire off a confirmation email; non-blocking for local demo storage.
      fetch(`${API_BASE}/provider/register-notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          businessName: formData.businessName,
          ownerName: formData.ownerName,
        }),
      }).catch(() => {
        // Ignore email failures in the UI; logged server-side.
      });

      setMessage(
        "Thanks! Your provider registration was submitted and is pending admin review. You'll be able to log in once approved."
      );
      setFormData({
        businessName: "",
        ownerName: "",
        email: "",
        password: "",
        phone: "",
        address: "",
        category: "Home Services",
      });
    } catch (error) {
      console.error("Failed to register provider", error);

      setMessage("Unable to submit registration to the server. Please try again once online.");

      if (error?.code === "auth/email-already-in-use") {
        setMessage("An account already exists for this email. Try logging in instead.");
      } else if (error?.code === "auth/weak-password") {
        setMessage("Password must be at least 6 characters.");
      } else {
        setMessage("Unable to submit registration. Please try again.");
      }

    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="floating-circle circle-top" aria-hidden="true" />
      <div className="floating-circle circle-bottom" aria-hidden="true" />

      <div className="login-shell">
        <div className="login-panel">
          <div className="brand-wrap">
            <h1 className="brand">ALLORA SERVICE HUB</h1>
            <p className="role">Service Provider</p>
          </div>

          <section className="card" style={{ maxWidth: 520 }}>
            <h2 className="card-title">Provider Registration</h2>
            <p className="card-subtitle">Tell us about your business to join the platform.</p>

            <form className="login-form" onSubmit={handleSubmit}>
              <div className="field">
                <label className="label" htmlFor="businessName">Business Name</label>
                <input
                  id="businessName"
                  name="businessName"
                  className="input"
                  type="text"
                  placeholder="e.g. Acme Home Services"
                  value={formData.businessName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="ownerName">Owner / Contact Name</label>
                <input
                  id="ownerName"
                  name="ownerName"
                  className="input"
                  type="text"
                  placeholder="Full name"
                  value={formData.ownerName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="email">Email</label>
                <input
                  id="email"
                  name="email"
                  className="input"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="password">Password</label>
                <input
                  id="password"
                  name="password"
                  className="input"
                  type="password"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="phone">Phone</label>
                <input
                  id="phone"
                  name="phone"
                  className="input"
                  type="tel"
                  placeholder="+64 21 000 0000"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="address">Address</label>
                <input
                  id="address"
                  name="address"
                  className="input"
                  type="text"
                  placeholder="Street, City"
                  value={formData.address}
                  onChange={handleChange}
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="category">Category</label>
                <select
                  id="category"
                  name="category"
                  className="input"
                  value={formData.category}
                  onChange={handleChange}
                >
                  <option>Home Services</option>
                  <option>Technology</option>
                  <option>Health & Wellness</option>
                  <option>Events</option>
                  <option>Consulting</option>
                  <option>Other</option>
                </select>
              </div>

              {message && (
                <p className="reset-message" role="alert" style={{ marginTop: 4 }}>
                  {message}
                </p>
              )}

              <div className="row-between">
                <button type="button" className="link" onClick={() => navigate(-1)}>
                  Back
                </button>
                <button type="submit" className="btn" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit Registration"}
                </button>
              </div>
            </form>
          </section>
        </div>

        <div className="login-visual" aria-hidden="true">
          <div className="login-visual-inner">
            <div className="visual-logo">
              <InfinityLogo className="infinity-logo" focusable="false" />
            </div>
            <p className="visual-eyebrow">ALLORA</p>
            <h2>Grow your services with Allora.</h2>
            <p>Register your business and we'll review your profile to get you live.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

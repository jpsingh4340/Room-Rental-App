// Simple admin password reset form that captures an email and shows confirmation messaging.
import React, { useState } from "react";
import { ReactComponent as InfinityLogo } from "../../assets/infinity-logo.svg";
import "../Customer/Login.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setMessage("Please enter your email address.");
      return;
    }
    setMessage(`Password reset link sent to ${email}`);
    setEmail("");
  };

  return (
    <div className="admin-login-page">
      <div className="floating-circle circle-top" aria-hidden="true" />
      <div className="floating-circle circle-bottom" aria-hidden="true" />

      <div className="login-shell">
        <div className="login-panel">
          <div className="brand-wrap">
            <h1 className="brand">ALLORA SERVICE HUB</h1>
            <p className="role">Admin Password Reset</p>
          </div>

          <section className="card" style={{ maxWidth: 460 }}>
            <h2 className="card-title">Reset Password</h2>
            <p className="card-subtitle">Enter your admin email to receive a reset link.</p>

            <form className="login-form" onSubmit={handleSubmit}>
              <div className="field">
                <label className="label" htmlFor="email">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  className="input"
                  placeholder="Enter your registered email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn">
                Send Reset Link
              </button>
            </form>

            {message && (
              <p
                style={{
                  marginTop: "12px",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#1e7a45",
                  textAlign: "center",
                }}
              >
                {message}
              </p>
            )}

            <p className="hint">
              <button className="link-strong" type="button" onClick={() => window.history.back()}>
                Back to login
              </button>
            </p>
          </section>
        </div>

        <div className="login-visual" aria-hidden="true">
          <div className="login-visual-inner">
            <div className="visual-logo">
              <InfinityLogo className="infinity-logo" focusable="false" />
            </div>
            <p className="visual-eyebrow">ALLORA</p>
            <h2>Secure workspace for bookings and support.</h2>
            <p>Admins can request a secure reset link to regain access.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

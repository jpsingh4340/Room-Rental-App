// Service provider login page that enforces provider role before entering the dashboard.
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { ReactComponent as InfinityLogo } from "../../assets/infinity-logo.svg";
import "../Customer/Login.css";
import { auth, db } from "../../firebase";

export default function ProviderLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth) return undefined;

    let active = true;
    // Always start the provider login page in a signed-out state so users must log in intentionally.
    signOut(auth).catch(() => {
      if (active) {
        setError("Unable to reset your session. Please try again before signing in.");
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!auth) {
      setError("Firebase is not configured. Add your keys to .env to enable provider login.");
      return;
    }
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    try {
      setSubmitting(true);
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      console.log("[ProviderLogin] Login successful for user:", cred.user.uid);

      const snap = await getDoc(doc(db, "users", cred.user.uid));
      const data = snap.exists() ? snap.data() : {};

      const role = data?.role || data?.Role || data?.userType || null;
      const status = (data?.status || "").toString().toLowerCase();
      if (role !== "Service Provider") {
        setError("This account is not authorized for provider access.");
        await signOut(auth);
        return;
      }
      if (status && status !== "active") {
        setError("Your provider account is pending approval. Please wait for an admin to approve it.");
        await signOut(auth);
        return;
      }
      navigate("/provider/dashboard", { replace: true });
    } catch (signInError) {
      if (signInError?.code === "auth/invalid-credential") {
        setError("Invalid provider credentials.");
      } else {
        setError("Unable to sign in. Please try again.");
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

          <section className="card" style={{ maxWidth: 460 }}>
            <h2 className="card-title">Provider Login</h2>

            <form className="login-form" onSubmit={handleSubmit}>
              <div className="field">
                <label className="label" htmlFor="provider-email">Email Address</label>
                <input
                  id="provider-email"
                  name="email"
                  className="input"
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="provider-password">Password</label>
                <input
                  id="provider-password"
                  name="password"
                  className="input"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>

              {error && (
                <p className="reset-message error" role="alert">
                  {error}
                </p>
              )}

              <button type="submit" className="btn" disabled={submitting}>
                {submitting ? "Signing in..." : "Login"}
              </button>
            </form>
          </section>
        </div>

        <div className="login-visual" aria-hidden="true">
          <div className="login-visual-inner">
            <div className="visual-logo">
              <InfinityLogo className="infinity-logo" focusable="false" />
            </div>
            <p className="visual-eyebrow">ALLORA</p>
            <h2>Calm workspace for bookings and support.</h2>
          </div>
        </div>
      </div>
    </div>
  );
}

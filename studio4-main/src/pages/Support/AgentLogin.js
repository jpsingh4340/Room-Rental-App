// Agent login flow that checks staff roles before routing to support dashboards.
import React, { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { ReactComponent as InfinityLogo } from "../../assets/infinity-logo.svg";
import "../Customer/Login.css";
import { auth, db } from "../../firebase";

export default function AgentLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth || !db) return undefined;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const role = snap.exists() ? snap.data()?.role || snap.data()?.Role || snap.data()?.userType : null;
        if (role === "Customer Support") {
          navigate("/agent-dashboard", { replace: true });
        }
      } catch (err) {
        console.warn("[AgentLogin] Failed to pre-check role", err);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const getUserRole = async (uid) => {
    if (!db) return null;
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    return data.role || data.Role || data.userType || null;
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");

    if (!auth || !db) {
      setError("Firebase is not configured. Add your keys to enable agent login.");
      return;
    }

    try {
      setSubmitting(true);
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const role = await getUserRole(credential.user.uid);

      if (role === "Customer Support") {
        navigate("/agent-dashboard", { replace: true });
      } else {
        setError("This account is not authorized for agent access.");
        await signOut(auth);
      }
    } catch (err) {
      setError("Invalid email or password. Please try again.");
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
            <p className="role">Customer Support</p>
          </div>

          <section className="card" style={{ maxWidth: 460 }}>
            <h2 className="card-title">Agent Login</h2>
            <p className="card-subtitle">Access the agent workspace to handle customer tickets.</p>

            <form className="login-form" onSubmit={handleLogin}>
              <div className="field">
                <label className="label" htmlFor="agent-email">
                  Email Address
                </label>
                <input
                  id="agent-email"
                  type="email"
                  className="input"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="agent-password">
                  Password
                </label>
                <div className="password-row">
                  <input
                    id="agent-password"
                    type={showPassword ? "text" : "password"}
                    className="input"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="eye-btn"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                      <path d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10z" />
                    </svg>
                  </button>
                </div>
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
            <h2>Calm workspace for support and tickets.</h2>
            <p>Track every request with friendly status cards and on-call support.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

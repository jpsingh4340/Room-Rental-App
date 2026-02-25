// Admin sign-in screen that optionally seeds admin users and routes to the dashboard.
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { ReactComponent as InfinityLogo } from "../../assets/infinity-logo.svg";
import "../Customer/Login.css";
import { auth, db } from "../../firebase";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const allowedAdminEmails = (
    process.env.REACT_APP_ADMIN_EMAILS || ""
  )
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  useEffect(() => {
    if (!auth) return undefined;
    signOut(auth).catch(() => {});
    return () => {};
  }, []);

  const upsertUserRole = async (uid, emailAddress, role) => {
    if (!db || !uid) return null;
    const userRef = doc(db, "users", uid);
    await setDoc(
      userRef,
      {
        email: emailAddress || "",
        role,
      },
      { merge: true }
    );
    return role;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!auth) {
      setError("Firebase is not configured.");
      return;
    }

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setSubmitting(true);
      const emailAddress = email.trim().toLowerCase();

      if (!allowedAdminEmails.includes(emailAddress)) {
        setError("This email is not authorized as an admin.");
        return;
      }

      try {
        const credential = await signInWithEmailAndPassword(auth, emailAddress, password);
        if (db && credential?.user?.uid) {
          await upsertUserRole(credential.user.uid, emailAddress, "Administrator");
        }
        navigate("/admin/dashboard", { replace: true });
      } catch (signInError) {
        if (signInError?.code === "auth/user-not-found") {
          const bootstrap = await createUserWithEmailAndPassword(auth, emailAddress, password);
          if (db && bootstrap?.user?.uid) {
            await upsertUserRole(bootstrap.user.uid, emailAddress, "Administrator");
          }
          navigate("/admin/dashboard", { replace: true });
        } else {
          throw signInError;
        }
      }
    } catch (signInError) {
      console.error("Admin login error:", signInError);
      if (signInError?.code === "auth/invalid-credential") {
        setError("Invalid credentials.");
      } else if (signInError?.code === "auth/user-not-found") {
        setError("Admin account not found.");
      } else if (signInError?.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (signInError?.code === "auth/network-request-failed") {
        setError("Network error. Check your connection.");
      } else {
        setError(`Error: ${signInError.message || "Unknown error"}`);
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
            <p className="role">Administrator</p>
          </div>

          <section className="card">
            <h2 className="card-title">Login</h2>

            <form className="login-form" onSubmit={handleSubmit}>
              <div className="field">
                <label className="label" htmlFor="admin-email">
                  Email Address
                </label>
                <input
                  id="admin-email"
                  name="email"
                  type="email"
                  className="input"
                  placeholder="Email Address"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="admin-password">
                  Password
                </label>
                <div className="password-row">
                  <input
                    id="admin-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    className="input"
                    placeholder="Password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    required
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
            <h2>Calm workspace for administration.</h2>
          </div>
        </div>
      </div>
    </div>
  );
}

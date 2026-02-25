// Customer authentication screen covering login, signup, and inline password reset flows.
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import "./Login.css";
import { ReactComponent as InfinityLogo } from "../../assets/infinity-logo.svg";
import { auth, db, ensureUserRole } from "../../firebase";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:4000";

export default function Login({ defaultMode = "login" }) {
  const [isLoading, setIsLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetStep, setResetStep] = useState(1);
  const [resetEmail, setResetEmail] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [signupData, setSignupData] = useState({
    firstName: "",
    lastName: "",
    dob: "",
    region: "",
    email: "",
    password: "",
  });
  const [signupMessage, setSignupMessage] = useState("");
  const [signupError, setSignupError] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const showSignupByDefault = defaultMode === "signup" || location.pathname === "/signup";
  const [isSignup, setIsSignup] = useState(showSignupByDefault);

  const routeToRoleHome = (role) => {
    if (role === "Administrator") {
      navigate("/admin/dashboard", { replace: true });
      return;
    }
    if (role === "Customer Support") {
      navigate("/support", { replace: true });
      return;
    }
    if (role === "Service Provider") {
      navigate("/provider/dashboard", { replace: true });
      return;
    }
    navigate("/my-board", { replace: true });
  };

  const canAccessSupport = (role) =>
    ["Customer", "Customer Support", "Administrator", "Service Provider"].includes(role);

  const getReturnPath = () => {
    const fromState = location.state?.from;
    if (!fromState) return null;
    if (typeof fromState === "string") return fromState;
    if (typeof fromState === "object" && fromState.pathname) return fromState.pathname;
    return null;
  };

  const getReturnState = () => {
    const fromState = location.state?.from;
    if (typeof fromState === "object" && fromState.state) return fromState.state;
    return null;
  };

  const redirectToSupportIfRequested = (role) => {
    const targetPath = getReturnPath();
    if (targetPath && targetPath.startsWith("/support") && canAccessSupport(role)) {
      navigate(targetPath, { replace: true });
      return true;
    }
    return false;
  };

  useEffect(() => {
    const finishLoading = () => setIsLoading(false);
    if (document.readyState === "complete") {
      finishLoading();
    } else {
      window.addEventListener("load", finishLoading);
    }
    const timeoutId = window.setTimeout(finishLoading, 1200);

    return () => {
      window.removeEventListener("load", finishLoading);
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (isLoading) {
      document.body.classList.add("body-lock");
    } else {
      document.body.classList.remove("body-lock");
    }

    return () => {
      document.body.classList.remove("body-lock");
    };
  }, [isLoading]);

  useEffect(() => {
    setIsSignup(showSignupByDefault);
  }, [showSignupByDefault]);

  const getUserRole = async (uid) => {
    if (!db) return null;
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    return data.role || data.Role || data.userType || null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoginError("");

    if (!auth || !db) {
      setLoginError("Firebase is not configured. Add your keys to .env to enable login.");
      return;
    }

    if (!email.trim() || !password) {
      setLoginError("Please enter your email and password.");
      return;
    }

    try {
      setLoginLoading(true);
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      await ensureUserRole(credential.user.uid, credential.user.email);
      const role = await getUserRole(credential.user.uid);

      const returnPath = getReturnPath();
      const returnState = getReturnState();

      if (redirectToSupportIfRequested(role)) {
        return;
      }

      if (returnPath) {
        navigate(returnPath, { replace: true, state: returnState });
        return;
      }

      if (role === "Administrator") {
        routeToRoleHome("Administrator");
        return;
      }

      if (role === "Customer Support") {
        routeToRoleHome("Customer Support");
        return;
      }

      if (role === "Service Provider") {
        routeToRoleHome("Service Provider");
        return;
      }

      if (role === "Customer") {
        routeToRoleHome("Customer");
        return;
      }

      setLoginError("No role is assigned to this account. Please contact support.");
      await signOut(auth);
    } catch (error) {
      if (error?.code === "auth/invalid-credential") {
        setLoginError("Invalid email or password.");
      } else if (error?.code === "auth/network-request-failed") {
        setLoginError("Network error while signing in. Check your connection and try again.");
      } else if (error?.code === "auth/too-many-requests") {
        setLoginError("Too many attempts. Please wait a moment and try again.");
      } else if (error?.code === "auth/user-disabled") {
        setLoginError("This account is disabled. Contact support.");
      } else {
        console.warn("[Login] Sign-in failed:", error);
        setLoginError(error?.message || "Unable to sign in right now. Please try again.");
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const resetSignupState = () => {
    setSignupData({
      firstName: "",
      lastName: "",
      dob: "",
      region: "",
      email: "",
      password: "",
    });
    setSignupMessage("");
    setSignupError("");
    setSignupLoading(false);
  };

  const resetForgotState = () => {
    setResetStep(1);
    setResetEmail("");
    setInputCode("");
    setNewPassword("");
    setConfirmPassword("");
    setResetMessage("");
    setResetError("");
    setResetLoading(false);
  };

  const openForgot = () => {
    setForgotOpen(true);
    resetForgotState();
  };

  const openSignup = () => {
    setIsSignup(true);
    navigate("/signup", { state: location.state });
    resetSignupState();
  };

  const closeSignup = () => {
    setIsSignup(false);
    navigate("/login", { state: location.state });
    resetSignupState();
  };

  const closeForgot = () => {
    setForgotOpen(false);
    resetForgotState();
  };

  const handleForgotSubmit = async (event) => {
    event.preventDefault();
    setResetError("");
    setResetMessage("");

    try {
      setResetLoading(true);

      if (resetStep === 1) {
        if (!resetEmail.trim() || !resetEmail.includes("@")) {
          setResetError("Please enter a valid email address.");
          return;
        }

        const response = await fetch(`${API_BASE_URL}/auth/reset/request`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: resetEmail }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.message || "Could not send reset code.");
        }

        setResetStep(2);
        setInputCode("");
        setResetMessage(`We sent a 6-digit code to ${resetEmail}.`);
        return;
      }

      if (resetStep === 2) {
        if (!inputCode.trim()) {
          setResetError("Please enter the code you received.");
          return;
        }

        const response = await fetch(`${API_BASE_URL}/auth/reset/verify`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: resetEmail,
            code: inputCode.trim(),
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.message || "Verification failed.");
        }

        setResetStep(3);
        setResetMessage("Code verified! Create a new password.");
        return;
      }

      if (resetStep === 3) {
        if (newPassword.length < 6) {
          setResetError("Password must be at least 6 characters.");
          return;
        }

        if (newPassword !== confirmPassword) {
          setResetError("Passwords do not match.");
          return;
        }

        const response = await fetch(`${API_BASE_URL}/auth/reset/complete`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: resetEmail,
            code: inputCode.trim(),
            password: newPassword,
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.message || "Could not update password.");
        }

        setResetMessage("Password updated! You can now log in.");
        setTimeout(() => {
          closeForgot();
        }, 1800);
      }
    } catch (error) {
      setResetError(error.message || "Something went wrong. Try again.");
    } finally {
      setResetLoading(false);
    }
  };

  const handleSignupChange = (event) => {
    const { name, value } = event.target;
    setSignupData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSignupSubmit = async (event) => {
    event.preventDefault();
    setSignupError("");
    setSignupMessage("");

    if (!signupData.firstName.trim() || !signupData.lastName.trim()) {
      setSignupError("Please provide your first and last name.");
      return;
    }

    if (!signupData.dob) {
      setSignupError("Please select your date of birth.");
      return;
    }

    if (!signupData.region) {
      setSignupError("Please choose your New Zealand region.");
      return;
    }

    if (!signupData.email.trim() || !signupData.email.includes("@")) {
      setSignupError("Please enter a valid email address.");
      return;
    }

    if (signupData.password.length < 6) {
      setSignupError("Password must be at least 6 characters.");
      return;
    }

    try {
      setSignupLoading(true);

      // Create Firebase user
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          signupData.email.trim(),
          signupData.password
        );
        const user = userCredential.user;

        // Store user info in Firestore
        const userDocRef = doc(db, "users", user.uid);
        await setDoc(
          userDocRef,
          {
            firstName: signupData.firstName,
            lastName: signupData.lastName,
            email: signupData.email.trim().toLowerCase(),
            dob: signupData.dob,
            region: signupData.region,
            role: "Customer",
            createdAt: serverTimestamp(),
          },
          { merge: true }
        );

      // Send welcome email via server (non-blocking for local/offline setups)
      let successMessage = "";
      try {
        const response = await fetch(`${API_BASE_URL}/auth/signup`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(signupData),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          console.warn("[Signup] Welcome email failed:", data?.message || response.statusText);
          successMessage = "Account created successfully! Email service is offline, continuing without sending email.";
        } else {
          successMessage = `Account created successfully! We've emailed ${signupData.email}. Redirecting...`;
        }
      } catch (emailError) {
        console.warn("[Signup] Skipping welcome email; service unreachable.", emailError);
        successMessage = "Account created successfully! Email service is offline, continuing without sending email.";
      }

      setSignupMessage(successMessage || "Account created successfully! Redirecting...");
      setTimeout(() => {
        const returnPath = getReturnPath();
        const returnState = getReturnState();
        if (returnPath) {
          navigate(returnPath, { replace: true, state: returnState });
          return;
        }
        if (!redirectToSupportIfRequested("Customer")) {
          routeToRoleHome("Customer");
        }
      }, 700);
    } catch (error) {
      if (error?.code === "auth/email-already-in-use") {
        setSignupError("This email is already registered.");
      } else if (error?.code === "auth/weak-password") {
        setSignupError("Password is too weak. Please use a stronger password.");
      } else if (error?.code === "auth/network-request-failed") {
        setSignupError("Network error while creating the account. Check your connection or VPN/ad blocker and try again.");
      } else if (error?.message?.includes("Failed to fetch")) {
        setSignupError("Cannot reach the signup email service. Please start the server on the API URL shown in your .env (default http://localhost:4000).");
      } else {
        setSignupError(error.message || "Something went wrong. Please try again.");
      }
    } finally {
      setSignupLoading(false);
    }
  };

  const regions = [
    "Auckland",
    "Wellington",
    "Christchurch",
    "Hamilton",
    "Tauranga",
    "Dunedin",
    "Palmerston North",
    "Napier",
    "Rotorua",
    "New Plymouth",
    "Whangarei",
    "Nelson",
    "Invercargill",
    "Queenstown",
  ];

  const cardClassName = isSignup ? "card card--signup" : "card";
  const pageClassName = isSignup ? "admin-login-page is-signup" : "admin-login-page";

  return (
    <div className={pageClassName}>
      {isLoading && (
        <div className="page-loader" role="status" aria-live="polite">
          <InfinityLogo className="infinity-logo loader-logo" focusable="false" />
          <p className="loader-text">Loading Allora</p>
        </div>
      )}

      <div className="floating-circle circle-top" aria-hidden="true" />
      <div className="floating-circle circle-bottom" aria-hidden="true" />

      <div className="login-shell">
        <div className="login-panel">
          <section className={cardClassName}>
          {isSignup ? (
            <>
              <h2 className="card-title">Create Account</h2>
              <div className="signup-header">
                <span className="pill badge-soft">New workspace</span>
                <p className="card-subtitle">
                  Create your Allora account to manage bookings, support, and insights in one calm place.
                </p>
                <div className="signup-meta">
                  <span className="meta-chip">Email verification</span>
                  <span className="meta-chip">NZ region ready</span>
                  <span className="meta-chip meta-chip--accent">Secure by design</span>
                </div>
              </div>
              <form className="login-form" onSubmit={handleSignupSubmit}>
                <div className="signup-row">
                  <div className="field">
                    <label className="label" htmlFor="signup-first-name">
                      First Name
                    </label>
                    <input
                      id="signup-first-name"
                      name="firstName"
                      type="text"
                      className="input"
                      placeholder="First Name"
                      value={signupData.firstName}
                      onChange={handleSignupChange}
                      required
                    />
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="signup-last-name">
                      Last Name
                    </label>
                    <input
                      id="signup-last-name"
                      name="lastName"
                      type="text"
                      className="input"
                      placeholder="Last Name"
                      value={signupData.lastName}
                      onChange={handleSignupChange}
                      required
                    />
                  </div>
                </div>

                <div className="signup-row signup-row--pair">
                  <div className="field">
                    <label className="label" htmlFor="signup-dob">
                      Date of Birth
                    </label>
                    <input
                      id="signup-dob"
                      name="dob"
                      type="date"
                      className="input"
                      value={signupData.dob}
                      onChange={handleSignupChange}
                      required
                    />
                  </div>

                  <div className="field">
                    <label className="label" htmlFor="signup-region">
                      Region (New Zealand)
                    </label>
                    <select
                      id="signup-region"
                      name="region"
                      className="input"
                      value={signupData.region}
                      onChange={handleSignupChange}
                      required
                    >
                      <option value="">Select a city</option>
                      {regions.map((region) => (
                        <option key={region} value={region}>
                          {region}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="signup-row signup-row--pair signup-row--tight">
                  <div className="field">
                    <label className="label" htmlFor="signup-email">
                      Email Address
                    </label>
                    <input
                      id="signup-email"
                      name="email"
                      type="email"
                      className="input"
                      placeholder="Email Address"
                      value={signupData.email}
                      onChange={handleSignupChange}
                      required
                    />
                  </div>

                  <div className="field">
                    <label className="label" htmlFor="signup-password">
                      Password
                    </label>
                    <input
                      id="signup-password"
                      name="password"
                      type="password"
                      className="input"
                      placeholder="Create a password"
                      value={signupData.password}
                      onChange={handleSignupChange}
                      required
                    />
                  </div>
                </div>

                {signupMessage && (
                  <p className="reset-message success">{signupMessage}</p>
                )}
                {signupError && (
                  <p className="reset-message error">{signupError}</p>
                )}

                <button type="submit" className="btn" disabled={signupLoading}>
                  {signupLoading ? "Creating..." : "Create Account"}
                </button>
              </form>

              <p className="hint">
                Already have an account?{" "}
                <button type="button" className="inline-link" onClick={closeSignup}>
                  Log in
                </button>
              </p>

            </>
          ) : (
            <>
              <h2 className="card-title">Login</h2>

              <form onSubmit={handleSubmit} className="login-form">
                <div className="field">
                  <label className="label" htmlFor="login-email">
                    Email Address
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    className="input"
                    placeholder="Email Address"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>

                <div className="field">
                  <label className="label" htmlFor="login-password">
                    Password
                  </label>
                  <div className="password-row">
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      className="input"
                      placeholder="Password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="eye-btn"
                      aria-label="Toggle password visibility"
                      aria-pressed={showPassword}
                      onClick={() => setShowPassword((value) => !value)}
                    >
                      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                        <path d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {loginError && (
                  <p className="reset-message error" role="alert">
                    {loginError}
                  </p>
                )}

                <div className="row-between">
                  <span className="remember-copy">Stay signed in</span>
                  <button type="button" className="link" onClick={openForgot}>
                    Forgot Password
                  </button>
                </div>

                <button type="submit" className="btn" disabled={loginLoading}>
                  {loginLoading ? "Signing in..." : "Login"}
                </button>

                <p className="hint">
                  Don't have an account?{" "}
                  <button type="button" className="inline-link" onClick={openSignup}>
                    Sign up
                  </button>
                </p>
              </form>
            </>
          )}
          </section>
        </div>

        <div className="login-visual" aria-hidden="true">
          <div className="login-visual-inner">
            <div className="visual-logo">
              <InfinityLogo className="infinity-logo" focusable="false" />
            </div>
            <div className="visual-copy">
              <p className="visual-eyebrow">Allora</p>
              <h2>
                {isSignup
                  ? "Create your Allora workspace."
                  : "Calm workspace for bookings and support."}
              </h2>
              <p>
                {isSignup
                  ? "Open an account to manage bookings, notes, and on-call support in one place."
                  : "Track every request with friendly status cards and on-call support."}
              </p>
              {isSignup && (
                <ul className="visual-list">
                  <li>Unified bookings, support, and notes</li>
                  <li>Invite teammates whenever you are ready</li>
                  <li>Crafted for New Zealand customers</li>
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {forgotOpen && (
        <div className="reset-overlay" role="dialog" aria-modal="true">
          <section className="reset-card">
            <header className="reset-header">
              <h3 className="reset-title">
                {resetStep === 1 && "Reset Password"}
                {resetStep === 2 && "Enter Verification Code"}
                {resetStep === 3 && "Create New Password"}
              </h3>
              <button
                type="button"
                className="reset-close"
                aria-label="Close reset password form"
                onClick={closeForgot}
              >
                {"×"}
              </button>
            </header>

            <form className="reset-form" onSubmit={handleForgotSubmit}>
              {resetStep === 1 && (
                <label className="reset-field">
                  <span>Email Address</span>
                  <input
                    type="email"
                    className="input"
                    value={resetEmail}
                    onChange={(event) => setResetEmail(event.target.value)}
                    placeholder="Enter your email"
                    required
                  />
                </label>
              )}

              {resetStep === 2 && (
                <label className="reset-field">
                  <span>Verification Code</span>
                  <input
                    type="text"
                    className="input"
                    value={inputCode}
                    onChange={(event) => setInputCode(event.target.value)}
                    placeholder="Enter 6-digit code"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                  />
                </label>
              )}

              {resetStep === 3 && (
                <>
                  <label className="reset-field">
                    <span>New Password</span>
                    <input
                      type="password"
                      className="input"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder="Enter new password"
                      required
                    />
                  </label>
                  <label className="reset-field">
                    <span>Confirm Password</span>
                    <input
                      type="password"
                      className="input"
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      placeholder="Confirm new password"
                      required
                    />
                  </label>
                </>
              )}

              {resetMessage && (
                <p className="reset-message success">{resetMessage}</p>
              )}
              {resetError && <p className="reset-message error">{resetError}</p>}

              <button
                type="submit"
                className="btn reset-btn"
                disabled={resetLoading}
              >
                {resetLoading
                  ? resetStep === 1
                    ? "Sending..."
                    : resetStep === 2
                    ? "Verifying..."
                    : "Saving..."
                  : resetStep === 1
                  ? "Send Code"
                  : resetStep === 2
                  ? "Verify Code"
                  : "Save Password"}
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

// Placeholder staff login UI that routes team members into admin-controlled areas.
import React from "react";
import { useNavigate } from "react-router-dom";
import { ReactComponent as InfinityLogo } from "../../assets/infinity-logo.svg";
import "../Customer/Login.css";

export default function StaffLogin() {
  const navigate = useNavigate();

  return (
    <div className="admin-login-page">
      <div className="floating-circle circle-top" aria-hidden="true" />
      <div className="floating-circle circle-bottom" aria-hidden="true" />

      <div className="login-shell">
        <div className="login-panel">
          <div className="brand-wrap">
            <h1 className="brand">ALLORA SERVICE HUB</h1>
            <p className="role">Staff Access</p>
          </div>

          <section className="card">
            <h2 className="card-title">Staff Login</h2>
            <p className="card-subtitle">Choose the workspace you need to access.</p>

            <div className="login-form staff-login-grid">
              <button type="button" className="btn" onClick={() => navigate("/admin/login")}>
                Admin Login
              </button>
              <button type="button" className="btn" onClick={() => navigate("/agent/login")}>
                Customer Support Login
              </button>
            </div>
          </section>
        </div>

        <div className="login-visual" aria-hidden="true">
          <div className="login-visual-inner">
            <div className="visual-logo">
              <InfinityLogo className="infinity-logo" focusable="false" />
            </div>
            <p className="visual-eyebrow">ALLORA</p>
            <h2>Staff portals for secure access.</h2>
            <p>Admins and support agents sign in through their dedicated workspaces.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

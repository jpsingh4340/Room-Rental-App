// Navigation header that manages auth-aware links, role visibility, and notifications dropdowns.
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { ReactComponent as InfinityLogo } from "../assets/infinity-logo.svg";
import { auth, db, isBackgroundUserSession } from "../firebase";
import "./NavigationBar.css";

export default function NavigationBar({
  activeSection,            // Current highlighted nav section
  onSectionSelect,          // Callback when user clicks a nav tab
  notificationCount = 0,    // Unread notification count
  notifications = [],       // Full notification list
  onNotificationsViewed,    // Callback to mark notifications as seen
}) {
  // UI state for collapsing mobile nav
  const [isNavCollapsed, setIsNavCollapsed] = useState(true);

  // Firebase-authenticated user
  const [currentUser, setCurrentUser] = useState(null);

  // Role pulled from Firestore (admin, agent, provider, customer)
  const [currentRole, setCurrentRole] = useState(null);

  // Login dropdown (customer / provider)
  const [showLoginMenu, setShowLoginMenu] = useState(false);

  // Notification popover visibility
  const [showNotificationList, setShowNotificationList] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // Utility to highlight nav tabs based on routing
  const navLinkClass = (section, path) => {
    const matchesSection = activeSection === section;
    const matchesPath = path && location.pathname.startsWith(path);
    return `dashboard-nav-link${matchesSection || matchesPath ? " active" : ""}`;
  };

  // Handles clicks for the Discover button
  const handleDiscoverClick = () => {
    setIsNavCollapsed(true);
    if (onSectionSelect) return onSectionSelect("discover");
    if (location.pathname !== "/discover") navigate("/discover");
  };

  // Generic route navigation wrapper
  const handleNavRouteClick = (path) => {
    setIsNavCollapsed(true);
    navigate(path);
  };

  // CTA → redirect providers to onboarding
  const handleJoinAsProfessional = () => {
    setIsNavCollapsed(true);
    navigate("/provider/register", { state: { role: "Service Provider" } });
  };

  // Handles choosing customer/provider login
  const handleLoginSelect = (value) => {
    setIsNavCollapsed(true);
    setShowLoginMenu(false);
    navigate(value === "provider" ? "/provider/login" : "/login");
  };

  // Logout → reset UI + localStorage + Firebase session
  const handleLogout = async () => {
    setIsNavCollapsed(true);
    try {
      await signOut(auth);
    } finally {
      localStorage.removeItem("allora-demo-role");
      setCurrentUser(null);
      setCurrentRole(null);
      navigate("/login");
    }
  };

  // Toggles mobile hamburger nav
  const toggleNavCollapse = () => {
    setIsNavCollapsed(prev => !prev);
  };

  // Logic for notification button depending on the active role/layout
  const handleNotificationsClick = () => {
    setIsNavCollapsed(true);

    // Mark notifications as viewed in parent state
    if (onNotificationsViewed) onNotificationsViewed();

    const pathname = location.pathname;

    const isProviderView = pathname.startsWith("/provider");
    const isAdminView = pathname.startsWith("/admin");
    const isAgentView = pathname.startsWith("/agent-dashboard");

    // Provider → take user to notifications tab on dashboard
    if (isProviderView) {
      if (pathname.startsWith("/provider/dashboard")) {
        navigate("/provider/dashboard?tab=notifications");
      }
      return;
    }

    // Customer view → open popover
    if (!isAdminView && !isAgentView) {
      setShowNotificationList(open => !open);
      return;
    }

    // Admin / Agent → scroll into notifications panel
    const targetSearch = "?target=notifications";
    const onAdminDashboard =
      isAdminView && pathname.startsWith("/admin/dashboard");

    if (onAdminDashboard) {
      const panel = document.getElementById("admin-notifications-panel");
      if (panel) panel.scrollIntoView({ behavior: "smooth" });

      if (location.search !== targetSearch) {
        navigate(`/admin/dashboard${targetSearch}`);
      }
    } else {
      navigate(`/admin/dashboard${targetSearch}`);
    }
  };

  // Reset dropdowns whenever route changes
  useEffect(() => {
    setIsNavCollapsed(true);
    setShowLoginMenu(false);
    setShowNotificationList(false);
  }, [location.pathname]);

  // Firebase auth listener → load Firestore role when logged in
  useEffect(() => {
    if (!auth || !db) return;

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user || isBackgroundUserSession(user)) {
        setCurrentUser(null);
        setCurrentRole(null);
        return;
      }

      setCurrentUser(user);

      // Fetch role from Firestore /users collection
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const role = snap.exists() ? snap.data().role : null;
        setCurrentRole(role || null);
      } catch (error) {
        console.warn("[Nav] Failed to load user role", error);
        setCurrentRole(null);
      }
    });

    return () => unsub();
  }, [location.pathname]);

  const pathname = location.pathname;

  // Role-based minimal nav context (Provider, Admin, Agent layouts)
  const isAgentView = pathname.startsWith("/agent-dashboard");
  const isAdminView = pathname.startsWith("/admin");
  const isProviderView = pathname.startsWith("/provider");
  const isMinimalNav = isAgentView || isAdminView || isProviderView;

  // Dynamic mini-heading for dashboard layouts
  const minimalHeading = () => {
    if (isAgentView) return { kicker: "Agent workspace", title: "Customer Support Dashboard" };
    if (isAdminView) return { kicker: "Admin workspace", title: "Admin Dashboard" };
    if (isProviderView) return { kicker: "Provider workspace", title: "Service Provider Dashboard" };
    return null;
  };

  // Public nav links vs. customer nav links
  const renderLinks = () => {
    if (isMinimalNav) return null; // Dashboard views hide main navigation

    // Unauthenticated view
    if (!currentUser) {
      return (
        <>
          <button className={navLinkClass("discover", "/discover")} onClick={handleDiscoverClick}>
            Discover
          </button>
          <button className={navLinkClass(null, "/about")} onClick={() => handleNavRouteClick("/about")}>
            About Us
          </button>
          <button className={navLinkClass(null, "/services")} onClick={() => handleNavRouteClick("/services")}>
            Services
          </button>
        </>
      );
    }

    // Logged-in (customer) view
    return (
      <>
        <button className={navLinkClass("discover", "/discover")} onClick={handleDiscoverClick}>
          Discover
        </button>
        <button className={navLinkClass("board", "/my-board")} onClick={() => handleNavRouteClick("/my-board")}>
          My Board
        </button>
        <button className={navLinkClass(null, "/about")} onClick={() => handleNavRouteClick("/about")}>
          About Us
        </button>
        <button className={navLinkClass(null, "/services")} onClick={() => handleNavRouteClick("/services")}>
          Services
        </button>
      </>
    );
  };

  // Only show latest 5 notifications in popover
  const recentNotifications = useMemo(() => notifications.slice(0, 5), [notifications]);

  // Popover styling for customer view
  const notificationPopoverStyle = {
    position: "fixed",
    right: "16px",
    bottom: "16px",
    width: "280px",
    maxHeight: "260px",
    overflowY: "auto",
    zIndex: 2000,
  };

  return (
    <header className="dashboard-nav navbar navbar-expand-lg navbar-light sticky-top">
      <div className="container-fluid">

        {/* Brand / Logo */}
        <div className="nav-brand navbar-brand d-flex align-items-center gap-3">
          <div className="nav-logo">
            <InfinityLogo />
          </div>
          <div className="nav-brand-title">
            <span>ALLORA</span>
            <span>SERVICE HUB</span>
          </div>
        </div>

        {/* Mobile hamburger icon */}
        <button
          className="navbar-toggler"
          aria-expanded={!isNavCollapsed}
          onClick={toggleNavCollapse}
        >
          <span className="navbar-toggler-icon" />
        </button>

        {/* Main expandable nav container */}
        <div className={`collapse navbar-collapse${isNavCollapsed ? "" : " show"}`}>

          {/* Center nav links */}
          <div className="navbar-nav mx-auto gap-lg-4 text-center">
            {renderLinks()}
          </div>

          {/* Right-side actions (dynamic based on role layout) */}
          <div className="nav-actions d-flex align-items-center gap-3">

            {/* If on dashboard layouts: show compact header */}
            {isMinimalNav ? (
              <>
                {/* Dashboard header (Admin/Agent/Provider) */}
                <div className="nav-support-wrapper">
                  {minimalHeading() && (
                    <div className="nav-support-heading">
                      <p className="nav-support-kicker">{minimalHeading().kicker}</p>
                      <h2 className="nav-support-title">{minimalHeading().title}</h2>
                    </div>
                  )}

                  {/* Notifications + Logout */}
                  <div className="nav-support-actions">
                    <div className="nav-notification-wrapper">
                      <button className="nav-icon-btn" onClick={handleNotificationsClick}>
                        {/* Bell icon */}
                        <svg width="20" height="20" fill="none">
                          <path
                            d="M12 4a6 6 0 00-6 6v3.382..."
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                          <path
                            d="M10 19a2 2 0 004 0"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                        </svg>
                        {/* Badge */}
                        {notificationCount > 0 && (
                          <span className="nav-icon-badge">{notificationCount}</span>
                        )}
                      </button>

                      {/* Customer-style popover notifications list */}
                      {showNotificationList && recentNotifications.length > 0 && (
                        <div className="nav-notification-popover" style={notificationPopoverStyle}>
                          {recentNotifications.map((n) => (
                            <div key={n.id} className="nav-notification-item">
                              <p className="nav-notification-subject">{n.subject}</p>
                              <p className="nav-notification-message">{n.message}</p>
                              <span className="nav-notification-meta">{n.sentAt || "Just now"}</span>
                            </div>
                          ))}

                          {/* View all notifications button */}
                          <button
                            className="nav-notification-viewall"
                            onClick={() => {
                              setShowNotificationList(false);
                              if (onNotificationsViewed) onNotificationsViewed();

                              const targetSearch = "?target=notifications";
                              if (isAdminView) {
                                navigate(`/admin/dashboard${targetSearch}`);
                              }
                            }}
                          >
                            View all
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Logout button */}
                    <button className="dashboard-nav-link nav-support-logout" onClick={handleLogout}>
                      Logout
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* For customers/public users */}
                {currentUser ? (
                  <button className="dashboard-nav-link" onClick={handleLogout}>
                    Logout
                  </button>
                ) : (
                  <div className="nav-login-buttons d-flex gap-2">
                    {/* Login dropdown (customer/provider) */}
                    <div className="nav-login-menu">
                      <button
                        className="nav-login-trigger"
                        aria-expanded={showLoginMenu}
                        onClick={() => setShowLoginMenu((open) => !open)}
                      >
                        Login
                        <span className="nav-login-chevron">
                          <svg viewBox="0 0 20 20">
                            <path d="M5 7l5 6 5-6" stroke="currentColor" />
                          </svg>
                        </span>
                      </button>

                      {showLoginMenu && (
                        <div className="nav-login-dropdown" role="menu">
                          <button onClick={() => handleLoginSelect("customer")}>Customer Login</button>
                          <button onClick={() => handleLoginSelect("provider")}>Service Provider Login</button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* CTA to onboard as provider */}
                <button className="nav-cta" onClick={handleJoinAsProfessional}>
                  Join as Professional
                </button>

                {/* Public Support page */}
                <button
                  className={navLinkClass(null, "/support")}
                  onClick={() => handleNavRouteClick("/support")}
                >
                  Support
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

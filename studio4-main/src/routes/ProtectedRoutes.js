// Route guard components that gate pages by Firebase auth status and role membership.
import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, isBackgroundUserSession } from "../firebase";

export function RoleProtectedRoute({ requiredRole, redirectTo = "/login", children }) {
  const [state, setState] = useState({ checking: true, allowed: false });
  const location = useLocation();
  const allowedRoles = useMemo(
    () => (Array.isArray(requiredRole) ? requiredRole : [requiredRole]),
    [requiredRole]
  );

  useEffect(() => {
    if (!auth || !db) {
      setState({ checking: false, allowed: false });
      return;
    }

    let isActive = true;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!isActive) return;

      if (!currentUser || isBackgroundUserSession(currentUser)) {
        setState({ checking: false, allowed: false });
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", currentUser.uid));
        const data = snap.exists() ? snap.data() : {};
        const role = data.role || data.Role || data.userType || null;
        const status = (data.status || data.Status || "").toString().toLowerCase();
        const isBlockedStatus = status === "suspended" || status === "pending";
        setState({ checking: false, allowed: allowedRoles.includes(role) && !isBlockedStatus });
      } catch (error) {
        console.warn("[Auth] Failed to read role", error);
        setState({ checking: false, allowed: false });
      }
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [allowedRoles, requiredRole]);

  if (state.checking) {
    return <div style={{ padding: 24, textAlign: "center" }}>Checking access...</div>;
  }

  if (!state.allowed) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  return children;
}

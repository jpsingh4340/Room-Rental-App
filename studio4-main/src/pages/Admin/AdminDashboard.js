// Admin dashboard for managing users, providers, services, bookings, and notifications via Firestore.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  writeBatch,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { auth, db, ensureFirebaseAuth } from "../../firebase";
import { useNavigate, useLocation } from "react-router-dom";
import NavigationBar from "../../components/NavigationBar";
import { COMMISSION_RATE, formatCurrency, getBookings, summarizeBookings } from "../../commission";
import {
  getServiceProviders,
  updateServiceProvider,
  clearLocalServiceProviders,
} from "../../serviceProviderCRUD";
import SendNotification from "../../components/SendNotification";
import "./AdminDashboard.css";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:4000";

const defaultSettings = {
  siteName: "Allora Service Hub",
  maintenance: false,
  defaultRole: "Customer",
  emailNotifications: true,
  itemsPerPage: 10,
};

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState("Dashboard");
  const [userMgmtTab, setUserMgmtTab] = useState("Customer");
  const navigate = useNavigate();
  const location = useLocation();

  const responsibilities = {
    "User Management": [
      "View, edit, suspend, or delete users.",
      "Approve/reject new event managers.",
    ],
    "Service Management": [
      "Manage all services and listings.",
      "Approve or remove service providers.",
    ],
    "Service Categories": [
      "Create, edit, and organize service categories.",
      "Assign categories to services and control visibility.",
    ],
    "System Management": [
      "Manage categories, the services we provide to the customers.",
      "Configure site settings.",
      "Display the categories, overall categories.",
    ],
    "Issue Resolution": [
      "Review and resolve customer issues.",
      "Take final decision on unresolved cases.",
    ],
    "Notification Center": [
      "Send emails and in-app announcements.",
      "Publish admin alerts to staff and users.",
    ],
    "Security management": [
      "Manage admin roles and access permissions.",
      "Review audit logs for suspicious activity.",
    ],
  };

  const formatSnapshotTimestamp = (value, fallback = "") => {
    if (!value) {
      return { display: fallback, order: 0 };
    }
    if (typeof value?.toMillis === "function") {
      const dateValue = value.toDate();
      return { display: dateValue.toLocaleString(), order: value.toMillis() };
    }
    const parsed = Date.parse(value);
    return {
      display: typeof value === "string" ? value : fallback,
      order: Number.isNaN(parsed) ? 0 : parsed,
    };
  };

const getBadgeLabel = (value, fallback = "Unknown") => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
};

const getBadgeClass = (value, fallback = "unknown") => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed.toLowerCase() : fallback;
};

  const ensureAuth = async () => {
    const user = await ensureFirebaseAuth();
    if (!user) {
      alert(
        "Firebase authentication is not available. Enable anonymous auth or provide service credentials."
    );
    return false;
  }
  return true;
};

  // User Management data
  const [customers, setCustomers] = useState([]);
  const [bookings, setBookings] = useState([]);

  const deriveDisplayName = (data = {}) => {
    const first = data.firstName || data.first_name;
    const last = data.lastName || data.last_name;
    const combined = [first, last].filter(Boolean).join(" ").trim();
    return (
      combined ||
      data.name ||
      data.Name ||
      data.displayName ||
      data.fullName ||
      "Unnamed"
    );
  };

  useEffect(() => {
    if (!db) return undefined;
    const shouldLoad =
      activeSection === "Dashboard" || activeSection === "User Management";
    if (!shouldLoad) return undefined;
    return onSnapshot(query(collection(db, "users"), limit(50)), (snapshot) => {
      setCustomers(
        snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          const role = data.role || data.Role || data.userType || "Customer";
          const status = data.status || data.Status || data.accountStatus || "Active";
          const joinedRaw = data.joinedAt || data.Joined || data.joined || "";
          const { display } = formatSnapshotTimestamp(
            joinedRaw,
            joinedRaw || new Date().toISOString().slice(0, 10)
          );
          return {
            id: docSnap.id,
            name: deriveDisplayName(data),
            email: data.email || data.Email || data.emailAddress || "",
            role,
            status,
            joinedAt: display,
          };
        })
      );
    });
  }, [db, activeSection]);

  const normalizeRole = (value) =>
    typeof value === "string" ? value.trim().toLowerCase() : "";

  const visibleRows = useMemo(() => {
    const target = normalizeRole(userMgmtTab);
    return customers.filter((u) => normalizeRole(u.role) === target);
  }, [customers, userMgmtTab]);

  const addSupportMember = async () => {
    if (!db) return;
    if (!(await ensureAuth())) return;
    const nameInput = window.prompt("Support member name?", "");
    if (!nameInput) return;
    const emailInput = window.prompt("Support member email?", "");
    if (!emailInput) {
      window.alert("Email is required to create a support account.");
      return;
    }
    const passwordInput = window.prompt(
      "Temporary password for the support member (min 6 characters)",
      "Support123!"
    );
    if (!passwordInput || passwordInput.length < 6) {
      window.alert("A password of at least 6 characters is required.");
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/support/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameInput.trim(),
          email: emailInput.trim(),
          password: passwordInput,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || "Could not create support member.");
      }
      window.alert("Customer support member created and notified with their password.");
    } catch (error) {
      console.error("[Support] Failed to add support user", error);
      window.alert("Unable to create the support member right now.");
    }
  };

  // Service Management state + Firestore data
  const SERVICE_COLLECTION = "Services";
  const [services, setServices] = useState([]);
  const [listings, setListings] = useState([]);
  const [serviceView, setServiceView] = useState("Manage Services");
  const [providerRegistrations, setProviderRegistrations] = useState([]);
  const [hiddenProviderIds, setHiddenProviderIds] = useState(() => new Set());
  const [activePanel, setActivePanel] = useState("notifications");
  const [loadNonCritical, setLoadNonCritical] = useState(false);

  // Section/panel awareness to avoid spinning up every listener when not needed.
  const isDashboard = activeSection === "Dashboard";
  const isServiceManagement = activeSection === "Service Management";
  const isUserManagement = activeSection === "User Management";
  const isIssueResolution = activeSection === "Issue Resolution";
  const isNotificationCenter = activeSection === "Notification Center";
  const isSystemManagement = activeSection === "System Management";

  const shouldLoadProviders =
    loadNonCritical &&
    (isServiceManagement ||
      (isDashboard && activePanel === "providers") ||
      (isUserManagement && userMgmtTab === "Service Provider"));
  const shouldLoadServices =
    loadNonCritical &&
    (isServiceManagement || (isDashboard && activePanel === "providers"));
  const shouldLoadCategories = loadNonCritical && isServiceManagement;
  const shouldLoadTickets =
    loadNonCritical && (isIssueResolution || (isDashboard && activePanel === "tickets"));
  const shouldLoadNotifications =
    loadNonCritical && (isNotificationCenter || (isDashboard && activePanel === "notifications"));
  const shouldLoadRoles = loadNonCritical && isNotificationCenter;
  const shouldLoadSettings = loadNonCritical && isSystemManagement;
  const shouldLoadBookings = loadNonCritical && isDashboard;

  const handleDashboardPanelChange = (panelKey) => {
    setActiveSection("Dashboard");
    setActivePanel(panelKey);
    navigate(`/admin/dashboard?target=${panelKey}`);
  };
  const visibleProviderRegistrations = useMemo(
    () =>
      providerRegistrations.filter((p) => !hiddenProviderIds.has(p.id)),
    [providerRegistrations, hiddenProviderIds]
  );

  const pendingProviders = useMemo(() => {
    if (!loadNonCritical) return [];
    return visibleProviderRegistrations.filter((p) => {
      const normalized = getBadgeLabel(p.status || "Pending");
      return normalized.toLowerCase() === "pending";
    });
  }, [visibleProviderRegistrations, loadNonCritical]);
  const syncedLegacyProvidersRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoadNonCritical(true), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!db || !shouldLoadServices) return undefined;
    return onSnapshot(query(collection(db, SERVICE_COLLECTION), limit(100)), (snapshot) => {
      const docs = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        const { display: submittedAtDisplay } = formatSnapshotTimestamp(
          data.submittedAt,
          data.submittedAt || ""
        );
        return { id: docSnap.id, ...data, submittedAtDisplay };
      });
      setServices(docs);
      setListings(docs);
    });
  }, [shouldLoadServices, db]);

  // Service Provider registrations (Firestore-first, fallback to local store)
  const refreshProviderRegistrations = async () => {
    const list = await getServiceProviders();
    setProviderRegistrations(list);
  };

  useEffect(() => {
    if (!db || !shouldLoadProviders) return undefined;
    const providerQuery = query(
      collection(db, "ServiceProvider"),
      orderBy("submittedAt", "desc"),
      limit(100)
    );
    const unsub = onSnapshot(providerQuery, (snapshot) => {
      const docs = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        const { display: submittedAtDisplay, order: submittedOrder } = formatSnapshotTimestamp(
          data.createdAt || data.submittedAt,
          data.createdAt || data.submittedAt || ""
        );
        return {
          id: docSnap.id,
          providerId: data.providerId || data.providerID || data.id || docSnap.id,
          businessName: data.businessName || data.provider || "Provider",
          ownerName: data.ownerName || data.owner || "",
          email: data.email || "",
          phone: data.phone || "",
          address: data.address || "",
          category: data.category || "General",
          status: data.status || "Pending",
          userId: data.userId || data.uid || "",
          submittedAt: submittedAtDisplay,
          _order:
            submittedOrder ||
            (typeof data.submittedAt?.toMillis === "function" ? data.submittedAt.toMillis() : 0) ||
            (typeof data.createdAt?.toMillis === "function" ? data.createdAt.toMillis() : 0) ||
            Date.parse(data.createdAt || data.submittedAt || "") ||
            Date.now(),
        };
      });
      setProviderRegistrations(docs.sort((a, b) => (b._order || 0) - (a._order || 0)));
    });
    return () => unsub();
  }, [shouldLoadProviders, db]);

  const clearProviderRegistrations = async () => {
    const confirmClear = window.confirm(
      "Clear all provider registration requests from your view? Data will remain in the database."
    );
    if (!confirmClear) return;

    // Hide all current registrations for this session only.
    setHiddenProviderIds((prev) => {
      const next = new Set(prev);
      providerRegistrations.forEach((p) => next.add(p.id));
      return next;
    });
    setProviderRegistrations([]);
    alert("Provider registrations cleared from the dashboard view only.");
  };

  // One-time backfill of legacy/local provider registrations into Firestore so old requests appear.
  useEffect(() => {
    if (!shouldLoadProviders) return;
    const syncLegacyProviders = async () => {
      if (!db || syncedLegacyProvidersRef.current) return;
      try {
        const legacy = await getServiceProviders();
        if (!Array.isArray(legacy) || legacy.length === 0) {
          syncedLegacyProvidersRef.current = true;
          return;
        }
        const existingEmails = new Set(
          providerRegistrations
            .map((p) => (p.email || "").toLowerCase())
            .filter(Boolean)
        );
        const existingIds = new Set(providerRegistrations.map((p) => p.providerId || p.id));

        const unsynced = legacy.filter((p) => {
          const email = (p.email || "").toLowerCase();
          return !existingEmails.has(email) && !existingIds.has(p.providerId || p.id);
        });

        if (unsynced.length === 0) {
          syncedLegacyProvidersRef.current = true;
          return;
        }

        const tasks = unsynced.map((p) =>
          addDoc(collection(db, "ServiceProvider"), {
            providerId: p.providerId || p.id || `SP-${Date.now()}`,
            businessName: p.businessName || p.provider || "Provider",
            ownerName: p.ownerName || "",
            email: (p.email || "").toLowerCase(),
            phone: p.phone || "",
            address: p.address || "",
            category: p.category || "General",
            status: p.status || "Pending",
            createdAt: serverTimestamp(),
          }).catch((err) => console.warn("[Provider] Failed to backfill legacy provider", err))
        );
        await Promise.allSettled(tasks);
      } catch (error) {
        console.warn("[Provider] Legacy sync failed", error);
      } finally {
        syncedLegacyProvidersRef.current = true;
      }
    };
    syncLegacyProviders();
  }, [db, providerRegistrations, shouldLoadProviders]);

  // Deep link into dashboard panels (e.g., from nav bell)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const target = (params.get("target") || "").toLowerCase();
    if (!target) return;

    const panelIdMap = {
      notifications: "admin-notifications-panel",
      notification: "admin-notifications-panel",
      tickets: "admin-tickets-panel",
      updates: "admin-updates-panel",
      providers: "admin-provider-panel",
      provider: "admin-provider-panel",
    };

    const panelId = panelIdMap[target];
    if (!panelId) return;

    const panelName =
      target === "provider" ? "providers" : target === "notification" ? "notifications" : target;

    setActiveSection("Dashboard");
    setActivePanel(panelName);
    setTimeout(() => {
      const el = document.getElementById(panelId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 50);
  }, [location.search]);

  const updateServiceStatus = async (serviceId, status) => {
    if (!db) return;
    if (!(await ensureAuth())) return;
    const serviceRecord = services.find((service) => service.id === serviceId);
    const linkedCategoryId =
      serviceRecord?.categoryDocId ||
      categoryServices.find((c) => c.serviceDocId === serviceId)?.id;
    try {
      const updateData = {
        status,
        updatedAt: serverTimestamp(),
      };
      
      // Set visibility based on status
      if (status === "Approved") {
        updateData.visible = true;
      } else if (status === "Rejected" || status === "Suspended") {
        updateData.visible = false;
      }
      
      await updateDoc(doc(db, SERVICE_COLLECTION, serviceId), updateData);
      if (linkedCategoryId) {
        await updateDoc(doc(db, SERVICE_CATEGORY_COLLECTION, linkedCategoryId), {
          status,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("[Firebase] Failed to update service", serviceId, error);
      alert("Unable to update the service. Please try again.");
    }
  };

  const toggleServiceStatus = async (serviceId) => {
    const current = services.find((service) => service.id === serviceId);
    if (!current) return;
    const nextStatus = current.status === "Suspended" ? "Active" : "Suspended";
    await updateServiceStatus(serviceId, nextStatus);
  };

  const deleteService = async (serviceId) => {
    if (!db) return;
    if (!(await ensureAuth())) return;
    if (!window.confirm("Delete this service permanently?")) return;
    const serviceRecord = services.find((service) => service.id === serviceId);
    const linkedCategoryId =
      serviceRecord?.categoryDocId ||
      categoryServices.find((c) => c.serviceDocId === serviceId)?.id;
    try {
      await deleteDoc(doc(db, SERVICE_COLLECTION, serviceId));
      if (linkedCategoryId) {
        await deleteDoc(doc(db, SERVICE_CATEGORY_COLLECTION, linkedCategoryId));
      }
    } catch (error) {
      console.error("[Firebase] Failed to delete service", serviceId, error);
      alert("Unable to delete the service. Please try again.");
    }
  };

  // Provider registration review (local store)
  const updateProviderStatus = async (id, status) => {
    if (db) {
      try {
        await updateDoc(doc(db, "ServiceProvider", id), {
          status,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        console.warn("[Provider] Failed to update provider status", error);
      }
      // Also update linked user, if present
      const target = providerRegistrations.find((p) => p.id === id);
      if (target?.userId) {
        try {
          await updateDoc(doc(db, "users", target.userId), {
            status,
            role: "Service Provider",
          });
        } catch (error) {
          console.warn("[Provider] Failed to update linked user status", error);
        }
      }
      return;
    }
    await updateServiceProvider(id, { status });
    refreshProviderRegistrations();
  };

  const notifyProviderApproval = async (provider, password = "") => {
    if (!provider?.email) return false;
    try {
      const response = await fetch(`${API_BASE}/provider/notify-approval`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: provider.email,
          businessName: provider.businessName,
          password,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || "Approval email failed");
      }
      return true;
    } catch (error) {
      console.warn("[ProviderApproval] Failed to send email", error);
      return false;
    }
  };

  const logProviderNotification = async (action, provider) => {
    if (!db || !provider) return;
    try {
      await addDoc(collection(db, "Notification"), {
        audience: "Service Providers",
        channel: "In-App",
        subject: `Provider ${action}`,
        message: `${provider.businessName || provider.email || "A provider"} was ${action.toLowerCase()}.`,
        status: "Sent",
        sentAt: serverTimestamp(),
        providerEmail: (provider.email || "").toLowerCase(),
        providerId: provider.providerId || provider.provider_id || "",
      });
    } catch (error) {
      console.warn("[ProviderNotification] Failed to log notification", error);
    }
  };

  const approveProviderRegistration = async (id) => {
    const provider = providerRegistrations.find((p) => p.id === id);
    if (!provider || !provider.email) {
      window.alert("Provider is missing an email. Cannot approve.");
      return;
    }

    const tempPassword =
      provider.password && provider.password.length >= 6
        ? provider.password
        : `Temp-${Math.random().toString(36).slice(2, 8)}!`;

    const approveLocally = async (note) => {
      await updateProviderStatus(id, "Active");
      logProviderNotification("Approved", provider);
      if (note) window.alert(note);
    };

    // Try backend approval (creates auth user + email) but fall back to local Firestore update if offline.
    try {
      const response = await fetch(`${API_BASE}/provider/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: provider.email,
          password: tempPassword,
          businessName: provider.businessName,
          ownerName: provider.ownerName,
          category: provider.category,
          phone: provider.phone,
          address: provider.address,
        }),
      });
      const approvalData = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(approvalData?.message || "Approval API failed");
      }

      const emailSent = approvalData?.emailSent !== false;
      await approveLocally(
        emailSent
          ? `Provider approved. Email sent to ${provider.email}.`
          : `Provider approved; email service unavailable. Share credentials manually (temp password: ${tempPassword}).`
      );
    } catch (error) {
      console.warn("[ProviderApproval] Backend unavailable, approving locally", error);
      await approveLocally(
        `Provider approved locally. Backend email service is unreachable, so please share credentials manually (temp password: ${tempPassword}).`
      );
    }
  };

  const declineProviderRegistration = (id) => {
    const provider = providerRegistrations.find((p) => p.id === id);
    updateProviderStatus(id, "Declined");
    logProviderNotification("Declined", provider);
  };

  const approveListing = async (serviceId) => {
    if (!db) return;
    if (!(await ensureAuth())) return;
    try {
      const serviceRecord = services.find((service) => service.id === serviceId);
      await updateDoc(doc(db, SERVICE_COLLECTION, serviceId), {
        status: "Approved",
        visible: true,
        updatedAt: serverTimestamp(),
      });
      
      // Notify the provider about the approval
      if (serviceRecord) {
        try {
          await addDoc(collection(db, "Notification"), {
            audience: "Service Providers",
            channel: "In-App",
            subject: "Service Approved",
            message: `Your service "${serviceRecord.serviceName || serviceRecord.service || "Service"}" has been approved and is now visible to customers.`,
            status: "Sent",
            sentAt: serverTimestamp(),
            providerEmail: (serviceRecord.providerEmail || serviceRecord.provider_email || "").toLowerCase(),
            providerId: serviceRecord.providerId || serviceRecord.provider_id || "",
            serviceDocId: serviceId,
          });
        } catch (notifyError) {
          console.warn("[ServiceApproval] Failed to send approval notification", notifyError);
        }
      }
    } catch (error) {
      console.error("[Firebase] Failed to approve service", serviceId, error);
      alert("Unable to approve the service. Please try again.");
    }
  };

  const rejectListing = async (serviceId) => {
    if (!db) return;
    if (!(await ensureAuth())) return;
    try {
      const serviceRecord = services.find((service) => service.id === serviceId);
      await updateServiceStatus(serviceId, "Rejected");
      
      // Notify the provider about the rejection
      if (serviceRecord) {
        try {
          await addDoc(collection(db, "Notification"), {
            audience: "Service Providers",
            channel: "In-App",
            subject: "Service Rejected",
            message: `Your service "${serviceRecord.serviceName || serviceRecord.service || "Service"}" has been rejected. Please review and resubmit with necessary changes.`,
            status: "Sent",
            sentAt: serverTimestamp(),
            providerEmail: (serviceRecord.providerEmail || serviceRecord.provider_email || "").toLowerCase(),
            providerId: serviceRecord.providerId || serviceRecord.provider_id || "",
            serviceDocId: serviceId,
          });
        } catch (notifyError) {
          console.warn("[ServiceRejection] Failed to send rejection notification", notifyError);
        }
      }
    } catch (error) {
      console.error("[Firebase] Failed to reject service", serviceId, error);
      alert("Unable to reject the service. Please try again.");
    }
  };

  // System Management: categories
  const [systemView, setSystemView] = useState("Manage Categories");
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    if (!db || !shouldLoadCategories) return undefined;
    return onSnapshot(query(collection(db, "Category"), limit(100)), (snapshot) => {
      setCategories(
        snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            name: data.name || "Unnamed",
            servicesCount: data.servicesCount ?? 0,
            visible: data.visible ?? true,
          };
        })
      );
    });
  }, [db, shouldLoadCategories]);

  const addCategory = async () => {
    if (!db) return;
    if (!(await ensureAuth())) return;
    const name = window.prompt("New category name?");
    if (!name) return;
    try {
      await addDoc(collection(db, "Category"), {
        name,
        servicesCount: 0,
        visible: true,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("[Firebase] Failed to add category", error);
      alert("Unable to add category. Please try again.");
    }
  };

  const toggleCategoryVisibility = async (id) => {
    if (!db) return;
    if (!(await ensureAuth())) return;
    const target = categories.find((c) => c.id === id);
    if (!target) return;
    try {
      await updateDoc(doc(db, "Category", id), {
        visible: !target.visible,
      });
    } catch (error) {
      console.error("[Firebase] Failed to update category", id, error);
      alert("Unable to update category visibility. Please try again.");
    }
  };

  const deleteCategory = async (id) => {
    if (!db) return;
    if (!(await ensureAuth())) return;
    try {
      await deleteDoc(doc(db, "Category", id));
    } catch (error) {
      console.error("[Firebase] Failed to delete category", id, error);
      alert("Unable to delete category. Please try again.");
    }
  };

  // Service Categories data
  const SERVICE_CATEGORY_COLLECTION = "ServiceCategories";
  const [categoryServices, setCategoryServices] = useState([]);
  const syncedCategoriesRef = useRef(new Set());

  useEffect(() => {
    if (!db || !shouldLoadCategories) return undefined;
    return onSnapshot(query(collection(db, SERVICE_CATEGORY_COLLECTION), limit(100)), (snapshot) => {
      setCategoryServices(
        snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            service: data.service || "Untitled",
            category: data.category || "General",
            provider: data.provider || "Unknown",
            status: data.status || "Active",
            serviceDocId: data.serviceDocId || data.serviceId || "",
            city: data.city || data.location || "",
            description: data.description || data.details || "",
          };
        })
      );
    });
  }, [db, shouldLoadCategories]);

  useEffect(() => {
    if (!shouldLoadBookings) return;
    let mounted = true;
    getBookings()
      .then((list) => {
        if (mounted) setBookings(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (mounted) setBookings([]);
      });
    return () => {
      mounted = false;
    };
  }, [shouldLoadBookings]);

  useEffect(() => {
    if (!db || !isServiceManagement || !shouldLoadCategories || !shouldLoadServices) return undefined;
    const syncMissingServices = async () => {
      if (!(await ensureAuth())) return;
      for (const category of categoryServices) {
        if (category.serviceDocId || syncedCategoriesRef.current.has(category.id)) continue;

        const matchingService = services.find(
          (svc) =>
            (svc.service || "").toLowerCase() === (category.service || "").toLowerCase() &&
            (svc.provider || "").toLowerCase() === (category.provider || "").toLowerCase()
        );

        try {
          if (matchingService) {
            await updateDoc(doc(db, SERVICE_CATEGORY_COLLECTION, category.id), {
              serviceDocId: matchingService.id,
            });
            if (!matchingService.categoryDocId) {
              await updateDoc(doc(db, SERVICE_COLLECTION, matchingService.id), {
                categoryDocId: category.id,
              });
            }
            syncedCategoriesRef.current.add(category.id);
            continue;
          }

          const submittedAt = new Date().toISOString();
          const serviceDocRef = await addDoc(collection(db, SERVICE_COLLECTION), {
            service: category.service,
            category: category.category,
            provider: category.provider,
            city: category.city || "",
            description: category.description || "",
            status: category.status || "Active",
            visible: (category.status || "").toLowerCase() !== "suspended",
            submittedAt,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: "admin-sync",
          });
          await updateDoc(doc(db, SERVICE_CATEGORY_COLLECTION, category.id), {
            serviceDocId: serviceDocRef.id,
          });
          await updateDoc(serviceDocRef, { categoryDocId: category.id });
          syncedCategoriesRef.current.add(category.id);
        } catch (error) {
          console.warn("[Firebase] Failed to sync service category to Services", error);
        }
      }
    };

    syncMissingServices();
  }, [categoryServices, services, shouldLoadCategories, shouldLoadServices, isServiceManagement]);

  const addCategoryService = async () => {
    if (!db) return;
    if (!(await ensureAuth())) return;
    const name = window.prompt("Service name?");
    if (!name) return;
    const category = window.prompt("Category?", "General") || "General";
    const provider = window.prompt("Provider?", "Unknown") || "Unknown";
    const city = window.prompt("City or region? (optional)", "") || "";
    const description = window.prompt("Short description? (optional)", "") || "";
    try {
      const submittedAt = new Date().toISOString();
      const serviceDocRef = await addDoc(collection(db, SERVICE_COLLECTION), {
        service: name.trim(),
        category: category.trim() || "General",
        provider: provider.trim() || "Unknown",
        city: city.trim(),
        description: description.trim(),
        status: "Active",
        visible: true,
        submittedAt,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: "admin-panel",
      });
      const categoryDocRef = await addDoc(collection(db, SERVICE_CATEGORY_COLLECTION), {
        service: name.trim(),
        category: category.trim() || "General",
        provider: provider.trim() || "Unknown",
        city: city.trim(),
        description: description.trim(),
        status: "Active",
        serviceDocId: serviceDocRef.id,
        createdAt: serverTimestamp(),
      });
      await updateDoc(serviceDocRef, { categoryDocId: categoryDocRef.id });
      window.alert("Service added and published to customers.");
    } catch (error) {
      console.error("[Firebase] Failed to add service category", error);
      alert("Unable to add the service. Please try again.");
    }
  };

  const toggleCategoryService = async (id) => {
    if (!db) return;
    if (!(await ensureAuth())) return;
    const serviceRecord = categoryServices.find((s) => s.id === id);
    if (!serviceRecord) return;
    const nextStatus = serviceRecord.status === "Suspended" ? "Active" : "Suspended";
    try {
      await updateDoc(doc(db, SERVICE_CATEGORY_COLLECTION, id), { status: nextStatus });
      if (serviceRecord.serviceDocId) {
        await updateDoc(doc(db, SERVICE_COLLECTION, serviceRecord.serviceDocId), {
          status: nextStatus,
          visible: nextStatus !== "Suspended",
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("[Firebase] Failed to update service category", id, error);
      alert("Unable to update the service status. Please try again.");
    }
  };

  const deleteCategoryService = async (id) => {
    if (!db) return;
    if (!(await ensureAuth())) return;
    const serviceRecord = categoryServices.find((s) => s.id === id);
    try {
      await deleteDoc(doc(db, SERVICE_CATEGORY_COLLECTION, id));
      if (serviceRecord?.serviceDocId) {
        await deleteDoc(doc(db, SERVICE_COLLECTION, serviceRecord.serviceDocId));
      }
    } catch (error) {
      console.error("[Firebase] Failed to delete service category", id, error);
      alert("Unable to delete the service. Please try again.");
    }
  };

  // Issue Resolution: queue + actions
  const [issueFilter, setIssueFilter] = useState("Open");
  const [issues, setIssues] = useState([]);

  useEffect(() => {
    if (!db || !shouldLoadTickets) return undefined;
    const ticketsQuery = query(collection(db, "tickets"), orderBy("createdAt", "desc"), limit(50));
    return onSnapshot(ticketsQuery, (snapshot) => {
      const docs = snapshot.docs
        .map((docSnap) => {
          const data = docSnap.data();
          const { display, order } = formatSnapshotTimestamp(
            data.createdAt,
            data.createdAt || new Date().toISOString().slice(0, 10)
          );
          return {
            id: docSnap.id,
            subject: data.subject || "Untitled",
            customer: data.customer || "Unknown",
            priority: data.priority || "Low",
            status: data.status || "Open",
            createdAt: display,
            _order: order,
          };
        })
        .sort((a, b) => b._order - a._order)
        .map(({ _order, ...rest }) => rest);
      setIssues(docs);
    });
  }, [shouldLoadTickets, db]);

  const filteredIssues = useMemo(
    () => loadNonCritical ? issues.filter((i) => (issueFilter === "All" ? true : i.status === issueFilter)) : [],
    [issues, issueFilter, loadNonCritical]
  );

  const updateIssueStatus = async (id, status) => {
    if (!db) return;
    if (!(await ensureAuth())) return;
    try {
      await updateDoc(doc(db, "tickets", id), { status });
    } catch (error) {
      console.error("[Firebase] Failed to update ticket", id, error);
      alert("Unable to update the ticket. Please try again.");
    }
  };

  const resolveIssue = (id) => updateIssueStatus(id, "Resolved");
  const closeIssue = (id) => updateIssueStatus(id, "Closed");
  const reopenIssue = (id) => updateIssueStatus(id, "Open");

  // Security management: roles and permissions
  const defaultPerms = [
    "view_users",
    "manage_services",
    "manage_categories",
    "send_notifications",
    "view_audit",
  ];
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    if (!db || !shouldLoadRoles) return undefined;
    return onSnapshot(query(collection(db, "Roles"), limit(50)), (snapshot) => {
      setRoles(
        snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            name: data.name || "Role",
            members: data.members ?? 0,
            perms: new Set(data.perms || []),
          };
        })
      );
    });
  }, [db, shouldLoadRoles]);

  const addRole = async () => {
    if (!db) return;
    if (!(await ensureAuth())) return;
    const name = window.prompt("New role name?");
    if (!name) return;
    try {
      await addDoc(collection(db, "Roles"), {
        name,
        members: 0,
        perms: ["view_users"],
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("[Firebase] Failed to add role", error);
      alert("Unable to add role. Please try again.");
    }
  };

  const deleteRole = async (id) => {
    if (!db) return;
    if (!(await ensureAuth())) return;
    try {
      await deleteDoc(doc(db, "Roles", id));
    } catch (error) {
      console.error("[Firebase] Failed to delete role", id, error);
      alert("Unable to delete role. Please try again.");
    }
  };

  const toggleRolePerm = async (id, key) => {
    if (!db) return;
    if (!(await ensureAuth())) return;
    const role = roles.find((r) => r.id === id);
    if (!role) return;
    const next = new Set(role.perms);
    next.has(key) ? next.delete(key) : next.add(key);
    setRoles((prev) =>
      prev.map((r) => (r.id === id ? { ...r, perms: new Set(next) } : r))
    );
    try {
      await updateDoc(doc(db, "Roles", id), { perms: Array.from(next) });
    } catch (error) {
      console.error("[Firebase] Failed to update role permissions", id, error);
      alert("Unable to update permissions. Please try again.");
    }
  };

  // Notification Center: compose + history
  const [notificationView, setNotificationView] = useState("Compose");
  const [compose, setCompose] = useState({
    audience: "Service Providers",
    channel: "Email",
    subject: "",
    message: "",
  });
  const [notifications, setNotifications] = useState([]);
  const [lastSeenNotifications, setLastSeenNotifications] = useState(() => {
    const stored = localStorage.getItem("admin-notifications-last-seen");
    return stored ? Number(stored) : 0;
  });
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [selectedProviderEmail, setSelectedProviderEmail] = useState("");
  const bookingTotals = useMemo(() => loadNonCritical ? summarizeBookings(bookings) : { adminTotal: 0, providerTotal: 0, totalVolume: 0 }, [bookings, loadNonCritical]);
  const commissionRatePercent = Math.round((COMMISSION_RATE || 0) * 100);

  const summaryCards = useMemo(() => {
    const serviceProviders = customers.filter((u) => u.role === "Service Provider").length;
    const supportAgents = customers.filter((u) => u.role === "Customer Support").length;
    const openIssues = issues.filter((issue) => issue.status === "Open").length;
    const pendingListings = listings.filter(
      (listing) => (listing.status || "").toLowerCase() === "pending"
    ).length;
    return [
      {
        key: "customers",
        label: "Customers",
        value: customers.length,
        detail: `${serviceProviders} service providers`,
      },
      {
        key: "support",
        label: "Support Team",
        value: supportAgents,
        detail: `${Math.max(customers.length - supportAgents, 0)} other members`,
      },
      {
        key: "services",
        label: "Services",
        value: loadNonCritical ? services.length : 0,
        detail: `${pendingListings} awaiting review`,
      },
      {
        key: "tickets",
        label: "Open Tickets",
        value: openIssues,
        detail: `${loadNonCritical ? issues.length : 0} total`,
      },
      {
        key: "commission",
        label: "Admin Commission",
        value: formatCurrency(bookingTotals.adminTotal),
        detail: `${commissionRatePercent}% from ${bookings.length} bookings`,
      },
      {
        key: "notifications",
        label: "Notifications Sent",
        value: loadNonCritical ? notifications.length : 0,
        detail: `${loadNonCritical ? roles.length : 0} roles configured`,
      },
    ];
  }, [
    customers,
    services,
    listings,
    issues,
    notifications,
    roles,
    bookingTotals,
    commissionRatePercent,
    loadNonCritical,
  ]);

  const recentNotifications = useMemo(() => loadNonCritical ? notifications.slice(0, 3) : [], [notifications, loadNonCritical]);
  const recentIssues = useMemo(() => issues.slice(0, 3), [issues]);
  const recentServices = useMemo(() => loadNonCritical ? services.slice(0, 3) : [], [services, loadNonCritical]);
  const providerNotifications = useMemo(() => {
    if (!loadNonCritical) return [];
    const targeted = notifications.filter((n) => {
      const audience = (n.audience || "").toLowerCase();
      return audience.includes("provider");
    });
    return targeted.length ? targeted : notifications;
  }, [notifications, loadNonCritical]);

  useEffect(() => {
    if (!db || !shouldLoadNotifications) return undefined;
    return onSnapshot(query(collection(db, "Notification"), limit(50)), (snapshot) => {
      const docs = snapshot.docs
        .map((docSnap) => {
          const data = docSnap.data();
          const { display, order } = formatSnapshotTimestamp(data.sentAt, "");
          return {
            id: docSnap.id,
            subject: data.subject || "",
            message: data.message || "",
            audience: data.audience || "",
            channel: data.channel || "Email",
            status: data.status || "Sent",
            sentAt: display,
            sentOrder: order,
          };
        })
        .sort((a, b) => b.sentOrder - a.sentOrder);
      setNotifications(docs);
    });
  }, [db, shouldLoadNotifications]);

  const sendNotification = async () => {
    const subject = compose.subject.trim();
    const message = compose.message.trim();
    if (!subject || !message) {
      alert("Please enter subject and message");
      return;
    }

    // Use server to send email broadcasts; keep Firestore write for in-app.
    if (compose.channel === "Email") {
      try {
        const response = await fetch(`${API_BASE}/notifications/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audience: compose.audience,
            channel: compose.channel,
            subject,
            message,
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data?.message || "Unable to send email notification.");
        }
        setCompose((prev) => ({ ...prev, subject: "", message: "" }));
        alert(data?.message || "Notification sent.");
      } catch (error) {
        console.error("[Notification] Failed to send email", error);
        alert(error?.message || "Unable to send email notification.");
      }
      return;
    }

    // In-app channel: write to Firestore.
    if (!db) return;
    if (!(await ensureAuth())) return;
    try {
      await addDoc(collection(db, "Notification"), {
        audience: compose.audience,
        channel: "In-App",
        subject,
        message,
        status: "Sent",
        sentAt: serverTimestamp(),
      });
      setCompose((prev) => ({ ...prev, subject: "", message: "" }));
      alert("Notification sent");
    } catch (error) {
      console.error("[Firebase] Failed to send notification", error);
      alert(
        `Unable to send notification. ${error?.code || "Unknown error"} ${
          error?.message ? "- " + error.message : ""
        }`
      );
    }
  };

  // System Management: site settings stored in Firestore
  const [settings, setSettings] = useState(defaultSettings);

  useEffect(() => {
    if (!db || !shouldLoadSettings) return undefined;
    const settingsRef = doc(db, "Admin", "siteSettings");
    return onSnapshot(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        setSettings({ ...defaultSettings, ...snapshot.data() });
      }
    });
  }, [shouldLoadSettings, db]);

  const unreadNotificationCount = useMemo(() => {
    if (!loadNonCritical) return 0;
    return notifications.filter((n) => (n.sentOrder || 0) > lastSeenNotifications).length;
  }, [notifications, lastSeenNotifications, loadNonCritical]);

  const markNotificationsSeen = () => {
    const now = Date.now();
    setLastSeenNotifications(now);
    localStorage.setItem("admin-notifications-last-seen", String(now));
  };

  const saveSettings = async () => {
    if (!db) return;
    if (!(await ensureAuth())) return;
    try {
      await setDoc(doc(db, "Admin", "siteSettings"), settings, { merge: true });
      alert("Settings saved");
    } catch (error) {
      console.error("[Firebase] Failed to save settings", error);
      alert("Unable to save settings. Please try again.");
    }
  };

  const resetSettings = async () => {
    setSettings(defaultSettings);
    if (!db) return;
    if (!(await ensureAuth())) return;
    try {
      await setDoc(doc(db, "Admin", "siteSettings"), defaultSettings);
    } catch (error) {
      console.error("[Firebase] Failed to reset settings", error);
      alert("Unable to reset settings. Please try again.");
    }
  };

  return (
    <div className="admin-dashboard-page">
      <NavigationBar
        activeSection="admin"
        notificationCount={unreadNotificationCount}
        notifications={notifications}
        onNotificationsViewed={markNotificationsSeen}
      />
      <div className="admin-dashboard-shell">
        <main className="admin-main-content">
        <div className="admin-pill-row">
          {activeSection !== "Dashboard" && (
            <button className="pill-back-btn" onClick={() => setActiveSection("Dashboard")}>
              {"< Back"}
            </button>
          )}
          <div className="admin-pill-nav">
            {Object.keys(responsibilities).map((key) => (
              <button
                key={key}
                className={`pill-btn ${activeSection === key ? "active" : ""}`}
                onClick={() => setActiveSection(key)}
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        {activeSection === "Dashboard" ? (
          <>
            <div className="admin-summary-grid">
              {summaryCards.map((card) => (
                <div key={card.key} className="admin-summary-card">
                  <p className="summary-label">{card.label}</p>
                  <h3>{card.value}</h3>
                  {card.detail && <span className="summary-meta">{card.detail}</span>}
                </div>
              ))}
            </div>

            <div className="admin-panel-layout">
              <aside className="admin-side-nav">
                <button
                  className={`side-nav-btn ${activePanel === "notifications" ? "active" : ""}`}
                  onClick={() => handleDashboardPanelChange("notifications")}
                >
                  Notifications
                </button>
                <button
                  className={`side-nav-btn ${activePanel === "tickets" ? "active" : ""}`}
                  onClick={() => handleDashboardPanelChange("tickets")}
                >
                  Latest Tickets
                </button>
                <button
                  className={`side-nav-btn ${activePanel === "updates" ? "active" : ""}`}
                  onClick={() => handleDashboardPanelChange("updates")}
                >
                  Service Updates
                </button>
                <button
                  className={`side-nav-btn ${activePanel === "providers" ? "active" : ""}`}
                  onClick={() => handleDashboardPanelChange("providers")}
                >
                  Provider Registrations
                </button>
              </aside>

              <div className="admin-panel-stack">
                {activePanel === "notifications" && (
                  <div className="admin-panel-card" id="admin-notifications-panel">
                    <h4>Recent Notifications</h4>
                    <div className="activity">
                      {recentNotifications.length === 0 ? (
                        <p>No notifications sent.</p>
                      ) : (
                        recentNotifications.map((notification) => (
                          <p key={notification.id}>
                            <strong>{notification.subject || "Untitled notification"}</strong>
                            <br />
                            <span>
                              {notification.audience || "All"}  -  {notification.sentAt || "Queued"}
                            </span>
                          </p>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {activePanel === "tickets" && (
                  <div className="admin-panel-card" id="admin-tickets-panel">
                    <h4>Latest Tickets</h4>
                    <div className="activity">
                      {recentIssues.length === 0 ? (
                        <p>No tickets available.</p>
                      ) : (
                        recentIssues.map((ticket) => (
                          <p key={ticket.id}>
                            <strong>{ticket.subject}</strong>
                            <br />
                            <span>
                              {ticket.customer}  -  {ticket.createdAt || "Pending"}
                            </span>
                          </p>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {activePanel === "updates" && (
                  <div className="admin-panel-card" id="admin-updates-panel">
                    <h4>Service Updates</h4>
                    <div className="activity">
                      {recentServices.length === 0 ? (
                        <p>No services published yet.</p>
                      ) : (
                        recentServices.map((service) => (
                          <p key={service.id}>
                            {service.service || "Service"}  -  {service.status || "Pending"}
                          </p>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {activePanel === "providers" && (
                  <div className="admin-panel-card provider-card" id="admin-provider-panel">
                    <h4>Provider Registrations</h4>
                    <div className="actions-bar" style={{ marginBottom: 8, gap: 8 }}>
                      <button
                        className="action-btn"
                        onClick={clearProviderRegistrations}
                        disabled={!pendingProviders.length}
                      >
                        Clear All
                      </button>
                    </div>
                    {pendingProviders.length === 0 ? (
                      <p style={{ margin: 0 }}>No registrations awaiting approval.</p>
                    ) : (
                      <div className="admin-table-wrapper compact">
                        <table className="admin-table provider-table">
                          <thead>
                            <tr>
                              <th>Business</th>
                              <th>Owner</th>
                              <th>Category</th>
                              <th>Email</th>
                              <th>Status</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pendingProviders.slice(0, 12).map((p) => {
                              const statusLabel = getBadgeLabel(p.status || "Pending");
                              const statusClass = getBadgeClass(statusLabel || "Pending");
                              const isPending = statusLabel.toLowerCase() === "pending";
                              return (
                                <tr key={p.id}>
                                  <td>{p.businessName || "Untitled"}</td>
                                  <td>{p.ownerName || "Owner"}</td>
                                  <td>{p.category || "General"}</td>
                                  <td>{p.email || "No email"}</td>
                                  <td>
                                    <span className={`badge ${statusClass}`}>
                                      {statusLabel}
                                    </span>
                                  </td>
                                  <td className="provider-actions">
                                    <button
                                      className="action-btn primary"
                                      onClick={() => approveProviderRegistration(p.id)}
                                      disabled={!isPending}
                                    >
                                      Approve
                                    </button>
                                    <button
                                      className="action-btn danger"
                                      onClick={() => declineProviderRegistration(p.id)}
                                      disabled={!isPending}
                                    >
                                      Decline
                                    </button>
                                    <button
                                      className="action-btn"
                                      onClick={() => {
                                        setSelectedProviderEmail(p.email);
                                        setShowNotificationModal(true);
                                      }}
                                      disabled={!p.email}
                                    >
                                      Message
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div className="commission-summary-box">
                      <div className="commission-head">
                        <div>
                          <p className="subtle-label">Commission</p>
                          <h5 style={{ margin: "0 0 6px" }}>Platform fee on provider bookings</h5>
                          <p className="commission-subtext">
                            Applied automatically. Customers see only the full price; {commissionRatePercent}% routes to admin.
                          </p>
                        </div>
                        <div className="commission-rate-pill">{commissionRatePercent}%</div>
                      </div>
                      <div className="commission-stats">
                        <div className="commission-stat-card">
                          <p>Admin Commission Earned</p>
                          <strong>{formatCurrency(bookingTotals.adminTotal)}</strong>
                        </div>
                        <div className="commission-stat-card">
                          <p>Provider payout</p>
                          <strong>{formatCurrency(bookingTotals.providerTotal)}</strong>
                        </div>
                        <div className="commission-stat-card">
                          <p>Total price collected</p>
                          <strong>{formatCurrency(bookingTotals.totalVolume)}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="admin-table-wrapper" style={{ marginTop: 12 }}>
                      <h5 style={{ margin: "0 0 8px" }}>Provider Notification History</h5>
                      {providerNotifications.length === 0 ? (
                        <p style={{ margin: 0 }}>No provider notifications sent yet.</p>
                      ) : (
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Subject</th>
                              <th>Audience</th>
                              <th>Channel</th>
                              <th>Sent</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {providerNotifications.slice(0, 5).map((n) => (
                              <tr key={n.id}>
                                <td>{n.subject || "Untitled"}</td>
                                <td>{n.audience || "Service Providers"}</td>
                                <td>
                                  <span className={`badge ${getBadgeClass(n.channel || "Email")}`}>
                                    {getBadgeLabel(n.channel || "Email")}
                                  </span>
                                </td>
                                <td>{n.sentAt || "Pending"}</td>
                                <td>
                                  <span className={`badge ${getBadgeClass(n.status || "Sent")}`}>
                                    {getBadgeLabel(n.status || "Sent")}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (/* Responsibilities Section */
          <section className="admin-section-card responsibility-section">
            <div className="admin-section-header">
              <h2 style={{ margin: 0 }}>{activeSection}</h2>
            </div>

            {activeSection === "System Management" && (
              <div className="actions-bar top-right">
                <button
                  className={`action-btn ${systemView === "Manage Categories" ? "primary" : ""}`}
                  onClick={() => setSystemView("Manage Categories")}
                >
                  Manage Categories
                </button>
                <button
                  className={`action-btn ${systemView === "Site Settings" ? "primary" : ""}`}
                  onClick={() => setSystemView("Site Settings")}
                >
                  Site Settings
                </button>
                <button
                  className={`action-btn ${systemView === "View Categories" ? "primary" : ""}`}
                  onClick={() => setSystemView("View Categories")}
                >
                  View Categories
                </button>
              </div>
            )}

            {activeSection === "Service Management" && (
              <div className="actions-bar top-right">
                <button
                  className={`action-btn ${serviceView === "Manage Services" ? "primary" : ""}`}
                  onClick={() => setServiceView("Manage Services")}
                >
                  Manage Services
                </button>
                <button
                  className={`action-btn ${serviceView === "Review Listings" ? "primary" : ""}`}
                  onClick={() => setServiceView("Review Listings")}
                >
                  Review Listings
                </button>
                <button
                  className="action-btn primary"
                  onClick={addCategoryService}
                >
                  Add Service
                </button>
              </div>
            )}

            {/* Service Management info panel removed per request */}

            {activeSection === "Service Management" && (
              <div className="admin-table-wrapper" style={{ marginTop: 12 }}>
                {serviceView === "Manage Services" ? (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Service</th>
                        <th>Provider</th>
                        <th>Category</th>
                        <th>Status</th>
                        <th>Submitted</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {services.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ textAlign: "center", padding: 16 }}>No services.</td>
                        </tr>
                      ) : (
                        services.map((s) => (
                          <tr key={s.id}>
                            <td>{s.service}</td>
                            <td>{s.provider}</td>
                            <td>{s.category}</td>
                            <td>
                              <span className={`badge ${getBadgeClass(s.status)}`}>
                                {getBadgeLabel(s.status)}
                              </span>
                            </td>
                            <td>{s.submittedAtDisplay || s.submittedAt || "Pending"}</td>
                            <td className="admin-table-actions">
                              <button className="action-btn" onClick={() => toggleServiceStatus(s.id)}>
                                {s.status === "Suspended" ? "Activate" : "Suspend"}
                              </button>
                              <button className="action-btn danger" onClick={() => deleteService(s.id)}>Delete</button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                ) : (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Service</th>
                        <th>Provider</th>
                        <th>Category</th>
                        <th>Submitted</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listings.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ textAlign: "center", padding: 16 }}>No listings to review.</td>
                        </tr>
                      ) : (
                        listings.map((l) => (
                          <tr key={l.id}>
                            <td>{l.service}</td>
                            <td>{l.provider}</td>
                            <td>{l.category}</td>
                            <td>{l.submittedAtDisplay || l.submittedAt || "Pending"}</td>
                            <td>
                              <span className={`badge ${getBadgeClass(l.status)}`}>
                                {getBadgeLabel(l.status)}
                              </span>
                            </td>
                            <td className="admin-table-actions">
                              {l.status === "Pending" ? (
                                <>
                                  <button className="action-btn primary" onClick={() => approveListing(l.id)}>Approve</button>
                                  <button className="action-btn danger" onClick={() => rejectListing(l.id)}>Reject</button>
                                </>
                              ) : (
                                <span style={{ color: "#555" }}>No actions</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeSection === "Service Categories" && (
              <>
                <div className="actions-bar top-right">
                  <button className="action-btn primary" onClick={addCategoryService}>Add Service</button>
                </div>
                <div className="admin-table-wrapper" style={{ marginTop: 12 }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Service</th>
                        <th>Category</th>
                        <th>Provider</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryServices.length === 0 ? (
                        <tr>
                          <td colSpan="5" style={{ textAlign: "center", padding: 16 }}>No services in categories.</td>
                        </tr>
                      ) : (
                        categoryServices.map((s) => (
                          <tr key={s.id}>
                            <td>{s.service}</td>
                            <td>{s.category}</td>
                            <td>{s.provider}</td>
                            <td>
                              <span className={`badge ${getBadgeClass(s.status)}`}>
                                {getBadgeLabel(s.status)}
                              </span>
                            </td>
                            <td className="admin-table-actions">
                              <button className="action-btn" onClick={() => toggleCategoryService(s.id)}>
                                {s.status === "Suspended" ? "Activate" : "Suspend"}
                              </button>
                              <button className="action-btn danger" onClick={() => deleteCategoryService(s.id)}>Delete</button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {activeSection === "Security management" && (
              <>
                <div className="actions-bar top-right">
                  <button className="action-btn primary" onClick={addRole}>Add Role</button>
                </div>
                <div className="admin-table-wrapper" style={{ marginTop: 12 }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Role</th>
                        <th>Members</th>
                        <th>Permissions</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roles.length === 0 ? (
                        <tr>
                          <td colSpan="4" style={{ textAlign: "center", padding: 16 }}>No roles.</td>
                        </tr>
                      ) : (
                        roles.map((r) => (
                          <tr key={r.id}>
                            <td>{r.name}</td>
                            <td>{r.members}</td>
                            <td>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {defaultPerms.map((p) => (
                                  <button
                                    key={p}
                                    className={`perm-chip ${r.perms.has(p) ? "active" : ""}`}
                                    title={p.replace(/_/g, " ")}
                                    onClick={() => toggleRolePerm(r.id, p)}
                                  >
                                    {p.replace(/_/g, " ")}
                                  </button>
                                ))}
                              </div>
                            </td>
                            <td className="admin-table-actions">
                              <button className="action-btn danger" onClick={() => deleteRole(r.id)}>Delete</button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {activeSection === "Notification Center" && (
              <>
                <div className="actions-bar top-right">
                  <button
                    className={`action-btn ${notificationView === "Compose" ? "primary" : ""}`}
                    onClick={() => setNotificationView("Compose")}
                  >
                    Compose
                  </button>
                  <button
                    className={`action-btn ${notificationView === "History" ? "primary" : ""}`}
                    onClick={() => setNotificationView("History")}
                  >
                    History
                  </button>
                </div>

                {notificationView === "Compose" ? (
                  <div className="admin-table-wrapper notification-compose" style={{ marginTop: 12, padding: 16 }}>
                    <div className="settings-grid">
                      <div className="admin-form-group">
                        <label>Audience</label>
                        <select
                          className="select"
                          value={compose.audience}
                          onChange={(e) => setCompose((c) => ({ ...c, audience: e.target.value }))}
                        >
                          <option value="Service Providers">Service Providers</option>
                          <option value="Customer Support">Customer Support Agents</option>
                        </select>
                      </div>
                      <div className="admin-form-group">
                        <label>Channel</label>
                        <select
                          className="select"
                          value={compose.channel}
                          onChange={(e) => setCompose((c) => ({ ...c, channel: e.target.value }))}
                        >
                          <option>Email</option>
                          <option>In-App</option>
                        </select>
                      </div>
                      <div className="admin-form-group" style={{ gridColumn: "1/-1" }}>
                        <label>Subject</label>
                        <input
                          className="search"
                          type="text"
                          placeholder="Announcement subject"
                          value={compose.subject}
                          onChange={(e) => setCompose((c) => ({ ...c, subject: e.target.value }))}
                        />
                      </div>
                      <div className="admin-form-group" style={{ gridColumn: "1/-1" }}>
                        <label>Message</label>
                        <textarea
                          className="search"
                          style={{ minHeight: 120, resize: "vertical" }}
                          placeholder="Write your message..."
                          value={compose.message}
                          onChange={(e) => setCompose((c) => ({ ...c, message: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="header-actions" style={{ marginTop: 12 }}>
                      <button className="action-btn" onClick={() => setCompose({ ...compose, subject: "", message: "" })}>Clear</button>
                      <button className="action-btn primary" onClick={sendNotification}>Send</button>
                    </div>
                  </div>
                ) : (
                  <div className="admin-table-wrapper" style={{ marginTop: 12 }}>
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Subject</th>
                          <th>Audience</th>
                          <th>Channel</th>
                          <th>Sent</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {notifications.length === 0 ? (
                          <tr>
                            <td colSpan="5" style={{ textAlign: "center", padding: 16 }}>No notifications sent.</td>
                          </tr>
                        ) : (
                          notifications.map((n) => (
                            <tr key={n.id}>
                              <td>{n.subject}</td>
                              <td>{n.audience}</td>
                              <td><span className={`badge ${n.channel === "Email" ? "email" : "inapp"}`}>{n.channel}</span></td>
                              <td>{n.sentAt}</td>
                              <td><span className="badge resolved">{n.status}</span></td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {activeSection === "Issue Resolution" && (
              <>
                <div className="actions-bar top-right">
                  <button
                    className={`action-btn ${issueFilter === "Open" ? "primary" : ""}`}
                    onClick={() => setIssueFilter("Open")}
                  >
                    Open
                  </button>
                  <button
                    className={`action-btn ${issueFilter === "Resolved" ? "primary" : ""}`}
                    onClick={() => setIssueFilter("Resolved")}
                  >
                    Resolved
                  </button>
                  <button
                    className={`action-btn ${issueFilter === "All" ? "primary" : ""}`}
                    onClick={() => setIssueFilter("All")}
                  >
                    All
                  </button>
                </div>
                <div className="admin-table-wrapper" style={{ marginTop: 12 }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th>Customer</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredIssues.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ textAlign: "center", padding: 16 }}>No issues.</td>
                        </tr>
                      ) : (
                        filteredIssues.map((iss) => (
                          <tr key={iss.id}>
                            <td>{iss.subject}</td>
                            <td>{iss.customer}</td>
                            <td>
                              <span className={`badge ${getBadgeClass(iss.priority, "low")}`}>
                                {getBadgeLabel(iss.priority)}
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${getBadgeClass(iss.status)}`}>
                                {getBadgeLabel(iss.status)}
                              </span>
                            </td>
                            <td>{iss.createdAt}</td>
                            <td className="admin-table-actions">
                              {iss.status === "Open" && (
                                <>
                                  <button className="action-btn primary" onClick={() => resolveIssue(iss.id)}>Resolve</button>
                                  <button className="action-btn danger" onClick={() => closeIssue(iss.id)}>Close</button>
                                </>
                              )}
                              {iss.status === "Resolved" && (
                                <>
                                  <button className="action-btn" onClick={() => reopenIssue(iss.id)}>Reopen</button>
                                  <button className="action-btn danger" onClick={() => closeIssue(iss.id)}>Close</button>
                                </>
                              )}
                              {iss.status === "Closed" && (
                                <button className="action-btn" onClick={() => reopenIssue(iss.id)}>Reopen</button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {activeSection === "System Management" && (
              <>
                {systemView !== "Site Settings" ? (
                  <div className="admin-table-wrapper" style={{ marginTop: 12 }}>
                    <div className="page-header" style={{ padding: "10px 12px" }}>
                      <div></div>
                      <div className="header-actions">
                        <button className="action-btn primary" onClick={addCategory}>Add Category</button>
                      </div>
                    </div>
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Category</th>
                          <th>Services</th>
                          <th>Visibility</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categories.length === 0 ? (
                          <tr>
                            <td colSpan="4" style={{ textAlign: "center", padding: 16 }}>No categories.</td>
                          </tr>
                        ) : (
                          categories.map((c) => (
                            <tr key={c.id}>
                              <td>{c.name}</td>
                              <td>{c.servicesCount}</td>
                              <td>
                                <span className={`badge ${c.visible ? "visible" : "hidden"}`}>{c.visible ? "Visible" : "Hidden"}</span>
                              </td>
                              <td className="admin-table-actions">
                                <button className="action-btn" onClick={() => toggleCategoryVisibility(c.id)}>
                                  {c.visible ? "Hide" : "Show"}
                                </button>
                                <button className="action-btn danger" onClick={() => deleteCategory(c.id)}>Delete</button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="admin-table-wrapper" style={{ marginTop: 12, padding: 16 }}>
                    <div className="settings-grid">
                      <div className="admin-form-group">
                        <label>Site Name</label>
                        <input
                          className="search"
                          type="text"
                          value={settings.siteName}
                          onChange={(e) => setSettings((s) => ({ ...s, siteName: e.target.value }))}
                        />
                      </div>
                      <div className="admin-form-group">
                        <label>Default User Role</label>
                        <select
                          className="select"
                          value={settings.defaultRole}
                          onChange={(e) => setSettings((s) => ({ ...s, defaultRole: e.target.value }))}
                        >
                          <option>Customer</option>
                          <option>Customer Support</option>
                          <option>Service Provider</option>
                          <option>Administrator</option>
                        </select>
                      </div>

                      <div className="admin-form-group">
                        <label>Items Per Page</label>
                        <input
                          className="search"
                          type="number"
                          min="5"
                          max="100"
                          value={settings.itemsPerPage}
                          onChange={(e) => setSettings((s) => ({ ...s, itemsPerPage: Number(e.target.value) }))}
                        />
                      </div>

                      <div className="admin-form-group">
                        <label>Maintenance Mode</label>
                        <div className="switch">
                          <input
                            id="maintenanceSwitch"
                            type="checkbox"
                            checked={settings.maintenance}
                            onChange={(e) => setSettings((s) => ({ ...s, maintenance: e.target.checked }))}
                          />
                          <label htmlFor="maintenanceSwitch">{settings.maintenance ? "Enabled" : "Disabled"}</label>
                        </div>
                      </div>

                      <div className="admin-form-group">
                        <label>Email Notifications</label>
                        <div className="switch">
                          <input
                            id="emailNotifSwitch"
                            type="checkbox"
                            checked={settings.emailNotifications}
                            onChange={(e) => setSettings((s) => ({ ...s, emailNotifications: e.target.checked }))}
                          />
                          <label htmlFor="emailNotifSwitch">{settings.emailNotifications ? "On" : "Off"}</label>
                        </div>
                      </div>
                    </div>

                    <div className="header-actions" style={{ marginTop: 12 }}>
                      <button className="action-btn" onClick={resetSettings}>Reset</button>
                      <button className="action-btn primary" onClick={saveSettings}>Save Settings</button>
                    </div>
                  </div>
                )}
              </>
            )}

            {activeSection === "User Management" && (
              <div className="actions-bar top-right">
                {userMgmtTab === "Service Provider" ? (
                  <>
                    <button
                      className="action-btn primary"
                      onClick={() => {
                        setActiveSection("Service Management");
                        setServiceView("Manage Services");
                      }}
                    >
                      Manage Services
                    </button>
                    <button
                      className="action-btn"
                      onClick={() => {
                        setActiveSection("Service Management");
                        setServiceView("Review Listings");
                      }}
                    >
                      Review Listings
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="action-btn primary"
                      onClick={() => navigate("/admin/users")}
                    >
                      Manage Users
                    </button>
                    {userMgmtTab === "Customer Support" && (
                      <button className="action-btn primary" onClick={addSupportMember}>
                        Add Support Member
                      </button>
                    )}
                    <button
                      className="action-btn"
                      onClick={() => navigate("/admin/manager-approvals")}
                    >
                      Review New Managers
                    </button>
                  </>
                )}
              </div>
            )}

            {activeSection === "User Management" && (
              <div className="sub-nav inline">
                <button
                  className={`sub-nav-btn ${userMgmtTab === "Customer" ? "active" : ""}`}
                  onClick={() => setUserMgmtTab("Customer")}
                >
                  Customer
                </button>
                <button
                  className={`sub-nav-btn ${userMgmtTab === "Customer Support" ? "active" : ""}`}
                  onClick={() => setUserMgmtTab("Customer Support")}
                >
                  Customer Support
                </button>
                <button
                  className={`sub-nav-btn ${userMgmtTab === "Service Provider" ? "active" : ""}`}
                  onClick={() => setUserMgmtTab("Service Provider")}
                >
                  Service Provider
                </button>
              </div>
            )}

            {/* Short notes removed as requested */}

            {activeSection === "User Management" && (
              <div className="admin-table-wrapper" style={{ marginTop: 12 }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: "center", padding: 16 }}>No records.</td>
                      </tr>
                    ) : (
                      visibleRows.map((u) => (
                        <tr key={u.id}>
                          <td>{u.name}</td>
                          <td>{u.email}</td>
                          <td>{u.role}</td>
                          <td>
                            <span className={`badge ${getBadgeClass(u.status)}`}>
                              {getBadgeLabel(u.status)}
                            </span>
                          </td>
                          <td>{u.joinedAt}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>
      </div>
      <SendNotification 
        show={showNotificationModal}
        onHide={() => setShowNotificationModal(false)}
        providerEmail={selectedProviderEmail}
      />
    </div>
  );
}

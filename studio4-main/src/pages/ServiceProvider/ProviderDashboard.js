// Service provider dashboard for managing profile, services, bookings, and notifications.
import React, { useEffect, useMemo, useState } from "react";
import { Container, Row, Col, Card, Button, Modal, Form, Table, Badge, Alert, Nav } from "react-bootstrap";
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { getServiceProviders, getServices, addService, updateService, deleteService } from "../../serviceProviderCRUD";
import { COMMISSION_RATE, formatCurrency, summarizeBookings } from "../../commission";
import NavigationBar from "../../components/NavigationBar";
import { auth, db, ensureFirebaseAuth } from "../../firebase";

import "../Customer/CustomerDashboard.css";
import "./ProviderDashboard.css";

export default function ServiceProviderDashboard() {
  const [providers, setProviders] = useState([]);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [providerFormData, setProviderFormData] = useState({
    providerId: "",
    businessName: "",
    ownerName: "",
    email: "",
    phone: "",
    address: "",
    category: "Home Services",
    status: "Pending"
  });

  const [services, setServices] = useState([]);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [serviceFormData, setServiceFormData] = useState({
    serviceId: "",
    serviceName: "",
    description: "",
    price: "",
    duration: "",
    category: "Home Services",
    providerId: "",
    available: true
  });
  const [editingServiceId, setEditingServiceId] = useState(null);

  const [message, setMessage] = useState({ type: "", text: "" });
  const [activeView, setActiveView] = useState("overview");
  const [bookings, setBookings] = useState([]);
  const [providerNotifications, setProviderNotifications] = useState([]);
  const [lastSeenProviderNotifications, setLastSeenProviderNotifications] = useState(() => {
    const stored = localStorage.getItem("provider-notifications-last-seen");
    return stored ? Number(stored) : 0;
  });
  const [providerHiddenBefore, setProviderHiddenBefore] = useState(() => {
    const stored = localStorage.getItem("provider-notifications-hidden-before");
    return stored ? Number(stored) : 0;
  });
  const [newNotificationBanner, setNewNotificationBanner] = useState(null);
  const [currentEmail, setCurrentEmail] = useState("");


  const [providerProfile, setProviderProfile] = useState(null);
  const [bookingView, setBookingView] = useState("all");

  const [providerUnreadCount, setProviderUnreadCount] = useState(0);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const NEW_STATUSES = ["", "pending", "new", "request", "requested"];
  const ACTIVE_STATUSES = ["accepted", "in progress", "in-progress", "progress", "completed", "complete"];

  const newBookings = useMemo(
    () =>
      bookings.filter((b) => {
        const status = (b.status || "").toLowerCase();
        return NEW_STATUSES.includes(status);
      }),
    [bookings]
  );

  const managedBookings = useMemo(
    () =>
      bookings.filter((b) => {
        const status = (b.status || "").toLowerCase();
        if (NEW_STATUSES.includes(status)) return false;
        if (!status) return false;
        return ACTIVE_STATUSES.includes(status) || status === "cancelled" || status === "canceled";
      }),
    [bookings]
  );

  const providerIdLower = useMemo(
    () => String(providerProfile?.providerId || providerProfile?.provider_id || "").toLowerCase(),
    [providerProfile]
  );

  const providerEmails = useMemo(() => {
    const emailSet = new Set(
      [
        currentEmail,
        providerProfile?.email,
        providerProfile?.emailAddress,
        providerProfile?.providerEmail,
        providerProfile?.ownerEmail,
        providerProfile?.contactEmail,
      ]
        .filter(Boolean)
        .map((e) => String(e).toLowerCase())
    );
    return emailSet;
  }, [currentEmail, providerProfile]);

  const providerServices = useMemo(() => {
    if (!services.length) return [];
    return services.filter((svc) => {
      const svcProviderId = String(
        svc.providerId || svc.provider_id || svc.provider || svc.providerIdNormalized || ""
      ).toLowerCase();
      const svcProviderEmail = String(
        svc.providerEmail || svc.provider_email || svc["provider email"] || ""
      ).toLowerCase();
      const matchesId = providerIdLower && svcProviderId === providerIdLower;
      const matchesEmail = svcProviderEmail && providerEmails.has(svcProviderEmail);
      return matchesId || matchesEmail;
    }).sort((a, b) => {
      // Sort by status: Approved first, then Pending, then others
      const statusOrder = { "Approved": 0, "Pending": 1, "Rejected": 2, "Suspended": 3 };
      const aStatus = statusOrder[a.status] ?? 4;
      const bStatus = statusOrder[b.status] ?? 4;
      return aStatus - bStatus;
    });
  }, [services, providerEmails, providerIdLower]);

  const fetchProviders = async () => {
    try {
      const data = await getServiceProviders();
      setProviders(data);
    } catch (error) {
      setMessage({ type: "error", text: "Failed to fetch service providers" });
    }
  };

  const fetchServices = async () => {
    try {
      if (db) {
        await ensureFirebaseAuth();
        const servicesQuery = query(collection(db, "Services"));
        return onSnapshot(
          servicesQuery,
          (snapshot) => {
            const docs = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
            setServices(docs);
          },
          () => setMessage({ type: "error", text: "Failed to fetch services" })
        );
      }

      // Fallback to local storage if Firebase is unavailable
      const data = await getServices();
      setServices(data);
      return undefined;
    } catch (error) {
      setMessage({ type: "error", text: "Failed to fetch services" });
      return undefined;
    }
  };

  useEffect(() => {
    fetchProviders();
    let unsubscribeServices;
    const handleFocus = () => {
      fetchServices().then((unsub) => {
        unsubscribeServices = unsub;
      });
    };
    
    window.addEventListener("focus", handleFocus);
    handleFocus(); 

    const unsubAuth = auth?.onAuthStateChanged?.((user) => {
      setCurrentEmail(user?.email || "");
    });

    return () => {
      if (unsubscribeServices) unsubscribeServices();
      if (unsubAuth) unsubAuth();
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  // Load provider profile and notifications
  useEffect(() => {
    if (!db || !currentEmail) return undefined;
    let mounted = true;

    const emailLower = currentEmail.toLowerCase();
    
    console.log(`[ProviderDashboard] Loading profile for email: ${emailLower}`);
    
    // Try multiple collections to find provider profile
    const queries = [
      query(collection(db, "ServiceProvider"), where("email", "==", emailLower)),
      query(collection(db, "users"), where("email", "==", emailLower)),
    ];
    
    const unsubscribers = [];
    
    queries.forEach((profileQuery, index) => {
      const collectionName = index === 0 ? 'ServiceProvider' : 'users';
      const unsub = onSnapshot(
        profileQuery,
        (snapshot) => {
          if (!mounted) return;
          const first = snapshot.docs[0];
          if (first && !providerProfile) {
            const data = first.data();
            const profile = { 
              id: first.id, 
              ...data,
              email: data.email || emailLower,
              providerId: data.providerId || data.providerID || data.id || first.id
            };
            setProviderProfile(profile);
            console.log(`[ProviderDashboard] Found provider profile in ${collectionName}:`, profile);
          }
        },
        (error) => {
          console.warn(`[ProviderDashboard] Failed to load provider profile from ${collectionName}`, error);
        }
      );
      unsubscribers.push(unsub);
    });

    // Listen to all notifications so broadcasts to all providers (no providerEmail) are also received.
    const notificationsQuery = collection(db, "Notification");

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        if (!mounted) return;

        const docs = snapshot.docs
          .map((docSnap) => {
            const data = docSnap.data();
            const hasTimestamp = typeof data.sentAt?.toMillis === "function";
            const sentOrder = hasTimestamp ? data.sentAt.toMillis() : Date.parse(data.sentAt || "") || 0;
            const sentAtDisplay = hasTimestamp
              ? data.sentAt.toDate().toLocaleString()
              : data.sentAt || "";
            return { id: docSnap.id, ...data, sentOrder, sentAt: sentAtDisplay };
          })
          .filter((note) => {
            const audience = (note.audience || "").toLowerCase();
            const channel = (note.channel || "").toLowerCase();
            const matchesChannel =
              channel.includes("app") ||
              channel === "in-app" ||
              channel.includes("email");
            const noteProviderEmail = (note.providerEmail || note.email || "").toLowerCase();
            const matchesEmail =
              noteProviderEmail && providerEmails.has(noteProviderEmail);
            const noteProviderId = (note.providerId || note.provider_id || "").toLowerCase();
            const matchesProviderId = providerIdLower && noteProviderId === providerIdLower;
            const isProviderAudience =
              audience.includes("provider") || audience.includes("service provider");
            const isTargeted = Boolean(noteProviderEmail || noteProviderId);
            const matchesRecipient = !isTargeted || matchesEmail || matchesProviderId;
            // Only surface notifications meant for providers; show broadcasts or those targeted to this provider.
            return (
              matchesChannel &&
              isProviderAudience &&
              matchesRecipient
            );
          })
          .sort((a, b) => b.sentOrder - a.sentOrder);

        const visibleDocs = docs.filter(
          (note) => (note.sentOrder || 0) > providerHiddenBefore
        );

        setProviderNotifications(visibleDocs);
        const unread = visibleDocs.filter((n) => (n.sentOrder || 0) > lastSeenProviderNotifications).length;
        setProviderUnreadCount(unread);
        if (
          visibleDocs.length &&
          (visibleDocs[0].sentOrder || 0) > lastSeenProviderNotifications
        ) {
          setNewNotificationBanner(visibleDocs[0]);
        }
      },
      (error) => {
        console.warn("[ProviderDashboard] Failed to load notifications", error);
      }
    );
    return () => {
      mounted = false;
      unsubscribers.forEach(unsub => unsub && unsub());
      if (unsubscribe) unsubscribe();
    };
  }, [currentEmail, lastSeenProviderNotifications, providerHiddenBefore, providerEmails, providerIdLower, providerProfile]);

  const markProviderNotificationsSeen = () => {
    const now = Date.now();
    setLastSeenProviderNotifications(now);
    localStorage.setItem("provider-notifications-last-seen", String(now));
    setProviderUnreadCount(0);
    setNewNotificationBanner(null);
  };

  const clearProviderNotifications = () => {
    const now = Date.now();
    setLastSeenProviderNotifications(now);
    setProviderHiddenBefore(now);
    localStorage.setItem("provider-notifications-last-seen", String(now));
    localStorage.setItem("provider-notifications-hidden-before", String(now));
    setProviderUnreadCount(0);
    setProviderNotifications([]);
    setNewNotificationBanner(null);
  };

  // Load bookings
  useEffect(() => {
    if (!db || !currentEmail) return undefined;

    let mounted = true;
    const bookingMap = new Map();

    const sortBookings = (items) =>
      items.sort((a, b) => {
        const aTime =
          typeof a.createdAt?.toMillis === "function"
            ? a.createdAt.toMillis()
            : Date.parse(a.createdAt || "") || 0;
        const bTime =
          typeof b.createdAt?.toMillis === "function"
            ? b.createdAt.toMillis()
            : Date.parse(b.createdAt || "") || 0;
        return bTime - aTime;
      });

    const normalizeBooking = (booking) => {
      const providerEmail =
        booking.providerEmail ||
        booking.provider_email ||
        booking["provider email"] ||
        booking.provider;
      const providerIdValue =
        booking.providerId ||
        booking.provider_id ||
        booking["provider id"] ||
        booking.provider;
      return {
        ...booking,
        providerEmailNormalized: providerEmail ? String(providerEmail).toLowerCase() : "",
        providerIdNormalized: providerIdValue ? String(providerIdValue).toLowerCase() : "",
      };
    };

    const handleSnapshot = (snapshot) => {
      if (!mounted) return;
      bookingMap.clear();
      snapshot.docs.forEach((docSnap) => bookingMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() }));
      const filtered = Array.from(bookingMap.values()).map(normalizeBooking).filter((booking) => {
        const bookingEmail = booking.providerEmailNormalized;
        const bookingProviderId = booking.providerIdNormalized;
        const matchesEmail = bookingEmail && providerEmails.has(bookingEmail);
        const matchesProviderId = providerIdLower && bookingProviderId === providerIdLower;
        return matchesEmail || matchesProviderId;
      });
      setBookings(sortBookings(filtered));
    };

    const unsubscribers = [];
    const allQuery = query(collection(db, "Order"));
    unsubscribers.push(
      onSnapshot(allQuery, handleSnapshot, (error) => {
        console.warn("[ProviderDashboard] Failed to load bookings", error);
      })
    );

    return () => {
      mounted = false;
      unsubscribers.forEach((u) => u && u());
    };
  }, [currentEmail, providerEmails, providerIdLower]);

  const filteredServices = useMemo(() => {
    const ownerEmail = (providerProfile?.email || currentEmail || "").toLowerCase();
    if (!ownerEmail) return [];
    const ownerProviderId = (providerProfile?.providerId || "").toString().toLowerCase();

    return services
      .filter((service) => {
        const status = (service.status || "").toLowerCase();
        const visible = service.visible !== false;
        const allowedStatuses = ["approved", "active", "published", "live", "pending", ""];
        const isAllowedStatus = allowedStatuses.includes(status);
        if (!visible || !isAllowedStatus) return false;

        const serviceEmail = (service.email || service.providerEmail || "").toLowerCase();
        const serviceProviderId = (service.providerId || service.providerID || "").toString().toLowerCase();

        if (serviceEmail && serviceEmail === ownerEmail) return true;
        if (ownerProviderId && serviceProviderId === ownerProviderId) return true;
        return false;
      })
      .sort((a, b) => (a.service || "").localeCompare(b.service || "", undefined, { sensitivity: "base" }));
  }, [services, currentEmail, providerProfile]);

  // Backfill missing providerEmail/providerId on owned services so they stay visible.
  useEffect(() => {
    if (!db) return;
    const ownerEmail = (providerProfile?.email || currentEmail || "").toLowerCase();
    const ownerProviderId = (providerProfile?.providerId || "").toString().toLowerCase();
    if (!ownerEmail && !ownerProviderId) return;

    const needsUpdate = services.filter((service) => {
      const serviceEmail = (service.email || service.providerEmail || "").toLowerCase();
      const serviceProviderId = (service.providerId || service.providerID || "").toString().toLowerCase();
      const matchesProviderId = ownerProviderId && serviceProviderId === ownerProviderId;
      const matchesEmail = ownerEmail && serviceEmail === ownerEmail;
      const missingEmail = !serviceEmail && matchesProviderId;
      const missingProviderId = !serviceProviderId && matchesEmail;
      return (missingEmail || missingProviderId) && service.id;
    });

    if (needsUpdate.length === 0) return;

    needsUpdate.forEach((svc) => {
      try {
        updateDoc(doc(db, "Services", svc.id), {
          providerEmail: ownerEmail || svc.providerEmail || svc.email || "",
          providerId: ownerProviderId || svc.providerId || svc.providerID || "",
          provider: ownerProviderId || svc.providerId || svc.providerID || "",
        });
      } catch (error) {
        console.warn("[ProviderDashboard] Failed to backfill service ownership", svc.id, error);
      }
    });
  }, [services, currentEmail, providerProfile]);


  // ... (keep all your existing handler functions exactly the same)
  const handleProviderChange = (e) => {
    setProviderFormData({ ...providerFormData, [e.target.name]: e.target.value });
  };

  const handleSaveProvider = async () => {};

  const handleServiceChange = (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setServiceFormData({ ...serviceFormData, [e.target.name]: value });
  };

  const handleAddService = () => {
    setServiceFormData({
      serviceId: "",
      serviceName: "",
      description: "",
      price: "",
      duration: "",
      category: "Home Services",
      providerId: providerProfile?.providerId || "",
      available: true
    });
    setEditingServiceId(null);
    setShowServiceModal(true);
  };

  const handleEditService = (service) => {
    setServiceFormData({
      serviceId: service.serviceId,
      serviceName: service.serviceName,
      description: service.description,
      price: service.price,
      duration: service.duration,
      category: service.category,
      providerId: service.providerId,
      available: service.available
    });
    setEditingServiceId(service.id);
    setShowServiceModal(true);
  };

  const handleSaveService = async () => {
    if (!serviceFormData.serviceId || !serviceFormData.serviceName || !serviceFormData.price) {
      setMessage({ type: "error", text: "Please fill all required fields" });
      return;
    }

    try {
      if (db) {
        await ensureFirebaseAuth();
        const payload = {
          serviceId: serviceFormData.serviceId,
          serviceName: serviceFormData.serviceName,
          service: serviceFormData.serviceName,
          description: serviceFormData.description,
          price: serviceFormData.price,
          duration: serviceFormData.duration,
          category: serviceFormData.category,

          providerId: serviceFormData.providerId || providerProfile?.providerId || providerProfile?.provider_id || "",
          provider: serviceFormData.providerId || providerProfile?.providerId || providerProfile?.provider_id || "",
          providerEmail: currentEmail?.toLowerCase?.() || "",
          provider_email: currentEmail?.toLowerCase?.() || "",

          available: serviceFormData.available,
          status: "Approved",
          visible: true,
          submittedAt: new Date().toISOString(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: "service-provider",
        };

        if (editingServiceId) {
          await updateDoc(doc(db, "Services", editingServiceId), {
            ...payload,
            updatedAt: serverTimestamp(),
            status: "Approved",
            visible: true,
            providerEmail: currentEmail?.toLowerCase?.() || "",
            providerId: payload.providerId,
            provider: payload.providerId,
          });
          setMessage({ type: "success", text: "Service updated and awaiting approval." });
        } else {
          const newServiceRef = await addDoc(collection(db, "Services"), payload);
          setMessage({ type: "success", text: "Service submitted for admin approval." });
          try {
            await addDoc(collection(db, "Notification"), {
              audience: "Administrators",
              channel: "In-App",
              subject: "Service pending approval",
              message: `${serviceFormData.serviceName || "A service"} was submitted by provider ${serviceFormData.providerId ||
                "unknown"}.`,
              status: "Pending",
              sentAt: serverTimestamp(),
              serviceDocId: newServiceRef.id,
            });
          } catch (notifyErr) {
            console.warn("[ProviderDashboard] Failed to log approval notification", notifyErr);
          }
        }
      } else {
        if (editingServiceId) {
          await updateService(editingServiceId, serviceFormData);
          setMessage({ type: "success", text: "Service updated successfully!" });
        } else {
          await addService(serviceFormData);
          setMessage({ type: "success", text: "Service added successfully!" });
        }
      }
      setShowServiceModal(false);
      fetchServices();
    } catch (error) {
      setMessage({ type: "error", text: "Operation failed" });
    }
  };

  const handleDeleteService = async (id) => {
    if (window.confirm("Are you sure you want to delete this service?")) {
      try {
        if (db) {
          await ensureFirebaseAuth();
          await deleteDoc(doc(db, "Services", id));
        } else {
          await deleteService(id);
        }
        setMessage({ type: "success", text: "Service deleted successfully!" });
        fetchServices();
      } catch (error) {
        setMessage({ type: "error", text: "Failed to delete service" });
      }
    }
  };

  const categories = ["Home Services", "Beauty & Wellness", "Professional Services", "Education & Training", "Health & Fitness", "Technology", "Other"];

  const scopedProviders = useMemo(() => {
    if (providerProfile) return [providerProfile];
    if (!providerEmails.size) return [];
    return providers.filter(
      (p) => providerEmails.has(String(p.email || p.emailAddress || p.providerEmail || "").toLowerCase())
    );
  }, [providerProfile, providerEmails, providers]);

  const activeProviders = scopedProviders.filter((p) => p.status === "Active").length;
  const bookingTotals = useMemo(() => summarizeBookings(bookings), [bookings]);
  const commissionRatePercent = Math.round((COMMISSION_RATE || 0) * 100);
  const analyticsStats = useMemo(() => {
    const total = bookings.length;
    const completed = bookings.filter((b) => (b.status || "").toLowerCase() === "completed").length;
    const accepted = bookings.filter((b) => {
      const status = (b.status || "").toLowerCase();
      return status === "accepted" || status === "in progress" || status === "completed";
    }).length;
    const newOrPending = bookings.filter((b) => {
      const status = (b.status || "").toLowerCase();
      return status === "pending" || status === "new";
    }).length;
    const acceptanceRate = total ? Math.round(((accepted || 0) / total) * 100) : 0;
    return {
      total,
      completed,
      pending: newOrPending,
      acceptanceRate,
      providerPayout: bookingTotals.providerTotal || 0,
      revenue: (bookingTotals.providerTotal || 0) + (bookingTotals.adminTotal || 0),
    };
  }, [bookings, bookingTotals]);

  const parseTimestamp = (value) => {
    if (!value) return null;
    if (typeof value?.toDate === "function") return value.toDate();
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : new Date(parsed);
  };

  const bookingsSeries = useMemo(() => {
    const days = 30;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const seriesMap = new Map();
    for (let i = 0; i < days; i += 1) {
      const d = new Date(today);
      d.setDate(today.getDate() - (days - 1 - i));
      const key = d.toISOString().slice(0, 10);
      seriesMap.set(key, { label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), count: 0 });
    }
    bookings.forEach((b) => {
      const ts = parseTimestamp(b.createdAt || b.created_at || b.created || b.sentAt);
      if (!ts) return;
      ts.setHours(0, 0, 0, 0);
      const key = ts.toISOString().slice(0, 10);
      if (seriesMap.has(key)) {
        const existing = seriesMap.get(key);
        seriesMap.set(key, { ...existing, count: (existing.count || 0) + 1 });
      }
    });
    return Array.from(seriesMap.values());
  }, [bookings]);

  const getBookingStatusVariant = (status) => {
    const normalized = String(status || "").toLowerCase();
    if (normalized === "completed") return "success";
    if (normalized === "in progress") return "warning";
    if (normalized === "accepted") return "primary";
    if (normalized === "cancelled" || normalized === "canceled") return "danger";
    if (normalized === "pending" || normalized === "new" || normalized === "") return "secondary";
    return "info";
  };

  const markNotificationsRead = async () => {
    setProviderUnreadCount(0);
    if (!db) return;
    try {
      const updates = providerNotifications
        .filter((n) => !n.readAt)
        .map((n) => updateDoc(doc(db, "Notification", n.id), { readAt: serverTimestamp() }));
      await Promise.allSettled(updates);
    } catch (error) {
      console.warn("[ProviderDashboard] Failed to mark notifications read", error);
    }
  };

  const updateBookingStatus = async (id, status) => {
    if (!id) {
      setMessage({ type: "error", text: "Invalid booking ID" });
      return;
    }
    
    try {
      if (db) {
        const bookingRef = doc(db, "Order", id);
        await updateDoc(bookingRef, { 
          status,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.warn("Firebase update failed, updating locally only:", error);
    }
    
    // Always update local state regardless of Firebase success/failure
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    setMessage({ type: "success", text: `Booking status updated to ${status}` });
  };

  const deleteBookingById = async (id) => {
    if (!id) {
      setMessage({ type: "error", text: "Invalid booking ID" });
      return;
    }
    
    if (!window.confirm("Are you sure you want to delete this booking?")) return;
    
    try {
      if (db) {
        const bookingRef = doc(db, "Order", id);
        await deleteDoc(bookingRef);
      }
    } catch (error) {
      console.warn("Firebase delete failed, deleting locally only:", error);
    }
    
    // Always update local state regardless of Firebase success/failure
    setBookings((prev) => prev.filter((b) => b.id !== id));
    setMessage({ type: "success", text: "Booking deleted." });
  };

  return (
    <div className="customer-page provider-dashboard-page">
      <div className="dashboard-page">
        <NavigationBar
          activeSection="provider"
          notificationCount={providerUnreadCount}
          notifications={providerNotifications}
          onNotificationsViewed={markNotificationsRead}
        />
        <div className="dashboard-wrapper">
          <Container fluid className="dashboard-content">
        {message.text && (
          <Alert 
            variant={message.type === "error" ? "danger" : "success"} 
            dismissible 
            onClose={() => setMessage({ type: "", text: "" })}
            className="custom-alert"
          >
            <i className={`bi bi-${message.type === "error" ? "exclamation-circle" : "check-circle"}`}></i>
            {message.text}
          </Alert>
        )}

        {newNotificationBanner && (
          <Alert
            variant="info"
            dismissible
            onClose={markProviderNotificationsSeen}
            className="custom-alert"
          >
            <i className="bi bi-bell"></i> New message:{" "}
            <strong>{newNotificationBanner.subject || "Notification"}</strong>
          </Alert>
        )}

        {/* Navigation Tabs */}
        <Nav variant="pills" className="dashboard-nav mb-4">
          <Nav.Item>
            <Nav.Link 
              active={activeView === "overview"} 
              onClick={() => setActiveView("overview")}
              className="nav-link-custom"
            >
              <i className="bi bi-grid-fill"></i> Overview
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link 
              active={activeView === "services"} 
              onClick={() => setActiveView("services")}
              className="nav-link-custom"
            >
              <i className="bi bi-briefcase-fill"></i> Services
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link 
              active={activeView === "bookings"} 
              onClick={() => setActiveView("bookings")}
              className="nav-link-custom"
            >
              <i className="bi bi-calendar-check-fill"></i> Bookings
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link
              active={activeView === "notifications"}
              onClick={() => {
                setActiveView("notifications");
                markNotificationsRead();
              }}
              className="nav-link-custom"
            >
              <i className="bi bi-bell-fill"></i> Notifications
              {providerUnreadCount > 0 && (
                <Badge bg="danger" pill className="ms-2">
                  {providerUnreadCount}
                </Badge>
              )}
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link 
              active={activeView === "analytics"} 
              onClick={() => setActiveView("analytics")}
              className="nav-link-custom"
            >
              <i className="bi bi-bar-chart-fill"></i> Analytics
            </Nav.Link>
          </Nav.Item>

        </Nav>

        {/* Overview Section */}
        {activeView === "overview" && (
          <>
            <Row className="g-4 mb-4">
              <Col lg={3} md={6}>
                <Card className="stat-card stat-card-blue">
                  <Card.Body>
                    <div className="stat-icon">
                      <i className="bi bi-people"></i>
                    </div>
                    <h3 className="stat-number">{scopedProviders.length}</h3>
                    <p className="stat-label">Your Provider Profile{scopedProviders.length !== 1 ? "s" : ""}</p>
                    <div className="stat-badge">
                      <Badge bg="primary">Live</Badge>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col lg={3} md={6}>
                <Card className="stat-card stat-card-green">
                  <Card.Body>
                    <div className="stat-icon">
                      <i className="bi bi-check-circle"></i>
                    </div>
                    <h3 className="stat-number">{activeProviders}</h3>
                    <p className="stat-label">Active Providers</p>
                    <div className="stat-badge">
                      <Badge bg="success">Verified</Badge>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col lg={3} md={6}>
                <Card className="stat-card stat-card-orange">
                  <Card.Body>
                    <div className="stat-icon">
                      <i className="bi bi-briefcase"></i>
                    </div>
                    <h3 className="stat-number">{filteredServices.length}</h3>
                    <p className="stat-label">Your Services</p>
                    <div className="stat-badge">
                      <Badge bg="warning">{filteredServices.filter(s => s.available).length} Available</Badge>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col lg={3} md={6}>
                <Card className="stat-card stat-card-purple">
                  <Card.Body>
                    <div className="stat-icon">
                      <i className="bi bi-calendar-check"></i>
                    </div>
                    <h3 className="stat-number">{bookings.length}</h3>
                    <p className="stat-label">Total Bookings</p>
                    <div className="stat-badge">
                      <Badge bg="info">{bookings.filter(b => b.status === 'Pending').length} Pending</Badge>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            <Row className="g-4 mb-4">
              <Col lg={4} md={6}>
                <Card className="stat-card stat-card-payout">
                  <Card.Body>
                    <div className="stat-icon">
                      <i className="bi bi-piggy-bank"></i>
                    </div>
                    <p className="stat-label">Your Earnings</p>
                    <h3 className="stat-number">{formatCurrency(bookingTotals.providerTotal)}</h3>
                    <p className="text-muted mb-0">Total after commission</p>
                  </Card.Body>
                </Card>
              </Col>
              <Col lg={4} md={6}>
                <Card className="stat-card stat-card-commission">
                  <Card.Body>
                    <div className="stat-icon">
                      <i className="bi bi-cash-coin"></i>
                    </div>
                    <p className="stat-label">Platform Commission ({commissionRatePercent}%)</p>
                    <h3 className="stat-number">{formatCurrency(bookingTotals.adminTotal)}</h3>
                    <p className="text-muted mb-0">Deducted from bookings</p>
                  </Card.Body>
                </Card>
              </Col>
              <Col lg={4} md={6}>
                <Card className="stat-card stat-card-blue">
                  <Card.Body>
                    <div className="stat-icon">
                      <i className="bi bi-graph-up"></i>
                    </div>
                    <p className="stat-label">Total Revenue</p>
                    <h3 className="stat-number">{formatCurrency(bookingTotals.totalVolume)}</h3>
                    <p className="text-muted mb-0">Gross booking value</p>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            
          </>
        )}

        {/* Services Section */}
        {activeView === "services" && (
          <>
            <div className="section-header">
              <div>
                <h3>Services Catalog</h3>
                <p className="text-muted">Manage all available services. Services need admin approval before becoming visible to customers.</p>
              </div>
              <Button variant="primary" size="lg" onClick={handleAddService}>
                <i className="bi bi-plus-circle"></i> Add Service
              </Button>
            </div>


            {providerServices.length === 0 ? (
              <Row className="g-4">
                <Col xs={12}>
                  <Card className="text-center py-5">
                    <Card.Body>
                      <i className="bi bi-inbox" style={{fontSize: "3rem", opacity: 0.3}}></i>
                      <p className="text-muted mt-3">No services added yet</p>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            ) : (
              <Card className="table-card wider-table">
                <Card.Body className="p-0">
                  <Table responsive hover className="modern-table mb-0">
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th>Service</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Duration</th>
                        <th>Provider</th>
                        <th style={{ width: 170 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {providerServices.map((service) => (
                        <tr key={service.id}>
                          <td>
                            <div className="d-flex flex-column gap-1">
                              <Badge bg={service.available ? "success" : "secondary"}>
                                {service.available ? "Available" : "Unavailable"}
                              </Badge>
                              <Badge bg={service.status === "Approved" ? "success" : service.status === "Pending" ? "warning" : "danger"}>
                                {service.status || "Pending"}
                              </Badge>
                            </div>
                          </td>
                          <td>
                            <div className="d-flex flex-column">
                              <strong>{service.serviceName}</strong>
                              <small className="text-muted">{service.description || "No description"}</small>
                            </div>
                          </td>
                          <td>
                            <Badge bg="info">{service.category || "General"}</Badge>
                          </td>
                          <td>{service.price ? `$${service.price}` : "-"}</td>
                          <td>{service.duration || "-"}</td>
                          <td>{service.providerId || "-"}</td>
                          <td className="table-actions d-flex gap-2">
                            <Button size="sm" variant="warning" onClick={() => handleEditService(service)}>
                              <i className="bi bi-pencil"></i> Edit
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => handleDeleteService(service.id)}>
                              <i className="bi bi-trash"></i> Delete
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            )}

          </>
        )}

        {/* Bookings Section */}
        {activeView === "bookings" && (
          <>
            <div className="section-header">
              <div>
                <h3>Bookings</h3>
                <p className="text-muted">New customer requests and confirmed bookings</p>
              </div>
              <div className="d-flex gap-2">
                <Button
                  variant={bookingView === "all" ? "primary" : "outline-primary"}
                  onClick={() => setBookingView("all")}
                >
                  All
                </Button>
                <Button
                  variant={bookingView === "new" ? "primary" : "outline-primary"}
                  onClick={() => setBookingView("new")}
                >
                  New
                </Button>
              </div>
            </div>

            <Row className="g-4">
              <Col xs={12}>
                <Card className="table-card wider-table">
                  <Card.Header>
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <h5 className="mb-0">Active bookings</h5>
                        <small className="text-muted">
                          Bookings remain here after you take action so you can keep updating their status.
                        </small>
                      </div>
                      <Badge bg="primary">{managedBookings.length}</Badge>
                    </div>
                  </Card.Header>
                  <Card.Body className="p-0">
                    {managedBookings.length === 0 ? (
                      <div className="text-center py-5">
                        <i className="bi bi-clipboard-check" style={{ fontSize: "3rem", opacity: 0.3 }}></i>
                        <p className="text-muted mt-3">No active bookings yet.</p>
                      </div>
                    ) : (
                      <Table responsive hover className="modern-table">
                        <thead>
                          <tr>
                            <th>Service</th>
                            <th>Customer</th>
                            <th>City</th>
                            <th>Total Price</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {managedBookings.map((booking) => (
                            <tr key={booking.id}>
                              <td>{booking.service || "Service"}</td>
                              <td>{booking.customerName || booking.email || booking.customerEmail || "Customer"}</td>
                              <td>{booking.city || "-"}</td>
                              <td>{formatCurrency(booking.totalPrice || booking.basePrice || 0)}</td>
                              <td>
                                <Badge bg={getBookingStatusVariant(booking.status)}>{booking.status || "Pending"}</Badge>
                              </td>
                              <td className="table-actions d-flex gap-2 flex-wrap">
                                <Button
                                  size="sm"
                                  variant="warning"
                                  onClick={() => updateBookingStatus(booking.id, "In Progress")}
                                >
                                  In Progress
                                </Button>
                                <Button
                                  size="sm"
                                  variant="primary"
                                  onClick={() => updateBookingStatus(booking.id, "Completed")}
                                >
                                  Complete
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => updateBookingStatus(booking.id, "Pending")}
                                >
                                  Move to Pending
                                </Button>
                                <Button
                                  size="sm"
                                  variant="danger"
                                  onClick={() => deleteBookingById(booking.id)}
                                >
                                  Delete
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    )}
                  </Card.Body>
                </Card>
              </Col>

              <Col xs={12}>
                <Card className="table-card wider-table">
                  <Card.Header>
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <h5 className="mb-0">New booking requests</h5>
                        <small className="text-muted">
                          Booking notifications appear here. Take action to move them into the active list above and keep working on them.
                        </small>
                      </div>
                      <Badge bg="primary">{newBookings.length}</Badge>
                    </div>
                  </Card.Header>
                  <Card.Body className="p-0">
                    {newBookings.length === 0 ? (
                      <div className="text-center py-5">
                        <i className="bi bi-inbox" style={{ fontSize: "3rem", opacity: 0.3 }}></i>
                        <p className="text-muted mt-3">No new bookings yet.</p>
                      </div>
                    ) : (
                      <Table responsive hover className="modern-table">
                        <thead>
                          <tr>
                            <th>Service</th>
                            <th>Customer</th>
                            <th>City</th>
                            <th>Price</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {newBookings.map((booking) => (
                            <tr key={booking.id}>
                              <td>{booking.service || "Service"}</td>
                              <td>{booking.customerName || booking.email || booking.customerEmail || "Customer"}</td>
                              <td>{booking.city || "-"}</td>
                              <td>{formatCurrency(booking.totalPrice || booking.basePrice || 0)}</td>
                              <td>
                                <Badge bg={getBookingStatusVariant(booking.status)}>{booking.status || "Pending"}</Badge>
                              </td>
                              <td className="table-actions d-flex gap-2 flex-wrap">
                                <Button
                                  size="sm"
                                  variant="success"
                                  onClick={() => updateBookingStatus(booking.id, "Accepted")}
                                >
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="warning"
                                  onClick={() => updateBookingStatus(booking.id, "In Progress")}
                                >
                                  In Progress
                                </Button>
                                <Button
                                  size="sm"
                                  variant="primary"
                                  onClick={() => updateBookingStatus(booking.id, "Completed")}
                                >
                                  Complete
                                </Button>
                                <Button
                                  size="sm"
                                  variant="danger"
                                  onClick={() => deleteBookingById(booking.id)}
                                >
                                  Delete
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </>
        )}

        {/* Notifications Section */}
        {activeView === "notifications" && (
          <>
            <div className="section-header">
              <div>
                <h3>Notifications</h3>

                <p className="text-muted">Latest updates sent to your account</p>
              </div>
              <div className="d-flex gap-2">
                <Button
                  variant="outline-secondary"
                  onClick={clearProviderNotifications}
                  disabled={!providerNotifications.length}
                >
                  Clear
                </Button>
              </div>
            </div>

            <Card className="table-card wider-table">
              <Card.Body className="p-0">
                {providerNotifications.length === 0 ? (
                  <div className="text-center py-5">
                    <i className="bi bi-bell" style={{ fontSize: "3rem", opacity: 0.3 }}></i>
                    <p className="text-muted mt-3">No notifications yet.</p>
                  </div>
                ) : (
                  <Table responsive hover className="modern-table mb-0">
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th>Message</th>
                        <th>Channel</th>
                        <th>Sent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {providerNotifications.slice(0, 30).map((note) => (
                        <tr key={note.id}>
                          <td>{note.subject || "Notification"}</td>
                          <td style={{ whiteSpace: "pre-line" }}>{note.message || "No message provided."}</td>
                          <td>
                            <Badge bg={String(note.channel || "").toLowerCase().includes("email") ? "info" : "primary"}>
                              {note.channel || "In-App"}
                            </Badge>
                          </td>
                          <td>{note.sentAt || "Just now"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          </>
        )}

        {/* Analytics Section */}
        {activeView === "analytics" && (
          <>
            <div className="section-header">
              <div>
                <h3>Analytics</h3>
                <p className="text-muted">Live booking insights</p>
              </div>
            </div>

            <Row className="g-4 mb-4">
              <Col lg={3} md={6}>
                <Card className="stat-card stat-card-blue">
                  <Card.Body>
                    <p className="stat-label">Total bookings</p>
                    <h3 className="stat-number">{analyticsStats.total}</h3>
                  </Card.Body>
                </Card>
              </Col>
              <Col lg={3} md={6}>
                <Card className="stat-card stat-card-green">
                  <Card.Body>
                    <p className="stat-label">Completed</p>
                    <h3 className="stat-number">{analyticsStats.completed}</h3>
                  </Card.Body>
                </Card>
              </Col>
              <Col lg={3} md={6}>
                <Card className="stat-card stat-card-orange">
                  <Card.Body>
                    <p className="stat-label">Acceptance rate</p>
                    <h3 className="stat-number">{analyticsStats.acceptanceRate}%</h3>
                  </Card.Body>
                </Card>
              </Col>
              <Col lg={3} md={6}>
                <Card className="stat-card stat-card-purple">
                  <Card.Body>
                    <p className="stat-label">Provider payout</p>
                    <h3 className="stat-number">{formatCurrency(analyticsStats.providerPayout)}</h3>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            <Row className="g-4">
              <Col lg={7} md={12}>
                <Card className="analytics-chart-card">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <div>
                        <h6 className="mb-0">Bookings last 30 days</h6>
                        <small className="text-muted">Live from recent activity</small>
                      </div>
                    </div>
                    <div className="sparkline-wrapper">
                      <svg viewBox="0 0 300 120" preserveAspectRatio="none">
                        <polyline
                          fill="none"
                          stroke="url(#sparkGradient)"
                          strokeWidth="3"
                          points={bookingsSeries
                            .map((d, idx) => {
                              const x = (300 / Math.max(bookingsSeries.length - 1, 1)) * idx;
                              const maxY = Math.max(...bookingsSeries.map((p) => p.count), 1);
                              const y = 110 - (d.count / maxY) * 100;
                              return `${x},${y}`;
                            })
                            .join(" ")}
                        />
                        {bookingsSeries.map((d, idx) => {
                          const x = (300 / Math.max(bookingsSeries.length - 1, 1)) * idx;
                          const maxY = Math.max(...bookingsSeries.map((p) => p.count), 1);
                          const y = 110 - (d.count / maxY) * 100;
                          return <circle key={d.label} cx={x} cy={y} r="3" className="sparkline-dot" />;
                        })}
                        <defs>
                          <linearGradient id="sparkGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="var(--allora-primary)" />
                            <stop offset="100%" stopColor="var(--allora-primary-dark)" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                    <div className="d-flex justify-content-between text-muted small mt-2">
                      <span>{bookingsSeries[0]?.label || ""}</span>
                      <span>{bookingsSeries[bookingsSeries.length - 1]?.label || ""}</span>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col lg={5} md={12}>
                <Card className="table-card">
                  <Card.Body className="p-0">
                    <Table responsive hover className="modern-table mb-0">
                      <thead>
                        <tr>
                          <th>Status</th>
                          <th>Count</th>
                        </tr>
                      </thead>
                    <tbody>
                        <tr>
                          <td>Pending / New</td>
                          <td>{analyticsStats.pending}</td>
                        </tr>
                        <tr>
                          <td>Accepted / In Progress</td>
                          <td>{analyticsStats.total - analyticsStats.pending - analyticsStats.completed}</td>
                        </tr>
                        <tr>
                          <td>Completed</td>
                          <td>{analyticsStats.completed}</td>
                        </tr>
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </>
        )}


        {/* Booking notification details */}
        <Modal
          show={Boolean(selectedNotification)}
          onHide={() => setSelectedNotification(null)}
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title>{selectedNotification?.subject || "Notification"}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p className="mb-2">
              <strong>Message:</strong>
            </p>
            <p style={{ whiteSpace: "pre-line" }}>{selectedNotification?.message || "No message provided."}</p>
            <hr />
            <p className="mb-1">
              <strong>Channel:</strong> {selectedNotification?.channel || "In-App"}
            </p>
            <p className="mb-1">
              <strong>Sent:</strong> {selectedNotification?.sentAt || "Just now"}
            </p>
            {selectedNotification?.providerEmail && (
              <p className="mb-0">
                <strong>Provider email:</strong> {selectedNotification.providerEmail}
              </p>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setSelectedNotification(null)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Analytics Section intentionally removed from provider dashboard */}


        {/* Keep your existing modals exactly as they are */}
        <Modal 
          show={showProviderModal} 
          onHide={() => setShowProviderModal(false)} 
          size="xl" 
          centered 
          className="custom-modal wider-modal"
        >
          <Modal.Header closeButton>
            <Modal.Title>Register Service Provider</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form className="row g-3">
              <Form.Group as={Col} md="4" controlId="providerId">
                <Form.Label>Provider ID</Form.Label>
                <Form.Control
                  type="text"
                  name="providerId"
                  value={providerFormData.providerId}
                  onChange={handleProviderChange}
                  placeholder="SP-001"
                  required
                />
              </Form.Group>
              <Form.Group as={Col} md="4" controlId="businessName">
                <Form.Label>Business Name</Form.Label>
                <Form.Control
                  type="text"
                  name="businessName"
                  value={providerFormData.businessName}
                  onChange={handleProviderChange}
                  placeholder="Acme Services"
                  required
                />
              </Form.Group>
              <Form.Group as={Col} md="4" controlId="ownerName">
                <Form.Label>Owner</Form.Label>
                <Form.Control
                  type="text"
                  name="ownerName"
                  value={providerFormData.ownerName}
                  onChange={handleProviderChange}
                  placeholder="Owner name"
                  required
                />
              </Form.Group>

              <Form.Group as={Col} md="6" controlId="email">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  name="email"
                  value={providerFormData.email}
                  onChange={handleProviderChange}
                  placeholder="provider@email.com"
                  required
                />
              </Form.Group>
              <Form.Group as={Col} md="6" controlId="phone">
                <Form.Label>Phone</Form.Label>
                <Form.Control
                  type="text"
                  name="phone"
                  value={providerFormData.phone}
                  onChange={handleProviderChange}
                  placeholder="+64 210 000 000"
                  required
                />
              </Form.Group>

              <Form.Group as={Col} md="12" controlId="address">
                <Form.Label>Address</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  name="address"
                  value={providerFormData.address}
                  onChange={handleProviderChange}
                  placeholder="Street, City, Country"
                />
              </Form.Group>

              <Form.Group as={Col} md="6" controlId="category">
                <Form.Label>Category</Form.Label>
                <Form.Select name="category" value={providerFormData.category} onChange={handleProviderChange}>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group as={Col} md="6" controlId="status">
                <Form.Label>Status</Form.Label>
                <Form.Select name="status" value={providerFormData.status} onChange={handleProviderChange}>
                  <option>Pending</option>
                  <option>Active</option>
                  <option>Suspended</option>
                </Form.Select>
              </Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShowProviderModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveProvider}>Create Provider</Button>
          </Modal.Footer>
        </Modal>

        <Modal show={showServiceModal} onHide={() => setShowServiceModal(false)} size="lg" centered className="custom-modal">
          <Modal.Header closeButton>
            <Modal.Title>{editingServiceId ? "Edit Service" : "Add Service"}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form className="row g-3">
              <Form.Group as={Col} md="4" controlId="serviceId">
                <Form.Label>Service ID</Form.Label>
                <Form.Control
                  type="text"
                  name="serviceId"
                  value={serviceFormData.serviceId}
                  onChange={handleServiceChange}
                  placeholder="SV-001"
                  required
                />
              </Form.Group>
              <Form.Group as={Col} md="8" controlId="serviceName">
                <Form.Label>Service Name</Form.Label>
                <Form.Control
                  type="text"
                  name="serviceName"
                  value={serviceFormData.serviceName}
                  onChange={handleServiceChange}
                  placeholder="House Cleaning"
                  required
                />
              </Form.Group>

              <Form.Group as={Col} md="12" controlId="description">
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  name="description"
                  value={serviceFormData.description}
                  onChange={handleServiceChange}
                  placeholder="Describe the service"
                />
              </Form.Group>

              <Form.Group as={Col} md="4" controlId="price">
                <Form.Label>Price</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  step="0.01"
                  name="price"
                  value={serviceFormData.price}
                  onChange={handleServiceChange}
                  placeholder="99.00"
                  required
                />
              </Form.Group>
              <Form.Group as={Col} md="4" controlId="duration">
                <Form.Label>Duration</Form.Label>
                <Form.Control
                  type="text"
                  name="duration"
                  value={serviceFormData.duration}
                  onChange={handleServiceChange}
                  placeholder="2 hours"
                />
              </Form.Group>
              <Form.Group as={Col} md="4" controlId="categoryService">
                <Form.Label>Category</Form.Label>
                <Form.Select name="category" value={serviceFormData.category} onChange={handleServiceChange}>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group as={Col} md="6" controlId="provider">
                <Form.Label>Provider ID</Form.Label>
                <Form.Control
                  type="text"
                  name="providerId"
                  value={serviceFormData.providerId}
                  onChange={handleServiceChange}
                  placeholder="SP-001"
                />
              </Form.Group>
              <Form.Group as={Col} md="6" controlId="availability" className="d-flex align-items-end">
                <Form.Check
                  type="switch"
                  id="available"
                  name="available"
                  label="Available"
                  checked={serviceFormData.available}
                  onChange={handleServiceChange}
                />
              </Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShowServiceModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveService}>
              {editingServiceId ? "Save Changes" : "Add Service"}
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
      </div>
    </div>
  </div>
  );
}

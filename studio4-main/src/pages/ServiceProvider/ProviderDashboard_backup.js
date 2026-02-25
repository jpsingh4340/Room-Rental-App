// Backup copy of the service provider dashboard for managing services and bookings.
import React, { useEffect, useMemo, useState } from "react";
import { Container, Row, Col, Card, Button, Modal, Form, Table, Badge, Alert, Nav } from "react-bootstrap";
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import {
  getServiceProviders,
  addServiceProvider,
  updateServiceProvider,
  deleteServiceProvider,
  getServices,
  addService,
  updateService,
  deleteService
} from "../../serviceProviderCRUD";
import { COMMISSION_RATE, formatCurrency, getBookings, summarizeBookings } from "../../commission";
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
  const [editingProviderId, setEditingProviderId] = useState(null);

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
  const [currentEmail, setCurrentEmail] = useState("");
  const [providerProfile, setProviderProfile] = useState(null);
  const [bookingView, setBookingView] = useState("all");
  const [providerUnreadCount, setProviderUnreadCount] = useState(0);

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
    fetchServices().then((unsub) => {
      unsubscribeServices = unsub;
    });
    const unsubAuth = auth?.onAuthStateChanged?.((user) => {
      setCurrentEmail(user?.email || "");
    });
    return () => {
      if (unsubscribeServices) unsubscribeServices();
      if (unsubAuth) unsubAuth();
    };
  }, []);

  useEffect(() => {
    if (!db || !currentEmail) return undefined;
    let mounted = true;
    const emailLower = currentEmail.toLowerCase();
    const profileQuery = query(
      collection(db, "ServiceProvider"),
      where("email", "==", emailLower)
    );
    const unsubProfile = onSnapshot(
      profileQuery,
      (snapshot) => {
        if (!mounted) return;
        const first = snapshot.docs[0];
        if (first) {
          setProviderProfile({ id: first.id, ...first.data() });
        }
      },
      (error) => {
        console.warn("[ProviderDashboard] Failed to load provider profile", error);
      }
    );

    const notificationsQuery = query(
      collection(db, "Notification"),
      where("providerEmail", "==", currentEmail.toLowerCase()),
      orderBy("sentAt", "desc")
    );
    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        if (!mounted) return;
        const docs = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
        setProviderNotifications(docs);
        setProviderUnreadCount(docs.filter((n) => !n.readAt).length);
        console.log(`[ProviderDashboard] Loaded ${docs.length} notifications for ${currentEmail}`);
      },
      (error) => {
        console.warn("[ProviderDashboard] Failed to load notifications", error);
      }
    );
    return () => {
      mounted = false;
      if (unsubProfile) unsubProfile();
      if (unsubscribe) unsubscribe();
    };
  }, [currentEmail]);

  useEffect(() => {
    if (!db) return undefined;
    const ownerEmail = (currentEmail || "").toLowerCase();
    const ownerProviderId = (providerProfile?.providerId || "").toString();
    if (!ownerEmail && !ownerProviderId) return undefined;

    let mounted = true;
    const aggregated = new Map();

    const applySnapshot = (snapshot) => {
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data() || {};
        aggregated.set(docSnap.id, { id: docSnap.id, ...data });
      });
      if (mounted) {
        const sorted = Array.from(aggregated.values()).sort((a, b) => {
          const getMillis = (value) => {
            if (value?.toMillis) return value.toMillis();
            if (value?.seconds) return value.seconds * 1000;
            const parsed = Date.parse(value);
            return Number.isFinite(parsed) ? parsed : 0;
          };
          return getMillis(b.createdAt) - getMillis(a.createdAt);
        });
        setBookings(sorted);
      }
    };

    const unsubscribers = [];
    if (ownerEmail) {
      const bookingsByEmail = query(
        collection(db, "Order"),
        where("providerEmail", "==", ownerEmail)
      );
      unsubscribers.push(
        onSnapshot(
          bookingsByEmail,
          (snapshot) => {
            applySnapshot(snapshot);
            console.log(`[ProviderDashboard] Loaded bookings by email for ${ownerEmail}`);
          },
          (error) => console.warn("[ProviderDashboard] Failed to load bookings by email", error)
        )
      );
    }

    if (ownerProviderId) {
      const bookingsByProviderId = query(
        collection(db, "Order"),
        where("providerId", "==", ownerProviderId)
      );
      unsubscribers.push(
        onSnapshot(
          bookingsByProviderId,
          (snapshot) => {
            applySnapshot(snapshot);
            console.log(`[ProviderDashboard] Loaded bookings by providerId ${ownerProviderId}`);
          },
          (error) => console.warn("[ProviderDashboard] Failed to load bookings by providerId", error)
        )
      );
    }

    return () => {
      mounted = false;
      unsubscribers.forEach((unsub) => unsub && unsub());
    };
  }, [currentEmail, providerProfile, db]);

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
  }, [services, currentEmail, providerProfile, db]);

  // ... (keep all your existing handler functions exactly the same)
  const handleProviderChange = (e) => {
    setProviderFormData({ ...providerFormData, [e.target.name]: e.target.value });
  };

  const handleAddProvider = () => {
    setProviderFormData({
      providerId: "",
      businessName: "",
      ownerName: "",
      email: "",
      phone: "",
      address: "",
      category: "Home Services",
      status: "Pending"
    });
    setEditingProviderId(null);
    setShowProviderModal(true);
  };

  const handleEditProvider = (provider) => {
    setProviderFormData({
      providerId: provider.providerId,
      businessName: provider.businessName,
      ownerName: provider.ownerName,
      email: provider.email,
      phone: provider.phone,
      address: provider.address,
      category: provider.category,
      status: provider.status
    });
    setEditingProviderId(provider.id);
    setShowProviderModal(true);
  };

  const handleSaveProvider = async () => {
    if (!providerFormData.providerId || !providerFormData.businessName || !providerFormData.ownerName || !providerFormData.email || !providerFormData.phone) {
      setMessage({ type: "error", text: "Please fill all required fields" });
      return;
    }

    try {
      if (editingProviderId) {
        await updateServiceProvider(editingProviderId, providerFormData);
        setMessage({ type: "success", text: "Service provider updated successfully!" });
      } else {
        await addServiceProvider(providerFormData);
        setMessage({ type: "success", text: "Service provider registered successfully!" });
      }
      setShowProviderModal(false);
      fetchProviders();
    } catch (error) {
      setMessage({ type: "error", text: "Operation failed" });
    }
  };

  const handleDeleteProvider = async (id) => {
    if (window.confirm("Are you sure you want to delete this service provider?")) {
      try {
        await deleteServiceProvider(id);
        setMessage({ type: "success", text: "Service provider deleted successfully!" });
        fetchProviders();
      } catch (error) {
        setMessage({ type: "error", text: "Failed to delete service provider" });
      }
    }
  };

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
          providerId: serviceFormData.providerId || providerProfile?.providerId || "",
          provider: serviceFormData.providerId || providerProfile?.providerId || "",
          providerEmail: currentEmail?.toLowerCase?.() || "",
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

  const activeProviders = providers.filter(p => p.status === "Active").length;
  const pendingProviders = providers.filter(p => p.status === "Pending").length;
  const availableServices = services.filter(s => s.available).length;
  const bookingTotals = useMemo(() => summarizeBookings(bookings), [bookings]);
  const commissionRatePercent = Math.round((COMMISSION_RATE || 0) * 100);
  const unreadProviderNotifications = providerUnreadCount;

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
    try {
      if (db && id) {
        await updateDoc(doc(db, "Order", id), { status });
      }
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    } catch (error) {
      setMessage({ type: "error", text: "Failed to update booking status" });
    }
  };

  const deleteBookingById = async (id) => {
    try {
      if (db && id) {
        await deleteDoc(doc(db, "Order", id));
      }
      setBookings((prev) => prev.filter((b) => b.id !== id));
      setMessage({ type: "success", text: "Booking deleted." });
    } catch (error) {
      setMessage({ type: "error", text: "Failed to delete booking" });
    }
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
              {unreadProviderNotifications > 0 && (
                <Badge bg="danger" pill className="ms-2">
                  {unreadProviderNotifications}
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
                    <h3 className="stat-number">{providers.length}</h3>
                    <p className="stat-label">Total Providers</p>
                    <div className="stat-badge">
                      <Badge bg="primary">+{providers.length > 0 ? Math.round(providers.length * 0.12) : 0}% this month</Badge>
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
                    <h3 className="stat-number">{services.length}</h3>
                    <p className="stat-label">Total Services</p>
                    <div className="stat-badge">
                      <Badge bg="warning">{availableServices} Available</Badge>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col lg={3} md={6}>
                <Card className="stat-card stat-card-purple">
                  <Card.Body>
                    <div className="stat-icon">
                      <i className="bi bi-clock-history"></i>
                    </div>
                    <h3 className="stat-number">{pendingProviders}</h3>
                    <p className="stat-label">Pending Approvals</p>
                    <div className="stat-badge">
                      <Badge bg="info">Review</Badge>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            <Row className="g-4 mb-4">
              <Col lg={6} md={12}>
                <Card className="stat-card stat-card-commission">
                  <Card.Body>
                    <div className="stat-icon">
                      <i className="bi bi-cash-coin"></i>
                    </div>
                    <p className="stat-label">Admin commission ({commissionRatePercent}%)</p>
                    <h3 className="stat-number">{formatCurrency(bookingTotals.adminTotal)}</h3>
                    <p className="text-muted mb-0">Collected on recent bookings</p>
                  </Card.Body>
                </Card>
              </Col>
              <Col lg={6} md={12}>
                <Card className="stat-card stat-card-payout">
                  <Card.Body>
                    <div className="stat-icon">
                      <i className="bi bi-piggy-bank"></i>
                    </div>
                    <p className="stat-label">Provider payout</p>
                    <h3 className="stat-number">{formatCurrency(bookingTotals.providerTotal)}</h3>
                    <p className="text-muted mb-0">Total after commission</p>
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
                <p className="text-muted">Manage all available services</p>
              </div>
              <Button variant="primary" size="lg" onClick={handleAddService}>
                <i className="bi bi-plus-circle"></i> Add Service
              </Button>
            </div>

            <Row className="g-4">
              {filteredServices.length === 0 ? (
                <Col xs={12}>
                  <Card className="text-center py-5">
                    <Card.Body>
                      <i className="bi bi-inbox" style={{fontSize: "3rem", opacity: 0.3}}></i>
                      <p className="text-muted mt-3">No services added yet</p>
                    </Card.Body>
                  </Card>
                </Col>
              ) : (
                filteredServices.map((service) => (
                  <Col lg={4} md={6} key={service.id}>
                    <Card className="service-card">
                      <Card.Body>
                        <div className="service-header">
                          <Badge bg={service.available ? "success" : "secondary"}>
                            {service.available ? "Available" : "Unavailable"}
                          </Badge>
                          <Badge bg="info">{service.category}</Badge>
                        </div>
                        <h5 className="mt-3">{service.serviceName}</h5>
                        <p className="text-muted">{service.description}</p>
                        <div className="service-details">
                          <div className="detail-item">
                            <i className="bi bi-tag"></i>
                            <strong>${service.price}</strong>
                          </div>
                          <div className="detail-item">
                            <i className="bi bi-clock"></i>
                            <span>{service.duration}</span>
                          </div>
                          <div className="detail-item">
                            <i className="bi bi-person"></i>
                            <span>{service.providerId}</span>
                          </div>
                        </div>
                        <div className="service-actions">
                          <Button size="sm" variant="warning" onClick={() => handleEditService(service)}>
                            <i className="bi bi-pencil"></i> Edit
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => handleDeleteService(service.id)}>
                            <i className="bi bi-trash"></i> Delete
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))
              )}
            </Row>
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
                  <Card.Body className="p-0">
                    {bookings.length === 0 ? (
                      <div className="text-center py-5">
                        <i className="bi bi-inbox" style={{ fontSize: "3rem", opacity: 0.3 }}></i>
                        <p className="text-muted mt-3">No bookings yet.</p>
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
                          {bookings
                            .filter((b) => {
                              if (bookingView === "new") {
                                const status = (b.status || "").toLowerCase();
                                return status === "pending" || status === "new";
                              }
                              return true;
                            })
                            .map((booking) => (
                              <tr key={booking.id}>
                                <td>{booking.service || "Service"}</td>
                                <td>{booking.name || booking.customerName || booking.email || booking.customerEmail || "Customer"}</td>
                                <td>{booking.city || "-"}</td>
                                <td>{formatCurrency(booking.totalPrice || booking.priceToPay || booking.basePrice || 0)}</td>
                                <td>
                                  <Badge
                                    bg={
                                      (booking.status || "").toLowerCase() === "completed"
                                        ? "success"
                                        : (booking.status || "").toLowerCase() === "in progress"
                                        ? "warning"
                                        : "secondary"
                                    }
                                  >
                                    {booking.status || "Pending"}
                                  </Badge>
                                </td>
                                <td className="table-actions">
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
                <p className="text-muted">Customer bookings and system updates</p>
              </div>
              <Button variant="outline-primary" onClick={markNotificationsRead} disabled={providerUnreadCount === 0}>
                Mark all as read
              </Button>
            </div>

            <Row className="g-4">
              <Col xs={12}>
                <Card className="table-card wider-table">
                  <Card.Body className="p-0">
                    {providerNotifications.length === 0 ? (
                      <div className="text-center py-5">
                        <i className="bi bi-bell" style={{ fontSize: "3rem", opacity: 0.3 }}></i>
                        <p className="text-muted mt-3">No notifications yet.</p>
                      </div>
                    ) : (
                      <Table responsive hover className="modern-table">
                        <thead>
                          <tr>
                            <th>Subject</th>
                            <th>Message</th>
                            <th>Status</th>
                            <th>Sent</th>
                          </tr>
                        </thead>
                        <tbody>
                          {providerNotifications.map((note) => {
                            const status = (note.status || "").toLowerCase();
                            return (
                              <tr key={note.id} className={note.readAt ? "" : "table-active"}>
                                <td>{note.subject || "Notification"}</td>
                                <td>{note.message || note.details || "Update"}</td>
                                <td>
                                  <Badge
                                    bg={
                                      status === "new"
                                        ? "primary"
                                        : status === "pending"
                                        ? "warning"
                                        : status === "completed" || status === "approved"
                                        ? "success"
                                        : "secondary"
                                    }
                                  >
                                    {note.status || "New"}
                                  </Badge>
                                </td>
                                <td>
                                  {note.sentAt?.toDate
                                    ? note.sentAt.toDate().toLocaleString()
                                    : note.sentAt || "Just now"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </Table>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </>
        )}

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
            <Modal.Title>{editingProviderId ? "Edit Service Provider" : "Register Service Provider"}</Modal.Title>
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
            <Button variant="primary" onClick={handleSaveProvider}>
              {editingProviderId ? "Save Changes" : "Create Provider"}
            </Button>
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




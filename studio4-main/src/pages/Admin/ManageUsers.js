// Admin view to manage user accounts, roles, and statuses via Firestore and API endpoints.
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db, ensureFirebaseAuth, isFirebaseConfigured } from "../../firebase";
import { formatSnapshotTimestamp } from "../../utils/firestoreHelpers";

export default function ManageUsers() {
  const USER_COLLECTION = "users";
  const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:4000";
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("All");
  const [status, setStatus] = useState("All");

  const blankForm = { name: "", email: "", role: "Customer", status: "Active", password: "" };
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState(blankForm);
  const [viewUser, setViewUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [supportRowVisible, setSupportRowVisible] = useState(false);
  const [supportRow, setSupportRow] = useState({
    name: "",
    email: "",
    password: "",
    status: "Active",
  });
  const [supportSubmitting, setSupportSubmitting] = useState(false);
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
  const normalizeRole = (value) =>
    typeof value === "string" ? value.trim().toLowerCase() : "";
  const normalizeStatus = (value) =>
    typeof value === "string" ? value.trim().toLowerCase() : "";

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return undefined;
    }

    const unsub = onSnapshot(
      collection(db, USER_COLLECTION),
      (snapshot) => {
        const docs = snapshot.docs
          .map((docSnap) => {
            const data = docSnap.data();
            const joinedRaw = data.joinedAt || data.Joined || data.joined || null;
            const { display, order } = formatSnapshotTimestamp(
              joinedRaw,
              joinedRaw || new Date().toISOString()
            );
            return {
              id: docSnap.id,
              name: deriveDisplayName(data),
              email: data.email || data.Email || data.emailAddress || "",
              role: data.role || data.Role || "Customer",
              status: data.status || data.Status || "Active",
              joinedAtDisplay: display,
              _order: order,
            };
          })
          .sort((a, b) => b._order - a._order)
          .map(({ _order, joinedAtDisplay, ...rest }) => ({
            ...rest,
            joinedAt: joinedAtDisplay,
          }));

        setUsers(docs);
        setLoading(false);
      },
      (error) => {
        console.error("[Firebase] Failed to load users", error);
        alert("Unable to load users from Firebase.");
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const totalCustomers = useMemo(
    () => users.filter((u) => normalizeRole(u.role) === "customer").length,
    [users]
  );
  const totalSupport = useMemo(
    () => users.filter((u) => normalizeRole(u.role) === "customer support").length,
    [users]
  );
  const totalProviders = useMemo(
    () => users.filter((u) => normalizeRole(u.role) === "service provider").length,
    [users]
  );
  const totalActive = useMemo(
    () => users.filter((u) => normalizeStatus(u.status) === "active").length,
    [users]
  );
  const suspendedCount = useMemo(
    () => users.filter((u) => normalizeStatus(u.status) === "suspended").length,
    [users]
  );
  const activeCustomers = useMemo(
    () =>
      users.filter(
        (u) => normalizeRole(u.role) === "customer" && normalizeStatus(u.status) === "active"
      ).length,
    [users]
  );
  const activeSupport = useMemo(
    () =>
      users.filter(
        (u) => normalizeRole(u.role) === "customer support" && normalizeStatus(u.status) === "active"
      ).length,
    [users]
  );
  const activeProviders = useMemo(
    () =>
      users.filter(
        (u) => normalizeRole(u.role) === "service provider" && normalizeStatus(u.status) === "active"
      ).length,
    [users]
  );
  const metricCards = [
    { label: "Customers", value: totalCustomers, detail: `${activeCustomers} active`, tone: "blue" },
    { label: "Support Team", value: totalSupport, detail: `${activeSupport} active`, tone: "teal" },
    {
      label: "Service Providers",
      value: totalProviders,
      detail: `${activeProviders} active`,
      tone: "purple",
    },
    { label: "Active Users", value: totalActive, detail: `${suspendedCount} suspended`, tone: "amber" },
  ];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return users.filter((u) => {
      const matchesQuery =
        !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchesRole = role === "All" || u.role === role;
      const matchesStatus = status === "All" || u.status === status;
      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [users, query, role, status]);

  const clearFilters = () => {
    setQuery("");
    setRole("All");
    setStatus("All");
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

  const openAddModal = () => {
    setFormData(blankForm);
    setShowAddModal(true);
  };

  const openAddSupportModal = () => {
    setSupportRowVisible(true);
    setRole("Customer Support");
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setFormData(blankForm);
    setSubmitting(false);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!db || submitting) return;
    if (!(await ensureAuth())) return;

    setSubmitting(true);
    const isSupport = formData.role === "Customer Support";

    try {
      if (isSupport) {
        if (!formData.password || formData.password.length < 6) {
          alert("Please provide a temporary password with at least 6 characters.");
          setSubmitting(false);
          return;
        }

        const response = await fetch(`${API_BASE}/support/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name.trim(),
            email: formData.email.trim(),
            password: formData.password,
            status: formData.status,
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data?.message || "Unable to create support user.");
        }
      } else {
        await addDoc(collection(db, USER_COLLECTION), {
          name: formData.name.trim(),
          email: formData.email.trim(),
          role: formData.role,
          status: formData.status,
          joinedAt: serverTimestamp(),
        });
      }

      closeAddModal();
    } catch (error) {
      console.error("[Firebase] Failed to add user", error);
      const message =
        error?.code === "permission-denied"
          ? "Firebase rejected this write (Missing or insufficient permissions). Check Firestore rules or enable anonymous auth."
          : error?.message || "Unable to add user. Please try again.";
      alert(message);
      setSubmitting(false);
    }
  };

  const handleSupportRowChange = (e) => {
    const { name, value } = e.target;
    setSupportRow((prev) => ({ ...prev, [name]: value }));
  };

  const handleSupportRowSave = async (e) => {
    e.preventDefault();
    if (supportSubmitting) return;
    if (!(await ensureAuth())) return;

    if (!supportRow.name.trim() || !supportRow.email.trim()) {
      alert("Name and email are required for support members.");
      return;
    }
    if (!supportRow.password || supportRow.password.length < 6) {
      alert("Temporary password must be at least 6 characters.");
      return;
    }

    setSupportSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/support/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: supportRow.name.trim(),
          email: supportRow.email.trim(),
          password: supportRow.password,
          status: supportRow.status,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || "Unable to create support member.");
      }

      setSupportRowVisible(false);
      setSupportRow({ name: "", email: "", password: "", status: "Active" });
      setRole("Customer Support");
    } catch (error) {
      console.error("[Support] Failed to add support user", error);
      alert(error?.message || "Unable to create support member.");
    } finally {
      setSupportSubmitting(false);
    }
  };

  const toggleUserStatus = async (id) => {
    if (!db) return;
    if (!(await ensureAuth())) return;

    const target = users.find((u) => u.id === id);
    if (!target) return;

    const normalizedStatus = (target.status || "").toString();
    let nextStatus = "Suspended";
    if (normalizedStatus === "Suspended") {
      nextStatus = "Active";
    } else if (normalizedStatus === "Pending") {
      nextStatus = "Active";
    }

    try {
      await updateDoc(doc(db, USER_COLLECTION, id), { status: nextStatus });
    } catch (error) {
      console.error("[Firebase] Failed to update user", id, error);
      const message =
        error?.code === "permission-denied"
          ? "Permission denied. Ensure Firebase allows updates for this user."
          : "Unable to update status. Please try again.";
      alert(message);
    }
  };

  const deleteUser = async (id) => {
    if (!db) return;
    if (!(await ensureAuth())) return;
    if (!window.confirm("Remove this user permanently?")) return;

    try {
      await deleteDoc(doc(db, USER_COLLECTION, id));
    } catch (error) {
      console.error("[Firebase] Failed to delete user", id, error);
      const message =
        error?.code === "permission-denied"
          ? "Permission denied. Check Firestore rules for delete access."
          : "Unable to delete user. Please try again.";
      alert(message);
    }
  };

  return (
    <div className="admin-dashboard-page manage-users-page">
      <div className="admin-dashboard-shell">
        <div className="admin-hero manage-users-hero">
          <div className="hero-copy">
            <p className="eyebrow">Directory & Access</p>
            <h1 className="title">Manage Users</h1>
            <p className="subtitle">
              Invite support, review customers, and keep providers active from one place.
            </p>
          </div>
          <div className="hero-actions stacked">
            <div className="hero-buttons">
              <button className="action-btn" onClick={() => navigate("/admin/dashboard")}>
                Back to Dashboard
              </button>
              <button
                className="action-btn primary"
                onClick={openAddModal}
                disabled={!isFirebaseConfigured}
              >
                Add User
              </button>
              <button
                className="action-btn ghost"
                onClick={openAddSupportModal}
                disabled={!isFirebaseConfigured}
              >
                Add Support
              </button>
            </div>
            {!isFirebaseConfigured && (
              <div className="alert warning soft">
                Firebase keys are missing. Add them to <code>.env</code> to enable user management.
              </div>
            )}
          </div>
        </div>

        <div className="user-metrics-grid">
          {metricCards.map((card) => (
            <div key={card.label} className={`user-metric-card ${card.tone}`}>
              <p className="metric-label">{card.label}</p>
              <div className="metric-value">{card.value}</div>
              <p className="metric-detail">{card.detail}</p>
            </div>
          ))}
        </div>

        <div className="filters-card">
          <div className="filters-header">
            <div>
              <h3>User Directory</h3>
              <p className="filters-subtitle">Search, filter, and manage access.</p>
            </div>
            <div className="filters-count">
              {loading ? "Loading..." : `${filtered.length} visible`}
            </div>
          </div>
          <div className="filters">
            <input
              className="search"
              type="text"
              placeholder="Search name or email..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select className="select" value={role} onChange={(e) => setRole(e.target.value)}>
              <option>All</option>
              <option>Customer</option>
              <option>Customer Support</option>
              <option>Service Provider</option>
            </select>
            <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option>All</option>
              <option>Active</option>
              <option>Suspended</option>
              <option>Pending</option>
            </select>
            <button className="action-btn" onClick={clearFilters}>
              Clear
            </button>
          </div>
        </div>

        <div className="admin-table-wrapper elevated">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
          <tbody>
            {supportRowVisible && (
              <tr className="support-inline-row">
                <td>
                  <input
                    type="text"
                    name="name"
                    value={supportRow.name}
                    onChange={handleSupportRowChange}
                    placeholder="Support name"
                  />
                </td>
                <td>
                  <input
                    type="email"
                    name="email"
                    value={supportRow.email}
                    onChange={handleSupportRowChange}
                    placeholder="support@email.com"
                  />
                </td>
                <td>Customer Support</td>
                <td>
                  <select name="status" value={supportRow.status} onChange={handleSupportRowChange}>
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </td>
                <td>—</td>
                <td className="admin-table-actions">
                  <input
                    type="text"
                    name="password"
                    value={supportRow.password}
                    onChange={handleSupportRowChange}
                    placeholder="Temp password"
                    style={{ width: "100%" }}
                  />
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button
                      className="action-btn primary"
                      onClick={handleSupportRowSave}
                      disabled={supportSubmitting}
                    >
                      {supportSubmitting ? "Saving..." : "Save"}
                    </button>
                    <button
                      className="action-btn"
                      onClick={() => setSupportRowVisible(false)}
                      disabled={supportSubmitting}
                    >
                      Cancel
                    </button>
                  </div>
                </td>
              </tr>
            )}
            {loading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: 16 }}>
                  Loading users...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: 16 }}>
                  No users match your filters.
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>
                    <span className={`badge ${u.status.toLowerCase()}`}>{u.status}</span>
                  </td>
                  <td>{u.joinedAt}</td>
                  <td className="admin-table-actions">
                    <button className="action-btn" onClick={() => setViewUser(u)}>
                      View
                    </button>
                    <button className="action-btn" onClick={() => toggleUserStatus(u.id)}>
                      {u.status === "Suspended" ? "Activate" : "Suspend"}
                    </button>
                    <button className="action-btn danger" onClick={() => deleteUser(u.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="admin-admin-modal-backdrop" onClick={closeAddModal}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-admin-modal-header">
              <h2>Add New User</h2>
              <button className="close-btn" onClick={closeAddModal}>
                x
              </button>
            </div>
            <form onSubmit={handleAddUser}>
              <div className="admin-form-group">
                <label>Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div className="admin-form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div className="admin-form-group">
                <label>Role</label>
                <select name="role" value={formData.role} onChange={handleFormChange}>
                  <option value="Customer">Customer</option>
                  <option value="Customer Support">Customer Support</option>
                  <option value="Service Provider">Service Provider</option>
                </select>
              </div>
              <div className="admin-form-group">
                <label>Status</label>
                <select name="status" value={formData.status} onChange={handleFormChange}>
                  <option value="Active">Active</option>
                  <option value="Pending">Pending</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
              {formData.role === "Customer Support" && (
                <div className="admin-form-group">
                  <label>Temporary Password (sent to support)</label>
                  <input
                    type="text"
                    name="password"
                    value={formData.password}
                    onChange={handleFormChange}
                    placeholder="At least 6 characters"
                    required
                  />
                </div>
              )}
              <div className="admin-admin-modal-actions">
                <button type="button" className="action-btn" onClick={closeAddModal} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="action-btn primary" disabled={submitting}>
                  {submitting ? "Adding..." : "Add User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewUser && (
        <div className="admin-admin-modal-backdrop" onClick={() => setViewUser(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-admin-modal-header">
              <h2>User Details</h2>
              <button className="close-btn" onClick={() => setViewUser(null)}>
                x
              </button>
            </div>
            <div className="user-details">
              <div className="detail-row">
                <strong>Name:</strong> {viewUser.name}
              </div>
              <div className="detail-row">
                <strong>Email:</strong> {viewUser.email}
              </div>
              <div className="detail-row">
                <strong>Role:</strong> {viewUser.role}
              </div>
              <div className="detail-row">
                <strong>Status:</strong>{" "}
                <span className={`badge ${viewUser.status.toLowerCase()}`}>{viewUser.status}</span>
              </div>
              <div className="detail-row">
                <strong>Joined:</strong> {viewUser.joinedAt}
              </div>
            </div>
            <div className="admin-admin-modal-actions">
              <button className="action-btn" onClick={() => setViewUser(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  );
}



// Admin workflow for reviewing and approving manager access requests from Firestore.
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db, ensureFirebaseAuth, isFirebaseConfigured } from "../../firebase";
import { formatSnapshotTimestamp } from "../../utils/firestoreHelpers";

export default function ManagerApprovals() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Pending");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return undefined;
    }
    const unsub = onSnapshot(
      collection(db, "ManagerRequests"),
      (snapshot) => {
        const docs = snapshot.docs
          .map((docSnap) => {
            const data = docSnap.data();
            const { display, order } = formatSnapshotTimestamp(
              data.submittedAt,
              data.submittedAt || new Date().toISOString()
            );
            return {
              id: docSnap.id,
              name: data.name || "Applicant",
              email: data.email || "",
              notes: data.notes || "",
              status: data.status || "Pending",
              submittedAtDisplay: display,
              _order: order,
            };
          })
          .sort((a, b) => b._order - a._order)
          .map(({ _order, submittedAtDisplay, ...rest }) => ({
            ...rest,
            submittedAt: submittedAtDisplay,
          }));
        setRequests(docs);
        setLoading(false);
      },
      (error) => {
        console.error("[Firebase] Failed to load manager requests", error);
        alert("Unable to load manager requests from Firebase.");
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      const matchesQuery = `${r.name} ${r.email}`.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = status === "All" || r.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [query, status, requests]);

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

  const handleApprove = async (request) => {
    if (!db) return;
    if (!(await ensureAuth())) return;
    try {
      await updateDoc(doc(db, "ManagerRequests", request.id), {
        status: "Approved",
        reviewedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("[Firebase] Failed to approve request", request.id, error);
      const message =
        error?.code === "permission-denied"
          ? "Permission denied. Check Firebase rules for updating manager requests."
          : "Unable to approve request. Please try again.";
      alert(message);
    }
  };

  const handleReject = async (request) => {
    if (!db) return;
    if (!(await ensureAuth())) return;
    try {
      await updateDoc(doc(db, "ManagerRequests", request.id), {
        status: "Rejected",
        reviewedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("[Firebase] Failed to reject request", request.id, error);
      const message =
        error?.code === "permission-denied"
          ? "Permission denied. Check Firebase rules for updating manager requests."
          : "Unable to reject request. Please try again.";
      alert(message);
    }
  };

  const handleView = (request) =>
    alert(`Applicant: ${request.name}\nEmail: ${request.email}\nNotes: ${request.notes}`);

  const addRequest = async () => {
    if (!db) return;
    if (!(await ensureAuth())) return;
    const name = window.prompt("Applicant name?");
    if (!name) return;
    const email = window.prompt("Email?");
    if (!email) return;
    const notes = window.prompt("Notes about the request?", "");
    try {
      await addDoc(collection(db, "ManagerRequests"), {
        name,
        email,
        notes,
        status: "Pending",
        submittedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("[Firebase] Failed to add manager request", error);
      const message =
        error?.code === "permission-denied"
          ? "Permission denied. Check Firebase rules or enable anonymous auth to add requests."
          : "Unable to add request. Please try again.";
      alert(message);
    }
  };

  return (
    <div className="main-content users-page">
      <div className="page-header">
        <h1 className="title">New Manager Approvals</h1>
        <div className="header-actions">
          <button className="action-btn" onClick={() => navigate("/admin/dashboard")}>Back to Dashboard</button>
          <button className="action-btn primary" onClick={addRequest} disabled={!isFirebaseConfigured}>
            Add Request
          </button>
        </div>
      </div>

      {!isFirebaseConfigured && (
        <div className="alert warning" style={{ marginBottom: 16 }}>
          Firebase keys are missing. Add them to <code>.env</code> to manage requests.
        </div>
      )}

      <div className="filters">
        <input
          className="search"
          type="text"
          placeholder="Search applicant name or email..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option>Pending</option>
          <option>Approved</option>
          <option>Rejected</option>
          <option>All</option>
        </select>
      </div>

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Applicant</th>
              <th>Email</th>
              <th>Submitted</th>
              <th>Notes</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: 16 }}>Loading requests...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: 16 }}>No requests found.</td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.email}</td>
                  <td>{r.submittedAt}</td>
                  <td>{r.notes}</td>
                  <td>
                    <span className={`badge ${r.status.toLowerCase()}`}>{r.status}</span>
                  </td>
                  <td className="admin-table-actions">
                    <button className="action-btn" onClick={() => handleView(r)}>View</button>
                    {r.status === "Pending" && (
                      <>
                        <button className="action-btn primary" onClick={() => handleApprove(r)}>Approve</button>
                        <button className="action-btn danger" onClick={() => handleReject(r)}>Reject</button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

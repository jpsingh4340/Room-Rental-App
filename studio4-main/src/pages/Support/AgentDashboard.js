// Support agent dashboard for reviewing tickets and marking updates in Firestore.
import React, { useEffect, useState } from "react";
import { collection, doc, getDocs, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import NavigationBar from "../../components/NavigationBar";
import "./SupportDashboard.css";
import "./AgentDashboard.css";

export default function AgentDashboard() {
  const [tickets, setTickets] = useState([]);
  const [expandedTicket, setExpandedTicket] = useState(null);

  useEffect(() => {
    const fetchTickets = async () => {
      if (!db) return;
      try {
        const snap = await getDocs(collection(db, "tickets"));
        const data = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
        setTickets(data);
      } catch (error) {
        console.error("[AgentDashboard] Ticket fetch error", error);
      }
    };
    fetchTickets();
  }, []);

  const handleStatusChange = async (id, newStatus) => {
    try {
      const ticketRef = doc(db, "tickets", id);
      const updateData = {
        status: newStatus,
        handledBy: "Agent",
        updatedAt: serverTimestamp(),
      };

      if (newStatus === "Resolved") {
        updateData.resolvedAt = serverTimestamp();
      }

      await updateDoc(ticketRef, updateData);
    } catch (err) {
      console.error("Error updating ticket:", err);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "-";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString("en-NZ", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="support-page">
      <NavigationBar activeSection="support" />

      <main className="support-main">
        <section className="support-hero">
          <div>
            <p className="clean-label subtle">Live queue</p>
            <h2>Manage Support Tickets</h2>
            <p className="support-hero-copy">
              Review customer issues, update statuses, and keep resolution times tight.
            </p>
          </div>
        </section>

        <section className="support-card">
          <div className="support-table-wrapper">
            <table className="ticket-table">
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Handled By</th>
                  <th>Created</th>
                  <th>Modified</th>
                  <th>Resolved</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {tickets.length > 0 ? (
                  tickets.map((t) => (
                    <React.Fragment key={t.id}>
                      <tr>
                        <td>{t.id}</td>
                        <td>{t.userName || t.name || "N/A"}</td>
                        <td>{t.userEmail || t.email || "N/A"}</td>
                        <td>{t.userPhone || t.phone || "N/A"}</td>
                        <td>{t.subject}</td>
                        <td>
                          <select
                            value={t.status}
                            onChange={(e) => handleStatusChange(t.id, e.target.value)}
                            className={`status-dropdown ${(t.status || "Open").replace(/\s/g, "")}`}
                          >
                            <option value="Open">Open</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Resolved">Resolved</option>
                          </select>
                        </td>
                        <td>{t.handledBy || "-"}</td>
                        <td>{formatDate(t.createdAt)}</td>
                        <td>{formatDate(t.updatedAt)}</td>
                        <td>{formatDate(t.resolvedAt)}</td>
                        <td>
                          <button
                            className="details-btn"
                            onClick={() => setExpandedTicket(expandedTicket === t.id ? null : t.id)}
                          >
                            {expandedTicket === t.id ? "Hide" : "View"}
                          </button>
                        </td>
                      </tr>

                      {expandedTicket === t.id && (
                        <tr className="expanded-row">
                          <td colSpan="11">
                            <div className="details-box">
                              <h4>Customer Query Details</h4>
                              <p>
                                <strong>Subject:</strong> {t.subject}
                              </p>
                              <p>
                                <strong>Description:</strong> {t.description || "No description provided."}
                              </p>
                              <p>
                                <strong>Status:</strong> {t.status}
                              </p>
                              <p>
                                <strong>Created:</strong> {formatDate(t.createdAt)}
                              </p>
                              <p>
                                <strong>Last Modified:</strong> {formatDate(t.updatedAt)}
                              </p>
                              {t.resolvedAt && (
                                <p>
                                  <strong>Resolved At:</strong> {formatDate(t.resolvedAt)}
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  <tr>
                    <td colSpan="11" className="no-tickets">
                      No tickets found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <footer className="support-footer">
        <p>(c) 2025 Allora Service Hub. All rights reserved.</p>
        <div className="footer-social">
          <p>To know more about our website, visit us on:</p>
          <div className="social-icons">
            <a href="https://www.facebook.com" target="_blank" rel="noreferrer">
              <i className="bi bi-facebook"></i>
            </a>
            <a href="https://www.instagram.com" target="_blank" rel="noreferrer">
              <i className="bi bi-instagram"></i>
            </a>
            <a href="https://www.tiktok.com" target="_blank" rel="noreferrer">
              <i className="bi bi-tiktok"></i>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

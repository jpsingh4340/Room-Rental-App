// Customer support dashboard that tracks tickets, conversations, and FAQ content via Firestore.
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import {
    collection,
    getDocs,
    addDoc,
    doc,
    getDoc,
    onSnapshot,
    query,
    where,
    serverTimestamp,
} from "firebase/firestore";

import { isBackgroundUserSession } from "../../firebase";

import NavigationBar from "../../components/NavigationBar";
import { auth, db } from "../../firebase";
import "./SupportDashboard.css";

const FALLBACK_SUPPORT_TOPICS = [
    {
        id: "basics",
        title: "Getting started",
        desc: "Create an account, post your first request, and understand approvals.",
        faqs: [
            { Q: "How do I create a ticket?", A: "Click '+ Create Ticket' above, fill in subject and description, then submit." },
            { Q: "Do I need to be logged in?", A: "Yes—tickets require a logged-in customer so updates stay tied to your account." },
        ],
    },
    {
        id: "billing",
        title: "Billing & payments",
        desc: "Invoices, receipts, and payment timelines.",
        faqs: [
            { Q: "Where is my receipt?", A: "Receipts are emailed instantly after payment and appear in your ticket timeline." },
            { Q: "Can I change payment method?", A: "Yes—reply on your ticket or create a new one and the team will update billing details." },
        ],
    },
];

function SupportDashboard() {

    const navigate = useNavigate();

    // States
    const [successMessage, setSuccessMessage] = useState("");

    const [showNotifications, setShowNotifications] = useState(false);
    const [showTickets, setShowTickets] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [feedbackTicket, setFeedbackTicket] = useState(null);
    const [headerUserEmail, setHeaderUserEmail] = useState("");
    const [openTopicId, setOpenTopicId] = useState(null);
    const [openFaqByTopic, setOpenFaqByTopic] = useState({});



    // Real Data States
    const [notifications, setNotifications] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [ticketsLoading, setTicketsLoading] = useState(true);
    const [supportTopics, setSupportTopics] = useState(FALLBACK_SUPPORT_TOPICS);
    const [userInfo, setUserInfo] = useState({ name: "", email: "", phone: "" });
    const [authUser, setAuthUser] = useState(null);
    const createTicketRef = useRef(null);

    // New ticket form
    const [newTicket, setNewTicket] = useState({
        subject: "",
        description: "",
        status: "Open",
    });
    const [showCreateTicket, setShowCreateTicket] = useState(false);
   // Track auth state and fetch user profile
    useEffect(() => {
        const unsubAuth = onAuthStateChanged(auth, (user) => {
            setAuthUser(user);
            setHeaderUserEmail(user?.email || "");
            setTicketsLoading(true);
        });

        return () => unsubAuth();
    }, []);


    const requireCustomerLogin = () => {
        const user = auth?.currentUser;
        if (!user || isBackgroundUserSession(user)) {
            navigate("/login", { state: { from: "/support" } });
            return false;
        }
        return true;
    };

    //  FETCH LOGGED-IN USER INFO 

    useEffect(() => {
        const fetchUserData = async () => {
            if (!authUser?.uid) return;

            try {
                const userRef = doc(db, "users", authUser.uid);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists()) {
                    setUserInfo(userSnap.data());
                } else {
                    // fallback: search by email if UID doc not found
                    const allUsers = await getDocs(collection(db, "users"));
                    allUsers.forEach((u) => {
                        const data = u.data();
                        if (data.email === authUser.email) {
                            setUserInfo(data);
                        }
                    });
                }
            } catch (error) {
                console.error("Error fetching user info:", error);
            }
        };

        fetchUserData();
    }, [authUser]);

    useEffect(() => {
        if (showCreateTicket && createTicketRef.current) {
            createTicketRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }, [showCreateTicket]);

    //  FETCH TICKETS (REAL-TIME) 
    useEffect(() => {
        const ownerId = authUser?.uid || null;
        const ownerEmail = authUser?.email?.toLowerCase() || null;
        if (!ownerId || !db) {
            setTickets([]);
            setTicketsLoading(false);
            return undefined;
        }

        const ticketsQuery = query(collection(db, "tickets"), where("userId", "==", ownerId));

        const unsubscribe = onSnapshot(
            ticketsQuery,
            (snap) => {
                const data = snap.docs
                    .map((docSnap) => {
                        const item = docSnap.data();
                        const createdAt = item.createdAt?.toDate ? item.createdAt.toDate() : item.createdAt;
                        return {
                            id: docSnap.id,
                            ...item,
                            createdAt,
                        };
                    })
                    .filter((item) => {
                        const ticketUserId = item.userId;
                        const ticketEmail = (item.userEmail || "").toLowerCase();
                        return ticketUserId === ownerId || (!!ownerEmail && ticketEmail === ownerEmail);
                    })
                    .sort((a, b) => {
                        const aTime = a.createdAt?.getTime ? a.createdAt.getTime() : 0;
                        const bTime = b.createdAt?.getTime ? b.createdAt.getTime() : 0;
                        return bTime - aTime;
                    });
                setTickets(data);
                setTicketsLoading(false);
            },
            (error) => {
                console.error("[SupportDashboard] Error fetching tickets:", error);
                setTickets([]);
                setTicketsLoading(false);
            }
        );

        return unsubscribe;
    }, [authUser?.uid, authUser?.email]);

    //  FETCH NOTIFICATIONS (one-time) 
    useEffect(() => {
        const fetchNotifications = async () => {
            if (!db) return;
            try {
                const snap = await getDocs(collection(db, "notifications"));
                const data = snap.docs.map((doc) => doc.data().message || "");
                setNotifications(data);
            } catch (error) {
                console.error("[SupportDashboard] Notifications fetch error", error);
            }
        };
        fetchNotifications();
    }, []);

    //  FETCH FAQ TOPICS (one-time) 
    useEffect(() => {
        const fetchTopics = async () => {
            if (!db) return;
            try {
                const snap = await getDocs(collection(db, "supportTopics"));
                const topicsData = snap.docs.map((doc) => {
                    const item = doc.data();
                    return {
                        id: doc.id,
                        title: item.title || "Untitled Topic",
                        desc: item.desc || "",
                        faqs: item.FAQS || item.faqs || [],
                    };
                });
                if (topicsData.length) {
                    setSupportTopics(topicsData);
                } else {
                    setSupportTopics(FALLBACK_SUPPORT_TOPICS);
                }
            } catch (error) {
                console.error("[SupportDashboard] FAQ fetch error", error);
            }
        };
        fetchTopics();
    }, []);

    //  CLEAR NOTIFICATIONS 
    const clearNotifications = () => setNotifications([]);

    //  CREATE NEW TICKET (AUTO USER INFO + SERVER TIME) 
    const handleCreateTicket = async (e) => {
        e.preventDefault();
        if (!requireCustomerLogin()) return;
        if (!newTicket.subject.trim() || !newTicket.description.trim()) {
            alert("Please fill in both subject and description.");
            return;
        }

        if (!db) {
            alert("Support tickets are unavailable because Firebase is not configured.");
            return;
        }

        console.log("Creating ticket with:", { auth: !!auth, db: !!db, currentUser: auth?.currentUser });

        const currentUser = authUser;
        if (!currentUser || !currentUser.email) {
            alert("Please log in to create a support ticket.");
            navigate("/login");
            return;
        }

        const ownerKey = currentUser.email.toLowerCase();
        const ticketData = {
            subject: newTicket.subject.trim(),
            description: newTicket.description.trim(),
            status: newTicket.status,
            createdAt: serverTimestamp(),
            userId: currentUser.uid,
            userName: userInfo.name || currentUser.displayName || ownerKey,
            userEmail: (userInfo.email || currentUser.email).toLowerCase(),
            userPhone: userInfo.phone || "Not provided",
        };

        console.log("Ticket data:", ticketData);

        try {
            const docRef = await addDoc(collection(db, "tickets"), ticketData);
            // Optimistically show the new ticket for the current user
            setTickets((prev) => [
                { id: docRef.id, ...ticketData, createdAt: new Date() },
                ...prev,
            ]);
            setNewTicket({ subject: "", description: "", status: "Open" });
            setShowCreateTicket(false);
            setSuccessMessage("Ticket created successfully!");
            setTimeout(() => setSuccessMessage(""), 3000);
        } catch (error) {
            console.error("Failed to create ticket:", error);
            setSuccessMessage("Ticket could not be created. Please try again once you're online.");
            setTimeout(() => setSuccessMessage(""), 4000);
        }
    };

    // SAFE SEARCH FILTER 
    const filteredResults = (supportTopics || [])
        .map((topic) => ({
            ...topic,
            faqs: (topic?.faqs || []).filter((faq) => {
                const q = faq?.Q?.toLowerCase?.() || faq?.q?.toLowerCase?.() || "";
                const a = faq?.A?.toLowerCase?.() || faq?.a?.toLowerCase?.() || "";
                const query = searchQuery?.toLowerCase?.() || "";
                return q.includes(query) || a.includes(query);
            }),
        }))
        .filter((topic) => {
            const title = topic?.title?.toLowerCase?.() || "";
            const query = searchQuery?.toLowerCase?.() || "";
            return title.includes(query) || topic.faqs.length > 0;
        });

    useEffect(() => {
        // Reset open state if topics change
        setOpenTopicId(null);
        setOpenFaqByTopic({});
    }, [supportTopics]);

    const toggleFaq = (topicKey, faqKey) => {
        setOpenFaqByTopic((prev) => ({
            ...prev,
            [topicKey]: prev[topicKey] === faqKey ? null : faqKey,
        }));
    };

    //  FORMAT DATE FUNCTION 
    const formatDate = (timestamp) => {
        if (!timestamp) return "Pending...";
        try {
            const date = timestamp.toDate ? timestamp.toDate() : timestamp;
            return date.toLocaleString("en-NZ", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
            });
        } catch {
            return "Invalid date";
        }
    };


    return (
        <div className="support-page">
            <NavigationBar activeSection="support" />
            
            {/*  HEADER  */}
            <header className="support-header">
                <div className="header-right">
                    {headerUserEmail && <span className="header-user">Welcome back, {headerUserEmail}.</span>}

                    {/* My Tickets */}
                    <i
                        className="bi bi-journal-text header-icon"
                        title="My Tickets"
                        onClick={() => {
                            if (!requireCustomerLogin()) return;
                            setShowTickets((prev) => !prev);
                            setShowNotifications(false);
                        }}
                    ></i>

                    {/* Notifications */}
                    <div className="icon-wrapper">
                        <i
                            className="bi bi-bell header-icon"
                            title="Notifications"
                        onClick={() => {
                            setShowNotifications(!showNotifications);
                            setShowTickets(false);
                        }}
                    ></i>
                        {notifications.length > 0 && (
                            <span className="notification-badge">{notifications.length}</span>
                        )}

                        {showNotifications && (
                            <div
                                className="notification-dropdown"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="dropdown-header">
                                    Notifications
                                    <button className="clear-btn" onClick={clearNotifications}>
                                        Clear
                                    </button>
                                </div>
                                <ul>
                                    {notifications.length ? (
                                        notifications.map((n, i) => <li key={i}>{n}</li>)
                                    ) : (
                                        <p className="no-notifications">No new notifications</p>
                                    )}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Profile */}
                    <div className="profile-section" />
                </div>
            </header>

            {/*SEARCH BAR */}
            <div className="search-container">
                <input
                    type="text"
                    placeholder="Search for help topics or questions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                />
            </div>

            {/*  MAIN CONTENT  */}
            <main className="support-main text-center">
                {searchQuery ? (
                    filteredResults.length > 0 ? (
                        <div className="support-grid">
                            {filteredResults.map((topic, index) => (
                                <div key={index} className="support-card active">
                                    <h3>{topic.title}</h3>
                                    {topic.faqs.map((faq, i) => (
                                        <div key={i} className="faq-item search-result">
                                            <p>
                                                <strong>{faq.Q || faq.q}</strong> - {faq.A || faq.a}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="no-results">
                            No results found - create a support ticket.
                        </p>

                    )
                ) : supportTopics.length ? (
                    <div className="support-grid support-card-grid">
                        {supportTopics.map((topic, index) => {
                            const topicKey = String(topic.id ?? index);

                            return (
                                <div
                                    key={topicKey}
                                    className="support-card faq-card"
                                >
                                    <div className="faq-card-header">
                                        <div>
                                            <h3>{topic.title}</h3>
                                            <p className="support-card-desc">{topic.desc}</p>
                                        </div>
                                    </div>
                                    <div className="support-card-faqs">
                                        {(topic.faqs || []).map((faq, i) => {
                                            const faqKey = `${topicKey}-${faq.id ?? faq.Q ?? faq.q ?? i}`;
                                            const isFaqOpen = openFaqByTopic[topicKey] === faqKey;
                                            return (
                                                <div
                                                    key={faqKey}
                                                    className={`faq-row card-row${isFaqOpen ? " open" : ""}`}
                                                >
                                                    <button
                                                        type="button"
                                                        className="faq-row-trigger"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleFaq(topicKey, faqKey);
                                                        }}
                                                        aria-expanded={isFaqOpen}
                                                    >
                                                        <span className="faq-q">{faq.Q || faq.q}</span>
                                                        <span className="faq-row-icon" aria-hidden="true">
                                                            {isFaqOpen ? "-" : "+"}
                                                        </span>
                                                    </button>
                                                    <div className="faq-row-panel" hidden={!isFaqOpen}>
                                                        <p className="faq-a">{faq.A || faq.a}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {(!topic.faqs || topic.faqs.length === 0) && (
                                            <p className="support-card-empty">No FAQs yet for this topic.</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="support-empty-state">
                        <h3>No help topics yet</h3>
                        <p>Start by creating a ticket so our team can add resources for your request.</p>
                        <span className="create-ticket-placeholder" />
                    </div>
                )}
            </main>
            {/*  TICKETS PANEL  */}
            <div className={`tickets-panel ${showTickets ? "open" : ""}`}>
                <div className="tickets-header">
                    <h4>My Tickets</h4>
                    <div>
                        <button
                            className="add-btn"
                            onClick={() => {
                                if (!requireCustomerLogin()) return;
                                setShowCreateTicket(!showCreateTicket);
                            }}
                        >
                            + Create
                        </button>
                        <button
                            className="close-btn"
                            onClick={() => setShowTickets(false)}
                        >
                            Close
                        </button>
                    </div>
                </div>

                <div className="tickets-body">
                    {showCreateTicket && (
                        <div className="create-ticket-form" ref={createTicketRef}>
                            <h5>Create New Ticket</h5>
                            <form onSubmit={handleCreateTicket}>
                                <input
                                    type="text"
                                    placeholder="Enter ticket subject..."
                                    value={newTicket.subject}
                                    onChange={(e) =>
                                        setNewTicket({ ...newTicket, subject: e.target.value })
                                    }
                                    className="input-box"
                                    required
                                />
                                <textarea
                                    placeholder="Enter ticket description..."
                                    value={newTicket.description}
                                    onChange={(e) =>
                                        setNewTicket({ ...newTicket, description: e.target.value })
                                    }
                                    className="input-box"
                                    rows={3}
                                    required
                                ></textarea>
                                <button type="submit" className="create-btn">
                                    Submit
                                </button>
                            </form>
                        </div>
                    )}

                    {ticketsLoading ? (
                        <p>Loading tickets...</p>
                    ) : tickets.length > 0 ? (
                        <table className="tickets-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th>Subject</th>
                                    <th>Status</th>
                                    <th>Created At</th>
                                    <th>Feedback</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tickets.map((t) => (
                                    <tr key={t.id}>
                                        <td>{t.userName || "Not Provided"}</td>
                                        <td>{t.userEmail || "Not Provided"}</td>
                                        <td>{t.userPhone || "Not Provided"}</td>
                                        <td>{t.subject}</td>
                                        <td>{t.status || "FAQ"}</td>
                                        <td>{formatDate(t.createdAt)}</td>
                                        <td>
                                            <button
                                                className="feedback-btn"
                                                onClick={() => setFeedbackTicket(t)}
                                            >
                                                Give Feedback
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p>No tickets found.</p>
                    )}
                </div>
            </div>
            {/* FEEDBACK POPUP (NEW) */}
            {feedbackTicket && (
                <div className="feedback-popup">
                    <div className="feedback-box">
                        <h3>Feedback for: {feedbackTicket.subject}</h3>

                        <label>Your Rating:</label>
                        <select
                            className="input-box"
                            value={feedbackTicket.rating || ""}
                            onChange={(e) =>
                                setFeedbackTicket({ ...feedbackTicket, rating: e.target.value })
                            }
                        >
                            <option value="">Select rating</option>
                            <option value="1">1 - Bad</option>
                            <option value="2">2 - Poor</option>
                            <option value="3">3 - Okay</option>
                            <option value="4">4 - Good</option>
                            <option value="5">5 - Excellent</option>
                        </select>

                        <label>Your Feedback:</label>
                        <textarea
                            className="input-box"
                            rows={3}
                            placeholder="Write your feedback..."
                            value={feedbackTicket.feedback || ""}
                            onChange={(e) =>
                                setFeedbackTicket({ ...feedbackTicket, feedback: e.target.value })
                            }
                        ></textarea>

                        <div className="popup-buttons">
                            <button
                            className="submit-btn"
                            onClick={async () => {
                                    if (!feedbackTicket.rating || !(feedbackTicket.feedback || "").trim()) {
                                        alert("Please provide a rating and feedback before submitting.");
                                        return;
                                    }
                                    try {
                                        await addDoc(collection(db, "feedback"), {
                                            ticketId: feedbackTicket.id,
                                            subject: feedbackTicket.subject,
                                            rating: feedbackTicket.rating || "",
                                            feedback: feedbackTicket.feedback || "",
                                            userEmail: feedbackTicket.userEmail,
                                            userName: feedbackTicket.userName,
                                            createdAt: new Date(),
                                        });
                                        setSuccessMessage("Thank you! Your feedback has been submitted successfully.");
                                        setFeedbackTicket(null);

                                        setTimeout(() => setSuccessMessage(""), 3000); // hide after 3 sec

                                    } catch (err) {
                                        console.error("Error submitting feedback:", err);
                                        alert("Failed to submit feedback. Please try again.");
                                    }
                                }}

                            >
                                Submit
                            </button>

                            <button
                                className="cancel-btn"
                                onClick={() => setFeedbackTicket(null)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {successMessage && (
                <div className="success-toast">
                    <i className="bi bi-check-circle-fill"></i>
                    <span>{successMessage}</span>
                </div>
            )}

            {/*  FOOTER  */}
            <footer className="support-footer">
                <p>(c) 2025 Allora Service Hub. All rights reserved.</p>
                <div className="footer-social">
                    <p>To know more about our website, visit us on:</p>
                    <div className="social-icons">
                        <a href="https://www.facebook.com" target="_blank" rel="noreferrer">
                            <i className="bi bi-facebook"></i>
                        </a>
                        <a
                            href="https://www.instagram.com"
                            target="_blank"
                            rel="noreferrer"
                        >
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

export default SupportDashboard;

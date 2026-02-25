// Modal form that lets admins compose and send provider notifications to Firestore.
import React, { useState } from "react";
import { Modal, Form, Button } from "react-bootstrap";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export default function SendNotification({ show, onHide, providerEmail }) {
  // Local state for form fields (subject + message)
  const [formData, setFormData] = useState({
    subject: "",
    message: ""
  });

  // Tracks if the notification is in-flight (loading state)
  const [sending, setSending] = useState(false);

  // Syncs form input changes with state
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handles the submit → pushes a new notification to Firestore
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic input validation
    const normalizedEmail = (providerEmail || "").trim().toLowerCase();
    if (!formData.subject || !formData.message) return;
    if (!normalizedEmail) {
      alert("This provider does not have an email address on file.");
      onHide();
      return;
    }
    if (!db) {
      alert("Firebase is not configured. Cannot send notifications right now.");
      onHide();
      return;
    }

    setSending(true);

    try {
      // Create a new document inside the "Notification" collection
      await addDoc(collection(db, "Notification"), {
        audience: "Service Providers",               // Who this message is for
        providerEmail: normalizedEmail,             // Target provider
        subject: formData.subject,                  // Message subject
        message: formData.message,                  // Message body
        status: "New",                              // Default unread status
        sentAt: serverTimestamp(),                  // Backend-generated timestamp
        sentBy: "Administrator"                     // Sender identity
      });

      // Reset the form after send
      setFormData({ subject: "", message: "" });

      // Close modal
      onHide();

    } catch (error) {
      console.error("Error sending notification:", error);
      alert("Unable to send notification right now. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      {/* Modal Header */}
      <Modal.Header closeButton>
        <Modal.Title>Send Message to Provider</Modal.Title>
      </Modal.Header>

      {/* Modal Body → The form UI */}
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          {/* Display provider email */}
          <Form.Group className="mb-3">
            <Form.Label>To: {providerEmail}</Form.Label>
          </Form.Group>

          {/* Subject input */}
          <Form.Group className="mb-3">
            <Form.Label>Subject</Form.Label>
            <Form.Control
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              required
            />
          </Form.Group>

          {/* Message input */}
          <Form.Group className="mb-3">
            <Form.Label>Message</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              name="message"
              value={formData.message}
              onChange={handleChange}
              required
            />
          </Form.Group>
        </Form>
      </Modal.Body>

      {/* Modal Footer → Action buttons */}
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={sending || !providerEmail}
        >
          {sending ? "Sending..." : "Send Message"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

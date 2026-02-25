// Simplified booking request form prototype for capturing customer interest.
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import NavigationBar from "../../components/NavigationBar";
import { db } from "../../firebase";
import "./CustomerDashboard.css";

export default function GetStarted() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    service: "",
    providerEmail: "",
    details: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const orderData = {
        name: formData.name,
        customerName: formData.name,
        email: formData.email,
        customerEmail: formData.email,
        service: formData.service,
        description: formData.details,
        providerEmail: formData.providerEmail.toLowerCase(),
        totalPrice: 100,
        status: "Pending",
        createdAt: serverTimestamp()
      };

      console.log("Creating order:", orderData);
      const docRef = await addDoc(collection(db, "Order"), orderData);
      console.log("Order created:", docRef.id);
      
      setMessage("Booking created successfully!");
      setTimeout(() => navigate("/services"), 1000);
    } catch (error) {
      console.error("Error creating booking:", error);
      setMessage("Error creating booking");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dashboard-page get-started-page">
      <NavigationBar />
      <main className="get-started-content">
        <section className="get-started-hero">
          <h1>Create Test Booking</h1>
        </section>

        <section className="get-started-form-card">
          <form className="get-started-form" onSubmit={handleSubmit}>
            <div className="form-row">
              <label htmlFor="name">Customer Name</label>
              <input 
                id="name" 
                name="name" 
                type="text" 
                value={formData.name} 
                onChange={handleChange} 
                required 
              />
            </div>

            <div className="form-row">
              <label htmlFor="email">Customer Email</label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-row">
              <label htmlFor="service">Service</label>
              <input
                id="service"
                name="service"
                type="text"
                value={formData.service}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-row">
              <label htmlFor="providerEmail">Provider Email</label>
              <input
                id="providerEmail"
                name="providerEmail"
                type="email"
                value={formData.providerEmail}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-row">
              <label htmlFor="details">Details</label>
              <textarea
                id="details"
                name="details"
                rows={3}
                value={formData.details}
                onChange={handleChange}
                required
              />
            </div>

            {message && <div className="form-feedback">{message}</div>}

            <div className="form-actions">
              <button type="submit" className="nav-cta" disabled={submitting}>
                {submitting ? "Creating..." : "Create Booking"}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}

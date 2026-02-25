// Lean working version of the provider dashboard focused on service listings and notifications.
import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, Button, Table, Badge, Nav } from "react-bootstrap";
import { collection, onSnapshot, query, where, addDoc, serverTimestamp } from "firebase/firestore";
import NavigationBar from "../../components/NavigationBar";
import { auth, db } from "../../firebase";
import "../Customer/CustomerDashboard.css";
import "./ProviderDashboard.css";

export default function ServiceProviderDashboard() {
  const [activeView, setActiveView] = useState("bookings");
  const [bookings, setBookings] = useState([]);
  const [currentEmail, setCurrentEmail] = useState("");

  useEffect(() => {
    const unsubAuth = auth?.onAuthStateChanged?.((user) => {
      setCurrentEmail(user?.email || "");
    });
    return () => {
      if (unsubAuth) unsubAuth();
    };
  }, []);

  useEffect(() => {
    if (!db || !currentEmail) return undefined;
    
    const ownerEmail = currentEmail.toLowerCase();
    console.log(`Loading bookings for: ${ownerEmail}`);

    const bookingsQuery = query(
      collection(db, "Order"),
      where("providerEmail", "==", ownerEmail)
    );

    const unsubscribe = onSnapshot(
      bookingsQuery,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        console.log(`Found ${docs.length} bookings:`, docs);
        setBookings(docs);
      },
      (error) => console.error("Error loading bookings:", error)
    );

    return unsubscribe;
  }, [currentEmail]);

  const createTestBooking = async () => {
    if (!db || !currentEmail) return;
    
    const testData = {
      name: "Test Customer",
      customerName: "Test Customer",
      email: "test@customer.com",
      service: "Test Service",
      providerEmail: currentEmail.toLowerCase(),
      totalPrice: 100,
      status: "Pending",
      createdAt: serverTimestamp()
    };

    try {
      const docRef = await addDoc(collection(db, "Order"), testData);
      console.log("Test booking created:", docRef.id);
    } catch (error) {
      console.error("Error creating test booking:", error);
    }
  };

  return (
    <div className="customer-page provider-dashboard-page">
      <div className="dashboard-page">
        <NavigationBar activeSection="provider" />
        <div className="dashboard-wrapper">
          <Container fluid className="dashboard-content">
            <Nav variant="pills" className="dashboard-nav mb-4">
              <Nav.Item>
                <Nav.Link 
                  active={activeView === "bookings"} 
                  onClick={() => setActiveView("bookings")}
                >
                  Bookings ({bookings.length})
                </Nav.Link>
              </Nav.Item>
            </Nav>

            <div className="section-header">
              <div>
                <h3>Bookings for {currentEmail}</h3>
              </div>
              <Button variant="success" onClick={createTestBooking}>
                Create Test Booking
              </Button>
            </div>

            <Row className="g-4">
              <Col xs={12}>
                <Card>
                  <Card.Body className="p-0">
                    {bookings.length === 0 ? (
                      <div className="text-center py-5">
                        <p>No bookings found for {currentEmail}</p>
                      </div>
                    ) : (
                      <Table responsive hover>
                        <thead>
                          <tr>
                            <th>Service</th>
                            <th>Customer</th>
                            <th>Price</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bookings.map((booking) => (
                            <tr key={booking.id}>
                              <td>{booking.service}</td>
                              <td>{booking.name || booking.customerName}</td>
                              <td>${booking.totalPrice || 0}</td>
                              <td>
                                <Badge bg="secondary">
                                  {booking.status || "Pending"}
                                </Badge>
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
          </Container>
        </div>
      </div>
    </div>
  );
}

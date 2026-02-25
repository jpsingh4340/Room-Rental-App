// Test script to verify notification and booking system
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export const testProviderNotification = async (providerEmail, customerName = "Test Customer", service = "Test Service") => {
  if (!db) {
    console.error("Firebase not configured");
    return;
  }

  try {
    // Create test notification
    await addDoc(collection(db, "Notification"), {
      audience: "Service Providers",
      providerEmail: providerEmail.toLowerCase(),
      subject: "New booking request",
      message: `${customerName} requested ${service} in Auckland.`,
      customerName: customerName,
      customerEmail: "test@example.com",
      service: service,
      city: "Auckland",
      status: "New",
      sentAt: serverTimestamp(),
    });

    // Create test booking
    await addDoc(collection(db, "Order"), {
      name: customerName,
      customerName: customerName,
      email: "test@example.com",
      customerEmail: "test@example.com",
      phone: "+64 21 000 0000",
      city: "Auckland",
      service: service,
      description: "Test booking for verification",
      providerEmail: providerEmail.toLowerCase(),
      providerId: "TEST-001",
      providerName: "Test Provider",
      priceToPay: 100,
      totalPrice: 100,
      fullPrice: 100,
      basePrice: 85,
      commissionAmount: 15,
      commissionRate: 0.15,
      createdAt: serverTimestamp(),
      status: "Pending",
    });

    console.log(`Test notification and booking created for ${providerEmail}`);
    return true;
  } catch (error) {
    console.error("Failed to create test data:", error);
    return false;
  }
};
// Express API for password reset flows backed by Firebase Admin and SMTP mailer.
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const nodemailer = require("nodemailer");
const admin = require("firebase-admin");

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:3000";

admin.initializeApp({
  // Use the default service account provided by the hosting runtime.
  credential: admin.credential.applicationDefault(),
  projectId: process.env.FIREBASE_PROJECT_ID,
});
const authAdmin = admin.auth();
const firestore = admin.firestore();

app.use(
  cors({
    origin: clientOrigin,
    credentials: true,
  })
);
app.use(express.json());

// Simple in-memory store for demo purposes.
const pendingResets = new Map();

const smtpConfig = {
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT || 587),
  secure: process.env.MAIL_SECURE === "true",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
};

// Fallback to a local JSON transport when SMTP is not configured to avoid connection errors in dev.
const useJsonTransport = !smtpConfig.host || !smtpConfig.auth.user || !smtpConfig.auth.pass;
const transporter = useJsonTransport
  ? nodemailer.createTransport({ jsonTransport: true })
  : nodemailer.createTransport(smtpConfig);

if (useJsonTransport) {
  console.warn(
    "[mail] MAIL_HOST / MAIL_USER / MAIL_PASS missing. Emails will be logged locally (json transport)."
  );
} else {
  transporter.verify((error) => {
    if (error) {
      console.warn(
        "[mail] Transport verification failed. Check your SMTP settings before going live.",
        error.message
      );
    } else {
      console.log("[mail] Ready to send messages.");
    }
  });
}

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getExpiryDate() {
  const minutes = Number(process.env.RESET_CODE_EXPIRY_MINUTES) || 10;
  return new Date(Date.now() + minutes * 60 * 1000);
}

const normalize = (value = "") =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

async function sendMailWithTimeout(options, timeoutMs = 8000) {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("MAIL_TIMEOUT")), timeoutMs)
  );
  return Promise.race([transporter.sendMail(options), timeoutPromise]);
}

app.post("/auth/reset/request", async (req, res) => {
  const { email } = req.body;

  if (!email || typeof email !== "string") {
    return res.status(400).json({ message: "Email is required." });
  }

  const code = generateCode();
  const expiresAt = getExpiryDate();
  pendingResets.set(email.toLowerCase(), { code, expiresAt });

  try {
    await transporter.sendMail({
      from: process.env.MAIL_USER,
      to: email,
      subject: "Your Allora Service Hub reset code",
      text: `Here is your password reset code: ${code}. It expires in 10 minutes.`,
      html: `<p>Use this code to reset your password:</p><p style="font-size:24px;font-weight:bold;letter-spacing:6px;">${code}</p><p>This code expires in 10 minutes.</p>`,
    });

    return res.json({ message: "Reset code sent." });
  } catch (error) {
    console.error("[mail] Unable to send reset code:", error.message);
    pendingResets.delete(email.toLowerCase());
    return res
      .status(500)
      .json({ message: "Could not send reset code. Please try again later." });
  }
});

app.post("/auth/reset/verify", (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ message: "Email and code are required." });
  }

  const record = pendingResets.get(email.toLowerCase());

  if (!record || record.code !== code || new Date() > record.expiresAt) {
    return res.status(400).json({ message: "Invalid or expired code." });
  }

  return res.json({ message: "Code verified." });
});

app.post("/auth/reset/complete", async (req, res) => {
  const { email, code, password } = req.body;

  if (!email || !code || !password) {
    return res
      .status(400)
      .json({ message: "Email, code and new password are required." });
  }

  if (password.length < 6) {
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters long." });
  }

  const record = pendingResets.get(email.toLowerCase());

  if (!record || record.code !== code || new Date() > record.expiresAt) {
    return res.status(400).json({ message: "Invalid or expired code." });
  }

  pendingResets.delete(email.toLowerCase());

  try {
    const userRecord = await authAdmin.getUserByEmail(email);
    await authAdmin.updateUser(userRecord.uid, { password });
    console.log(`[reset] Password updated for ${email}`);
  } catch (error) {
    console.error("[reset] Failed to update password:", error.message);
    if (error?.code === "auth/user-not-found") {
      return res.status(404).json({
        message: "No account exists with that email address.",
      });
    }
    return res.status(500).json({
      message:
        "Unable to update password right now. Please try again or contact support.",
    });
  }

  return res.json({ message: "Password updated." });
});

app.post("/auth/signup", async (req, res) => {
  const { firstName, lastName, dob, region, email, password } = req.body || {};

  if (!firstName || !lastName || !dob || !region || !email || !password) {
    return res
      .status(400)
      .json({ message: "All fields are required to create an account." });
  }

  if (password.length < 6) {
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters long." });
  }

  const mailPayload = {
    from: process.env.MAIL_USER,
    to: email,
    subject: "Welcome to Allora Service Hub",
    text: `Kia ora ${firstName},

Thanks for signing up to the Allora Service Hub. We have your region recorded as ${region}.

You can now log in using your email address.

Nga mihi,
Allora Support`,
    html: `<p>Kia ora ${firstName},</p>
        <p>Thanks for signing up to the <strong>Allora Service Hub</strong>.</p>
        <p>We have your region recorded as <strong>${region}</strong>. You can now log in using your email address.</p>
        <p style="margin-top:20px;">Nga mihi,<br/>Allora Support</p>`,
  };

  try {
    await sendMailWithTimeout(mailPayload);
    console.log(`[signup] Registered ${email} (${firstName} ${lastName}) from ${region}.`);
    return res.json({ message: "Signup successful. Welcome email sent." });
  } catch (error) {
    console.error("[signup] Welcome email issue:", error.message);
    console.log(`[signup] Registered ${email} (${firstName} ${lastName}) from ${region}, but email may be delayed.`);
    return res.json({
      message: "Signup successful. Welcome email may be delayed; please check your inbox shortly.",
    });
  }
});

app.post("/provider/approve", async (req, res) => {
  const { email, password, businessName, ownerName, category, phone, address } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required to approve a provider." });
  }

  let userRecord;
  try {
    userRecord = await authAdmin.createUser({
      email,
      password,
      displayName: businessName || ownerName || email,
    });
  } catch (error) {
    if (error.code === "auth/email-already-exists") {
      userRecord = await authAdmin.getUserByEmail(email);
    } else {
      console.error("[provider-approval] Failed to create user:", error.message);
      return res.status(500).json({ message: "Unable to create provider login right now." });
    }
  }

  try {
    const userDoc = {
      email,
      role: "Service Provider",
      businessName: businessName || "",
      ownerName: ownerName || "",
      category: category || "General",
      phone: phone || "",
      address: address || "",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await firestore.collection("users").doc(userRecord.uid).set(userDoc, { merge: true });
  } catch (error) {
    console.error("[provider-approval] Failed to write Firestore user:", error.message);
    return res.status(500).json({ message: "User created, but unable to save profile." });
  }

  const safeName = businessName || "your business";
  const mailPayload = {
    from: process.env.MAIL_USER,
    to: email,
    subject: "Your Allora provider account has been approved",
    text: `Kia ora,

Good news! Your provider registration for ${safeName} has been approved.

You can now sign in to the Allora Service Hub using the email and password you registered with.

Nga mihi,
Allora Support`,
    html: `<p>Kia ora,</p>
           <p>Good news! Your provider registration for <strong>${safeName}</strong> has been approved.</p>
           <p>You can now sign in to the <strong>Allora Service Hub</strong> using the email and password you registered with.</p>
           <p style="margin-top:20px;">Nga mihi,<br/>Allora Support</p>`,
  };

  let emailSent = false;
  try {
    await sendMailWithTimeout(mailPayload);
    emailSent = true;
  } catch (error) {
    console.warn("[provider-approval] User created, email failed:", error.message);
  }

  return res.json({ message: "Provider approved.", uid: userRecord.uid, emailSent });
});

app.post("/provider/notify-approval", async (req, res) => {
  const { email, businessName } = req.body || {};

  if (!email) {
    return res.status(400).json({ message: "Email is required to send a notification." });
  }

  const safeName = businessName || "your business";
  const mailPayload = {
    from: process.env.MAIL_USER,
    to: email,
    subject: "Your Allora provider account is active",
    text: `Kia ora,

Your provider registration for ${safeName} has been approved.

You can now sign in to the Allora Service Hub using the email and password you registered with.

Nga mihi,
Allora Support`,
    html: `<p>Kia ora,</p>
           <p>Your provider registration for <strong>${safeName}</strong> has been approved.</p>
           <p>You can now sign in to the <strong>Allora Service Hub</strong> using the email and password you registered with.</p>
           <p style="margin-top:20px;">Nga mihi,<br/>Allora Support</p>`,
  };

  try {
    await sendMailWithTimeout(mailPayload);
    return res.json({ message: "Approval notification sent." });
  } catch (error) {
    console.error("[provider-approval] Unable to send approval email:", error.message);
    return res.status(500).json({ message: "Could not send approval email." });
  }
});

app.post("/provider/register-notify", async (req, res) => {
  const { email, businessName, ownerName } = req.body || {};

  if (!email) {
    return res.status(400).json({ message: "Email is required." });
  }

  const safeName = businessName || "your business";
  const owner = ownerName || "you";
  const mailPayload = {
    from: process.env.MAIL_USER,
    to: email,
    subject: "We received your provider registration",
    text: `Kia ora ${owner},

Thanks for registering ${safeName} as a provider with the Allora Service Hub.
Your submission is pending review. We'll email you once it's approved.

Nga mihi,
Allora Support`,
    html: `<p>Kia ora ${owner},</p>
           <p>Thanks for registering <strong>${safeName}</strong> as a provider with the Allora Service Hub.</p>
           <p>Your submission is pending review. We'll email you once it's approved.</p>
           <p style="margin-top:20px;">Nga mihi,<br/>Allora Support</p>`,
  };

  try {
    await sendMailWithTimeout(mailPayload);
    return res.json({ message: "Registration email sent." });
  } catch (error) {
    console.warn("[provider-register] Failed to send registration email:", error.message);
    return res.status(500).json({ message: "Could not send email right now." });
  }
});

// Admin helper: clear all provider registration documents (and related notifications) in Firestore.
app.post("/provider/registrations/clear", async (_req, res) => {
  const batchSize = 400; // stay under Firestore's 500-mutation batch limit

  const deleteInChunks = async (collectionRef, description) => {
    let deleted = 0;
    while (true) {
      const snap = await collectionRef.limit(batchSize).get();
      if (snap.empty) break;
      const batch = firestore.batch();
      snap.docs.forEach((docSnap) => batch.delete(docSnap.ref));
      await batch.commit();
      deleted += snap.size;
      if (snap.size < batchSize) break;
    }
    console.log(`[provider-clear] Removed ${deleted} ${description}.`);
    return deleted;
  };

  try {
    const removedProviders = await deleteInChunks(
      firestore.collection("ServiceProvider"),
      "provider registrations"
    );
    const removedNotifications = await deleteInChunks(
      firestore.collection("Notification").where("type", "==", "provider-registration"),
      "provider registration notifications"
    );

    return res.json({
      message:
        removedProviders || removedNotifications
          ? "Provider registrations cleared."
          : "No provider registrations to clear.",
      removedProviders,
      removedNotifications,
    });
  } catch (error) {
    console.error("[provider-clear] Failed to clear provider registrations:", error);
    return res
      .status(500)
      .json({ message: "Unable to clear provider registrations right now." });
  }
});

app.post("/notifications/send", async (req, res) => {
  const { audience, channel, subject, message } = req.body || {};

  if (!subject || !message) {
    return res.status(400).json({ message: "Subject and message are required." });
  }

  const normalizedChannel = normalize(channel) || "email";
  const normalizedAudience = normalize(audience || "");
  let audienceLabel = "Service Providers";
  let wantedRoles = ["service provider", "provider", "service providers"];

  if (normalizedAudience.includes("support") || normalizedAudience.includes("agent")) {
    audienceLabel = "Customer Support";
    wantedRoles = [
      "customer support",
      "customer support agent",
      "support agent",
      "support team",
      "support",
      "agent",
    ];
  } else if (!normalizedAudience.includes("provider")) {
    return res
      .status(400)
      .json({ message: "Audience must be Service Providers or Customer Support agents." });
  }

  const roleMatchesAudience = (role = "") =>
    wantedRoles.some((allowed) => role === allowed || role.includes(allowed));

  let recipients = [];

  if (normalizedChannel === "email") {
    try {
      const snapshot = await firestore.collection("users").get();
      recipients = snapshot.docs
        .map((docSnap) => docSnap.data())
        .map((data) => {
          const email = data.email || data.Email || data.emailAddress;
          const role = normalize(data.role || data.Role || data.userType);
          if (!email) return null;
          if (roleMatchesAudience(role)) return email;
          return null;
        })
        .filter(Boolean);

      // Remove duplicates to avoid multiple sends to the same mailbox.
      recipients = Array.from(new Set(recipients));

      if (recipients.length === 0) {
        return res.status(400).json({ message: "No recipients found for this audience." });
      }
    } catch (error) {
      console.error("[notifications] Failed to fetch recipients", error.message);
      return res.status(500).json({ message: "Could not load recipients." });
    }
  }

  let status = "Sent";
  if (normalizedChannel === "email") {
    const mailPayload = {
      from: process.env.MAIL_USER,
      bcc: recipients,
      subject,
      text: message,
      html: `<p>${message.replace(/\n/g, "<br/>")}</p>`,
    };

    try {
      await sendMailWithTimeout(mailPayload);
    } catch (error) {
      console.error("[notifications] Failed to send email broadcast:", error.message);
      status = "Failed";
    }
  }

  try {
    await firestore.collection("Notification").add({
      audience: audienceLabel,
      channel: normalizedChannel === "in-app" ? "In-App" : "Email",
      subject,
      message,
      status,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.warn("[notifications] Could not write notification record:", error.message);
  }

  if (status === "Failed") {
    return res.status(500).json({ message: "Email broadcast failed to send." });
  }

  return res.json({ message: "Notification sent.", recipients: recipients.length });
});

app.post("/requests/notify", async (req, res) => {
  const { name, email, phone, city, service, providerEmail, details } = req.body || {};

  if (!name || !email || !service || !details) {
    return res.status(400).json({ message: "Name, email, service, and details are required." });
  }

  const recipient = providerEmail || process.env.MAIL_USER;
  if (!recipient) {
    return res.status(500).json({ message: "No provider email configured." });
  }

  const subject = `New request for ${service}`;
  const text = `A customer submitted a request.
Name: ${name}
Email: ${email}
Phone: ${phone || "Not provided"}
City: ${city || "Not provided"}
Service: ${service}

Details:
${details}
`;
  const html = `<p>A new customer request was submitted.</p>
    <p><strong>Name:</strong> ${name}<br/>
    <strong>Email:</strong> ${email}<br/>
    <strong>Phone:</strong> ${phone || "Not provided"}<br/>
    <strong>City:</strong> ${city || "Not provided"}<br/>
    <strong>Service:</strong> ${service}</p>
    <p><strong>Details:</strong><br/>${(details || "").replace(/\n/g, "<br/>")}</p>`;

  try {
    await sendMailWithTimeout({
      from: process.env.MAIL_USER,
      to: recipient,
      subject,
      text,
      html,
      replyTo: email,
    });
    return res.json({ message: "Request sent." });
  } catch (error) {
    console.error("[request-notify] Failed to send request email:", error.message);
    return res.status(500).json({ message: "Could not send request to provider." });
  }
});

app.post("/support/create", async (req, res) => {
  const { email, name, password, status } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  try {
    const userRecord = await authAdmin.createUser({
      email: email.trim().toLowerCase(),
      password,
      displayName: name || "Customer Support",
      emailVerified: true,
    });

    await authAdmin.setCustomUserClaims(userRecord.uid, { role: "customer_support" });

    await firestore.collection("users").doc(userRecord.uid).set({
      name: name || "Customer Support",
      email: email.trim(),
      role: "Customer Support",
      status: status || "Active",
      joinedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const safeName = name || "there";
    const mailPayload = {
      from: process.env.MAIL_USER,
      to: email,
      subject: "You have been added as Customer Support",
      text: `Kia ora ${safeName},

You've been added as a Customer Support member for the Allora Service Hub.

Your temporary password is: ${password}

You can sign in now and change it from your profile page. If you forget it, request a reset using this email on the login page.

Nga mihi,
Allora Team`,
      html: `<p>Kia ora ${safeName},</p>
             <p>You've been added as a <strong>Customer Support</strong> member for the Allora Service Hub.</p>
             <p><strong>Your temporary password is:</strong> ${password}</p>
             <p>You can sign in now and change it from your profile page. If you forget it, request a reset using this email on the login page.</p>
             <p style="margin-top:20px;">Nga mihi,<br/>Allora Team</p>`,
    };

    try {
      await sendMailWithTimeout(mailPayload);
    } catch (mailError) {
      console.warn("[support-create] User created, email failed:", mailError.message);
      return res
        .status(200)
        .json({ message: "Support member created, but email failed to send.", uid: userRecord.uid });
    }

    return res.json({ message: "Support member created and notified.", uid: userRecord.uid });
  } catch (error) {
    console.error("[support-create] Failed to create support user:", error.message);
    const status = error.code === "auth/email-already-exists" ? 409 : 500;
    return res.status(status).json({ message: error.message || "Unable to create support user." });
  }
});

app.post("/support/notify-created", async (req, res) => {
  const { email, name } = req.body || {};

  if (!email) {
    return res.status(400).json({ message: "Email is required to notify the support member." });
  }

  const safeName = name || "there";
  const mailPayload = {
    from: process.env.MAIL_USER,
    to: email,
    subject: "You have been added as Customer Support",
    text: `Kia ora ${safeName},

You've been added as a Customer Support member for the Allora Service Hub.

You can now sign in with your support credentials. If you don't have a password yet, request a reset on the login page using this email.

Nga mihi,
Allora Team`,
    html: `<p>Kia ora ${safeName},</p>
           <p>You've been added as a <strong>Customer Support</strong> member for the Allora Service Hub.</p>
           <p>You can now sign in with your support credentials. If you don't have a password yet, request a reset on the login page using this email.</p>
           <p style="margin-top:20px;">Nga mihi,<br/>Allora Team</p>`,
  };

  try {
    await sendMailWithTimeout(mailPayload);
    return res.json({ message: "Support welcome email sent." });
  } catch (error) {
    console.error("[support-notify] Unable to send support welcome email:", error.message);
    return res.status(500).json({ message: "Could not send support welcome email." });
  }
});
app.listen(port, () => {
  console.log(`Password reset service running on http://localhost:${port}`);
});


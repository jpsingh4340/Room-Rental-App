// Service provider and service CRUD helpers with seed data, local caching, and Firestore sync.
import { addDoc, collection, deleteDoc, doc, getDocs, limit, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { db, ensureFirebaseAuth } from "./firebase";

const PROVIDER_KEY = "allora_service_providers";
const SERVICE_KEY = "allora_services";

const randomId = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random()}`);

const seedProviders = [
  {
    id: "sp-seed-1",
    providerId: "SP-001",
    businessName: "Acme Home Services",
    ownerName: "Priya Rao",
    email: "hello@acmehome.nz",
    phone: "+64 21 111 1111",
    address: "12 Garden Lane, Auckland",
    category: "Home Services",
    status: "Active",
  },
  {
    id: "sp-seed-2",
    providerId: "SP-002",
    businessName: "Pixel Perfect Studio",
    ownerName: "Leo Martins",
    email: "projects@pixelperfect.nz",
    phone: "+64 21 222 2222",
    address: "88 K Road, Auckland",
    category: "Technology",
    status: "Pending",
  },
];

const seedServices = [
  {
    id: "svc-seed-1",
    serviceId: "SV-100",
    serviceName: "Deep Clean (3BR)",
    description: "Full house clean with kitchen and bathroom detailing.",
    price: "180",
    duration: "3 hours",
    category: "Home Services",
    providerId: "SP-001",
    available: true,
  },
  {
    id: "svc-seed-2",
    serviceId: "SV-200",
    serviceName: "Website Sprint",
    description: "Launch-ready marketing site in 7 days with CMS handoff.",
    price: "2400",
    duration: "1 week",
    category: "Technology",
    providerId: "SP-002",
    available: true,
  },
];

const readStore = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return [...fallback];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [...fallback];
  } catch {
    return [...fallback];
  }
};

const writeStore = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore write errors (private mode, etc.)
  }
};

const mapFirestoreDocs = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));
// Service provider records must live in the primary Firestore collection below.
const providerCollections = ["ServiceProvider"];

const getProviderCollectionRef = (name) => collection(db, name);

const resolveProviderCollection = async () => {
  const name = providerCollections[0];
  const ref = getProviderCollectionRef(name);
  // Verify the collection is reachable; surface errors to the caller so registration cannot silently fall back.
  const snap = await getDocs(query(ref, limit(1)));
  return { ref, name, hasDocs: !snap.empty };
};

// Ensure we never persist raw passwords alongside provider profiles.
const scrubProviderSecrets = (provider = {}) => {
  const { password: _password, ...rest } = provider;
  return rest;
};

export const getServiceProviders = async () => {
  if (db) {
    try {
      await ensureFirebaseAuth();
      const { ref } = await resolveProviderCollection();
      const MAX_PROVIDERS = 200;
      const snap = await getDocs(query(ref, limit(MAX_PROVIDERS)));
      return mapFirestoreDocs(snap);
    } catch (error) {
      console.warn("[ServiceProviderCRUD] Falling back to local storage for providers", error);
    }
  }
  return readStore(PROVIDER_KEY, seedProviders);
};

export const addServiceProvider = async (provider) => {
  if (!db) {
    throw new Error("Firebase is not configured. Provider registrations must be saved to Firestore.");
  }

  try {
    await ensureFirebaseAuth();
    const { ref, name } = await resolveProviderCollection();
    const safeProvider = scrubProviderSecrets(provider);
    const submittedAt = serverTimestamp();
    const payload = {
      ...safeProvider,
      providerId: safeProvider.providerId || `SP-${Date.now()}`,
      status: safeProvider.status || "Pending",
      submittedAt,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(ref, payload);

    // Notify admins of new pending provider registration
    if (payload.status === "Pending") {
      try {
        await addDoc(collection(db, "Notification"), {
          audience: "Administrators",
          channel: "In-App",
          subject: "New Provider Registration",
          message: `${payload.businessName || payload.ownerName || "A new provider"} has registered and is pending approval.`,
          status: "Sent",
          sentAt: submittedAt,
          providerEmail: (payload.email || "").toLowerCase(),
          providerId: payload.providerId || payload.provider_id || "",
          type: "provider-registration",
        });
      } catch (notifyError) {
        console.warn("[ServiceProviderCRUD] Failed to send admin notification", notifyError);
      }
    }

    return { id: docRef.id, collection: name, ...payload };
  } catch (error) {
    console.error("[ServiceProviderCRUD] Failed to add provider to Firestore", error);
    throw error;
  }
};

export const updateServiceProvider = async (id, updates) => {
  if (db) {
    try {
      await ensureFirebaseAuth();
      const { name } = await resolveProviderCollection();
      const safeUpdates = scrubProviderSecrets(updates);
      await updateDoc(doc(db, name, id), { ...safeUpdates, updatedAt: serverTimestamp() });
      return { id, ...updates };
    } catch (error) {
      console.warn("[ServiceProviderCRUD] Failed to update provider in Firestore, trying local storage", error);
    }
  }

  const list = readStore(PROVIDER_KEY, seedProviders);
  const idx = list.findIndex((item) => item.id === id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...updates };
    writeStore(PROVIDER_KEY, list);
    return list[idx];
  }
  return null;
};

export const deleteServiceProvider = async (id) => {
  if (db) {
    try {
      await ensureFirebaseAuth();
      const { name } = await resolveProviderCollection();
      await deleteDoc(doc(db, name, id));
      return true;
    } catch (error) {
      console.warn("[ServiceProviderCRUD] Failed to delete provider from Firestore, trying local storage", error);
    }
  }

  const list = readStore(PROVIDER_KEY, seedProviders).filter((item) => item.id !== id);
  writeStore(PROVIDER_KEY, list);
  return true;
};

// Clear locally stored provider registrations (used when Firebase is not configured).
export const clearLocalServiceProviders = () => {
  writeStore(PROVIDER_KEY, []);
  return true;
};

export const getServices = async () => readStore(SERVICE_KEY, seedServices);

export const addService = async (service) => {
  const list = readStore(SERVICE_KEY, seedServices);
  const record = { id: randomId(), ...service };
  list.push(record);
  writeStore(SERVICE_KEY, list);
  return record;
};

export const updateService = async (id, updates) => {
  const list = readStore(SERVICE_KEY, seedServices);
  const idx = list.findIndex((item) => item.id === id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...updates };
    writeStore(SERVICE_KEY, list);
    return list[idx];
  }
  return null;
};

export const deleteService = async (id) => {
  const list = readStore(SERVICE_KEY, seedServices).filter((item) => item.id !== id);
  writeStore(SERVICE_KEY, list);
  return true;
};

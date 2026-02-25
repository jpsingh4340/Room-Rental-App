// Utilities for calculating commissions, storing bookings locally, and syncing records to Firestore.
import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp } from "firebase/firestore";
import { db, ensureFirebaseAuth } from "./firebase";

const BOOKINGS_KEY = "allora_bookings";
const FALLBACK_STORE = [];
export const COMMISSION_RATE = 0.1;

const canUseLocalStorage = () => {
  try {
    return typeof localStorage !== "undefined";
  } catch {
    return false;
  }
};

const randomId = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `bk-${Date.now()}-${Math.random().toString(16).slice(2)}`);

export const parsePrice = (value) => {
  const numeric = parseFloat(String(value || "").replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return numeric;
};

export const calculateCommission = (basePrice, rate = COMMISSION_RATE) => {
  const price = parsePrice(basePrice);
  const commissionRate = Number.isFinite(rate) ? rate : COMMISSION_RATE;
  const commissionAmount = Math.round(price * commissionRate * 100) / 100;
  const totalPrice = Math.round((price + commissionAmount) * 100) / 100;
  const providerShare = Math.round(price * 100) / 100;
  return {
    basePrice: price,
    commissionRate,
    commissionAmount,
    totalPrice,
    providerShare,
  };
};

const readStore = () => {
  if (!canUseLocalStorage()) return [...FALLBACK_STORE];
  try {
    const raw = localStorage.getItem(BOOKINGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeStore = (list) => {
  if (!canUseLocalStorage()) {
    FALLBACK_STORE.length = 0;
    FALLBACK_STORE.push(...list);
    return;
  }
  try {
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(list));
  } catch {
    // Ignore write errors (private mode, etc.)
  }
};

const bookingCollections = ["Order", "Orders", "Bookings"];

const resolveBookingCollection = async () => {
  if (!db) return null;
  for (const name of bookingCollections) {
    try {
      const ref = collection(db, name);
      const snap = await getDocs(query(ref, limit(1)));
      return { ref, name, hasDocs: !snap.empty };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(`[Bookings] Cannot access collection ${name}, trying next`, error);
    }
  }
  return { ref: collection(db, bookingCollections[0]), name: bookingCollections[0], hasDocs: false };
};

const normalizeBookingDoc = (docSnap) => {
  const data = docSnap.data() || {};
  const createdAtRaw = data.createdAt;
  const createdMillis =
    typeof createdAtRaw?.toMillis === "function"
      ? createdAtRaw.toMillis()
      : Date.parse(createdAtRaw || "") || Date.now();
  return {
    id: docSnap.id,
    ...data,
    createdAt: new Date(createdMillis).toISOString(),
    createdAtMs: createdMillis,
  };
};

export const getBookings = async () => {
  if (db) {
    try {
      await ensureFirebaseAuth();
      const resolved = await resolveBookingCollection();
      if (resolved?.ref) {
        const MAX_BOOKINGS = 200;
        let snap;
        try {
          snap = await getDocs(
            query(resolved.ref, orderBy("createdAt", "desc"), limit(MAX_BOOKINGS))
          );
        } catch (orderErr) {
          snap = await getDocs(query(resolved.ref, limit(MAX_BOOKINGS)));
          // eslint-disable-next-line no-console
          console.warn("[Bookings] Could not order by createdAt, returning unordered results", orderErr);
        }
        return snap.docs.map(normalizeBookingDoc);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("[Bookings] Falling back to local storage", error);
    }
  }
  return readStore();
};

export const addBooking = async (booking) => {
  const amounts = calculateCommission(
    booking?.basePrice ?? booking?.price ?? booking?.totalPrice ?? 0,
    booking?.commissionRate ?? COMMISSION_RATE
  );

  const record = {
    id: booking?.id || randomId(),
    status: booking?.status || "Booked",
    createdAt: booking?.createdAt || new Date().toISOString(),
    ...booking,
    ...amounts,
  };

  if (db) {
    try {
      await ensureFirebaseAuth();
      const resolved = await resolveBookingCollection();
      if (resolved?.ref) {
        const payload = {
          ...record,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        const docRef = await addDoc(resolved.ref, payload);
        return { ...record, id: docRef.id };
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("[Bookings] Failed to write to Firestore, using local storage", error);
    }
  }

  const list = readStore();
  list.unshift(record);
  writeStore(list);
  return record;
};

export const summarizeBookings = (bookings = []) =>
  bookings.reduce(
    (acc, booking) => {
      const commission = parsePrice(booking.commissionAmount);
      const providerShare = parsePrice(
        booking.providerShare ?? booking.basePrice ?? 0
      );
      const totalPrice = parsePrice(booking.totalPrice ?? booking.basePrice);
      acc.adminTotal += commission;
      acc.providerTotal += providerShare;
      acc.totalVolume += totalPrice;
      return acc;
    },
    { adminTotal: 0, providerTotal: 0, totalVolume: 0 }
  );

export const formatCurrency = (value) =>
  `$${parsePrice(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// Helper to normalize Firestore timestamps into sortable display-friendly objects.
export const formatSnapshotTimestamp = (value, fallback = "") => {
  if (!value) {
    return { display: fallback, order: 0 };
  }
  if (typeof value?.toMillis === "function") {
    const dateValue = value.toDate();
    return { display: dateValue.toLocaleString(), order: value.toMillis() };
  }
  const parsed = Date.parse(value);
  return {
    display: typeof value === "string" ? value : fallback,
    order: Number.isNaN(parsed) ? 0 : parsed,
  };
};

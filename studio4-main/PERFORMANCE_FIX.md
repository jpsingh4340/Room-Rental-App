# Admin Dashboard Performance Fix

## Problem
Your admin page is loading **all data at once** from Firebase without pagination or limits. This causes:
- Slow initial load (fetching thousands of documents)
- High memory usage
- Laggy UI when rendering large tables
- Expensive real-time listeners on entire collections

## Solution: Add Query Limits & Pagination

### Quick Fix (5 minutes)
Replace the Firestore listeners to limit initial data:

```javascript
// BEFORE (loads everything)
return onSnapshot(collection(db, "users"), (snapshot) => {
  setCustomers(snapshot.docs.map(...));
});

// AFTER (loads first 50, then paginate)
return onSnapshot(
  query(collection(db, "users"), limit(50)),
  (snapshot) => {
    setCustomers(snapshot.docs.map(...));
  }
);
```

### Implementation Steps

1. **Add limit() to all collection queries:**
   - Users: limit(50)
   - Services: limit(100)
   - Notifications: limit(50)
   - Tickets: limit(50)

2. **Add "Load More" buttons** for tables that exceed limits

3. **Lazy load sections** - only fetch data when admin clicks into that section

### Files to Update
- `src/pages/Admin/AdminDashboard.js` - Main dashboard
- `src/pages/Admin/ManageUsers.js` - User management page

### Expected Improvements
- Initial load: 5-10 seconds → 1-2 seconds
- Memory usage: 50-70% reduction
- UI responsiveness: Immediate

## Don't Delete Firebase Data
Deleting data won't fix the performance issue. The problem is in how the code loads data, not the data itself.

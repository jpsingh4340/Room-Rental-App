# Code Snippets for Provider Notifications

## Copy-Paste Ready Code

### Snippet 1: Update ProviderDashboard.js - State Initialization

**Location**: Around line 48, after `const [message, setMessage] = useState(...)`

**BEFORE:**
```javascript
// Original message state and default overview tab
const [message, setMessage] = useState({ type: "", text: "" });
const [activeView, setActiveView] = useState("overview");
```

**AFTER:**
```javascript
// Message state plus view initialized from tab query param
const [message, setMessage] = useState({ type: "", text: "" });
const searchParams = new URLSearchParams(window.location.search);
const initialTab = searchParams.get("tab") || "overview";
const [activeView, setActiveView] = useState(initialTab);
```

---

### Snippet 2: Add URL Parameter Listener

**Location**: Before the first `useEffect(() => { fetchProviders();...` block

**ADD THIS NEW useEffect:**
```javascript
// Listen for tab query param changes and sync activeView
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get("tab");
  if (tab) {
    setActiveView(tab);
  }
}, [window.location.search]);
```

---

## Complete Updated Sections

### Complete State Section (ProviderDashboard.js)

```javascript
// Full provider dashboard state setup, including tab from URL
export default function ServiceProviderDashboard() {
  const [providers, setProviders] = useState([]);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [providerFormData, setProviderFormData] = useState({
    providerId: "",
    businessName: "",
    ownerName: "",
    email: "",
    phone: "",
    address: "",
    category: "Home Services",
    status: "Pending"
  });

  const [services, setServices] = useState([]);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [serviceFormData, setServiceFormData] = useState({
    serviceId: "",
    serviceName: "",
    description: "",
    price: "",
    duration: "",
    category: "Home Services",
    providerId: "",
    available: true
  });
  const [editingServiceId, setEditingServiceId] = useState(null);

  const [message, setMessage] = useState({ type: "", text: "" });
  const searchParams = new URLSearchParams(window.location.search);
  const initialTab = searchParams.get("tab") || "overview";
  const [activeView, setActiveView] = useState(initialTab);
  const [bookings, setBookings] = useState([]);
  const [providerNotifications, setProviderNotifications] = useState([]);
  const [lastSeenProviderNotifications, setLastSeenProviderNotifications] = useState(() => {
    const stored = localStorage.getItem("provider-notifications-last-seen");
    return stored ? Number(stored) : 0;
  });
  const [providerHiddenBefore, setProviderHiddenBefore] = useState(() => {
    const stored = localStorage.getItem("provider-notifications-hidden-before");
    return stored ? Number(stored) : 0;
  });
  const [newNotificationBanner, setNewNotificationBanner] = useState(null);
  const [currentEmail, setCurrentEmail] = useState("");

  const [providerProfile, setProviderProfile] = useState(null);
  const [bookingView, setBookingView] = useState("all");

  const [providerUnreadCount, setProviderUnreadCount] = useState(0);
  const [selectedNotification, setSelectedNotification] = useState(null);
  
  // ... rest of component
}
```

---

### Complete useEffect Section (ProviderDashboard.js)

```javascript
// URL parameter listener - ADD THIS FIRST
// Keeps activeView aligned with ?tab value for deep-linking
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get("tab");
  if (tab) {
    setActiveView(tab);
  }
}, [window.location.search]);

// Existing useEffect - KEEP THIS
// Fetch providers/services and auth email on mount; clean up listeners on unmount
useEffect(() => {
  fetchProviders();
  let unsubscribeServices;
  const handleFocus = () => {
    fetchServices().then((unsub) => {
      unsubscribeServices = unsub;
    });
  };
  
  window.addEventListener("focus", handleFocus);
  handleFocus(); 

  const unsubAuth = auth?.onAuthStateChanged?.((user) => {
    setCurrentEmail(user?.email || "");
  });

  return () => {
    if (unsubscribeServices) unsubscribeServices();
    if (unsubAuth) unsubAuth();
    window.removeEventListener("focus", handleFocus);
  };
}, []);

// ... rest of useEffects remain the same
```

---

## NavigationBar.js Changes

### Change 1: Remove Conditional Wrapper

**BEFORE:**
```javascript
// Conditional notification wrapper hiding bell for provider view
<div className="nav-support-actions">
  {/* Bell/notifications hidden for provider view */}
  {!isProviderView && (
    <div className="nav-notification-wrapper">
      {/* notification bell code */}
    </div>
  )}
  {/* Menu icon removed per request */}
  <button type="button" className="dashboard-nav-link nav-support-logout" onClick={handleLogout}>
```

**AFTER:**
```javascript
// Always show notification wrapper alongside logout button
<div className="nav-support-actions">
  <div className="nav-notification-wrapper">
    {/* notification bell code */}
  </div>
  <button type="button" className="dashboard-nav-link nav-support-logout" onClick={handleLogout}>
```

---

### Change 2: Update handleNotificationsClick

**BEFORE:**
```javascript
// Collapse nav and toggle notification list for non-admin/agent users
const handleNotificationsClick = () => {
  setIsNavCollapsed(true);
  if (!isAdminView && !isAgentView) {
    setShowNotificationList((open) => !open);
  }
  if (typeof onNotificationsViewed === "function") {
    onNotificationsViewed();
  }
  if (isAdminView || isAgentView) {
    // ... admin/agent logic
  }
};
```

**AFTER:**
```javascript
// Collapse nav, notify parent, and route to role-specific notification target
const handleNotificationsClick = () => {
  setIsNavCollapsed(true);
  if (typeof onNotificationsViewed === "function") {
    onNotificationsViewed();
  }
  
  const pathname = location.pathname;
  const isProviderView = pathname.startsWith("/provider");
  const isAdminView = pathname.startsWith("/admin");
  const isAgentView = pathname.startsWith("/agent-dashboard");
  
  if (isProviderView) {
    const onProviderDashboard = pathname.startsWith("/provider/dashboard");
    if (onProviderDashboard) {
      navigate("/provider/dashboard?tab=notifications");
    }
  } else if (!isAdminView && !isAgentView) {
    setShowNotificationList((open) => !open);
  } else if (isAdminView || isAgentView) {
    const targetSearch = "?target=notifications";
    const onAdminDashboard = isAdminView && pathname.startsWith("/admin/dashboard");
    if (onAdminDashboard) {
      const panel = document.getElementById("admin-notifications-panel");
      if (panel) {
        panel.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      if (location.search !== targetSearch) {
        navigate(`/admin/dashboard${targetSearch}`);
      }
    } else {
      navigate(`/admin/dashboard${targetSearch}`);
    }
  }
};
```

---

## Testing Code

### Test Notification Creation (Run in Browser Console)

```javascript
// Test creating a notification
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

const testNotification = async () => {
  try {
    await addDoc(collection(db, "Notification"), {
      audience: "Service Providers",
      providerEmail: "provider@example.com", // Change to actual provider email
      subject: "Test Notification",
      message: "This is a test notification from the console",
      status: "New",
      sentAt: serverTimestamp(),
      sentBy: "Administrator",
      channel: "In-App"
    });
    console.log("Test notification created successfully!");
  } catch (error) {
    console.error("Error creating test notification:", error);
  }
};

testNotification();
```

---

## Verification Checklist

```javascript
// Quick console checks for notification data, URL params, and localStorage
console.log("Notifications:", providerNotifications);
console.log("Unread count:", providerUnreadCount);
console.log("Current email:", currentEmail);

// Check URL parameters
console.log("URL params:", new URLSearchParams(window.location.search).get("tab"));

// Check localStorage
console.log("Last seen:", localStorage.getItem("provider-notifications-last-seen"));
console.log("Hidden before:", localStorage.getItem("provider-notifications-hidden-before"));
```

---

## Common Issues & Fixes

### Issue: Notification bell not showing

**Check:**
```javascript
// Confirm provider dashboard route before expecting bell visibility
// In browser console
console.log("Is provider view:", location.pathname.startsWith("/provider"));
console.log("Is on dashboard:", location.pathname.startsWith("/provider/dashboard"));
```

**Fix:** Verify NavigationBar.js was updated correctly

---

### Issue: Notifications not appearing

**Check:**
```javascript
// Inspect notifications state, user email, and Firestore targeting fields
// In browser console
console.log("Provider notifications:", providerNotifications);
console.log("Current email:", currentEmail);

// In Firestore console
// Check Notification collection for documents with:
// - providerEmail matching current email (lowercase)
// - audience containing "provider"
```

**Fix:** Verify notification was created with correct fields

---

### Issue: Count not updating

**Check:**
```javascript
// Inspect unread count, timestamps, and ensure onSnapshot listener is active
// In browser console
console.log("Unread count:", providerUnreadCount);
console.log("Last seen timestamp:", lastSeenProviderNotifications);

// Check if listener is active
// Look for "onSnapshot" in Network tab
```

**Fix:** Refresh page or check Firestore connection

---

## Summary

✅ **NavigationBar.js** - Already updated (file rewritten)
⏳ **ProviderDashboard.js** - Needs 2 small changes (copy-paste snippets above)

Total changes needed: ~15 lines of code
Time to implement: ~5 minutes

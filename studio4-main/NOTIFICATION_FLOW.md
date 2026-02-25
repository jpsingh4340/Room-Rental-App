# Provider Notification Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ADMIN DASHBOARD                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ SendNotification Component                           │   │
│  │ - Select Provider                                    │   │
│  │ - Enter Subject & Message                            │   │
│  │ - Click "Send Message"                               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    Firestore Write
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              FIRESTORE DATABASE                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Notification Collection                              │   │
│  │ {                                                    │   │
│  │   audience: "Service Providers",                     │   │
│  │   providerEmail: "provider@email.com",               │   │
│  │   subject: "...",                                    │   │
│  │   message: "...",                                    │   │
│  │   sentAt: Timestamp,                                 │   │
│  │   sentBy: "Administrator"                            │   │
│  │ }                                                    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    Firestore Listener
                    (onSnapshot)
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              PROVIDER DASHBOARD                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ NavigationBar                                        │   │
│  │ ┌────────────────────────────────────────────────┐   │   │
│  │ │ 🔔 Notification Bell                           │   │   │
│  │ │ Badge: 1 (unread count)                        │   │   │
│  │ │ Click → Navigate to Notifications Tab          │   │   │
│  │ └────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Notifications Tab                                    │   │
│  │ ┌────────────────────────────────────────────────┐   │   │
│  │ │ Subject: "..."                                 │   │   │
│  │ │ Message: "..."                                 │   │   │
│  │ │ Channel: In-App                                │   │   │
│  │ │ Sent: 2024-01-15 10:30 AM                      │   │   │
│  │ └────────────────────────────────────────────────┘   │   │
│  │ ┌────────────────────────────────────────────────┐   │   │
│  │ │ [More notifications...]                        │   │   │
│  │ └────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Admin Sends Notification
```
Admin Dashboard
    ↓
SendNotification Component
    ↓
Form Submission
    ↓
addDoc(collection(db, "Notification"), {
  audience: "Service Providers",
  providerEmail: provider@email.com,
  subject: "...",
  message: "...",
  sentAt: serverTimestamp(),
  sentBy: "Administrator"
})
    ↓
Firestore Database
```

### 2. Provider Receives Notification
```
Provider Logs In
    ↓
ProviderDashboard Mounts
    ↓
onSnapshot Listener Activated
    ↓
Query: WHERE providerEmail == currentEmail
       AND audience CONTAINS "provider"
    ↓
Notifications Fetched
    ↓
State Updated: providerNotifications
    ↓
Unread Count Calculated
    ↓
NavigationBar Updated with Badge
    ↓
Notifications Tab Populated
```

### 3. Real-time Updates
```
New Notification Sent
    ↓
Firestore Listener Triggered
    ↓
onSnapshot Callback Fires
    ↓
New Notification Added to State
    ↓
UI Re-renders
    ↓
Provider Sees New Message Instantly
```

## Component Interactions

```
NavigationBar
├── Displays notification bell
├── Shows unread count badge
├── Handles click → navigate to notifications tab
└── Receives props from ProviderDashboard:
    ├── notificationCount (unread count)
    ├── notifications (array of notification objects)
    └── onNotificationsViewed (callback)

ProviderDashboard
├── Manages notification state
├── Sets up Firestore listener
├── Calculates unread count
├── Renders Notifications tab
└── Passes data to NavigationBar
```

## State Management

```
ProviderDashboard State:
├── providerNotifications: [] (all notifications)
├── providerUnreadCount: 0 (unread count)
├── lastSeenProviderNotifications: timestamp (for tracking read status)
├── providerHiddenBefore: timestamp (for clearing notifications)
├── newNotificationBanner: object (latest notification)
└── activeView: "notifications" (current tab)

LocalStorage:
├── provider-notifications-last-seen: timestamp
└── provider-notifications-hidden-before: timestamp
```

## URL Navigation

```
User clicks notification bell
    ↓
handleNotificationsClick() triggered
    ↓
navigate("/provider/dashboard?tab=notifications")
    ↓
URL changes to include ?tab=notifications
    ↓
useEffect watches window.location.search
    ↓
Extracts tab parameter
    ↓
setActiveView("notifications")
    ↓
Notifications tab becomes active
```

## Notification Filtering

Notifications are filtered by:
1. **providerEmail** - Must match logged-in user's email (lowercase)
2. **audience** - Must contain "provider" or "service provider"
3. **channel** - Must contain "app", "in-app", or "email"
4. **visibility** - Hidden before timestamp is excluded

## Key Features

✅ **Real-time** - Firestore listeners provide instant updates
✅ **Persistent** - Notifications stored in Firestore
✅ **Unread Tracking** - Badge shows unread count
✅ **Clear Function** - Providers can clear all notifications
✅ **Banner Alert** - New notifications show as alert
✅ **Tab Navigation** - Direct link to notifications tab
✅ **Responsive** - Works on all screen sizes
✅ **Accessible** - Proper ARIA labels and semantic HTML

## Performance Considerations

- Firestore listener only queries notifications for current provider
- Notifications limited to 30 most recent in display
- Unread count calculated efficiently
- LocalStorage used for persistence
- No unnecessary re-renders with proper dependency arrays

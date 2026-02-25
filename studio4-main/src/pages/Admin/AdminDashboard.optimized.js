// Reference notes for an optimized AdminDashboard that adds query limits to Firestore listeners.
// OPTIMIZED VERSION - Replace the useEffect hooks with these versions
// This adds query limits to prevent loading all data at once

// 1. Users listener - REPLACE the existing users useEffect
useEffect(() => {
  if (!db) return undefined;
  return onSnapshot(
    query(collection(db, "users"), limit(50)),
    (snapshot) => {
      const allDocs = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        const role = data.role || data.Role || data.userType || "Customer";
        const status = data.status || data.Status || data.accountStatus || "Active";
        const joinedRaw = data.joinedAt || data.Joined || data.joined || "";
        const { display } = formatSnapshotTimestamp(
          joinedRaw,
          joinedRaw || new Date().toISOString().slice(0, 10)
        );
        return {
          id: docSnap.id,
          name: deriveDisplayName(data),
          email: data.email || data.Email || data.emailAddress || "",
          role,
          status,
          joinedAt: display,
        };
      });
      setCustomers(allDocs);
    }
  );
}, []);

// 2. Services listener - REPLACE the existing services useEffect
useEffect(() => {
  if (!db) return undefined;
  return onSnapshot(
    query(collection(db, SERVICE_COLLECTION), limit(100)),
    (snapshot) => {
      const docs = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        const { display: submittedAtDisplay } = formatSnapshotTimestamp(
          data.submittedAt,
          data.submittedAt || ""
        );
        return { id: docSnap.id, ...data, submittedAtDisplay };
      });
      setServices(docs);
      setListings(docs);
    }
  );
}, []);

// 3. Tickets listener - REPLACE the existing tickets useEffect
useEffect(() => {
  if (!db) return undefined;
  const ticketsQuery = query(
    collection(db, "tickets"),
    orderBy("createdAt", "desc"),
    limit(50)
  );
  return onSnapshot(ticketsQuery, (snapshot) => {
    const docs = snapshot.docs
      .map((docSnap) => {
        const data = docSnap.data();
        const { display, order } = formatSnapshotTimestamp(
          data.createdAt,
          data.createdAt || new Date().toISOString().slice(0, 10)
        );
        return {
          id: docSnap.id,
          subject: data.subject || "Untitled",
          customer: data.customer || "Unknown",
          priority: data.priority || "Low",
          status: data.status || "Open",
          createdAt: display,
          _order: order,
        };
      })
      .sort((a, b) => b._order - a._order)
      .map(({ _order, ...rest }) => rest);
    setIssues(docs);
  });
}, []);

// 4. Notifications listener - REPLACE the existing notifications useEffect
useEffect(() => {
  if (!db) return undefined;
  return onSnapshot(
    query(
      collection(db, "Notification"),
      orderBy("sentAt", "desc"),
      limit(50)
    ),
    (snapshot) => {
      const docs = snapshot.docs
        .map((docSnap) => {
          const data = docSnap.data();
          const { display, order } = formatSnapshotTimestamp(data.sentAt, "");
          return {
            id: docSnap.id,
            subject: data.subject || "",
            message: data.message || "",
            audience: data.audience || "",
            channel: data.channel || "Email",
            status: data.status || "Sent",
            sentAt: display,
            sentOrder: order,
          };
        })
        .sort((a, b) => b.sentOrder - a.sentOrder);
      setNotifications(docs);
    }
  );
}, []);

// 5. ServiceProvider listener - REPLACE the existing provider useEffect
useEffect(() => {
  if (db) {
    const unsub = onSnapshot(
      query(collection(db, "ServiceProvider"), limit(100)),
      (snapshot) => {
        const docs = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          const { display: submittedAtDisplay, order: submittedOrder } = formatSnapshotTimestamp(
            data.createdAt || data.submittedAt,
            data.createdAt || data.submittedAt || ""
          );
          return {
            id: docSnap.id,
            providerId: data.providerId || data.providerID || data.id || docSnap.id,
            businessName: data.businessName || data.provider || "Provider",
            ownerName: data.ownerName || data.owner || "",
            email: data.email || "",
            phone: data.phone || "",
            address: data.address || "",
            category: data.category || "General",
            status: data.status || "Pending",
            userId: data.userId || data.uid || "",
            submittedAt: submittedAtDisplay,
            _order: submittedOrder || 0,
          };
        });
        setProviderRegistrations(docs.sort((a, b) => (b._order || 0) - (a._order || 0)));
      }
    );
    return () => unsub();
  }

  const refreshProviderRegistrations = async () => {
    const list = await getServiceProviders();
    setProviderRegistrations(list);
  };
  refreshProviderRegistrations();
}, []);

// 6. Categories listener - REPLACE the existing categories useEffect
useEffect(() => {
  if (!db) return undefined;
  return onSnapshot(
    query(collection(db, "Category"), limit(100)),
    (snapshot) => {
      setCategories(
        snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            name: data.name || "Unnamed",
            servicesCount: data.servicesCount ?? 0,
            visible: data.visible ?? true,
          };
        })
      );
    }
  );
}, []);

// 7. ServiceCategories listener - REPLACE the existing service categories useEffect
useEffect(() => {
  if (!db) return undefined;
  return onSnapshot(
    query(collection(db, SERVICE_CATEGORY_COLLECTION), limit(100)),
    (snapshot) => {
      setCategoryServices(
        snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            service: data.service || "Untitled",
            category: data.category || "General",
            provider: data.provider || "Unknown",
            status: data.status || "Active",
            serviceDocId: data.serviceDocId || data.serviceId || "",
            city: data.city || data.location || "",
            description: data.description || data.details || "",
          };
        })
      );
    }
  );
}, []);

// 8. Roles listener - REPLACE the existing roles useEffect
useEffect(() => {
  if (!db) return undefined;
  return onSnapshot(
    query(collection(db, "Roles"), limit(50)),
    (snapshot) => {
      setRoles(
        snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            name: data.name || "Role",
            members: data.members ?? 0,
            perms: new Set(data.perms || []),
          };
        })
      );
    }
  );
}, []);

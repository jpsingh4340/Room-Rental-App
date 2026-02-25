// Instruction snippet for patching ProviderDashboard to initialize tab state from URL.
// Add this code after line 48 (after const [message, setMessage] = useState...)
// Replace the activeView useState with this:

const searchParams = new URLSearchParams(window.location.search);
const initialTab = searchParams.get("tab") || "overview";
const [activeView, setActiveView] = useState(initialTab);

// Add this useEffect BEFORE the existing useEffect that calls fetchProviders
// This will handle URL parameter changes:

useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get("tab");
  if (tab) {
    setActiveView(tab);
  }
}, [window.location.search]);

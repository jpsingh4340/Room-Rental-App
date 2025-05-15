// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",           // ✅ Paste from Firebase console
  authDomain: "YOUR_AUTH_DOMAIN",   // ✅ Paste from Firebase console
  projectId: "YOUR_PROJECT_ID",     // ✅ Paste from Firebase console
  storageBucket: "YOUR_STORAGE",    // ✅ Paste from Firebase console
  messagingSenderId: "YOUR_MSG_ID", // ✅ Paste from Firebase console
  appId: "YOUR_APP_ID"              // ✅ Paste from Firebase console
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

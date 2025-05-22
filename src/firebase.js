import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDR-TcSr7qCAKCCTvCjzIE_mqvKHo67YjA",
  authDomain: "rental-haven-c052a.firebaseapp.com",
  projectId: "rental-haven-c052a",
  storageBucket: "rental-haven-c052a.appspot.com",
  messagingSenderId: "167061675023",
  appId: "1:167061675023:web:8fe3d486cca2c533ae577a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth };  
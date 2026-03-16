import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDlvMln1tUg4yaY3HeNE4dEj3EMs26zxLY",
  authDomain: "mrh-system.firebaseapp.com",
  projectId: "mrh-system",
  storageBucket: "mrh-system.firebasestorage.app",
  messagingSenderId: "333543002678",
  appId: "1:333543002678:web:d45a1e42108c4a12673e97",
  measurementId: "G-3485EVNE4H",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export { app, auth, googleProvider };

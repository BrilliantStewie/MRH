// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDlvMln1tUg4yaY3HeNE4dEj3EMs26zxLY",
  authDomain: "mrh-system.firebaseapp.com",
  projectId: "mrh-system",
  storageBucket: "mrh-system.firebasestorage.app",
  messagingSenderId: "333543002678",
  appId: "1:333543002678:web:9db81149b660b05f673e97",
  measurementId: "G-4ZH3VPPKWL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
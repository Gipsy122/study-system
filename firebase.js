import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database"; // For Realtime Database
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAnX310YufEPE5ODH0RHusbtaw9wNGGhdE",
  authDomain: "study-system-29.firebaseapp.com",
  databaseURL: "https://study-system-29-default-rtdb.firebaseio.com",
  projectId: "study-system-29",
  storageBucket: "study-system-29.firebasestorage.app",
  messagingSenderId: "407118949554",
  appId: "1:407118949554:web:17eeecc4c20db90da22dab"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services and export them
export const db = getDatabase(app);
export const auth = getAuth(app);

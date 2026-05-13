import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDiO9hsmKqMO9sKA51Vu7XOXTaHAHuiJc0",
  authDomain: "eventos-deportivos-47cef.firebaseapp.com",
  projectId: "eventos-deportivos-47cef",
  storageBucket: "eventos-deportivos-47cef.firebasestorage.app",
  messagingSenderId: "234075489107",
  appId: "1:234075489107:web:e7f45e76fa0de4654457a6"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
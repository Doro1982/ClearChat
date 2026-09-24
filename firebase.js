import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { getFunctions } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-functions.js";

// Firebase-Webkonfiguration deines Projekts (kein geheimer Server-Schlüssel):
const firebaseConfig = {
  apiKey: "AIzaSyAKUn6IHEbB0t6ZOqtdzWA24HXkZaOWoEk",
  authDomain: "clear-chat-42659.firebaseapp.com",
  projectId: "clear-chat-42659",
  storageBucket: "clear-chat-42659.firebasestorage.app",
  messagingSenderId: "215294899521",
  appId: "1:215294899521:web:a1334913278a5aa98a1dc0",
  measurementId: "G-FC453C84GG"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app, "europe-west3");

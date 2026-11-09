import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCgi7LoG0HHv3T1nEH2MLVUzMmPhEUIsYc",
  authDomain: "apex-ai-bf4a8.firebaseapp.com",
  projectId: "apex-ai-bf4a8",
  storageBucket: "apex-ai-bf4a8.firebasestorage.app",
  messagingSenderId: "561087504028",
  appId: "1:561087504028:web:9788e4c3fdbc4d744b9759",
  measurementId: "G-T92TQP5G8W"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = getFirestore(app);

export default app;

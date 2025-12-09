import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCi92VKS0fFRt8Ku6nxaROqjKcWYI3rCoY",
  authDomain: "npd-all-in-one-notepad.firebaseapp.com",
  databaseURL: "https://npd-all-in-one-notepad-default-rtdb.firebaseio.com",
  projectId: "npd-all-in-one-notepad",
  storageBucket: "npd-all-in-one-notepad.firebasestorage.app",
  messagingSenderId: "425291387152",
  appId: "1:425291387152:android:4f943b700a1c6186411595"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const realtimeDb = getDatabase(app);
export const auth = getAuth(app);

// Google OAuth Client ID for Google Calendar integration
export const GOOGLE_CLIENT_ID = "425291387152-n9k3dc2b60nbsup70tub111n8l8o22lo.apps.googleusercontent.com";

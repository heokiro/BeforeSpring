import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyBARfCbsBvRoRA9diaSwTCeQ3GONe526RA",
  authDomain: "beforespring-exhibit.firebaseapp.com",
  projectId: "beforespring-exhibit",
  storageBucket: "beforespring-exhibit.firebasestorage.app",
  messagingSenderId: "614711632063",
  appId: "1:614711632063:web:bdc53952147c20c630660a",
  databaseURL: "https://beforespring-exhibit-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);

// Realtime Database 인스턴스
export const database = getDatabase(app);

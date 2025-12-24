import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBnMBLwet0MJY7kieNH8cUl7Yzaoj-xzkM",
  authDomain: "fantabet-bacd3.firebaseapp.com",
  projectId: "fantabet-bacd3",
  storageBucket: "fantabet-bacd3.firebasestorage.app",
  messagingSenderId: "547579162390",
  appId: "1:547579162390:web:2698006e48ba874a91ea37",
  measurementId: "G-D7Z0Q9GNNM"
};

// Initialize Firebase with explicit types
let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
} catch (e) {
    console.error("Firebase initialization error", e);
}

export { auth, db };
require("firebase/firestore");
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, query, where, getDocs } = require("firebase/firestore");
const fs = require("fs");
const path = require("path");

const firebaseKeys = {
  apiKey: "EXPO_PUBLIC_FIREBASE_API_KEY",
  authDomain: "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
  projectId: "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
  storageBucket: "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  appId: "EXPO_PUBLIC_FIREBASE_APP_ID",
};

function readFirebaseConfig() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return {};
  const rawEnv = fs.readFileSync(envPath, "utf8");
  return Object.fromEntries(
    Object.entries(firebaseKeys).map(([k, pk]) => {
      const match = rawEnv.match(new RegExp(`^\\s*${pk}\\s*=\\s*["']?([^"',\\r\\n]+)`, "m"));
      return [k, match ? match[1].trim() : ""];
    })
  );
}

async function checkDb() {
  const app = initializeApp(readFirebaseConfig());
  const db = getFirestore(app);

  console.log("Checking root products...");
  const rootSnap = await getDocs(collection(db, "products"));
  rootSnap.docs.forEach(d => {
    const data = d.data();
    if (data.title && data.title.includes("Car")) {
      console.log("Root:", d.id, data.title, data.stateName, data.stateId);
    }
  });

  console.log("Checking Bihar nested products...");
  const nestedSnap = await getDocs(collection(db, "states", "Bihar", "products"));
  nestedSnap.docs.forEach(d => {
    const data = d.data();
    if (data.title && data.title.includes("Car")) {
      console.log("Nested:", d.id, data.title);
    }
  });
}

checkDb().then(() => process.exit(0)).catch(console.error);

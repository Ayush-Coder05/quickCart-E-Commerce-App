require("firebase/firestore");
const { initializeApp } = require("firebase/app");
const { getFirestore, doc, deleteDoc } = require("firebase/firestore");
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

async function fixGhostItems() {
  const app = initializeApp(readFirebaseConfig());
  const db = getFirestore(app);

  const itemsToDelete = ["prod_3203", "prod_3204"];
  
  for (const id of itemsToDelete) {
    console.log(`Deleting root product ${id}...`);
    await deleteDoc(doc(db, "products", id));
  }
  
  console.log("Cleanup complete!");
}

fixGhostItems().then(() => process.exit(0)).catch(console.error);

require("firebase/firestore");
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, query, getDocs, limit, where } = require("firebase/firestore");
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

function normalizeId(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function mapProduct(doc, fallbackStateName = "") {
  const d = doc.data();
  const stateName = String(d.stateName ?? d.state ?? fallbackStateName ?? "");
  const categoryName = String(d.categoryName ?? d.category ?? d.categoryId ?? "General");
  const categoryId = String(d.categoryId ?? normalizeId(categoryName) ?? "general");

  return {
    id: doc.id,
    categoryId,
    categoryName,
    title: String(d.title ?? d.name ?? "Untitled item"),
  };
}

async function debugMappedProducts() {
  const app = initializeApp(readFirebaseConfig());
  const db = getFirestore(app);

  console.log("Root products for bihar:");
  const rootSnap = await getDocs(query(collection(db, "products"), where("stateId", "==", "bihar"), limit(10)));
  rootSnap.docs.forEach(d => {
    const p = mapProduct(d, "Bihar");
    console.log(`${p.title} -> categoryId: ${p.categoryId}, categoryName: ${p.categoryName}`);
  });

  console.log("\nNested products for bihar:");
  const nestedSnap = await getDocs(query(collection(db, "states", "Bihar", "products"), limit(10)));
  nestedSnap.docs.forEach(d => {
    const p = mapProduct(d, "Bihar");
    console.log(`${p.title} -> categoryId: ${p.categoryId}, categoryName: ${p.categoryName}`);
  });
}

debugMappedProducts().then(() => process.exit(0)).catch(console.error);

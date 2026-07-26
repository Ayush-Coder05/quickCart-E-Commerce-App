require("firebase/firestore");
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");
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

async function run() {
  const app = initializeApp(readFirebaseConfig());
  const db = getFirestore(app);

  const categories = [];
  const catSnap = await getDocs(collection(db, "states", "Bihar", "categories"));
  catSnap.forEach(d => {
    categories.push({ id: d.id, ...d.data() });
  });

  console.log("Categories:", categories.map(c => c.id).join(", "));

  const products = [];
  const prodSnap = await getDocs(collection(db, "states", "Bihar", "products"));
  prodSnap.forEach(d => {
    products.push({ id: d.id, ...d.data() });
  });

  console.log("Products:");
  products.forEach(p => {
    console.log(`- ${p.title} | categoryId: ${p.categoryId} | category: ${p.category} | categoryName: ${p.categoryName}`);
    categories.forEach(c => {
      if (c.id === p.categoryId) {
        console.log(`   -> MATCHES category ${c.id}`);
      }
    });
  });
}

run().catch(console.error);

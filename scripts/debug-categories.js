require("firebase/firestore");
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, query, getDocs } = require("firebase/firestore");
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

async function debugCategories() {
  const app = initializeApp(readFirebaseConfig());
  const db = getFirestore(app);

  console.log("Categories for Bihar:");
  const catSnap = await getDocs(collection(db, "states", "Bihar", "categories"));
  catSnap.docs.forEach(d => {
    console.log(`Cat ID: ${d.id}, Name: ${d.data().name}`);
  });

  console.log("\nProducts in Bihar:");
  const prodSnap = await getDocs(collection(db, "states", "Bihar", "products"));
  let prodCount = 0;
  prodSnap.docs.forEach(d => {
    if (prodCount++ < 10) {
      const data = d.data();
      console.log(`Prod: ${data.title}, categoryId: ${data.categoryId}, categoryName: ${data.categoryName}, category: ${data.category}`);
    }
  });

  console.log("\nRoot Products (first 10):");
  const rootSnap = await getDocs(collection(db, "products"));
  let rootCount = 0;
  rootSnap.docs.forEach(d => {
    if (rootCount++ < 10) {
      const data = d.data();
      console.log(`Prod: ${data.title}, categoryId: ${data.categoryId}, categoryName: ${data.categoryName}, category: ${data.category}`);
    }
  });

}

debugCategories().then(() => process.exit(0)).catch(console.error);

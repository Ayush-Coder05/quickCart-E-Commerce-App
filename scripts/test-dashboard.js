require("firebase/firestore");
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, query, where, getCountFromServer, getAggregateFromServer, sum, getDocs, limit, orderBy } = require("firebase/firestore");
const fs = require("fs");
const path = require("path");

const firebaseKeys = {
  apiKey: "EXPO_PUBLIC_FIREBASE_API_KEY",
  authDomain: "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
  projectId: "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
  storageBucket: "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  appId: "EXPO_PUBLIC_FIREBASE_APP_ID",
  measurementId: "EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID",
};

function readDotEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return "";
  return fs.readFileSync(envPath, "utf8");
}

function readValue(rawEnv, firebaseKey, publicKey) {
  if (process.env[publicKey]) return process.env[publicKey];
  const publicPattern = new RegExp(`^\\s*${publicKey}\\s*=\\s*["']?([^"',\\r\\n]+)`, "m");
  const publicMatch = rawEnv.match(publicPattern);
  if (publicMatch) return publicMatch[1].trim();
  const firebasePattern = new RegExp(`${firebaseKey}\\s*[:=]\\s*["']([^"']+)["']`, "m");
  const firebaseMatch = rawEnv.match(firebasePattern);
  return firebaseMatch ? firebaseMatch[1].trim() : "";
}

function readFirebaseConfig() {
  const rawEnv = readDotEnv();
  return Object.fromEntries(
    Object.entries(firebaseKeys).map(([firebaseKey, publicKey]) => [
      firebaseKey,
      readValue(rawEnv, firebaseKey, publicKey),
    ]),
  );
}

async function testQueries() {
  const app = initializeApp(readFirebaseConfig());
  const db = getFirestore(app);

  try {
    console.log("Testing fetchRevenue...");
    try {
      await getAggregateFromServer(query(collection(db, "orders"), where("status", "==", "delivered")), {
        totalRevenue: sum('total')
      });
      console.log("fetchRevenue aggregate OK");
    } catch (e) {
      console.log("fetchRevenue aggregate failed:", e.message);
      await getDocs(query(collection(db, "orders"), where("status", "==", "delivered")));
      console.log("fetchRevenue fallback OK");
    }
  } catch (e) {
    console.log("fetchRevenue overall failed:", e.message);
  }

  try {
    console.log("Testing users count...");
    await getCountFromServer(collection(db, "users"));
    console.log("users count OK");
  } catch (e) {
    console.log("users count failed:", e.message);
  }

  try {
    console.log("Testing orders count...");
    await getCountFromServer(collection(db, "orders"));
    console.log("orders count OK");
  } catch (e) {
    console.log("orders count failed:", e.message);
  }

  try {
    console.log("Testing pending orders count...");
    await getCountFromServer(query(collection(db, "orders"), where("status", "in", ["pending", "confirmed", "packed", "shipped"])));
    console.log("pending orders count OK");
  } catch (e) {
    console.log("pending orders count failed:", e.message);
  }

  try {
    console.log("Testing available products count...");
    await getCountFromServer(query(collection(db, "products"), where("availability", "==", "available")));
    console.log("available products count OK");
  } catch (e) {
    console.log("available products count failed:", e.message);
  }

  try {
    console.log("Testing recent orders...");
    await getDocs(query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(10)));
    console.log("recent orders OK");
  } catch (e) {
    console.log("recent orders failed:", e.message);
  }
}

testQueries().then(() => {
  console.log("Done");
  process.exit(0);
});

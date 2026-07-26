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

const safeCount = async (q) => {
  try {
    const snap = await getCountFromServer(q);
    return snap.data().count;
  } catch (e) {
    const snap = await getDocs(q);
    return snap.size;
  }
};

async function testQueries() {
  const app = initializeApp(readFirebaseConfig());
  const db = getFirestore(app);

  try {
    console.log("Testing users count fallback...");
    const count = await safeCount(collection(db, "users"));
    console.log("users count fallback OK:", count);
  } catch (e) {
    console.log("users count fallback failed:", e.message);
  }
}

testQueries().then(() => {
  console.log("Done");
  process.exit(0);
});

const { initializeApp } = require("firebase/app");
const { getFirestore, doc, deleteDoc } = require("firebase/firestore");
const fs = require("fs");
const path = require("path");

function getEnvVar(key) {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return "";
  const rawEnv = fs.readFileSync(envPath, "utf8");
  const pattern = new RegExp(`^\\s*${key}\\s*=\\s*["']?([^"',\\r\\n]+)`, "m");
  const match = rawEnv.match(pattern);
  return match ? match[1].trim() : "";
}

const firebaseConfig = {
  apiKey: getEnvVar("EXPO_PUBLIC_FIREBASE_API_KEY"),
  authDomain: getEnvVar("EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN"),
  projectId: getEnvVar("EXPO_PUBLIC_FIREBASE_PROJECT_ID"),
  storageBucket: getEnvVar("EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getEnvVar("EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
  appId: getEnvVar("EXPO_PUBLIC_FIREBASE_APP_ID")
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const INDIAN_STATES = [
  "Andaman & Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
  "Chandigarh", "Chhattisgarh", "Dadra & Nagar Haveli and Daman & Diu", "Delhi", "Goa",
  "Gujarat", "Haryana", "Himachal Pradesh", "Jammu & Kashmir", "Jharkhand", "Karnataka",
  "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim",
  "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

async function run() {
  let deletedCount = 0;
  for (const stateName of INDIAN_STATES) {
    const bannerRef = doc(db, "states", stateName, "banners", "b1");
    try {
      await deleteDoc(bannerRef);
      deletedCount++;
      console.log(`Deleted b1 from ${stateName}`);
    } catch (e) {
      console.error(`Error deleting from ${stateName}: ${e.message}`);
    }
  }
  console.log(`Deleted banner b1 from ${deletedCount} states.`);
  process.exit(0);
}

run();

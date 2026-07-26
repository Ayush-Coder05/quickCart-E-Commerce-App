const fs = require("fs");
const path = require("path");
const { initializeApp } = require("firebase/app");
const { collection, getDocs, getFirestore, query, where } = require("firebase/firestore");

const firebaseKeys = {
  apiKey: "EXPO_PUBLIC_FIREBASE_API_KEY",
  authDomain: "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
  projectId: "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
  storageBucket: "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  appId: "EXPO_PUBLIC_FIREBASE_APP_ID",
};

function readConfig() {
  const raw = fs.readFileSync(path.join(__dirname, "..", ".env"), "utf8");
  return Object.fromEntries(Object.entries(firebaseKeys).map(([key, envKey]) => {
    const match = raw.match(new RegExp(`^\\s*${envKey}\\s*=\\s*["']?([^"',\\r\\n]+)`, "m"));
    return [key, match ? match[1].trim() : ""];
  }));
}

async function main() {
  const db = getFirestore(initializeApp(readConfig()));
  for (const state of ["Bihar", "Chhattisgarh", "Jharkhand", "Uttar Pradesh"]) {
    const nestedProducts = await getDocs(collection(db, "states", state, "products"));
    const nestedCategories = await getDocs(collection(db, "states", state, "categories"));
    const nestedBanners = await getDocs(collection(db, "states", state, "banners"));
    const names = nestedProducts.docs.slice(0, 3).map((item) => item.data().name || item.data().title).join(" | ");
    console.log(`${state}: ${nestedProducts.size} products, ${nestedCategories.size} categories, ${nestedBanners.size} banners. Sample: ${names}`);
  }
  const rootBihar = await getDocs(query(collection(db, "products"), where("stateId", "==", "bihar")));
  const rootPatna = await getDocs(query(collection(db, "products"), where("city", "==", "Patna")));
  const cities = await getDocs(collection(db, "cities"));
  console.log(`Root Bihar products: ${rootBihar.size}`);
  console.log(`Root Patna products: ${rootPatna.size}`);
  console.log(`Root cities: ${cities.size}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

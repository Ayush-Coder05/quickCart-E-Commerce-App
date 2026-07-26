const fs = require("fs");
const path = require("path");
const { initializeApp } = require("firebase/app");
const { getFirestore, writeBatch, collection, getDocs, doc } = require("firebase/firestore");

const firebaseKeys = {
  apiKey: "EXPO_PUBLIC_FIREBASE_API_KEY",
  authDomain: "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
  projectId: "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
  storageBucket: "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  appId: "EXPO_PUBLIC_FIREBASE_APP_ID",
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

const CATEGORIES_TO_REMOVE = [
  "c_home",
  "c_education",
  "c_travel",
  "c_realestate",
  "c_events",
  "c_jobs",
  "c_repair",
];

const INDIAN_STATES = [
  "Andaman & Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
  "Chandigarh", "Chhattisgarh", "Dadra & Nagar Haveli and Daman & Diu", "Delhi", "Goa",
  "Gujarat", "Haryana", "Himachal Pradesh", "Jammu & Kashmir", "Jharkhand", "Karnataka",
  "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim",
  "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

async function removeCategories() {
  const app = initializeApp(readFirebaseConfig());
  const db = getFirestore(app);

  console.log("Removing specified categories and products from Firestore...");

  let totalDeleted = 0;

  for (const stateName of INDIAN_STATES) {
    console.log(`Processing state: ${stateName}`);
    
    let batch = writeBatch(db);
    let batchCount = 0;

    // 1. Delete categories
    const categoriesRef = collection(db, "states", stateName, "categories");
    for (const catId of CATEGORIES_TO_REMOVE) {
      batch.delete(doc(categoriesRef, catId));
      batchCount++;
    }

    // 2. Delete products that belong to these categories
    const productsRef = collection(db, "states", stateName, "products");
    const productsSnapshot = await getDocs(productsRef);
    
    for (const productDoc of productsSnapshot.docs) {
      const data = productDoc.data();
      // the schema uses categoryId in v2, but category in v1. 
      // let's check both
      if (CATEGORIES_TO_REMOVE.includes(data.categoryId) || CATEGORIES_TO_REMOVE.includes(data.category)) {
        batch.delete(doc(productsRef, productDoc.id));
        batchCount++;
        
        if (batchCount >= 400) {
          await batch.commit();
          totalDeleted += batchCount;
          batch = writeBatch(db);
          batchCount = 0;
        }
      }
    }

    if (batchCount > 0) {
      await batch.commit();
      totalDeleted += batchCount;
    }
  }

  console.log(`\n✅ Successfully deleted ${totalDeleted} documents (categories and their products).`);
}

removeCategories().catch(console.error);

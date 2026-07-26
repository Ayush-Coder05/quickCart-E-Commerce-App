const fs = require("fs");
const path = require("path");
const { initializeApp } = require("firebase/app");
const { getFirestore, writeBatch, collection, doc } = require("firebase/firestore");

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

const INDIAN_STATES = [
  "Andaman & Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
  "Chandigarh", "Chhattisgarh", "Dadra & Nagar Haveli and Daman & Diu", "Delhi", "Goa",
  "Gujarat", "Haryana", "Himachal Pradesh", "Jammu & Kashmir", "Jharkhand", "Karnataka",
  "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim",
  "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

const STATE_TO_CITIES = {
  "Delhi": ["New Delhi", "Dwarka", "Rohini"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur"],
  "Karnataka": ["Bengaluru", "Mysuru", "Mangaluru"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Varanasi"],
  "West Bengal": ["Kolkata", "Howrah", "Darjeeling"],
  // Just fallback to generic for this script
};

const KIDS_CATEGORY = { id: "c_kids", name: "Kids and Toys", icon: "🧸", color: "#FBBF24", order: 5 };

const KIDS_ITEMS = [
  { title: "Remote Control Car", price: 999, label: "1 Unit", emoji: "🏎️", rating: 4.5, description: "High-speed rechargeable RC car.", tags: ["Toys", "Boys"] },
  { title: "Barbie Doll Set", price: 1299, label: "1 Set", emoji: "👧", rating: 4.6, description: "Classic doll with accessories.", tags: ["Toys", "Girls"] },
  { title: "Building Blocks", price: 599, label: "100 Pcs", emoji: "🧱", rating: 4.7, description: "Educational colorful interlocking blocks.", tags: ["Educational", "Toddler"] },
  { title: "Kids Cotton T-Shirt", price: 349, label: "1 Pc", emoji: "👕", rating: 4.4, description: "Soft 100% cotton printed tee.", tags: ["Clothing", "Boys"] },
  { title: "Frock for Girls", price: 599, label: "1 Pc", emoji: "👗", rating: 4.5, description: "Beautiful party wear frock.", tags: ["Clothing", "Girls"] },
  { title: "Action Figure Set", price: 899, label: "Set of 5", emoji: "🦸‍♂️", rating: 4.3, description: "Popular superhero action figures.", tags: ["Toys", "Kids"] },
  { title: "Baby Romper", price: 499, label: "Pack of 2", emoji: "👶", rating: 4.8, description: "Comfortable sleepwear for infants.", tags: ["Clothing", "Infant"] },
  { title: "Soft Teddy Bear", price: 699, label: "Medium", emoji: "🧸", rating: 4.7, description: "Plush soft toy for kids.", tags: ["Toys", "Soft Toys"] },
  { title: "Kids Running Shoes", price: 799, label: "1 Pair", emoji: "👟", rating: 4.6, description: "Lightweight and durable sports shoes.", tags: ["Footwear", "Kids"] },
  { title: "Coloring Book & Crayons", price: 199, label: "Set", emoji: "🖍️", rating: 4.9, description: "Creative fun with 24 crayons.", tags: ["Educational", "Art"] },
];

async function addKidsCategory() {
  const app = initializeApp(readFirebaseConfig());
  const db = getFirestore(app);

  console.log("Adding Kids category and products to Firestore...");

  let totalAdded = 0;

  for (const stateName of INDIAN_STATES) {
    const batch = writeBatch(db);
    let stateOps = 0;

    const cities = STATE_TO_CITIES[stateName] || ["Local City"];
    const stateId = stateName.toLowerCase().replace(/[^a-z0-9]/g, "_");

    // 1. Add Category
    const catRef = doc(collection(db, "states", stateName, "categories"), KIDS_CATEGORY.id);
    batch.set(catRef, KIDS_CATEGORY);
    stateOps++;

    // 2. Add Products
    KIDS_ITEMS.forEach((item, index) => {
      const docId = `prod_c_kids_${index}`;
      const docRef = doc(collection(db, "states", stateName, "products"), docId);
      
      const city = cities[index % cities.length];
      const availability = (index % 10 === 9) ? "out_of_stock" : "available";

      batch.set(docRef, { 
        ...item, 
        stateName,
        stateId,
        city,
        categoryId: KIDS_CATEGORY.id,
        categoryName: KIDS_CATEGORY.name,
        availability 
      });
      stateOps++;
    });

    await batch.commit();
    console.log(`[${stateName}] Added ${stateOps} documents.`);
    totalAdded += stateOps;
  }

  console.log(`\n✅ Successfully added ${totalAdded} kids products and categories!`);
}

addKidsCategory().catch(console.error);

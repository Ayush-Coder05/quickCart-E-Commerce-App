const fs = require("fs");
const path = require("path");
const { initializeApp } = require("firebase/app");
const {
  getFirestore,
  writeBatch,
  doc,
  collection,
} = require("firebase/firestore");

// ── Firebase Config Setup ─────────────────────────────────────────────────────
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

// ── Data Definitions ──────────────────────────────────────────────────────────

const INDIAN_STATES = [
  "Andaman & Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
  "Chandigarh", "Chhattisgarh", "Dadra & Nagar Haveli and Daman & Diu", "Delhi", "Goa",
  "Gujarat", "Haryana", "Himachal Pradesh", "Jammu & Kashmir", "Jharkhand", "Karnataka",
  "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim",
  "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

const CATEGORIES = [
  { id: "c_food", name: "Restaurants and Food", icon: "🍔", color: "#EF4444" },
  { id: "c_grocery", name: "Grocery and Kirana", icon: "🛒", color: "#16A34A" },
  { id: "c_medical", name: "Medical and Pharmacy", icon: "💊", color: "#3B82F6" },
  { id: "c_electronics", name: "Electronics", icon: "📱", color: "#8B5CF6" },
  { id: "c_fashion", name: "Fashion and Clothing", icon: "👕", color: "#EC4899" },
  { id: "c_kids", name: "Kids and Toys", icon: "🧸", color: "#FBBF24" },
];

const ITEMS_BY_CATEGORY = {
  c_food: [
    { name: "Royal Biryani Combo", price: 349, unit: "1 Serve", emoji: "🥘", rating: 4.8 },
    { name: "Margherita Pizza Large", price: 499, unit: "12 Inch", emoji: "🍕", rating: 4.5 },
    { name: "Spicy Chicken Burger", price: 199, unit: "1 Pc", emoji: "🍔", rating: 4.6 },
    { name: "Paneer Butter Masala", price: 249, unit: "500ml", emoji: "🍛", rating: 4.7 },
    { name: "Hakka Noodles", price: 179, unit: "1 Serve", emoji: "🍜", rating: 4.3 },
    { name: "Tandoori Chicken Half", price: 299, unit: "4 Pcs", emoji: "🍗", rating: 4.9 },
    { name: "Cold Coffee with Ice Cream", price: 149, unit: "350ml", emoji: "🥤", rating: 4.4 },
    { name: "Chocolate Truffle Cake", price: 549, unit: "500g", emoji: "🎂", rating: 4.8 },
    { name: "Masala Dosa", price: 119, unit: "1 Pc", emoji: "🥞", rating: 4.5 },
    { name: "Veg Momos", price: 99, unit: "8 Pcs", emoji: "🥟", rating: 4.6 },
  ],
  c_grocery: [
    { name: "Aashirvaad Atta", price: 235, unit: "5 kg", emoji: "🌾", rating: 4.8 },
    { name: "Amul Taaza Milk", price: 68, unit: "1 L", emoji: "🥛", rating: 4.7 },
    { name: "Fortune Sunflower Oil", price: 145, unit: "1 L", emoji: "🛢️", rating: 4.5 },
    { name: "Tata Salt", price: 28, unit: "1 kg", emoji: "🧂", rating: 4.9 },
    { name: "Maggi 2-Minute Noodles", price: 140, unit: "12 Pack", emoji: "🍜", rating: 4.8 },
    { name: "Onion - Local", price: 45, unit: "1 kg", emoji: "🧅", rating: 4.2 },
    { name: "Potato - Fresh", price: 30, unit: "1 kg", emoji: "🥔", rating: 4.3 },
    { name: "Tomato - Hybrid", price: 40, unit: "1 kg", emoji: "🍅", rating: 4.4 },
    { name: "India Gate Basmati Rice", price: 450, unit: "5 kg", emoji: "🍚", rating: 4.7 },
    { name: "Surf Excel Easy Wash", price: 215, unit: "1.5 kg", emoji: "🧼", rating: 4.6 },
  ],
  c_medical: [
    { name: "Dolo 650 Tablet", price: 30, unit: "15 Tabs", emoji: "💊", rating: 4.9 },
    { name: "Volini Pain Relief Spray", price: 150, unit: "40g", emoji: "🧴", rating: 4.6 },
    { name: "Vicks Vaporub", price: 95, unit: "25ml", emoji: "🌿", rating: 4.8 },
    { name: "Band-Aid Washproof", price: 50, unit: "20 Strips", emoji: "🩹", rating: 4.7 },
    { name: "Digene Antacid", price: 125, unit: "200ml", emoji: "🧪", rating: 4.5 },
    { name: "Cetaphil Cleanser", price: 299, unit: "125ml", emoji: "🧼", rating: 4.6 },
    { name: "Digital Thermometer", price: 250, unit: "1 Unit", emoji: "🌡️", rating: 4.4 },
    { name: "Eno Lemon", price: 60, unit: "6 Sachets", emoji: "🍋", rating: 4.8 },
    { name: "Himalaya Neem Face Wash", price: 140, unit: "100ml", emoji: "🌿", rating: 4.5 },
    { name: "Dettol Antiseptic Liquid", price: 195, unit: "500ml", emoji: "💧", rating: 4.9 },
  ],
  c_electronics: [
    { name: "Fast Charging Cable", price: 399, unit: "1 Unit", emoji: "🔌", rating: 4.4 },
    { name: "Wireless Earbuds", price: 1499, unit: "1 Pair", emoji: "🎧", rating: 4.5 },
    { name: "10000mAh Power Bank", price: 999, unit: "1 Unit", emoji: "🔋", rating: 4.6 },
    { name: "Bluetooth Speaker", price: 1299, unit: "1 Unit", emoji: "🔊", rating: 4.3 },
    { name: "Smart Watch Fit", price: 2499, unit: "1 Unit", emoji: "⌚", rating: 4.2 },
    { name: "Laptop Stand", price: 599, unit: "1 Unit", emoji: "💻", rating: 4.5 },
    { name: "Wireless Mouse", price: 499, unit: "1 Unit", emoji: "🖱️", rating: 4.4 },
    { name: "LED Desk Lamp", price: 799, unit: "1 Unit", emoji: "💡", rating: 4.6 },
    { name: "USB C Hub", price: 899, unit: "1 Unit", emoji: "🔌", rating: 4.3 },
    { name: "Screen Guard", price: 199, unit: "1 Unit", emoji: "📱", rating: 4.1 },
  ],
  c_fashion: [
    { name: "Men's Cotton T-Shirt", price: 499, unit: "1 Pc", emoji: "👕", rating: 4.3 },
    { name: "Women's Kurtis", price: 799, unit: "1 Pc", emoji: "👗", rating: 4.5 },
    { name: "Running Shoes", price: 1499, unit: "1 Pair", emoji: "👟", rating: 4.4 },
    { name: "Denim Jeans Regular", price: 1299, unit: "1 Pc", emoji: "👖", rating: 4.2 },
    { name: "Casual Backpack", price: 899, unit: "1 Pc", emoji: "🎒", rating: 4.6 },
    { name: "Polarized Sunglasses", price: 599, unit: "1 Pc", emoji: "🕶️", rating: 4.3 },
    { name: "Leather Wallet", price: 450, unit: "1 Pc", emoji: "👛", rating: 4.5 },
    { name: "Formal Shirt", price: 999, unit: "1 Pc", emoji: "👔", rating: 4.4 },
    { name: "Winter Jacket", price: 2499, unit: "1 Pc", emoji: "🧥", rating: 4.6 },
    { name: "Cotton Socks", price: 299, unit: "3 Pairs", emoji: "🧦", rating: 4.7 },
  ],
  c_kids: [
    { name: "Remote Control Car", price: 999, unit: "1 Unit", emoji: "🏎️", rating: 4.5 },
    { name: "Barbie Doll Set", price: 1299, unit: "1 Set", emoji: "👧", rating: 4.6 },
    { name: "Building Blocks", price: 599, unit: "100 Pcs", emoji: "🧱", rating: 4.7 },
    { name: "Kids Cotton T-Shirt", price: 349, unit: "1 Pc", emoji: "👕", rating: 4.4 },
    { name: "Frock for Girls", price: 599, unit: "1 Pc", emoji: "👗", rating: 4.5 },
    { name: "Action Figure Set", price: 899, unit: "Set of 5", emoji: "🦸‍♂️", rating: 4.3 },
    { name: "Baby Romper", price: 499, unit: "Pack of 2", emoji: "👶", rating: 4.8 },
    { name: "Soft Teddy Bear", price: 699, unit: "Medium", emoji: "🧸", rating: 4.7 },
    { name: "Kids Running Shoes", price: 799, unit: "1 Pair", emoji: "👟", rating: 4.6 },
    { name: "Coloring Book & Crayons", price: 199, unit: "Set", emoji: "🖍️", rating: 4.9 },
  ],
};

const BANNERS = [
  { id: "b2", title: "Fresh Fruits & Veggies", subtitle: "Direct from Farms", emoji: "🥦", gradientColors: ["#4ADE80", "#22C55E", "#16A34A"] },
  { id: "b3", title: "Top Rated Electronics", subtitle: "Unbeatable Prices", emoji: "🎧", gradientColors: ["#A78BFA", "#7C3AED", "#5B21B6"] },
];

async function seedDatabase() {
  const app = initializeApp(readFirebaseConfig());
  const db = getFirestore(app);

  console.log(`Starting Firestore Seeding for ${INDIAN_STATES.length} States...`);

  let totalOperations = 0;

  for (const stateName of INDIAN_STATES) {
    const batch = writeBatch(db);
    let stateOps = 0;

    // 1. Categories
    CATEGORIES.forEach((cat, index) => {
      const docRef = doc(collection(db, "states", stateName, "categories"), cat.id);
      batch.set(docRef, { ...cat, order: index });
      stateOps++;
    });

    // 2. Products
    let prodIdCounter = 1;
    CATEGORIES.forEach((cat) => {
      const items = ITEMS_BY_CATEGORY[cat.id];
      items.forEach((item) => {
        const docRef = doc(collection(db, "states", stateName, "products"), `p_${prodIdCounter++}`);
        // Add `state` key explicitly as requested by user
        batch.set(docRef, { ...item, category: cat.id, state: stateName });
        stateOps++;
      });
    });

    // 3. Banners
    BANNERS.forEach((banner, index) => {
      const docRef = doc(collection(db, "states", stateName, "banners"), banner.id);
      batch.set(docRef, { ...banner, order: index });
      stateOps++;
    });

    console.log(`[${stateName}] Committing ${stateOps} operations...`);
    await batch.commit();
    totalOperations += stateOps;
  }

  console.log(`\n✅ Seeding complete! Wrote ${totalOperations} documents across ${INDIAN_STATES.length} states.`);
}

seedDatabase().catch(console.error);

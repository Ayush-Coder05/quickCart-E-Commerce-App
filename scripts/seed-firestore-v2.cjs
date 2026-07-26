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

const STATE_TO_CITIES = {
  "Andaman & Nicobar Islands": ["Port Blair", "Havelock"],
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur"],
  "Arunachal Pradesh": ["Itanagar", "Tawang"],
  "Assam": ["Guwahati", "Dibrugarh", "Silchar"],
  "Bihar": ["Patna", "Gaya", "Muzaffarpur"],
  "Chandigarh": ["Chandigarh"],
  "Chhattisgarh": ["Raipur", "Bhilai", "Bilaspur"],
  "Dadra & Nagar Haveli and Daman & Diu": ["Daman", "Diu", "Silvassa"],
  "Delhi": ["New Delhi", "Dwarka", "Rohini"],
  "Goa": ["Panaji", "Margao", "Vasco da Gama"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara"],
  "Haryana": ["Gurugram", "Faridabad", "Panipat"],
  "Himachal Pradesh": ["Shimla", "Manali", "Dharamshala"],
  "Jammu & Kashmir": ["Srinagar", "Jammu", "Anantnag"],
  "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad"],
  "Karnataka": ["Bengaluru", "Mysuru", "Mangaluru"],
  "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode"],
  "Ladakh": ["Leh", "Kargil"],
  "Lakshadweep": ["Kavaratti", "Agatti"],
  "Madhya Pradesh": ["Indore", "Bhopal", "Jabalpur"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur"],
  "Manipur": ["Imphal", "Churachandpur"],
  "Meghalaya": ["Shillong", "Cherrapunji"],
  "Mizoram": ["Aizawl", "Lunglei"],
  "Nagaland": ["Kohima", "Dimapur"],
  "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela"],
  "Puducherry": ["Puducherry", "Auroville"],
  "Punjab": ["Ludhiana", "Amritsar", "Jalandhar"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur"],
  "Sikkim": ["Gangtok", "Pelling"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai"],
  "Telangana": ["Hyderabad", "Warangal", "Nizamabad"],
  "Tripura": ["Agartala", "Udaipur"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Varanasi"],
  "Uttarakhand": ["Dehradun", "Haridwar", "Rishikesh"],
  "West Bengal": ["Kolkata", "Howrah", "Darjeeling"],
};

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
    { title: "Royal Biryani Combo", price: 349, label: "1 Serve", emoji: "🥘", rating: 4.8, description: "Authentic dum biryani served with raita.", tags: ["Spicy", "Bestseller"] },
    { title: "Margherita Pizza Large", price: 499, label: "12 Inch", emoji: "🍕", rating: 4.5, description: "Classic cheese pizza with fresh basil.", tags: ["Veg", "Italian"] },
    { title: "Spicy Chicken Burger", price: 199, label: "1 Pc", emoji: "🍔", rating: 4.6, description: "Crispy chicken patty with spicy mayo.", tags: ["Non-Veg", "Fast Food"] },
    { title: "Paneer Butter Masala", price: 249, label: "500ml", emoji: "🍛", rating: 4.7, description: "Rich and creamy cottage cheese curry.", tags: ["Veg", "Curry"] },
    { title: "Hakka Noodles", price: 179, label: "1 Serve", emoji: "🍜", rating: 4.3, description: "Stir-fried noodles with fresh veggies.", tags: ["Chinese", "Veg"] },
    { title: "Tandoori Chicken Half", price: 299, label: "4 Pcs", emoji: "🍗", rating: 4.9, description: "Smoky, charcoal-grilled tender chicken.", tags: ["Non-Veg", "Starters"] },
    { title: "Cold Coffee with Ice Cream", price: 149, label: "350ml", emoji: "🥤", rating: 4.4, description: "Thick cold coffee topped with vanilla ice cream.", tags: ["Beverage", "Sweet"] },
    { title: "Chocolate Truffle Cake", price: 549, label: "500g", emoji: "🎂", rating: 4.8, description: "Dense chocolate cake with rich ganache.", tags: ["Dessert", "Eggless"] },
    { title: "Masala Dosa", price: 119, label: "1 Pc", emoji: "🥞", rating: 4.5, description: "Crispy crepe served with sambar and chutney.", tags: ["South Indian", "Veg"] },
    { title: "Veg Momos", price: 99, label: "8 Pcs", emoji: "🥟", rating: 4.6, description: "Steamed dumplings filled with minced veggies.", tags: ["Snacks", "Street Food"] },
  ],
  c_grocery: [
    { title: "Aashirvaad Atta", price: 235, label: "5 kg", emoji: "🌾", rating: 4.8, description: "Whole wheat atta for soft rotis.", tags: ["Staples", "Bestseller"] },
    { title: "Amul Taaza Milk", price: 68, label: "1 L", emoji: "🥛", rating: 4.7, description: "Toned milk, pasteurized.", tags: ["Dairy", "Daily Needs"] },
    { title: "Fortune Sunflower Oil", price: 145, label: "1 L", emoji: "🛢️", rating: 4.5, description: "Light and healthy cooking oil.", tags: ["Grocery", "Cooking"] },
    { title: "Tata Salt", price: 28, label: "1 kg", emoji: "🧂", rating: 4.9, description: "Iodized salt for everyday cooking.", tags: ["Staples", "Essential"] },
    { title: "Maggi 2-Minute Noodles", price: 140, label: "12 Pack", emoji: "🍜", rating: 4.8, description: "Instant noodles for quick snacks.", tags: ["Snacks", "Instant"] },
    { title: "Onion - Local", price: 45, label: "1 kg", emoji: "🧅", rating: 4.2, description: "Freshly sourced local onions.", tags: ["Vegetables", "Fresh"] },
    { title: "Potato - Fresh", price: 30, label: "1 kg", emoji: "🥔", rating: 4.3, description: "Quality potatoes for daily use.", tags: ["Vegetables", "Fresh"] },
    { title: "Tomato - Hybrid", price: 40, label: "1 kg", emoji: "🍅", rating: 4.4, description: "Red, juicy hybrid tomatoes.", tags: ["Vegetables", "Fresh"] },
    { title: "India Gate Basmati Rice", price: 450, label: "5 kg", emoji: "🍚", rating: 4.7, description: "Premium long-grain basmati rice.", tags: ["Staples", "Premium"] },
    { title: "Surf Excel Easy Wash", price: 215, label: "1.5 kg", emoji: "🧼", rating: 4.6, description: "Detergent powder for tough stains.", tags: ["Cleaning", "Household"] },
  ],
  c_medical: [
    { title: "Dolo 650 Tablet", price: 30, label: "15 Tabs", emoji: "💊", rating: 4.9, description: "Paracetamol tablets for fever and pain.", tags: ["Medicine", "Essential"] },
    { title: "Volini Pain Relief Spray", price: 150, label: "40g", emoji: "🧴", rating: 4.6, description: "Instant pain relief spray.", tags: ["Pain Relief", "First Aid"] },
    { title: "Vicks Vaporub", price: 95, label: "25ml", emoji: "🌿", rating: 4.8, description: "Cold and cough relief.", tags: ["Cold", "Ointment"] },
    { title: "Band-Aid Washproof", price: 50, label: "20 Strips", emoji: "🩹", rating: 4.7, description: "Waterproof adhesive bandages.", tags: ["First Aid", "Wound Care"] },
    { title: "Digene Antacid", price: 125, label: "200ml", emoji: "🧪", rating: 4.5, description: "Relief from acidity and gas.", tags: ["Digestion", "Syrup"] },
    { title: "Cetaphil Cleanser", price: 299, label: "125ml", emoji: "🧼", rating: 4.6, description: "Gentle skin cleanser for daily use.", tags: ["Skincare", "Dermatologist Recommended"] },
    { title: "Digital Thermometer", price: 250, label: "1 Unit", emoji: "🌡️", rating: 4.4, description: "Accurate digital thermometer.", tags: ["Devices", "Health"] },
    { title: "Eno Lemon", price: 60, label: "6 Sachets", emoji: "🍋", rating: 4.8, description: "Fast relief from acidity.", tags: ["Digestion", "Instant"] },
    { title: "Himalaya Neem Face Wash", price: 140, label: "100ml", emoji: "🌿", rating: 4.5, description: "Purifying neem face wash.", tags: ["Skincare", "Herbal"] },
    { title: "Dettol Antiseptic Liquid", price: 195, label: "500ml", emoji: "💧", rating: 4.9, description: "Multipurpose antiseptic liquid.", tags: ["Hygiene", "First Aid"] },
  ],
  c_electronics: [
    { title: "Fast Charging Cable", price: 399, label: "1 Unit", emoji: "🔌", rating: 4.4, description: "Type-C fast charging braided cable.", tags: ["Accessories", "Mobile"] },
    { title: "Wireless Earbuds", price: 1499, label: "1 Pair", emoji: "🎧", rating: 4.5, description: "True wireless earbuds with ANC.", tags: ["Audio", "Bluetooth"] },
    { title: "10000mAh Power Bank", price: 999, label: "1 Unit", emoji: "🔋", rating: 4.6, description: "Slim power bank with dual output.", tags: ["Accessories", "Charging"] },
    { title: "Bluetooth Speaker", price: 1299, label: "1 Unit", emoji: "🔊", rating: 4.3, description: "Portable waterproof speaker.", tags: ["Audio", "Portable"] },
    { title: "Smart Watch Fit", price: 2499, label: "1 Unit", emoji: "⌚", rating: 4.2, description: "Fitness tracker with heart rate monitor.", tags: ["Wearables", "Fitness"] },
    { title: "Laptop Stand", price: 599, label: "1 Unit", emoji: "💻", rating: 4.5, description: "Adjustable aluminum laptop stand.", tags: ["Accessories", "Ergonomics"] },
    { title: "Wireless Mouse", price: 499, label: "1 Unit", emoji: "🖱️", rating: 4.4, description: "Ergonomic 2.4GHz wireless mouse.", tags: ["Peripherals", "Computer"] },
    { title: "LED Desk Lamp", price: 799, label: "1 Unit", emoji: "💡", rating: 4.6, description: "Dimmable eye-care study lamp.", tags: ["Lighting", "Home Office"] },
    { title: "USB C Hub", price: 899, label: "1 Unit", emoji: "🔌", rating: 4.3, description: "4-in-1 multi-port adapter.", tags: ["Accessories", "Connectivity"] },
    { title: "Screen Guard", price: 199, label: "1 Unit", emoji: "📱", rating: 4.1, description: "Tempered glass screen protector.", tags: ["Accessories", "Mobile"] },
  ],
  c_fashion: [
    { title: "Men's Cotton T-Shirt", price: 499, label: "1 Pc", emoji: "👕", rating: 4.3, description: "Solid color 100% cotton tee.", tags: ["Men", "Casual"] },
    { title: "Women's Kurtis", price: 799, label: "1 Pc", emoji: "👗", rating: 4.5, description: "Printed cotton kurti for daily wear.", tags: ["Women", "Ethnic"] },
    { title: "Running Shoes", price: 1499, label: "1 Pair", emoji: "👟", rating: 4.4, description: "Lightweight breathable sports shoes.", tags: ["Footwear", "Sports"] },
    { title: "Denim Jeans Regular", price: 1299, label: "1 Pc", emoji: "👖", rating: 4.2, description: "Classic blue regular fit denim.", tags: ["Men", "Bottoms"] },
    { title: "Casual Backpack", price: 899, label: "1 Pc", emoji: "🎒", rating: 4.6, description: "Water-resistant college backpack.", tags: ["Bags", "Accessories"] },
    { title: "Polarized Sunglasses", price: 599, label: "1 Pc", emoji: "🕶️", rating: 4.3, description: "UV protection aviator sunglasses.", tags: ["Accessories", "Eyewear"] },
    { title: "Leather Wallet", price: 450, label: "1 Pc", emoji: "👛", rating: 4.5, description: "Genuine leather bifold wallet.", tags: ["Accessories", "Men"] },
    { title: "Formal Shirt", price: 999, label: "1 Pc", emoji: "👔", rating: 4.4, description: "Slim fit solid formal shirt.", tags: ["Men", "Formal"] },
    { title: "Winter Jacket", price: 2499, label: "1 Pc", emoji: "🧥", rating: 4.6, description: "Windproof hooded bomber jacket.", tags: ["Winter Wear", "Outerwear"] },
    { title: "Cotton Socks", price: 299, label: "3 Pairs", emoji: "🧦", rating: 4.7, description: "Ankle length breathable socks.", tags: ["Accessories", "Daily Wear"] },
  ],
  c_kids: [
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
  ],
};

const BANNERS = [
  { id: "b1", title: "Local Services at Your Doorstep", subtitle: "Fast & Reliable", emoji: "🏡", gradientColors: ["#38BDF8", "#0284C7", "#0369A1"] },
  { id: "b2", title: "Fresh Groceries Delivered", subtitle: "Everyday Needs", emoji: "🥑", gradientColors: ["#4ADE80", "#16A34A", "#15803D"] },
  { id: "b3", title: "Top Rated Electronics", subtitle: "Unbeatable Prices", emoji: "🎧", gradientColors: ["#A78BFA", "#7C3AED", "#5B21B6"] },
];

async function seedDatabase() {
  const app = initializeApp(readFirebaseConfig());
  const db = getFirestore(app);

  console.log(`Starting Safe Firestore Seeding for ${INDIAN_STATES.length} States...`);

  let totalOperations = 0;

  for (const stateName of INDIAN_STATES) {
    const batch = writeBatch(db);
    let stateOps = 0;

    const cities = STATE_TO_CITIES[stateName] || ["Local City"];
    // Safe ID base for deterministic overwrite
    const stateId = stateName.toLowerCase().replace(/[^a-z0-9]/g, "_");

    // 1. Categories
    CATEGORIES.forEach((cat, index) => {
      // PREDICTABLE ID: e.g. "c_food"
      const docRef = doc(collection(db, "states", stateName, "categories"), cat.id);
      batch.set(docRef, { ...cat, order: index });
      stateOps++;
    });

    // 2. Products
    CATEGORIES.forEach((cat) => {
      const items = ITEMS_BY_CATEGORY[cat.id];
      items.forEach((item, index) => {
        // PREDICTABLE ID: e.g. "prod_c_food_0"
        const docId = `prod_${cat.id}_${index}`;
        const docRef = doc(collection(db, "states", stateName, "products"), docId);
        
        // Randomly assign a city from the state
        const city = cities[index % cities.length];
        
        // Randomly set out_of_stock (~10% chance) based on index to keep it deterministic
        const availability = (index % 10 === 9) ? "out_of_stock" : "available";

        batch.set(docRef, { 
          ...item, 
          stateName,
          stateId,
          city,
          categoryId: cat.id,
          categoryName: cat.name,
          availability 
        });
        stateOps++;
      });
    });

    // 3. Banners
    BANNERS.forEach((banner, index) => {
      // PREDICTABLE ID: e.g. "b1"
      const docRef = doc(collection(db, "states", stateName, "banners"), banner.id);
      batch.set(docRef, { ...banner, order: index });
      stateOps++;
    });

    console.log(`[${stateName}] Committing ${stateOps} operations...`);
    await batch.commit();
    totalOperations += stateOps;
  }

  console.log(`\n✅ Safe Seeding complete! Wrote or overwritten ${totalOperations} documents across ${INDIAN_STATES.length} states.`);
}

seedDatabase().catch((e) => {
  console.error("Failed to seed database", e);
  process.exit(1);
});

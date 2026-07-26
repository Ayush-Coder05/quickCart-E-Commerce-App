const fs = require("fs");
const path = require("path");
const { initializeApp } = require("firebase/app");
const {
  collection,
  doc,
  getDocs,
  getFirestore,
  writeBatch,
  Timestamp,
} = require("firebase/firestore");

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
  return fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
}

function readValue(rawEnv, firebaseKey, publicKey) {
  if (process.env[publicKey]) return process.env[publicKey];
  const envMatch = rawEnv.match(new RegExp(`^\\s*${publicKey}\\s*=\\s*["']?([^"',\\r\\n]+)`, "m"));
  if (envMatch) return envMatch[1].trim();
  const configMatch = rawEnv.match(new RegExp(`${firebaseKey}\\s*[:=]\\s*["']([^"']+)`, "m"));
  return configMatch ? configMatch[1].trim() : "";
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

function normalizeId(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const image = {
  groceries: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80",
  vegetables: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=900&q=80",
  dairy: "https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=900&q=80",
  snacks: "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?auto=format&fit=crop&w=900&q=80",
  personal: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=900&q=80",
  electronics: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
  rice: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=900&q=80",
  atta: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=900&q=80",
  milk: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=900&q=80",
  paneer: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=900&q=80",
  banana: "https://images.unsplash.com/photo-1603833665858-e61d17a86224?auto=format&fit=crop&w=900&q=80",
  tomato: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=900&q=80",
  oil: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=900&q=80",
  bread: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80",
  shampoo: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=900&q=80",
  earbuds: "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=900&q=80",
  charger: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=900&q=80",
  bannerFresh: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1400&q=85",
  bannerGrocery: "https://images.unsplash.com/photo-1601598851547-4302969d0614?auto=format&fit=crop&w=1400&q=85",
  bannerElectronics: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=85",
};

const states = [
  { name: "Bihar", cities: ["Patna", "Gaya", "Muzaffarpur"] },
  { name: "Chhattisgarh", cities: ["Raipur", "Bhilai", "Bilaspur"] },
  { name: "Jharkhand", cities: ["Ranchi", "Jamshedpur", "Dhanbad"] },
  { name: "Uttar Pradesh", cities: ["Lucknow", "Varanasi", "Kanpur"] },
];

const categories = [
  { id: "groceries", name: "Groceries", icon: "Cart", color: "#16A34A" },
  { id: "fruits_vegetables", name: "Fruits and Vegetables", icon: "Leaf", color: "#22C55E" },
  { id: "dairy_bakery", name: "Dairy and Bakery", icon: "Milk", color: "#F59E0B" },
  { id: "snacks_beverages", name: "Snacks and Beverages", icon: "Cup", color: "#EF4444" },
  { id: "personal_care", name: "Personal Care", icon: "Care", color: "#8B5CF6" },
  { id: "electronics", name: "Electronics", icon: "Phone", color: "#2563EB" },
];

const baseProducts = [
  { slug: "basmati_rice", categoryId: "groceries", name: "India Gate Basmati Rice", label: "5 kg", price: 449, stock: 48, imageUrl: image.rice, description: "Long-grain basmati rice for daily meals and special biryani recipes.", tags: ["rice", "staple"] },
  { slug: "whole_wheat_atta", categoryId: "groceries", name: "Aashirvaad Whole Wheat Atta", label: "5 kg", price: 235, stock: 62, imageUrl: image.atta, description: "Fresh whole wheat flour for soft rotis and parathas.", tags: ["atta", "staple"] },
  { slug: "sunflower_oil", categoryId: "groceries", name: "Fortune Sunflower Oil", label: "1 L", price: 145, stock: 40, imageUrl: image.oil, description: "Light cooking oil suitable for everyday frying and tadka.", tags: ["oil", "kitchen"] },
  { slug: "fresh_tomato", categoryId: "fruits_vegetables", name: "Fresh Tomato", label: "1 kg", price: 38, stock: 85, imageUrl: image.tomato, description: "Firm red tomatoes sourced from local markets each morning.", tags: ["fresh", "vegetable"] },
  { slug: "banana_dozen", categoryId: "fruits_vegetables", name: "Robusta Banana", label: "12 pcs", price: 55, stock: 70, imageUrl: image.banana, description: "Naturally sweet bananas, ready for snacks and breakfast bowls.", tags: ["fruit", "fresh"] },
  { slug: "amul_milk", categoryId: "dairy_bakery", name: "Amul Taaza Milk", label: "1 L", price: 68, stock: 90, imageUrl: image.milk, description: "Pasteurized toned milk delivered chilled for daily use.", tags: ["milk", "dairy"] },
  { slug: "paneer_block", categoryId: "dairy_bakery", name: "Fresh Paneer Block", label: "200 g", price: 92, stock: 44, imageUrl: image.paneer, description: "Soft paneer for curries, rolls, sandwiches, and snacks.", tags: ["paneer", "dairy"] },
  { slug: "brown_bread", categoryId: "dairy_bakery", name: "Harvest Brown Bread", label: "400 g", price: 48, stock: 36, imageUrl: image.bread, description: "Soft sliced brown bread baked for quick breakfasts.", tags: ["bread", "bakery"] },
  { slug: "mixed_snacks", categoryId: "snacks_beverages", name: "Haldiram's Namkeen Mix", label: "400 g", price: 118, stock: 54, imageUrl: image.snacks, description: "Crunchy savoury snack mix for tea time and guests.", tags: ["snacks", "namkeen"] },
  { slug: "herbal_shampoo", categoryId: "personal_care", name: "Herbal Care Shampoo", label: "340 ml", price: 179, stock: 32, imageUrl: image.shampoo, description: "Gentle everyday shampoo with a clean, fresh fragrance.", tags: ["personal care", "hair"] },
  { slug: "wireless_earbuds", categoryId: "electronics", name: "Wireless Earbuds", label: "1 pair", price: 1499, stock: 18, imageUrl: image.earbuds, description: "Compact Bluetooth earbuds with clear calls and long battery life.", tags: ["audio", "bluetooth"] },
  { slug: "fast_charger", categoryId: "electronics", name: "Type-C Fast Charger", label: "20 W", price: 599, stock: 22, imageUrl: image.charger, description: "Fast wall charger with Type-C output for modern phones.", tags: ["charger", "mobile"] },
];

const banners = [
  { id: "local_fresh", title: "Fresh Daily Picks", subtitle: "Fruits, vegetables, dairy, and pantry items near you", imageUrl: image.bannerFresh, gradientColors: ["#16A34A", "#0F766E"], order: 0 },
  { id: "grocery_week", title: "Weekly Grocery Basket", subtitle: "Staples and home essentials at simple demo prices", imageUrl: image.bannerGrocery, gradientColors: ["#F59E0B", "#EA580C"], order: 1 },
  { id: "quick_electronics", title: "Useful Electronics", subtitle: "Chargers, earbuds, and quick accessories", imageUrl: image.bannerElectronics, gradientColors: ["#2563EB", "#7C3AED"], order: 2 },
];

async function commitAll(db, writes) {
  let batch = writeBatch(db);
  let count = 0;
  let total = 0;
  for (const write of writes) {
    write(batch);
    count += 1;
    total += 1;
    if (count === 400) {
      await batch.commit();
      batch = writeBatch(db);
      count = 0;
    }
  }
  if (count > 0) await batch.commit();
  return total;
}

async function deleteCollectionWrites(db, collectionPath) {
  const snap = await getDocs(collection(db, ...collectionPath));
  return snap.docs.map((item) => (batch) => batch.delete(item.ref));
}

async function resetCatalog(db) {
  const writes = [];
  const stateSnap = await getDocs(collection(db, "states"));
  const stateNames = new Set([...states.map((s) => s.name), ...stateSnap.docs.map((d) => d.id)]);

  for (const name of stateNames) {
    for (const child of ["products", "categories", "banners"]) {
      writes.push(...await deleteCollectionWrites(db, ["states", name, child]));
    }
    writes.push((batch) => batch.delete(doc(db, "states", name)));
  }

  for (const root of ["products", "categories", "cities", "banners", "products_v3"]) {
    writes.push(...await deleteCollectionWrites(db, [root]));
  }

  const deleted = await commitAll(db, writes);
  console.log(`Deleted ${deleted} catalog documents.`);
}

function productForState(state, product, index) {
  const category = categories.find((cat) => cat.id === product.categoryId) || categories[0];
  const city = state.cities[index % state.cities.length];
  const now = Timestamp.now();
  return {
    id: `${normalizeId(state.name)}_${product.slug}`,
    data: {
      name: product.name,
      title: product.name,
      categoryId: category.id,
      categoryName: category.name,
      description: `${product.description} Available for quick demo delivery in ${city}, ${state.name}.`,
      imageUrl: product.imageUrl,
      image: product.imageUrl,
      emoji: "Bag",
      label: product.label,
      price: product.price,
      mrp: Math.round(product.price * 1.12),
      stock: product.stock,
      availability: "available",
      status: "available",
      serviceCity: city,
      city,
      state: state.name,
      stateName: state.name,
      stateId: normalizeId(state.name),
      rating: Number((4.2 + (index % 6) / 10).toFixed(1)),
      tags: product.tags,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  };
}

async function seedCatalog(db) {
  const now = Timestamp.now();
  const writes = [];

  categories.forEach((category, index) => {
    writes.push((batch) => batch.set(doc(db, "categories", category.id), {
      ...category,
      order: index,
      isActive: true,
      isVisible: true,
      hasPage: true,
      createdAt: now,
      updatedAt: now,
    }));
  });

  states.forEach((state, stateIndex) => {
    const stateId = normalizeId(state.name);
    writes.push((batch) => batch.set(doc(db, "states", state.name), {
      id: stateId,
      name: state.name,
      stateName: state.name,
      isActive: true,
      order: stateIndex,
      cities: state.cities,
      createdAt: now,
      updatedAt: now,
    }));

    state.cities.forEach((city, cityIndex) => {
      writes.push((batch) => batch.set(doc(db, "cities", `${stateId}_${normalizeId(city)}`), {
        name: city,
        cityName: city,
        state: state.name,
        stateName: state.name,
        stateId,
        deliveryAvailable: true,
        isActive: true,
        order: stateIndex * 10 + cityIndex,
        createdAt: now,
        updatedAt: now,
      }));
    });

    categories.forEach((category, index) => {
      writes.push((batch) => batch.set(doc(db, "states", state.name, "categories", category.id), {
        ...category,
        order: index,
        isActive: true,
        isVisible: true,
        hasPage: true,
        createdAt: now,
        updatedAt: now,
      }));
    });

    banners.forEach((banner) => {
      writes.push((batch) => batch.set(doc(db, "states", state.name, "banners", banner.id), {
        ...banner,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      }));
    });

    baseProducts.forEach((product, index) => {
      const seeded = productForState(state, product, index);
      writes.push((batch) => batch.set(doc(db, "states", state.name, "products", seeded.id), seeded.data));
      writes.push((batch) => batch.set(doc(db, "products", seeded.id), seeded.data));
    });
  });

  const written = await commitAll(db, writes);
  console.log(`Created ${written} demo catalog documents.`);
  console.log(`Seeded ${states.length} states, ${states.reduce((sum, state) => sum + state.cities.length, 0)} cities, ${categories.length} categories, and ${states.length * baseProducts.length} products.`);
  console.log("Primary demo locations: Bihar/Patna, Chhattisgarh/Raipur, Jharkhand/Ranchi, Uttar Pradesh/Lucknow.");
}

async function main() {
  const config = readFirebaseConfig();
  const missing = Object.entries(config)
    .filter(([key, value]) => key !== "measurementId" && !value)
    .map(([key]) => key);
  if (missing.length > 0) {
    throw new Error(`Missing Firebase config: ${missing.join(", ")}`);
  }

  const app = initializeApp(config);
  const db = getFirestore(app);
  console.log(`Resetting demo catalog for Firebase project ${config.projectId}...`);
  await resetCatalog(db);
  await seedCatalog(db);
  console.log("Done. Admin and user panels now read the same product IDs from root and nested state paths.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

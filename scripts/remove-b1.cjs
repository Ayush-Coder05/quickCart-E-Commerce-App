
const { initializeApp } = require("firebase/app");
const { initializeApp } = require("firebase/app");
const {
  getFirestore,
  writeBatch,
  doc,
  collection,
} = require("firebase/firestore");



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
  for (const stateName of INDIAN_STATES) {
    const bannerRef = doc(db, "states", stateName, "banners", "b1");
    try {
      await deleteDoc(bannerRef);
      console.log(`Deleted banner b1 from ${stateName}`);
    } catch (e) {
      console.error(`Failed to delete banner b1 from ${stateName}`, e);
    }
  }
  console.log("Done deleting b1 banners.");
  process.exit(0);
}

run();

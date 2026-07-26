const { initializeApp } = require("firebase/firestore");
// We need to setup firebase admin or regular firebase properly.
// Let's check how seed-firestore.cjs does it.
const fs = require('fs');
const path = require('path');

const seedCode = fs.readFileSync(path.join(__dirname, 'seed-firestore.cjs'), 'utf8');
const configMatch = seedCode.match(/const firebaseConfig = {[\s\S]*?};/);
const importsMatch = seedCode.match(/const {[\s\S]*?} = require\("firebase\/firestore"\);/);

const scriptContent = `
const { initializeApp } = require("firebase/app");
${importsMatch ? importsMatch[0] : 'const { getFirestore, doc, deleteDoc } = require("firebase/firestore");'}

${configMatch ? configMatch[0] : ''}

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
      console.log(\`Deleted banner b1 from \${stateName}\`);
    } catch (e) {
      console.error(\`Failed to delete banner b1 from \${stateName}\`, e);
    }
  }
  console.log("Done deleting b1 banners.");
  process.exit(0);
}

run();
`;

fs.writeFileSync(path.join(__dirname, 'remove-b1.cjs'), scriptContent);
console.log("Created remove-b1.cjs");

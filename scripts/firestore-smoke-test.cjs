const fs = require("fs");
const path = require("path");
const { initializeApp } = require("firebase/app");
const {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDocs,
  getFirestore,
  limit,
  query,
  updateDoc,
  where,
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

async function run() {
  const app = initializeApp(readFirebaseConfig());
  const db = getFirestore(app);
  const users = collection(db, "users");
  const mobile = `98${String(Date.now()).slice(-8)}`;
  const originalPassword = "Test123";
  const updatedPassword = "Newpass1";

  const findByMobile = async () => {
    const snapshot = await getDocs(query(users, where("mobile", "==", mobile), limit(1)));
    return snapshot.docs[0] ?? null;
  };

  if (await findByMobile()) throw new Error("Generated mobile number already exists.");

  const created = await addDoc(users, {
    fullName: "Firestore Smoke Test",
    mobile,
    password: originalPassword,
    createdAt: Timestamp.now(),
  });

  const savedUser = await findByMobile();
  if (!savedUser) throw new Error("Signup did not save a user in Firestore.");

  const duplicateBlocked = Boolean(await findByMobile());
  if (!duplicateBlocked) throw new Error("Duplicate mobile precheck failed.");

  if (savedUser.data().password === "Wrong123") {
    throw new Error("Wrong login details were accepted.");
  }

  if (savedUser.data().password !== originalPassword) {
    throw new Error("Correct login details were rejected.");
  }

  if ("123456" !== "123456") throw new Error("Default OTP validation failed.");

  await updateDoc(doc(db, "users", created.id), {
    password: updatedPassword,
    updatedAt: Timestamp.now(),
  });

  const updatedUser = await findByMobile();
  if (updatedUser?.data().password !== updatedPassword || !updatedUser.data().updatedAt) {
    throw new Error("Forgot password did not update the password and updatedAt.");
  }

  console.log(`PASS Firestore checklist. mobile=${mobile} docId=${created.id}`);
}

run().catch((error) => {
  console.error(`FAIL Firestore checklist. ${error.message}`);
  process.exit(1);
});

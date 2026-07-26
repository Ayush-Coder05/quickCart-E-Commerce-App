require("firebase/firestore");
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, updateDoc, doc } = require("firebase/firestore");
const { getStorage, ref, uploadBytes, getDownloadURL } = require("firebase/storage");
const fs = require("fs");
const path = require("path");

const firebaseKeys = {
  apiKey: "EXPO_PUBLIC_FIREBASE_API_KEY",
  authDomain: "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
  projectId: "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
  storageBucket: "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  appId: "EXPO_PUBLIC_FIREBASE_APP_ID",
};

function readFirebaseConfig() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return {};
  const rawEnv = fs.readFileSync(envPath, "utf8");
  return Object.fromEntries(
    Object.entries(firebaseKeys).map(([k, pk]) => {
      const match = rawEnv.match(new RegExp(`^\\s*${pk}\\s*=\\s*["']?([^"',\\r\\n]+)`, "m"));
      return [k, match ? match[1].trim() : ""];
    })
  );
}

async function uploadAndSet(db, storage, productDoc, imagePath) {
  try {
    console.log(`Uploading ${imagePath} for ${productDoc.data().title}...`);
    const fileData = fs.readFileSync(imagePath);
    const storageRef = ref(storage, `products/${path.basename(imagePath)}`);
    
    await uploadBytes(storageRef, fileData, { contentType: "image/jpeg" });
    const url = await getDownloadURL(storageRef);
    
    await updateDoc(productDoc.ref, {
      imageUrl: url,
      image: url // some fields use image
    });
    console.log(`Updated ${productDoc.data().title} with url: ${url}`);
  } catch (err) {
    console.error(`Failed to update ${productDoc.data().title}`, err);
  }
}

async function run() {
  const app = initializeApp(readFirebaseConfig());
  const db = getFirestore(app);
  const storage = getStorage(app);

  const prodSnap = await getDocs(collection(db, "states", "Bihar", "products"));
  const rootSnap = await getDocs(collection(db, "products"));
  
  const allDocs = [...prodSnap.docs, ...rootSnap.docs];
  
  for (const d of allDocs) {
    const title = d.data().title || d.data().name || "";
    
    if (title.toLowerCase().includes("gala apples") && process.env.IMAGE_APPLES) {
      await uploadAndSet(db, storage, d, process.env.IMAGE_APPLES);
    }
    else if (title.toLowerCase().includes("dashboard air freshener") && process.env.IMAGE_FRESHENER) {
      await uploadAndSet(db, storage, d, process.env.IMAGE_FRESHENER);
    }
    else if (title.toLowerCase().includes("side mirror anti-fog film") && process.env.IMAGE_FILM) {
      await uploadAndSet(db, storage, d, process.env.IMAGE_FILM);
    }
  }
  
  console.log("Done");
  process.exit(0);
}

run().catch(console.error);

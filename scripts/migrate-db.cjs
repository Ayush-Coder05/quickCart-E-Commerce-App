const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, writeBatch } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyBvxqEFGniMtVZRZasJgbnaN0Cg7Du01ac",
  authDomain: "quickcart-4e4ef.firebaseapp.com",
  projectId: "quickcart-4e4ef",
  storageBucket: "quickcart-4e4ef.firebasestorage.app",
  messagingSenderId: "666380451057",
  appId: "1:666380451057:web:d867263f8c3a57277e7d50",
  measurementId: "G-4BJMJE8PHZ"
};

async function migrateProducts() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const states = ["Bihar", "Maharashtra"]; // Let's migrate Bihar for now, or you can add others

  for (const stateName of states) {
    console.log("Migrating products for", stateName);
    const snap = await getDocs(collection(db, "states", stateName, "products"));
    
    let batch = writeBatch(db);
    let count = 0;

    for (const productDoc of snap.docs) {
      const data = productDoc.data();
      const updates = {};
      
      // If there's a name but no title, add title
      if (data.name && !data.title) {
        updates.title = data.name;
      }
      
      // If there's a unit but no label, add label
      if (data.unit && !data.label) {
        updates.label = data.unit;
      }
      
      if (Object.keys(updates).length > 0) {
        batch.update(productDoc.ref, updates);
        count++;
        
        if (count === 400) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
    }

    if (count > 0) {
      await batch.commit();
    }
  }
  
  console.log("Migration complete!");
  process.exit(0);
}

migrateProducts().catch(console.error);

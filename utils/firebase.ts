import Constants from "expo-constants";
import { FirebaseOptions, getApp, getApps, initializeApp } from "firebase/app";
// @ts-ignore - getReactNativePersistence exists in firebase/auth at runtime for React Native
import { initializeAuth, getReactNativePersistence, getAuth } from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

type FirebaseConfigKey = keyof FirebaseOptions;
type RuntimeConstants = typeof Constants & {
  manifest?: {
    extra?: {
      firebase?: Partial<Record<FirebaseConfigKey, string>>;
    };
  };
  manifest2?: {
    extra?: {
      expoClient?: {
        extra?: {
          firebase?: Partial<Record<FirebaseConfigKey, string>>;
        };
      };
    };
  };
};

const runtimeConstants = Constants as RuntimeConstants;

function fromExtra(key: FirebaseConfigKey) {
  return (
    runtimeConstants.expoConfig?.extra?.firebase?.[key] ||
    runtimeConstants.manifest?.extra?.firebase?.[key] ||
    runtimeConstants.manifest2?.extra?.expoClient?.extra?.firebase?.[key] ||
    ""
  );
}

function configValue(publicEnvValue: string | undefined, key: FirebaseConfigKey) {
  return publicEnvValue || fromExtra(key);
}

const firebaseConfig: FirebaseOptions = {
  apiKey:            configValue(process.env.EXPO_PUBLIC_FIREBASE_API_KEY,            "apiKey"),
  authDomain:        configValue(process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,        "authDomain"),
  projectId:         configValue(process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,         "projectId"),
  storageBucket:     configValue(process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,     "storageBucket"),
  messagingSenderId: configValue(process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,"messagingSenderId"),
  appId:             configValue(process.env.EXPO_PUBLIC_FIREBASE_APP_ID,             "appId"),
  measurementId:     configValue(process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,     "measurementId"),
};



const missingConfig = Object.entries(firebaseConfig)
  .filter(([key, value]) => key !== "measurementId" && !value)
  .map(([key]) => key);

if (missingConfig.length > 0) {
  console.error(`Missing Firebase config values: ${missingConfig.join(", ")}`);
}

export const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Firestore
export const db = (() => {
  try {
    return initializeFirestore(firebaseApp, {
      experimentalForceLongPolling: true,
    });
  } catch {
    return getFirestore(firebaseApp);
  }
})();

// Firebase Auth with AsyncStorage persistence (session survives app restarts)
export const auth = (() => {
  try {
    // getReactNativePersistence + ReactNativeAsyncStorage (v2 API)
    return initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
  } catch {
    // Already initialized (hot reload) - just return the existing instance
    return getAuth(firebaseApp);
  }
})();

// Firebase Storage
export const storage = getStorage(firebaseApp);

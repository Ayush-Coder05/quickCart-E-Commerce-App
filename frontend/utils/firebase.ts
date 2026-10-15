import Constants from "expo-constants";
import { Platform } from "react-native";
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
const rawAuth = (() => {
  try {
    if (Platform.OS === "web") {
      return getAuth(firebaseApp);
    }
    // getReactNativePersistence + ReactNativeAsyncStorage (v2 API)
    return initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
  } catch {
    // Already initialized (hot reload) - just return the existing instance
    return getAuth(firebaseApp);
  }
})();

// MongoDB auth session bridge for seamless backward compatibility
let _activeMongoUser: any = null;

// Initialize from storage on launch
ReactNativeAsyncStorage.getItem("@quickcart_auth_user")
  .then((raw) => {
    if (raw) {
      try {
        _activeMongoUser = JSON.parse(raw);
      } catch {}
    }
  })
  .catch(() => {});

export function setMongoSessionUser(u: any) {
  _activeMongoUser = u;
}

export function getMongoSessionUser() {
  return _activeMongoUser;
}

export const auth = new Proxy(rawAuth, {
  get(target, prop, receiver) {
    if (prop === "currentUser") {
      const fbUser = target.currentUser;
      if (fbUser) return fbUser;
      if (_activeMongoUser) {
        return {
          uid: _activeMongoUser.uid || _activeMongoUser.id,
          id: _activeMongoUser.id || _activeMongoUser.uid,
          email: _activeMongoUser.email,
          displayName: _activeMongoUser.fullName || _activeMongoUser.name || "",
          emailVerified: true,
          role: _activeMongoUser.role || "customer",
          photoURL: null,
          phoneNumber: _activeMongoUser.mobile || null,
        };
      }
      return null;
    }
    const val = Reflect.get(target, prop, receiver);
    if (typeof val === "function") {
      return val.bind(target);
    }
    return val;
  },
}) as unknown as typeof rawAuth;

// Firebase Storage
export const storage = getStorage(firebaseApp);

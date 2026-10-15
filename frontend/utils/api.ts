import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

const TOKEN_KEY = "@quickcart_auth_token";
const USER_KEY  = "@quickcart_auth_user";

function getDefaultApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, "");
  }

  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.location?.hostname) {
      return `http://${window.location.hostname}:5000`;
    }
    return "http://localhost:5000";
  }

  // If running in Expo Go or dev on LAN, use the Metro host IP if available
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).linkingUri?.match(/:\/\/(.[^/:]+)/)?.[1];

  if (hostUri) {
    const ip = hostUri.split(":")[0];
    if (ip && ip !== "localhost" && ip !== "127.0.0.1") {
      return `http://${ip}:5000`;
    }
  }

  // Fallback to active LAN IP for physical device or localhost for emulator/desktop
  return Platform.OS === "android" ? "http://192.168.29.127:5000" : "http://localhost:5000";
}

export const API_BASE_URL = getDefaultApiUrl();

export interface ApiUser {
  id: string;
  uid: string;
  fullName: string;
  email: string;
  mobile?: string;
  role: "customer" | "admin";
  pushToken?: string;
}

// ── Auth Token & User Storage ──────────────────────────────────────────────────

export async function setAuthSession(token: string, user: ApiUser): Promise<void> {
  await AsyncStorage.multiSet([
    [TOKEN_KEY, token],
    [USER_KEY, JSON.stringify(user)],
  ]);
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {}
  }
}

export async function getAuthToken(): Promise<string | null> {
  let token = await AsyncStorage.getItem(TOKEN_KEY);
  if (!token && typeof window !== "undefined" && window.localStorage) {
    token = localStorage.getItem(TOKEN_KEY);
  }
  return token;
}

export async function getStoredUser(): Promise<ApiUser | null> {
  let raw = await AsyncStorage.getItem(USER_KEY);
  if (!raw && typeof window !== "undefined" && window.localStorage) {
    raw = localStorage.getItem(USER_KEY);
  }
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function clearAuthSession(): Promise<void> {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {}
  }
}

// ── HTTP Client ────────────────────────────────────────────────────────────────

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  const token = await getAuthToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    if (response.status === 401 && !endpoint.includes("/api/auth/login")) {
      await clearAuthSession().catch(() => {});
    }
    const msg = data.detail || data.message || `Request failed with status ${response.status}`;
    const error: any = new Error(msg);
    error.status = response.status;
    error.code = data.code;
    error.data = data;
    throw error;
  }

  return data as T;
}

export const api = {
  get: <T = any>(url: string) => apiRequest<T>(url, { method: "GET" }),
  post: <T = any>(url: string, body?: any) =>
    apiRequest<T>(url, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T = any>(url: string, body?: any) =>
    apiRequest<T>(url, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  patch: <T = any>(url: string, body?: any) =>
    apiRequest<T>(url, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T = any>(url: string) => apiRequest<T>(url, { method: "DELETE" }),
};

export async function uploadImage(uri: string, base64Data?: string | null): Promise<string> {
  // If base64 data is supplied, upload via base64 endpoint
  if (base64Data) {
    try {
      const res = await api.post<{ success: boolean; url: string }>("/api/upload/base64", {
        image: base64Data,
        filename: "product.jpg",
      });
      if (res?.url) {
        return res.url;
      }
    } catch (e) {
      console.warn("Base64 upload failed, trying multipart:", e);
    }
  }

  // Fallback to multipart FormData upload
  try {
    const token = await getAuthToken();
    const formData = new FormData();
    const ext = uri.split(".").pop()?.toLowerCase() || "jpg";

    if (Platform.OS === "web") {
      const fetchRes = await fetch(uri);
      const blob = await fetchRes.blob();
      formData.append("file", blob, `photo.${ext}`);
    } else {
      formData.append("file", {
        uri,
        name: `photo.${ext}`,
        type: `image/${ext === "jpg" ? "jpeg" : ext}`,
      } as any);
    }

    const uploadUrl = `${API_BASE_URL}/api/upload`;
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(uploadUrl, {
      method: "POST",
      headers,
      body: formData,
    });

    const data = await response.json();
    if (response.ok && data?.url) {
      return data.url;
    }
  } catch (err) {
    console.warn("Multipart upload failed:", err);
  }

  // If backend upload is unavailable, return data URI if available or uri
  if (base64Data) {
    return `data:image/jpeg;base64,${base64Data}`;
  }
  return uri;
}

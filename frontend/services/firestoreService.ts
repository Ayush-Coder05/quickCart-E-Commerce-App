// services/firestoreService.ts
//
// Catalog and content service powered by MongoDB FastAPI backend (/api/...)

import { api } from "../utils/api";

export interface FirestoreBanner {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  emoji?: string;
  gradientColors?: string[];
  order: number;
}

export interface FirestoreCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  order: number;
  isActive?: boolean;
  hasPage?: boolean;
  isVisible?: boolean;
}

export interface FirestoreProduct {
  id: string;
  stateName: string;
  stateId: string;
  city: string;
  categoryId: string;
  categoryName: string;
  title: string;
  description: string;
  tags: string[];
  rating: number;
  price?: number;
  label?: string;
  availability: "available" | "out_of_stock";
  imageUrl?: string;
  emoji?: string;
  updatedAt?: number;
}

export interface StateContent {
  banners: FirestoreBanner[];
  categories: FirestoreCategory[];
  products: FirestoreProduct[];
}

const CATEGORY_COLORS = [
  "#22C55E",
  "#F97316",
  "#3B82F6",
  "#A855F7",
  "#EF4444",
  "#14B8A6",
  "#F59E0B",
  "#6366F1",
];

const CATEGORY_ICONS: Record<string, string> = {
  fruits: "Fruit",
  vegetables: "Veg",
  dairy: "Milk",
  bakery: "Bread",
  snacks: "Snack",
  beverages: "Drink",
  grocery: "Cart",
  household: "Home",
  personal: "Care",
};

function normalizeId(value: string | null | undefined): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeAvailability(value: unknown): "available" | "out_of_stock" {
  const raw = String(value ?? "available").toLowerCase();
  if (raw.includes("out") || raw.includes("sold") || raw === "false") {
    return "out_of_stock";
  }
  return "available";
}

function defaultBanners(stateName: string): FirestoreBanner[] {
  return [
    {
      id: "default-local",
      title: `Fresh picks in ${stateName}`,
      subtitle: "Groceries, daily essentials, and quick delivery near you",
      emoji: "Cart",
      gradientColors: ["#22C55E", "#16A34A", "#15803D"],
      order: 0,
    },
  ];
}

function categoriesFromProducts(products: FirestoreProduct[]): FirestoreCategory[] {
  const seen = new Map<string, FirestoreCategory>();

  products.forEach((product) => {
    if (seen.has(product.categoryId)) return;
    const index = seen.size;
    seen.set(product.categoryId, {
      id: product.categoryId,
      name: product.categoryName || product.categoryId,
      icon: CATEGORY_ICONS[normalizeId(product.categoryName)] || "Cart",
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      order: index + 1,
      isActive: false,
      hasPage: false,
      isVisible: false,
    });
  });

  return Array.from(seen.values());
}

export async function getStateBanners(stateName: string): Promise<FirestoreBanner[]> {
  try {
    const queryParam = stateName ? `?stateName=${encodeURIComponent(stateName)}` : "";
    const res = await api.get<{ success: boolean; banners: any[] }>(`/api/banners${queryParam}`);
    if (res?.banners && res.banners.length > 0) {
      return res.banners.map((b: any) => ({
        id: b.id || b._id,
        title: b.title || "",
        subtitle: b.subtitle,
        imageUrl: b.imageUrl,
        emoji: b.emoji,
        gradientColors: b.gradientColors,
        order: b.order ?? 0,
      }));
    }
  } catch (err) {
    console.warn("[firestoreService] MongoDB banners fetch error:", err);
  }
  return defaultBanners(stateName);
}

export async function getStateCategories(stateName: string): Promise<FirestoreCategory[]> {
  try {
    const res = await api.get<{ success: boolean; categories: any[] }>("/api/categories");
    if (res?.categories && res.categories.length > 0) {
      return res.categories.map((c: any, index: number) => ({
        id: c.id || c._id,
        name: c.name || "",
        icon: c.icon || CATEGORY_ICONS[normalizeId(c.name)] || "Cart",
        color: c.color || CATEGORY_COLORS[index % CATEGORY_COLORS.length] || "#F97316",
        order: c.order ?? index + 1,
        isActive: c.isActive !== false,
        hasPage: c.hasPage !== false,
        isVisible: c.isVisible !== false,
      }));
    }
  } catch (err) {
    console.warn("[firestoreService] MongoDB categories fetch error:", err);
  }
  return [];
}

export async function getStateProducts(stateName: string): Promise<FirestoreProduct[]> {
  try {
    const queryParam = stateName ? `?stateName=${encodeURIComponent(stateName)}&limit=200` : "?limit=200";
    const res = await api.get<{ success: boolean; products: any[] }>(`/api/products${queryParam}`);
    if (res?.products && Array.isArray(res.products) && res.products.length > 0) {
      return res.products.map((p: any) => ({
        id: p.id || p._id,
        stateName: p.stateName || stateName,
        stateId: p.stateId || normalizeId(p.stateName || stateName),
        city: p.city || "",
        categoryId: p.categoryId || "general",
        categoryName: p.categoryName || "General",
        title: p.title || p.name || "",
        description: p.description || "",
        tags: Array.isArray(p.tags) ? p.tags : [],
        rating: Number(p.rating ?? 4.5),
        price: Number(p.price ?? 0),
        label: p.label,
        availability: normalizeAvailability(p.availability),
        imageUrl: p.imageUrl,
        emoji: p.emoji || "Bag",
        updatedAt: p.updatedAt ? new Date(p.updatedAt).getTime() : undefined,
      }));
    }
  } catch (err) {
    console.warn("[firestoreService] MongoDB products fetch error:", err);
  }
  return [];
}

export async function getStateContent(stateName: string): Promise<StateContent> {
  const [bannersResult, categoriesResult, productsResult] = await Promise.allSettled([
    getStateBanners(stateName),
    getStateCategories(stateName),
    getStateProducts(stateName),
  ]);

  const rawBanners = bannersResult.status === "fulfilled" ? bannersResult.value : [];
  const rawCategories = categoriesResult.status === "fulfilled" ? categoriesResult.value : [];
  const products = productsResult.status === "fulfilled" ? productsResult.value : [];

  const banners = rawBanners.length > 0 ? rawBanners : defaultBanners(stateName);
  const categories = rawCategories.length > 0 ? rawCategories : categoriesFromProducts(products);

  return { banners, categories, products };
}

export function subscribeToStateProducts(stateName: string, callback: (products: FirestoreProduct[]) => void): () => void {
  let isMounted = true;

  const sync = async () => {
    try {
      const products = await getStateProducts(stateName);
      if (isMounted && products && products.length > 0) {
        callback(products);
      }
    } catch (err) {
      console.warn("[subscribeToStateProducts] fetch error:", err);
    }
  };

  sync();
  const timer = setInterval(sync, 10000);

  return () => {
    isMounted = false;
    clearInterval(timer);
  };
}

export function subscribeToAdminProducts(states: string[], callback: (products: FirestoreProduct[]) => void): () => void {
  let isMounted = true;

  const sync = async () => {
    try {
      const res = await api.get<{ success: boolean; products: any[] }>("/api/products?limit=500");
      if (isMounted && res?.products && Array.isArray(res.products)) {
        const mapped: FirestoreProduct[] = res.products.map((p: any) => ({
          id: p.id || p._id,
          stateName: p.stateName || p.state || "",
          stateId: p.stateId || normalizeId(p.stateName || p.state || ""),
          city: p.city || p.serviceCity || "",
          categoryId: p.categoryId || "general",
          categoryName: p.categoryName || "General",
          title: p.title || p.name || "",
          description: p.description || "",
          tags: Array.isArray(p.tags) ? p.tags : [],
          rating: Number(p.rating ?? 4.5),
          price: Number(p.price ?? 0),
          label: p.label,
          availability: normalizeAvailability(p.availability),
          imageUrl: p.imageUrl,
          emoji: p.emoji || "Bag",
          updatedAt: p.updatedAt ? new Date(p.updatedAt).getTime() : undefined,
          source: "root",
          stock: p.stock ?? 0,
        } as any));
        callback(mapped);
      }
    } catch (err) {
      console.warn("[subscribeToAdminProducts] fetch error:", err);
    }
  };

  sync();
  const timer = setInterval(sync, 10000);

  return () => {
    isMounted = false;
    clearInterval(timer);
  };
}

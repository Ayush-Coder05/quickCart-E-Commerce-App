import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  DocumentData,
  QueryDocumentSnapshot,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../utils/firebase";

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

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function mapBanner(doc: QueryDocumentSnapshot<DocumentData>): FirestoreBanner {
  const d = doc.data();
  return {
    id: doc.id,
    title: (d.title as string) ?? "",
    subtitle: (d.subtitle as string) ?? undefined,
    imageUrl: (d.imageUrl as string) ?? (d.image as string) ?? undefined,
    emoji: (d.emoji as string) ?? undefined,
    gradientColors: (d.gradientColors as string[]) ?? undefined,
    order: (d.order as number) ?? 0,
  };
}

function mapCategory(doc: QueryDocumentSnapshot<DocumentData>): FirestoreCategory {
  const d = doc.data();
  return {
    id: doc.id,
    name: (d.name as string) || (d.categoryName as string) || doc.id,
    icon: (d.icon as string) || CATEGORY_ICONS[normalizeId(d.name as string)] || "Cart",
    color: (d.color as string) || "#F97316",
    order: (d.order as number) ?? 0,
    isActive: d.isActive !== false,
    hasPage: d.hasPage !== false,
    isVisible: d.isVisible !== false,
  };
}

function mapProduct(
  doc: QueryDocumentSnapshot<DocumentData>,
  fallbackStateName = "",
): FirestoreProduct {
  const d = doc.data();
  const stateName = String(d.stateName ?? d.state ?? fallbackStateName ?? "");
  const categoryName = String(d.categoryName ?? d.category ?? d.categoryId ?? "General");
  const categoryId = String(d.categoryId ?? normalizeId(categoryName) ?? "general");
  const priceValue = Number(d.price ?? d.mrp ?? d.salePrice ?? 0);

  return {
    id: doc.id,
    stateName,
    stateId: String(d.stateId ?? normalizeId(stateName)),
    city: String(d.city ?? d.serviceCity ?? d.locality ?? ""),
    categoryId,
    categoryName,
    title: String(d.title ?? d.name ?? "Untitled item"),
    description: String(d.description ?? ""),
    tags: asStringArray(d.tags),
    rating: Number(d.rating ?? 4.4),
    price: Number.isFinite(priceValue) && priceValue > 0 ? priceValue : undefined,
    label: (d.label as string) || (d.unit as string) || (d.weight as string) || undefined,
    availability: normalizeAvailability(d.availability ?? d.status),
    imageUrl: (d.imageUrl as string) ?? (d.image as string) ?? undefined,
    emoji: (d.emoji as string) || "Bag",
    updatedAt: d.updatedAt?.toMillis ? d.updatedAt.toMillis() : (d.updatedAt || undefined),
  };
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

async function getRootProductsForState(stateName: string): Promise<FirestoreProduct[]> {
  const stateId = normalizeId(stateName);
  const rootRef = collection(db, "products");
  const attempts = [
    query(rootRef, where("stateId", "==", stateId), limit(200)),
    query(rootRef, where("stateName", "==", stateName), limit(200)),
    query(rootRef, where("state", "==", stateName), limit(200)),
  ];

  const byId = new Map<string, FirestoreProduct>();
  for (const q of attempts) {
    try {
      const snap = await getDocs(q);
      snap.docs.forEach((doc) => byId.set(doc.id, mapProduct(doc, stateName)));
      if (byId.size > 0) break;
    } catch (err) {
      console.warn("[firestoreService] root products fallback failed:", err);
    }
  }

  return Array.from(byId.values());
}

export async function getStateBanners(stateName: string): Promise<FirestoreBanner[]> {
  const ref = collection(db, "states", stateName, "banners");
  const q = query(ref, orderBy("order"));
  const snap = await getDocs(q);
  return snap.docs.map(mapBanner);
}

export async function getStateCategories(stateName: string): Promise<FirestoreCategory[]> {
  const ref = collection(db, "states", stateName, "categories");
  const q = query(ref, orderBy("order"));
  const snap = await getDocs(q);
  return snap.docs.map(mapCategory);
}

export async function getStateProducts(stateName: string): Promise<FirestoreProduct[]> {
  const ref = collection(db, "states", stateName, "products");
  const [nestedResult, rootResult] = await Promise.allSettled([
    getDocs(ref),
    getRootProductsForState(stateName),
  ]);
  const products = new Map<string, FirestoreProduct>();
  if (rootResult.status === "fulfilled") {
    rootResult.value.forEach((product) => products.set(product.id, product));
  }
  if (nestedResult.status === "fulfilled") {
    nestedResult.value.docs.forEach((productDoc) => {
      products.set(productDoc.id, mapProduct(productDoc, stateName));
    });
  }
  if (products.size === 0 && nestedResult.status === "rejected" && rootResult.status === "rejected") {
    throw nestedResult.reason;
  }
  return Array.from(products.values());
}

export async function getStateContent(stateName: string): Promise<StateContent> {
  // Use allSettled so a missing Firestore index or permission error on banners/categories
  // does NOT crash the entire home screen data load. Each sub-call degrades gracefully.
  const [bannersResult, categoriesResult, productsResult] = await Promise.allSettled([
    getStateBanners(stateName),
    getStateCategories(stateName),
    getStateProducts(stateName),
  ]);

  const rawBanners =
    bannersResult.status === "fulfilled" ? bannersResult.value : [];
  const rawCategories =
    categoriesResult.status === "fulfilled" ? categoriesResult.value : [];
  const products =
    productsResult.status === "fulfilled" ? productsResult.value : [];

  if (bannersResult.status === "rejected") {
    console.warn("[firestoreService] getStateBanners failed:", bannersResult.reason);
  }
  if (categoriesResult.status === "rejected") {
    console.warn("[firestoreService] getStateCategories failed:", categoriesResult.reason);
  }
  if (productsResult.status === "rejected") {
    console.warn("[firestoreService] getStateProducts failed:", productsResult.reason);
    // Re-throw only if products completely failed (banners/categories can be empty)
    throw productsResult.reason;
  }

  const banners = rawBanners.length > 0 ? rawBanners : defaultBanners(stateName);
  const categories =
    rawCategories.length > 0 ? rawCategories : categoriesFromProducts(products);

  return { banners, categories, products };
}

export function subscribeToStateProducts(stateName: string, callback: (products: FirestoreProduct[]) => void): () => void {
  const rootRef = collection(db, "products");
  const nestedRef = collection(db, "states", stateName, "products");
  const stateId = normalizeId(stateName);
  
  // To avoid complex multi-query fallback logic, we subscribe to the main query for root items.
  const rootQuery = query(rootRef, where("stateId", "==", stateId), limit(200));

  let rootProducts: FirestoreProduct[] = [];
  let nestedProducts: FirestoreProduct[] = [];

  const update = () => {
    const productsMap = new Map<string, FirestoreProduct>();
    rootProducts.forEach(p => productsMap.set(p.id, p));
    nestedProducts.forEach(p => productsMap.set(p.id, p));
    callback(Array.from(productsMap.values()));
  };

  const unsubRoot = onSnapshot(rootQuery, (snap) => {
    rootProducts = snap.docs.map(doc => mapProduct(doc, stateName));
    update();
  }, (err) => console.warn("root products snapshot error:", err));

  const unsubNested = onSnapshot(nestedRef, (snap) => {
    nestedProducts = snap.docs.map(doc => mapProduct(doc, stateName));
    update();
  }, (err) => console.warn("nested products snapshot error:", err));

  return () => {
    unsubRoot();
    unsubNested();
  };
}

export function subscribeToAdminProducts(states: string[], callback: (products: FirestoreProduct[]) => void): () => void {
  const productsMap = new Map<string, FirestoreProduct>();
  let emitTimeout: ReturnType<typeof setTimeout> | null = null;
  
  const update = () => {
    if (emitTimeout) clearTimeout(emitTimeout);
    emitTimeout = setTimeout(() => {
      callback(Array.from(productsMap.values()));
    }, 50); // debounce slightly as many snapshots might fire initially
  };

  const unsubs: (() => void)[] = [];

  // Root products
  const rootQuery = query(collection(db, "products"), limit(50));
  unsubs.push(
    onSnapshot(rootQuery, (snap) => {
      snap.docChanges().forEach(change => {
        const data = change.doc.data();
        const p: FirestoreProduct = {
          id:           change.doc.id,
          stateName:    data.stateName || data.state || data.stateId || "",
          stateId:      data.stateId || "",
          categoryId:   data.categoryId || data.categoryName || data.category || "",
          categoryName: data.categoryName || data.category || data.categoryId || "",
          title:        data.name || data.title || "",
          description:  data.description || "",
          imageUrl:     data.imageUrl || data.image || "",
          emoji:        data.emoji || "",
          price:        Number(data.price ?? data.mrp ?? data.salePrice ?? 0),
          availability: data.availability || data.status || "available",
          city:         data.serviceCity || data.city || data.locality || "",
          tags:         [],
          rating:       4.4,
          source:       "root",
        } as any; 
        // Adding source property just for admin panel compatibility
        (p as any).source = "root";
        (p as any).stock = data.stock ?? 0;
        
        if (change.type === "removed") {
          productsMap.delete(p.id);
        } else {
          // If state nested version exists, it should theoretically take precedence in UI,
          // but for admin panel we generally want to see everything.
          // Wait, if it exists in state, we shouldn't overwrite if it already exists?
          // Admin panel logic: if (all.some(x => x.id === d.id)) return;
          // We can just add prefix to key or avoid overwriting if a non-root version exists.
          if (!productsMap.has(p.id) || (productsMap.get(p.id) as any).source === "root") {
            productsMap.set(p.id, p);
          }
        }
      });
      update();
    })
  );

  // Nested states
  states.forEach(stateName => {
    const stateQuery = query(collection(db, "states", stateName, "products"), limit(10));
    unsubs.push(
      onSnapshot(stateQuery, (snap) => {
        snap.docChanges().forEach(change => {
          const data = change.doc.data();
          const p: FirestoreProduct = {
            id:           change.doc.id,
            stateName:    stateName,
            stateId:      normalizeId(stateName),
            categoryId:   data.categoryId || data.categoryName || data.category || "",
            categoryName: data.categoryName || data.category || data.categoryId || "",
            title:        data.name || data.title || "",
            description:  data.description || "",
            imageUrl:     data.imageUrl || data.image || "",
            emoji:        data.emoji || "",
            price:        Number(data.price ?? data.mrp ?? data.salePrice ?? 0),
            availability: data.availability || data.status || "available",
            city:         data.serviceCity || data.city || data.locality || "",
            tags:         [],
            rating:       4.4,
            source:       "state",
          } as any;
          (p as any).source = "state";
          (p as any).stock = data.stock ?? 0;

          if (change.type === "removed") {
            productsMap.delete(p.id);
          } else {
            productsMap.set(p.id, p);
          }
        });
        update();
      })
    );
  });

  return () => unsubs.forEach(fn => fn());
}


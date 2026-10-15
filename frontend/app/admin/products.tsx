// app/admin/products.tsx
//
// Admin Products CRUD via MongoDB FastAPI backend (/api/products)
// Product fields: title/name, categoryId, description, imageUrl, price, stock,
//                 availability, serviceCity, stateName, etc.

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "../../utils/api";
import { AdminHeader } from "../../components/admin/AdminHeader";
import { AdminDrawer } from "../../components/admin/AdminDrawer";
import { CrudModal, FieldDef } from "../../components/admin/CrudModal";
import { formatRupees } from "../../utils/currency";

const PRIMARY = "#16A34A";
const BG      = "#F3F4F6";

interface Product {
  id:           string;
  state:        string;
  name:         string;
  categoryId:   string;
  description:  string;
  imageUrl:     string;
  emoji:        string;
  price:        number;
  stock:        number;
  source:       "root" | "state";
  availability: string;
  serviceCity:  string;
  createdAt?:   any;
  updatedAt?:   any;
}

const FIELDS: FieldDef[] = [
  { key: "state",        label: "State Name",         type: "text",      placeholder: "e.g. Uttar Pradesh", required: true },
  { key: "name",         label: "Product Name",       type: "text",      placeholder: "e.g. Organic Milk",  required: true },
  { key: "categoryId",   label: "Category ID",        type: "text",      placeholder: "e.g. dairy_bakery",  required: true },
  { key: "imageUrl",     label: "Image URL *",        type: "text",      placeholder: "https://example.com/product-image.jpg" },
  { key: "description",  label: "Description",        type: "multiline", placeholder: "Short description..." },
  { key: "emoji",        label: "Emoji (fallback)",   type: "text",      placeholder: "e.g. 🍞" },
  { key: "price",        label: "Price (₹)",          type: "number",    placeholder: "e.g. 49",            required: true, keyboardType: "numeric" },
  { key: "stock",        label: "Stock Qty",          type: "number",    placeholder: "e.g. 100",           required: true, keyboardType: "numeric" },
  {
    key: "availability", label: "Availability", type: "select", required: true,
    options: [
      { label: "Available",    value: "available"   },
      { label: "Out of Stock", value: "out_of_stock" },
    ],
  },
  { key: "serviceCity", label: "Service City", type: "text", placeholder: "e.g. Varanasi" },
];

export default function ProductsScreen() {
  const insets = useSafeAreaInsets();
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [products,    setProducts]    = useState<Product[]>([]);
  const [filtered,    setFiltered]    = useState<Product[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [search,      setSearch]      = useState("");
  const [modalOpen,   setModalOpen]   = useState(false);
  const [editItem,    setEditItem]    = useState<Product | null>(null);
  const [saving,      setSaving]      = useState(false);

  const fetchProducts = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const res = await api.get<{ success: boolean; products: any[] }>("/api/products?limit=500");
      if (res?.products && Array.isArray(res.products)) {
        const mapped: Product[] = res.products.map((p) => ({
          id:           p.id || p._id,
          state:        p.stateName || p.state || "",
          name:         p.title || p.name || "",
          categoryId:   p.categoryId || "",
          description:  p.description || "",
          imageUrl:     p.imageUrl || "",
          emoji:        p.emoji || "🛍️",
          price:        Number(p.price || 0),
          stock:        Number(p.stock ?? 0),
          source:       "root",
          availability: p.availability || "available",
          serviceCity:  p.city || p.serviceCity || "",
          createdAt:    p.createdAt,
          updatedAt:    p.updatedAt,
        }));

        mapped.sort((a, b) => a.state.localeCompare(b.state) || a.name.localeCompare(b.name));
        setProducts(mapped);
      }
    } catch (err: any) {
      console.warn("Error fetching products from MongoDB:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    const interval = setInterval(() => {
      fetchProducts();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchProducts]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      q
        ? products.filter(
            (p) =>
              p.name.toLowerCase().includes(q) ||
              p.state.toLowerCase().includes(q) ||
              p.serviceCity.toLowerCase().includes(q),
          )
        : products,
    );
  }, [search, products]);

  const openAdd = () => {
    setEditItem(null);
    setModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditItem(p);
    setModalOpen(true);
  };

  const handleSave = async (data: Record<string, unknown>) => {
    try {
      setSaving(true);
      let url = String(data.imageUrl ?? "").trim();
      if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
        if (url.startsWith("/photo-") || url.startsWith("photo-")) {
          url = `https://images.unsplash.com/${url.replace(/^\//, "")}`;
        } else if (url.startsWith("//")) {
          url = `https:${url}`;
        } else {
          Alert.alert("Invalid URL", "Please enter a valid image URL (e.g. starting with https://).");
          setSaving(false);
          return;
        }
      }

      const state   = String(data.state ?? "").trim();
      const stateId = state.toLowerCase().replace(/[^a-z0-9]+/g, "_");
      const name    = String(data.name ?? "").trim();
      const city    = String(data.serviceCity ?? "").trim();

      const productData = {
        title:        name,
        name:         name,
        categoryId:   String(data.categoryId ?? "").trim(),
        categoryName: String(data.categoryId ?? "").trim(),
        description:  String(data.description ?? "").trim(),
        imageUrl:     url,
        emoji:        String(data.emoji ?? "").trim(),
        price:        Number(data.price) || 0,
        stock:        Number(data.stock) || 0,
        availability: String(data.availability ?? "available"),
        serviceCity:  city,
        city:         city,
        stateName:    state,
        stateId:      stateId,
        updatedAt:    new Date().toISOString(),
      };

      if (editItem) {
        await api.put(`/api/products/${editItem.id}`, productData);
      } else {
        await api.post("/api/products", productData);
      }

      setModalOpen(false);
      await fetchProducts();

      Alert.alert(
        editItem ? "Product Updated" : "Product Added",
        editItem
          ? `"${name}" has been updated successfully.`
          : `"${name}" has been added successfully.`,
      );
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not save product to database.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (p: Product) => {
    Alert.alert("Delete Product", `Delete "${p.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/api/products/${p.id}`);
            await fetchProducts();
            Alert.alert("Success", "Product deleted successfully.");
          } catch (err: any) {
            Alert.alert("Error", err.message || "Could not delete product.");
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Product }) => (
    <View style={styles.card}>
      <View style={styles.thumbBox}>
        {item.imageUrl ? (
          <Image
            key={`${item.imageUrl}-${item.updatedAt || ''}`}
            source={{ uri: item.imageUrl }}
            style={styles.thumb}
            contentFit="cover"
            cachePolicy="none"
          />
        ) : (
          <Text style={{ fontSize: 24 }}>{item.emoji || "📦"}</Text>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardMeta}>{item.state}  -  {item.serviceCity || "-"}</Text>
        <Text style={styles.cardMeta}>Stock: {item.stock}  -  {formatRupees(item.price)}</Text>
        <View style={[styles.availBadge, { backgroundColor: item.availability === "available" ? "#DCFCE7" : "#FEE2E2" }]}>
          <Text style={[styles.availText, { color: item.availability === "available" ? "#15803D" : "#B91C1C" }]}>
            {item.availability === "available" ? "Available" : "Out of Stock"}
          </Text>
        </View>
      </View>
      <Pressable onPress={() => openEdit(item)} style={styles.actionBtn}>
        <Ionicons name="create-outline" size={18} color={PRIMARY} />
      </Pressable>
      <Pressable onPress={() => handleDelete(item)} style={styles.actionBtn}>
        <Ionicons name="trash-outline" size={18} color="#DC2626" />
      </Pressable>
    </View>
  );

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />
      <AdminHeader title="Products" onMenuPress={() => setDrawerOpen(true)} />

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search products..."
          placeholderTextColor="#9CA3AF"
        />
        {search ? (
          <Pressable onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={PRIMARY} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 80 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchProducts(true)} tintColor={PRIMARY} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>{search ? "No results." : "No products. Tap + to add."}</Text>
            </View>
          }
        />
      )}

      <Pressable onPress={openAdd} style={[styles.fab, { bottom: insets.bottom + 20 }]}>
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>

      <CrudModal
        visible={modalOpen}
        title={editItem ? "Edit Product" : "Add Product"}
        fields={FIELDS}
        initial={editItem ? { ...editItem } : { availability: "available" }}
        saving={saving}
        onSave={handleSave}
        onCancel={() => setModalOpen(false)}
      />

      <AdminDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} activeRoute="/admin/products" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen:    { flex: 1, backgroundColor: BG },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    margin: 16, backgroundColor: "#fff", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: "#E5E7EB",
  },
  searchInput:  { flex: 1, fontSize: 14, color: "#1F2937" },
  list:         { paddingHorizontal: 16 },
  card: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10,
  },
  thumbBox: {
    width: 46, height: 46, borderRadius: 12, backgroundColor: "#F3F4F6",
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  thumb:        { width: 46, height: 46, borderRadius: 12 },
  cardName:     { fontSize: 14, fontWeight: "700", color: "#1F2937" },
  cardMeta:     { fontSize: 12, color: "#6B7280", marginTop: 2 },
  availBadge:   { marginTop: 6, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  availText:    { fontSize: 11, fontWeight: "700" },
  actionBtn:    { padding: 8 },
  emptyBox:     { padding: 40, alignItems: "center" },
  emptyText:    { color: "#9CA3AF", fontSize: 14 },
  fab: {
    position: "absolute", right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 8,
  },
});

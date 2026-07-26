//  app/admin/categories.tsx
//
//  Admin Categories CRUD - reads/writes states/{state}/categories/{id}
//  Validated add/edit/delete with CrudModal.
//  Chunked fetching (5 states at a time) to avoid quota issues.

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
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../utils/firebase";
import { AdminHeader } from "../../components/admin/AdminHeader";
import { AdminDrawer } from "../../components/admin/AdminDrawer";
import { CrudModal, FieldDef } from "../../components/admin/CrudModal";
import { INDIAN_STATES } from "../../utils/indianStates";

const PRIMARY = "#16A34A";
const BG      = "#F3F4F6";
const CHUNK   = 5; // fetch 5 states at a time to avoid quota

interface Category {
  id:    string;
  state: string;
  name:  string;
  icon:  string;
  color: string;
  order: number;
}

const FIELDS: FieldDef[] = [
  { key: "state", label: "State (Firestore document name)", type: "text",   placeholder: "e.g. Bihar",       required: true },
  { key: "name",  label: "Category Name",                   type: "text",   placeholder: "e.g. Vegetables",  required: true },
  { key: "icon",  label: "Icon — paste image URL OR emoji", type: "text",   placeholder: "https://... or 🥦", required: true },
  { key: "color", label: "Color (hex)",                     type: "text",   placeholder: "e.g. #4ADE80",     required: true },
  { key: "order", label: "Sort Order",                      type: "number", placeholder: "e.g. 1",           required: true, keyboardType: "numeric" },
];

export default function CategoriesScreen() {
  const insets = useSafeAreaInsets();
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [categories,  setCategories]  = useState<Category[]>([]);
  const [filtered,    setFiltered]    = useState<Category[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [search,      setSearch]      = useState("");
  const [modalOpen,   setModalOpen]   = useState(false);
  const [editItem,    setEditItem]    = useState<Category | null>(null);
  const [saving,      setSaving]      = useState(false);

  // ── Chunked fetch to avoid 36 simultaneous requests ──────────────────────
  const fetchAll = useCallback(async () => {
    try {
      const all: Category[] = [];
      for (let i = 0; i < INDIAN_STATES.length; i += CHUNK) {
        const chunk = INDIAN_STATES.slice(i, i + CHUNK);
        await Promise.all(
          chunk.map(async (stateName) => {
            try {
              const snap = await getDocs(
                query(collection(db, "states", stateName, "categories"), orderBy("order")),
              );
              snap.docs.forEach((d) =>
                all.push({ id: d.id, state: stateName, ...d.data() } as Category),
              );
            } catch {
              // state may not exist — skip silently
            }
          }),
        );
      }
      all.sort((a, b) => a.state.localeCompare(b.state) || a.order - b.order);
      setCategories(all);
      setFiltered(all);
    } catch {
      Alert.alert("Error", "Could not load categories.");
    }
  }, []);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    await fetchAll();
    setLoading(false); setRefreshing(false);
  }, [fetchAll]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      q
        ? categories.filter(
            (c) =>
              c.name.toLowerCase().includes(q) ||
              c.state.toLowerCase().includes(q),
          )
        : categories,
    );
  }, [search, categories]);

  const openAdd  = () => { setEditItem(null); setModalOpen(true); };
  const openEdit = (cat: Category) => { setEditItem(cat); setModalOpen(true); };

  const handleSave = async (data: Record<string, unknown>) => {
    try {
      setSaving(true);
      const state   = String(data.state ?? "").trim();
      const payload = {
        name:      String(data.name  ?? "").trim(),
        icon:      String(data.icon  ?? "").trim(),
        color:     String(data.color ?? "").trim(),
        order:     Number(data.order) || 0,
        updatedAt: serverTimestamp(),
      };

      if (editItem) {
        await updateDoc(doc(db, "states", editItem.state, "categories", editItem.id), payload);
      } else {
        await addDoc(collection(db, "states", state, "categories"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
      setModalOpen(false);
      await load();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not save category.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (cat: Category) => {
    Alert.alert("Delete Category", `Delete "${cat.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "states", cat.state, "categories", cat.id));
            await load();
          } catch {
            Alert.alert("Error", "Could not delete category.");
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Category }) => (
    <View style={styles.card}>
      <View style={[styles.iconBox, { backgroundColor: item.color + "28" }]}>
        <Text style={styles.iconText}>{item.icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardName}>{item.name}</Text>
        <View style={styles.metaRow}>
          <View style={[styles.colorDot, { backgroundColor: item.color }]} />
          <Text style={styles.cardMeta}>{item.state}</Text>
          <Text style={styles.cardMetaSep}>·</Text>
          <Text style={styles.cardMeta}>Order {item.order}</Text>
        </View>
      </View>
      <Pressable onPress={() => openEdit(item)} style={styles.actionBtn} hitSlop={4}>
        <Ionicons name="create-outline" size={18} color={PRIMARY} />
      </Pressable>
      <Pressable onPress={() => handleDelete(item)} style={styles.actionBtn} hitSlop={4}>
        <Ionicons name="trash-outline" size={18} color="#DC2626" />
      </Pressable>
    </View>
  );

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />
      <AdminHeader title="Categories" onMenuPress={() => setDrawerOpen(true)} />

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search categories..."
          placeholderTextColor="#9CA3AF"
        />
        {search ? (
          <Pressable onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>Loading categories…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => `${i.state}-${i.id}`}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 80 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={PRIMARY} />}
          removeClippedSubviews
          windowSize={10}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="list-outline" size={40} color="#D1D5DB" />
              <Text style={styles.emptyText}>
                {search ? "No results found." : "No categories yet. Tap + to add."}
              </Text>
            </View>
          }
        />
      )}

      <Pressable onPress={openAdd} style={[styles.fab, { bottom: insets.bottom + 20 }]}>
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>

      <CrudModal
        visible={modalOpen}
        title={editItem ? "Edit Category" : "Add Category"}
        fields={FIELDS}
        initial={editItem ? { ...editItem } : undefined}
        saving={saving}
        onSave={handleSave}
        onCancel={() => setModalOpen(false)}
      />

      <AdminDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} activeRoute="/admin/categories" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen:     { flex: 1, backgroundColor: BG },
  searchBar:  {
    flexDirection: "row", alignItems: "center", gap: 8,
    margin: 16, backgroundColor: "#fff", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: "#E5E7EB",
  },
  searchInput: { flex: 1, fontSize: 14, color: "#1F2937" },
  loadingBox:  { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { color: "#6B7280", fontSize: 14 },
  list:        { paddingHorizontal: 16 },
  card: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 2,
  },
  iconBox:   { width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  iconText:  { fontSize: 24 },
  cardName:  { fontSize: 15, fontWeight: "700", color: "#1F2937" },
  metaRow:   { flexDirection: "row", alignItems: "center", marginTop: 3, gap: 6 },
  colorDot:  { width: 8, height: 8, borderRadius: 4 },
  cardMeta:  { fontSize: 12, color: "#6B7280" },
  cardMetaSep: { fontSize: 12, color: "#D1D5DB" },
  actionBtn: { padding: 8 },
  emptyBox:  { padding: 40, alignItems: "center", gap: 12 },
  emptyText: { color: "#9CA3AF", fontSize: 14, textAlign: "center" },
  fab: {
    position: "absolute", right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 8,
  },
});


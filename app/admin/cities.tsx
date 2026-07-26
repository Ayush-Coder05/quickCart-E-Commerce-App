// app/admin/cities.tsx
//
// Admin CRUD for service cities/areas — with search and improved visuals.

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

const PRIMARY = "#16A34A";
const BG      = "#F3F4F6";

interface City {
  id:        string;
  name:      string;
  state:     string;
  active:    boolean;
  createdAt?: any;
}

const FIELDS: FieldDef[] = [
  { key: "name",   label: "City Name",  type: "text",    placeholder: "e.g. Patna",  required: true },
  { key: "state",  label: "State Name", type: "text",    placeholder: "e.g. Bihar",  required: true },
  { key: "active", label: "Active (serving customers)", type: "boolean" },
];

export default function CitiesScreen() {
  const insets = useSafeAreaInsets();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cities,     setCities]     = useState<City[]>([]);
  const [filtered,   setFiltered]   = useState<City[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState("");
  const [modalOpen,  setModalOpen]  = useState(false);
  const [editItem,   setEditItem]   = useState<City | null>(null);
  const [saving,     setSaving]     = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const snap = await getDocs(query(collection(db, "cities"), orderBy("state")));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as City));
      setCities(list);
      setFiltered(list);
    } catch {
      Alert.alert("Error", "Could not load cities.");
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
        ? cities.filter(
            (c) =>
              c.name.toLowerCase().includes(q) ||
              c.state.toLowerCase().includes(q),
          )
        : cities,
    );
  }, [search, cities]);

  const handleSave = async (data: Record<string, unknown>) => {
    try {
      setSaving(true);
      const payload = {
        name:      String(data.name  ?? "").trim(),
        state:     String(data.state ?? "").trim(),
        active:    Boolean(data.active),
        updatedAt: serverTimestamp(),
      };
      if (editItem) {
        await updateDoc(doc(db, "cities", editItem.id), payload);
      } else {
        await addDoc(collection(db, "cities"), { ...payload, createdAt: serverTimestamp() });
      }
      setModalOpen(false);
      await load();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not save city.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (city: City) => {
    Alert.alert("Delete City", `Delete "${city.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "cities", city.id));
            await load();
          } catch {
            Alert.alert("Error", "Could not delete city.");
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: City }) => (
    <View style={styles.card}>
      <View style={[styles.statusDot, { backgroundColor: item.active ? "#10B981" : "#D1D5DB" }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.cardName}>{item.name}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={12} color="#9CA3AF" />
          <Text style={styles.cardMeta}>{item.state}</Text>
          <View style={[styles.activeBadge, { backgroundColor: item.active ? "#DCFCE7" : "#F3F4F6" }]}>
            <Text style={[styles.activeText, { color: item.active ? "#15803D" : "#6B7280" }]}>
              {item.active ? "Active" : "Inactive"}
            </Text>
          </View>
        </View>
      </View>
      <Pressable onPress={() => { setEditItem(item); setModalOpen(true); }} style={styles.actionBtn} hitSlop={4}>
        <Ionicons name="create-outline" size={18} color={PRIMARY} />
      </Pressable>
      <Pressable onPress={() => handleDelete(item)} style={styles.actionBtn} hitSlop={4}>
        <Ionicons name="trash-outline" size={18} color="#DC2626" />
      </Pressable>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />
      <AdminHeader title="Cities / Service Areas" onMenuPress={() => setDrawerOpen(true)} />

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by city or state..."
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
          <Text style={styles.loadingText}>Loading cities…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 80 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={PRIMARY} />}
          removeClippedSubviews
          windowSize={10}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="location-outline" size={40} color="#D1D5DB" />
              <Text style={styles.emptyText}>
                {search ? "No cities match your search." : "No cities yet. Tap + to add."}
              </Text>
            </View>
          }
        />
      )}

      <Pressable
        onPress={() => { setEditItem(null); setModalOpen(true); }}
        style={[styles.fab, { bottom: insets.bottom + 20 }]}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>

      <CrudModal
        visible={modalOpen}
        title={editItem ? "Edit City" : "Add City"}
        fields={FIELDS}
        initial={(editItem ?? { active: true }) as Record<string, unknown>}
        saving={saving}
        onSave={handleSave}
        onCancel={() => setModalOpen(false)}
      />

      <AdminDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} activeRoute="/admin/cities" />
    </View>
  );
}

const styles = StyleSheet.create({
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
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 2,
  },
  statusDot:  { width: 10, height: 10, borderRadius: 5, marginTop: 2 },
  cardName:   { fontSize: 15, fontWeight: "700", color: "#1F2937" },
  metaRow:    { flexDirection: "row", alignItems: "center", marginTop: 4, gap: 6 },
  cardMeta:   { fontSize: 12, color: "#6B7280", flex: 1 },
  activeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  activeText:  { fontSize: 11, fontWeight: "700" },
  actionBtn:  { padding: 8 },
  emptyBox:   { padding: 40, alignItems: "center", gap: 12 },
  emptyText:  { color: "#9CA3AF", fontSize: 14, textAlign: "center" },
  fab: {
    position: "absolute", right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 8,
  },
});


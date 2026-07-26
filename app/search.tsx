import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MainTabs, MAIN_TABS_HEIGHT } from "../components/MainTabs";
import { FirestoreProduct, subscribeToStateProducts } from "../services/firestoreService";
import { cartStore } from "../utils/cartStore";
import { formatRupees } from "../utils/currency";
import { stateStore } from "../utils/stateStore";

const PRIMARY = "#16A34A";
const BG = "#F3F4F6";
const TEXT = "#1F2937";
const MUTED = "#6B7280";

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<FirestoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedState, setSelectedState] = useState(stateStore.current);

  useEffect(() => stateStore.subscribe(setSelectedState), []);

  useEffect(() => {
    if (!selectedState) {
      setLoading(false);
      return;
    }
    const unsub = subscribeToStateProducts(selectedState, (items) => {
      setProducts(items);
      setLoading(false);
    });
    return unsub;
  }, [selectedState]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return products;
    return products.filter((item) =>
      `${item.title} ${item.label ?? ""} ${item.categoryId ?? ""}`.toLowerCase().includes(needle),
    );
  }, [products, query]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
        <Text style={styles.subtitle}>Find products available in your selected state.</Text>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color={MUTED} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search milk, bread, snacks..."
          placeholderTextColor={MUTED}
          style={styles.input}
          autoFocus
        />
        {query ? (
          <Pressable onPress={() => setQuery("")} hitSlop={10}>
            <Ionicons name="close-circle" size={20} color={MUTED} />
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={PRIMARY} />
          <Text style={styles.emptyText}>Loading products...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: MAIN_TABS_HEIGHT + insets.bottom + 24 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="search-outline" size={44} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No products found</Text>
              <Text style={styles.emptyText}>Try a different name or change your state.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => router.push({ pathname: "/product/[id]", params: { id: item.id, product: JSON.stringify(item) } })}
            >
              <View style={styles.thumb}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.image} contentFit="cover" />
                ) : (
                  <Ionicons name="image-outline" size={26} color="#9CA3AF" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.meta}>{item.label || item.categoryId || "QuickCart item"}</Text>
                <Text style={styles.price}>{formatRupees(item.price ?? 0)}</Text>
              </View>
              <Pressable style={styles.addBtn} onPress={() => cartStore.add(item)}>
                <Text style={styles.addText}>ADD</Text>
              </Pressable>
            </Pressable>
          )}
        />
      )}

      <MainTabs active="search" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  header: { backgroundColor: "#FFFFFF", paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 },
  title: { color: TEXT, fontSize: 24, fontWeight: "900" },
  subtitle: { color: MUTED, fontSize: 13, marginTop: 3, fontWeight: "500" },
  searchBox: {
    margin: 16,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 10,
  },
  input: { flex: 1, color: TEXT, fontSize: 15, fontWeight: "600" },
  center: { alignItems: "center", justifyContent: "center", padding: 28, gap: 8 },
  emptyTitle: { color: TEXT, fontSize: 16, fontWeight: "800" },
  emptyText: { color: MUTED, fontSize: 13, textAlign: "center" },
  card: {
    minHeight: 92,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
  },
  thumb: { width: 64, height: 64, borderRadius: 12, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  image: { width: "100%", height: "100%" },
  name: { color: TEXT, fontSize: 14, fontWeight: "800" },
  meta: { color: MUTED, fontSize: 12, marginTop: 3 },
  price: { color: PRIMARY, fontSize: 15, fontWeight: "900", marginTop: 5 },
  addBtn: { borderWidth: 1, borderColor: PRIMARY, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  addText: { color: PRIMARY, fontSize: 12, fontWeight: "900" },
});






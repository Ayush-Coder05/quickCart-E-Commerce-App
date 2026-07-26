import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, StatusBar } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AdminHeader } from "../../components/admin/AdminHeader";
import { AdminDrawer } from "../../components/admin/AdminDrawer";

const PRIMARY = "#16A34A";
const BG = "#F3F4F6";

const CRUD_ENTITIES = [
  { label: "Categories", route: "/admin/categories", icon: "list-outline", description: "Create, read, update, and delete product categories." },
  { label: "Products", route: "/admin/products", icon: "cube-outline", description: "Create, read, update, and delete products." },
  { label: "Cities / Areas", route: "/admin/cities", icon: "location-outline", description: "Create, read, update, and delete service cities." },
  { label: "Users", route: "/admin/users", icon: "people-outline", description: "Create, read, update, and delete app users." },
  { label: "Orders", route: "/admin/orders", icon: "car-outline", description: "Read and update order statuses." },
];

export default function CrudScreen() {
  const insets = useSafeAreaInsets();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />
      <AdminHeader title="CRUD Operations" onMenuPress={() => setDrawerOpen(true)} />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}>
        <Text style={styles.title}>Manage Data</Text>
        <Text style={styles.subtitle}>Select an entity to perform Create, Read, Update, or Delete operations.</Text>

        <View style={styles.grid}>
          {CRUD_ENTITIES.map((entity, index) => (
            <Pressable
              key={index}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => router.push(entity.route as any)}
            >
              <View style={styles.iconContainer}>
                <Ionicons name={entity.icon as any} size={28} color={PRIMARY} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{entity.label}</Text>
                <Text style={styles.cardDesc}>{entity.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <AdminDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} activeRoute="/admin/crud" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 24,
  },
  grid: {
    gap: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  cardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#F3E5F5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: "#6B7280",
  },
});


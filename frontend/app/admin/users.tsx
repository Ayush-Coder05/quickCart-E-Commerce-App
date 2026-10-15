// app/admin/users.tsx
//
// Admin Users CRUD via MongoDB FastAPI backend (/api/users)

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

import { api } from "../../utils/api";
import { AdminHeader } from "../../components/admin/AdminHeader";
import { AdminDrawer } from "../../components/admin/AdminDrawer";
import { CrudModal, FieldDef } from "../../components/admin/CrudModal";

const PRIMARY = "#16A34A";
const BG      = "#F3F4F6";

interface AppUser {
  id:        string;
  fullName:  string;
  email:     string;
  mobile:    string;
  role:      string;
  createdAt?: any;
}

const FIELDS: FieldDef[] = [
  { key: "fullName", label: "Full Name", type: "text", placeholder: "e.g. John Doe",          required: true },
  { key: "email",    label: "Email",     type: "text", placeholder: "e.g. john@example.com",  required: true },
  { key: "mobile",   label: "Mobile",    type: "text", placeholder: "e.g. 9876543210" },
  {
    key: "role", label: "Role", type: "select", required: true,
    options: [
      { label: "Customer", value: "customer" },
      { label: "Admin",    value: "admin" },
    ],
  },
];

export default function UsersScreen() {
  const insets = useSafeAreaInsets();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [users,      setUsers]      = useState<AppUser[]>([]);
  const [filtered,   setFiltered]   = useState<AppUser[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState("");
  const [modalOpen,  setModalOpen]  = useState(false);
  const [editItem,   setEditItem]   = useState<AppUser | null>(null);
  const [saving,     setSaving]     = useState(false);

  const fetchUsers = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const res = await api.get<{ success: boolean; users: any[] }>("/api/users");
      if (res?.users && Array.isArray(res.users)) {
        const list: AppUser[] = res.users.map((d) => ({
          id:        d.id || d._id,
          fullName:  d.fullName || "",
          email:     d.email || "",
          mobile:    d.mobile || "",
          role:      d.role || "customer",
          createdAt: d.createdAt,
        }));
        setUsers(list);
        setFiltered(list);
      }
    } catch (err: any) {
      console.warn("Could not load users from MongoDB:", err);
      Alert.alert("Error", "Could not load users.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      q
        ? users.filter(
            (u) =>
              (u.fullName || "").toLowerCase().includes(q) ||
              (u.email    || "").toLowerCase().includes(q) ||
              (u.mobile   || "").toLowerCase().includes(q),
          )
        : users,
    );
  }, [search, users]);

  const handleSave = async (data: Record<string, unknown>) => {
    try {
      setSaving(true);
      const payload = {
        fullName: String(data.fullName ?? "").trim(),
        email:    String(data.email    ?? "").trim().toLowerCase(),
        mobile:   String(data.mobile   ?? "").trim(),
        role:     String(data.role     ?? "customer"),
      };

      if (editItem) {
        await api.put(`/api/users/${editItem.id}`, payload);
      } else {
        await api.post("/api/users", { ...payload, password: "ChangeMe123!" });
      }

      setModalOpen(false);
      await fetchUsers();
      Alert.alert(
        editItem ? "User Updated" : "User Added",
        editItem ? "User updated successfully." : "User created successfully with default temporary password."
      );
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not save user.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (user: AppUser) => {
    Alert.alert("Delete User", `Delete "${user.fullName || user.email}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/api/users/${user.id}`);
            await fetchUsers();
            Alert.alert("Success", "User deleted successfully.");
          } catch (err: any) {
            Alert.alert("Error", err.message || "Could not delete user.");
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: AppUser }) => (
    <View style={styles.card}>
      <View style={[styles.avatar, { backgroundColor: item.role === "admin" ? "#EDE7F6" : "#E0F2FE" }]}>
        <Ionicons
          name={item.role === "admin" ? "shield-checkmark" : "person"}
          size={20}
          color={item.role === "admin" ? PRIMARY : "#0369A1"}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.fullName || "—"}</Text>
        <Text style={styles.email} numberOfLines={1}>{item.email || "—"}</Text>
        {item.mobile ? <Text style={styles.mobile}>{item.mobile}</Text> : null}
      </View>
      <View style={[styles.roleBadge, { backgroundColor: item.role === "admin" ? "#EDE7F6" : "#F3F4F6" }]}>
        <Text style={[styles.roleText, { color: item.role === "admin" ? PRIMARY : "#374151" }]}>
          {item.role || "customer"}
        </Text>
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
      <AdminHeader title="Users" onMenuPress={() => setDrawerOpen(true)} />

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or email..."
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
          <Text style={styles.loadingText}>Loading users…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 80 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchUsers(true)} tintColor={PRIMARY} />}
          removeClippedSubviews
          windowSize={10}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="people-outline" size={40} color="#D1D5DB" />
              <Text style={styles.emptyText}>
                {search ? "No users match your search." : "No users found."}
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
        title={editItem ? "Edit User" : "Add User"}
        fields={FIELDS}
        initial={(editItem ?? { role: "customer" }) as Record<string, unknown>}
        saving={saving}
        onSave={handleSave}
        onCancel={() => setModalOpen(false)}
      />

      <AdminDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} activeRoute="/admin/users" />
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
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 2,
  },
  avatar:    { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  name:      { fontSize: 14, fontWeight: "700", color: "#1F2937" },
  email:     { fontSize: 12, color: "#6B7280", marginTop: 2 },
  mobile:    { fontSize: 12, color: "#9CA3AF", marginTop: 1 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  roleText:  { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
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

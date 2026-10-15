// ─────────────────────────────────────────────────────────────────────────────
//  app/state-picker.tsx
//
//  Shown when location detection fails or is skipped.
//  Lets the user search and manually select any Indian State/UT.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useMemo, useRef, useCallback } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  BackHandler,
  ToastAndroid,
  Alert
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, router, useFocusEffect } from "expo-router";

import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { INDIAN_STATES } from "../utils/indianStates";
import { stateStore } from "../utils/stateStore";

export default function StatePickerScreen() {
  const insets = useSafeAreaInsets();
  const { hint } = useLocalSearchParams<{ hint?: string }>();


  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  
  const flatListRef = useRef<FlatList>(null);
  const backPressCount = useRef(0);

  // ── Handle Back Press Logic ──────────────────────────────────────────────
  const handleBackPress = useCallback(() => {
    // Navigate to the previous screen if one exists.
    if (router.canGoBack()) {
      router.back();
      return true;
    }

    // If this screen is the first screen, prevent accidental exit by showing a toast
    // A second back press within 2 seconds should exit the app.
    if (backPressCount.current === 1) {
      BackHandler.exitApp();
      return true;
    }

    backPressCount.current = 1;
    if (Platform.OS === 'android') {
      ToastAndroid.show("Press back again to exit", ToastAndroid.SHORT);
    } else {
      Alert.alert("Exit App", "Press back again to exit");
    }

    setTimeout(() => {
      backPressCount.current = 0;
    }, 2000);

    return true;
  }, []);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener("hardwareBackPress", handleBackPress);
      return () => subscription.remove();
    }, [handleBackPress])
  );

  // ── Filter states ──────────────────────────────────────────────────────────
  const filteredStates = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return INDIAN_STATES;
    return INDIAN_STATES.filter((s) => s.toLowerCase().includes(q));
  }, [search]);

  // ── Selection Logic ────────────────────────────────────────────────────────
  const handleSelect = (item: string, index: number) => {
    setSelected(item);
    // Auto-scroll to selected item to improve UX
    try {
      flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
    } catch (e) {
      // Ignore layout errors if list is too small
    }
  };

  // ── Continue to Home ───────────────────────────────────────────────────────
  const handleContinue = () => {
    if (!selected) return;
    stateStore.set(selected);
    if (router.canDismiss()) {
      router.dismissAll();
    }
    router.replace({ pathname: "/home", params: { state: selected } });
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar style="light" />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 60) }]}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={26} color="#1F2937" />
        </TouchableOpacity>

        {hint && (
          <View style={styles.hintBanner}>
            <Ionicons name="information-circle-outline" size={18} color="#FBBF24" />
            <Text style={styles.hintText}>{hint}</Text>
          </View>
        )}

        <Text style={styles.title}>Select your state</Text>
        <Text style={styles.subtitle}>
          Choose your Indian State or Union Territory to see relevant products and deals.
        </Text>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#8B949E" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search state..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")} style={styles.clearIcon}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {selected && (
          <View style={styles.selectedBadge}>
            <Ionicons name="location" size={14} color="#16A34A" />
            <Text style={styles.selectedBadgeText}>{selected}</Text>
            <TouchableOpacity onPress={() => setSelected(null)} style={styles.selectedBadgeClose}>
              <Ionicons name="close" size={14} color="#16A34A" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.divider} />

      {/* ── List ───────────────────────────────────────────────────────────── */}
      <FlatList
        ref={flatListRef}
        data={filteredStates}
        keyExtractor={(item) => item}
        keyboardShouldPersistTaps="handled"
        // Dynamically compute padding to ensure the last item is accessible above the footer
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 140 }]}
        getItemLayout={(data, index) => ({ length: 50, offset: 50 * index, index })}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No states found for &quot;{search}&quot;</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const isSelected = item === selected;
          return (
            <TouchableOpacity
              style={[styles.listItem, isSelected && styles.listItemSelected]}
              onPress={() => handleSelect(item, index)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isSelected ? "radio-button-on" : "radio-button-off"}
                size={22}
                color={isSelected ? "#16A34A" : "#D1D5DB"}
              />
              <Text style={[styles.listItemText, isSelected && styles.listItemTextSelected]}>
                {item}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 12, 24) }]}>
        <TouchableOpacity
          style={[styles.btn, !selected && styles.btnDisabled]}
          activeOpacity={0.8}
          disabled={!selected}
          onPress={handleContinue}
        >
          <LinearGradient
            colors={!selected ? ["#F3F4F6", "#F3F4F6"] : ["#16A34A", "#15803D"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btnGradient}
          >
            <Text style={[styles.btnText, !selected && { color: "#9CA3AF" }]}>
              Continue
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  backBtn: {
    marginBottom: 16,
    alignSelf: "flex-start",
    padding: 4,
    marginLeft: -4,
  },
  hintBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
    marginBottom: 20,
    gap: 8,
  },
  hintText: {
    color: "#D97706",
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: "#1F2937",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 24,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    height: 48,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: "#1F2937",
    fontSize: 15,
    height: "100%",
  },
  clearIcon: {
    padding: 4,
  },
  selectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#86EFAC",
    gap: 6,
  },
  selectedBadgeText: {
    color: "#16A34A",
    fontSize: 13,
    fontWeight: "700",
  },
  selectedBadgeClose: {
    marginLeft: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  listContent: {
    paddingVertical: 8,
  },
  emptyContainer: {
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    color: "#6B7280",
    fontSize: 14,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 12,
  },
  listItemSelected: {
    backgroundColor: "#F0FDF4",
  },
  listItemText: {
    fontSize: 15,
    color: "#374151",
    fontWeight: "500",
  },
  listItemTextSelected: {
    color: "#16A34A",
    fontWeight: "700",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 15,
  },
  btn: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
  },
  btnDisabled: {
    opacity: 0.8,
  },
  btnGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.3,
  },
});


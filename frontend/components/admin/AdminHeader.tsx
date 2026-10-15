// components/admin/AdminHeader.tsx
//
// Polished admin header with safe-area support and optional back button.

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

const PRIMARY = "#16A34A";

interface Props {
  title:        string;
  onMenuPress?: () => void;
  /** When provided, renders a back arrow instead of the hamburger menu */
  onBack?:      () => void;
  /** Right-side action element */
  rightAction?: React.ReactNode;
}

export function AdminHeader({ title, onMenuPress, onBack, rightAction }: Props) {
  const insets = useSafeAreaInsets();

  const leftBtn = onBack
    ? (
      <Pressable
        onPress={onBack ?? (() => router.back())}
        style={styles.iconBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </Pressable>
    )
    : (
      <Pressable
        onPress={onMenuPress}
        style={styles.iconBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="menu" size={26} color="#fff" />
      </Pressable>
    );

  return (
    <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
      {leftBtn}
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <View style={styles.rightSlot}>
        {rightAction ?? null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor:   PRIMARY,
    flexDirection:     "row",
    alignItems:        "center",
    paddingBottom:     14,
    paddingHorizontal: 8,
    shadowColor:       "#000",
    shadowOffset:      { width: 0, height: 2 },
    shadowOpacity:     0.15,
    shadowRadius:      4,
    elevation:         4,
  },
  iconBtn:   { padding: 8, borderRadius: 8, minWidth: 44, alignItems: "center", justifyContent: "center" },
  title:     { flex: 1, color: "#fff", fontSize: 18, fontWeight: "800", textAlign: "center", letterSpacing: 0.2 },
  rightSlot: { minWidth: 44, alignItems: "flex-end" },
});


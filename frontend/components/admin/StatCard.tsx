// components/admin/StatCard.tsx
//
// Dashboard stat card with color accent, icon, and auto-sizing value.

import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  icon:     keyof typeof Ionicons.glyphMap;
  label:    string;
  value:    string | number;
  color?:   string;
  loading?: boolean;
}

export function StatCard({ icon, label, value, color = "#16A34A", loading }: Props) {
  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <View style={[styles.iconBox, { backgroundColor: color + "18" }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={color} style={{ marginTop: 10, marginBottom: 6 }} />
      ) : (
        <Text
          style={[styles.value, { color }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
        >
          {value}
        </Text>
      )}
      <Text style={styles.label} numberOfLines={2}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex:             1,
    minWidth:         140,
    backgroundColor:  "#fff",
    borderRadius:     14,
    padding:          16,
    borderLeftWidth:  3,
    alignItems:       "flex-start",
    shadowColor:      "#000",
    shadowOffset:     { width: 0, height: 2 },
    shadowOpacity:    0.06,
    shadowRadius:     6,
    elevation:        3,
  },
  iconBox:  {
    width:          38,
    height:         38,
    borderRadius:   10,
    alignItems:     "center",
    justifyContent: "center",
    marginBottom:   10,
  },
  value: {
    fontSize:    22,
    fontWeight:  "900",
    marginBottom: 4,
  },
  label: {
    fontSize:        11,
    color:           "#6B7280",
    fontWeight:      "600",
    textTransform:   "uppercase",
    letterSpacing:   0.4,
    lineHeight:      15,
  },
});


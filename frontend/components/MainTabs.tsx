import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ROUTES } from "../utils/routes";

type TabKey = "dashboard" | "search" | "orders" | "profile";

const PRIMARY = "#16A34A";
const TEXT = "#6B7280";

const tabs: {
  key: TabKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  route: any;
}[] = [
  { key: "dashboard", label: "Home", icon: "home-outline", activeIcon: "home", route: ROUTES.home },
  { key: "search", label: "Search", icon: "search-outline", activeIcon: "search", route: ROUTES.search },
  { key: "orders", label: "Orders", icon: "receipt-outline", activeIcon: "receipt", route: ROUTES.orders },
  { key: "profile", label: "Profile", icon: "person-outline", activeIcon: "person", route: ROUTES.profile },
];

export function MainTabs({ active }: { active: TabKey }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.shell, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {tabs.map((tab) => {
        const selected = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => {
              if (!selected) router.replace(tab.route);
            }}
            style={styles.tab}
          >
            <View style={[styles.iconPill, selected && styles.iconPillActive]}>
              <Ionicons
                name={selected ? tab.activeIcon : tab.icon}
                size={20}
                color={selected ? PRIMARY : TEXT}
              />
            </View>
            <Text style={[styles.label, selected && styles.labelActive]} numberOfLines={1}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const MAIN_TABS_HEIGHT = 68;

const styles = StyleSheet.create({
  shell: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: MAIN_TABS_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 6,
    paddingHorizontal: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 10,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  iconPill: {
    width: 42,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  iconPillActive: {
    backgroundColor: "#DCFCE7",
  },
  label: {
    color: TEXT,
    fontSize: 10,
    fontWeight: "700",
  },
  labelActive: {
    color: PRIMARY,
    fontWeight: "900",
  },
});




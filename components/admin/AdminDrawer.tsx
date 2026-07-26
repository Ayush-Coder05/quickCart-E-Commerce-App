// ─────────────────────────────────────────────────────────────────────────────
//  components/admin/AdminDrawer.tsx
//
//  Slide-in sidebar for the admin panel. Receives `isOpen`, `onClose`,
//  and `activeRoute` props so any admin screen can control it.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { logoutUser } from "../../utils/auth";
import { stateStore } from "../../utils/stateStore";

const { width: SW } = Dimensions.get("window");
const DRAWER_WIDTH  = Math.min(SW * 0.78, 300);
const PRIMARY       = "#16A34A";
const PRIMARY_LIGHT = "#F3E5F5";

type NavItem = {
  label:       string;
  icon:        keyof typeof Ionicons.glyphMap;
  route:       string;
  dividerAbove?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",         icon: "grid-outline",        route: "/admin/dashboard"  },
  { label: "Categories",        icon: "list-outline",        route: "/admin/categories" },
  { label: "Products",          icon: "cube-outline",        route: "/admin/products"   },
  { label: "Cities / Areas",    icon: "location-outline",    route: "/admin/cities"     },
  { label: "Orders",            icon: "car-outline",         route: "/admin/orders"     },
  { label: "Users",             icon: "people-outline",      route: "/admin/users", dividerAbove: true },
];

interface Props {
  isOpen:      boolean;
  onClose:     () => void;
  activeRoute: string;
}

export function AdminDrawer({ isOpen, onClose, activeRoute }: Props) {
  const insets      = useSafeAreaInsets();
  const translateX  = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOp   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue:         isOpen ? 0 : -DRAWER_WIDTH,
        duration:        260,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOp, {
        toValue:         isOpen ? 1 : 0,
        duration:        260,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isOpen]);

  const handleNavigate = (route: string) => {
    onClose();
    setTimeout(() => router.replace(route as any), 50);
  };

  const handleLogout = async () => {
    onClose();
    await stateStore.clear();
    await logoutUser();
  };

  return (
    <>
      {/* Backdrop */}
      <Animated.View
        pointerEvents={isOpen ? "auto" : "none"}
        style={[styles.overlay, { opacity: overlayOp }]}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      {/* Drawer panel */}
      <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
        {/* Brand header */}
        <View style={[styles.brand, { paddingTop: insets.top + 16 }]}>
          <View style={styles.brandIcon}>
            <Ionicons name="shield-checkmark" size={26} color="#fff" />
          </View>
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.brandTitle}>QuickCart</Text>
            <Text style={styles.brandSub}>Admin Panel</Text>
          </View>
        </View>

        {/* Nav items */}
        <ScrollView
          style={styles.nav}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 8 }}
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeRoute === item.route;
            return (
              <React.Fragment key={item.route}>
                {item.dividerAbove && <View style={styles.divider} />}
                <Pressable
                  onPress={() => handleNavigate(item.route)}
                  style={({ pressed }) => [
                    styles.navItem,
                    isActive  && styles.navItemActive,
                    pressed   && styles.navItemPressed,
                  ]}
                >
                  <View style={[styles.navIconBox, isActive && styles.navIconBoxActive]}>
                    <Ionicons
                      name={item.icon}
                      size={18}
                      color={isActive ? PRIMARY : "#6B7280"}
                    />
                  </View>
                  <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                    {item.label}
                  </Text>
                  {isActive && (
                    <View style={styles.activePill} />
                  )}
                </Pressable>
              </React.Fragment>
            );
          })}
        </ScrollView>

        {/* Footer: Logout */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.divider} />
          <Pressable onPress={handleLogout} style={styles.logoutBtn}>
            <View style={styles.logoutIconBox}>
              <Ionicons name="log-out-outline" size={18} color="#DC2626" />
            </View>
            <Text style={styles.logoutText}>Sign Out</Text>
          </Pressable>
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    zIndex:          99,
  },
  drawer: {
    position:        "absolute",
    top:             0,
    left:            0,
    bottom:          0,
    width:           DRAWER_WIDTH,
    backgroundColor: "#fff",
    zIndex:          100,
    shadowColor:     "#000",
    shadowOffset:    { width: 4, height: 0 },
    shadowOpacity:   0.15,
    shadowRadius:    16,
    elevation:       20,
  },

  // Brand
  brand: {
    flexDirection:     "row",
    alignItems:        "center",
    backgroundColor:   PRIMARY,
    paddingBottom:     20,
    paddingHorizontal: 20,
  },
  brandIcon: {
    width:           44,
    height:          44,
    borderRadius:    12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems:      "center",
    justifyContent:  "center",
  },
  brandTitle: { color: "#fff", fontSize: 18, fontWeight: "900" },
  brandSub:   { color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 1 },

  // Nav
  nav: { flex: 1, paddingHorizontal: 12 },
  navItem: {
    flexDirection:     "row",
    alignItems:        "center",
    paddingVertical:   11,
    paddingHorizontal: 10,
    borderRadius:      10,
    marginBottom:      2,
  },
  navItemActive:  { backgroundColor: PRIMARY_LIGHT },
  navItemPressed: { opacity: 0.7 },
  navIconBox: {
    width:           34,
    height:          34,
    borderRadius:    8,
    backgroundColor: "#F3F4F6",
    alignItems:      "center",
    justifyContent:  "center",
    marginRight:     12,
  },
  navIconBoxActive: { backgroundColor: "#EDE7F6" },
  navLabel:         { flex: 1, fontSize: 14, fontWeight: "600", color: "#374151" },
  navLabelActive:   { color: PRIMARY, fontWeight: "700" },
  activePill: {
    width:           4,
    height:          20,
    borderRadius:    2,
    backgroundColor: PRIMARY,
  },

  // Divider
  divider: {
    height:        1,
    backgroundColor: "#F3F4F6",
    marginHorizontal: 12,
    marginVertical:   8,
  },

  // Footer
  footer: { paddingHorizontal: 12 },
  logoutBtn: {
    flexDirection:  "row",
    alignItems:     "center",
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius:   10,
    backgroundColor: "#FEF2F2",
  },
  logoutIconBox: {
    width:           34,
    height:          34,
    borderRadius:    8,
    backgroundColor: "#FEE2E2",
    alignItems:      "center",
    justifyContent:  "center",
    marginRight:     12,
  },
  logoutText: { color: "#DC2626", fontSize: 14, fontWeight: "700" },
});


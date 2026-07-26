import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  ToastAndroid,
  Modal,
} from "react-native";
import { Image } from "expo-image";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  FirestoreBanner,
  FirestoreCategory,
  FirestoreProduct,
  getStateContent,
  subscribeToStateProducts,
} from "../services/firestoreService";
import { stateStore } from "../utils/stateStore";
import { ROUTES } from "../utils/routes";
import { formatRupees } from "../utils/currency";
import { cartStore } from "../utils/cartStore";
import { logoutUser } from "../utils/auth";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "../utils/firebase";
import { MainTabs, MAIN_TABS_HEIGHT } from "../components/MainTabs";

const { width: SW } = Dimensions.get("window");

const PRIMARY_COLOR = "#16A34A";
const ACCENT_COLOR = "#FFC200"; // Flipkart Minutes Yellow
const BG_COLOR = "#F3F4F6";      // Light Gray App Background
const TEXT_DARK = "#1F2937";
const TEXT_MUTED = "#6B7280";

function BannerSlide({ item }: { item: FirestoreBanner }) {
  const colors = item.gradientColors?.length === 3
    ? [item.gradientColors[0], item.gradientColors[1], item.gradientColors[2]] as const
    : ["#22C55E", "#16A34A", "#15803D"] as const;

  return (
    <LinearGradient colors={colors} style={styles.bannerSlide} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <View style={styles.bannerContent}>
        <Text style={styles.bannerTitle}>{item.title}</Text>
        {item.subtitle ? <Text style={styles.bannerSub}>{item.subtitle}</Text> : null}
        <View style={styles.bannerBtn}>
          <Text style={styles.bannerBtnText}>Shop Now</Text>
        </View>
      </View>
      {item.emoji ? (<Text style={styles.bannerEmoji}>{item.emoji}</Text>) : (<View style={styles.bannerIconFallback}><Ionicons name="bag-handle" size={42} color="rgba(255,255,255,0.92)" /></View>)}
    </LinearGradient>
  );
}

// Accepts a single stable `onSelectCat` so React.memo actually bails out:
// only the circle whose `selected` prop flips will re-render.
const CategoryCircle = memo(function CategoryCircle({
  item,
  selected,
  onSelectCat,
}: {
  item: FirestoreCategory | { id: string; name: string; icon: string; color: string };
  selected: boolean;
  onSelectCat: (id: string) => void;
}) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = useCallback(() => {
    scale.value = withSpring(0.92, { damping: 10 }, () => { scale.value = withSpring(1); });
    onSelectCat(item.id);
  }, [item.id, onSelectCat]);

  const isImageUrl = typeof item.icon === "string" &&
    (item.icon.startsWith("http://") || item.icon.startsWith("https://"));

  return (
    <Animated.View style={anim}>
      <Pressable onPress={handlePress} style={styles.categoryItem}>
        <View style={[styles.categoryCircle, selected && styles.categoryCircleSelected]}>
          {isImageUrl ? (
            <Image
              source={{ uri: item.icon }}
              style={{ width: 44, height: 44, borderRadius: 10 }}
              contentFit="cover"
            />
          ) : (
            <Text style={styles.categoryEmoji}>{item.icon === "grid" ? "All" : item.icon}</Text>
          )}
        </View>
        <Text style={[styles.categoryLabel, selected && styles.categoryLabelSelected]} numberOfLines={1}>
          {item.name}
        </Text>
      </Pressable>
    </Animated.View>
  );
});

function AddToCartControl({ count, onAdd, onRemove }: { count: number; onAdd: () => void; onRemove: () => void }) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const pressAdd = (e: any) => {
    if (e && e.stopPropagation) e.stopPropagation();
    scale.value = withSpring(0.85, { damping: 8 }, () => { scale.value = withSpring(1); });
    onAdd();
    if (Platform.OS === 'android') {
      ToastAndroid.show("Added to cart", ToastAndroid.SHORT);
    }
  };
  
  const pressRemove = (e: any) => {
    if (e && e.stopPropagation) e.stopPropagation();
    onRemove();
  };

  if (count === 0) {
    return (
      <Animated.View style={anim}>
        <Pressable style={styles.addBtn} onPress={pressAdd}>
          <Text style={styles.addBtnText}>ADD</Text>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.qtyControl, anim]}>
      <Pressable style={styles.qtyBtn} onPress={pressRemove}>
        <Text style={styles.qtyBtnText}>-</Text>
      </Pressable>
      <Text style={styles.qtyValue}>{count}</Text>
      <Pressable style={styles.qtyBtn} onPress={pressAdd}>
        <Text style={styles.qtyBtnText}>+</Text>
      </Pressable>
    </Animated.View>
  );
}

const LOCAL_IMAGES: Record<string, any> = {
  "Gala Apples": require("../assets/images/gala_apples.jpg"),
  "Dashboard Air Freshener": require("../assets/images/dashboard_freshener.jpg"),
  "Side Mirror Anti-Fog Film": require("../assets/images/antifog_film.jpg"),
};

const ProductCard = memo(function ProductCard({ item, cartCount, onAdd, onRemove }: { item: FirestoreProduct; cartCount: number; onAdd: () => void; onRemove: () => void }) {
  const isOutOfStock = item.availability === "out_of_stock";
  const itemTitle = item.title || (item as any).name;
  const localImage = LOCAL_IMAGES[itemTitle];

  return (
    <View style={[styles.card, isOutOfStock && styles.cardOutOfStock]}>
      <Pressable style={{ flex: 1 }} onPress={() => router.push({ pathname: "/product/[id]", params: { id: item.id, product: JSON.stringify(item) } })}>
        {item.tags && item.tags.length > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.tags[0]}</Text>
          </View>
        ) : null}
        
        <View style={styles.cardEmojiContainer}>
          {localImage ? (
            <Image
              source={localImage}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
            />
          ) : item.imageUrl ? (
            <Image
              key={`${item.imageUrl}-${item.updatedAt || ''}`}
              source={{ uri: item.updatedAt ? (item.imageUrl.includes('?') ? `${item.imageUrl}&t=${item.updatedAt}` : `${item.imageUrl}?t=${item.updatedAt}`) : item.imageUrl }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
            />
          ) : (
            item.emoji ? (<Text style={styles.cardEmoji}>{item.emoji}</Text>) : (<Ionicons name="image-outline" size={34} color="#9CA3AF" />)
          )}
          {isOutOfStock && (
            <View style={styles.outOfStockOverlay}>
              <Text style={styles.outOfStockText}>SOLD OUT</Text>
            </View>
          )}
        </View>
        
        <Text style={styles.cardName} numberOfLines={2}>{item.title || (item as any).name}</Text>
        
        <View style={styles.cardMetaRow}>
          {item.label ? <Text style={styles.cardUnit}>{item.label}</Text> : null}
          {item.city ? (
            <View style={styles.cityBadge}>
              <Ionicons name="location" size={10} color={TEXT_MUTED} />
              <Text style={styles.cityText}>{item.city}</Text>
            </View>
          ) : null}
        </View>
        
        <View style={styles.cardRating}>
          <Ionicons name="star" size={12} color="#F59E0B" />
          <Text style={styles.cardRatingVal}>{item.rating.toFixed(1)}</Text>
        </View>
      </Pressable>

      <View style={styles.cardBottom}>
        <Text style={styles.cardPrice}>{item.price ? formatRupees(item.price) : "Free"}</Text>
        {!isOutOfStock ? (
          <AddToCartControl count={cartCount} onAdd={onAdd} onRemove={onRemove} />
        ) : (
          <View style={styles.disabledAddBtn}>
            <Text style={styles.disabledAddBtnText}>N/A</Text>
          </View>
        )}
      </View>
    </View>
  );
});

function CartDot({ count }: { count: number }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (count > 0) {
      scale.value = withSpring(1.4, { damping: 6 }, () => { scale.value = withSpring(1); });
    }
  }, [count]);

  const anim = useAnimatedStyle(() => ({ 
    transform: [{ scale: scale.value }],
    opacity: count > 0 ? 1 : 0
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.cartDot, anim]}>
      <Text style={styles.cartDotText}>{count > 9 ? "9+" : count}</Text>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [currentState, setCurrentState] = useState(stateStore.current);
  const [stateHydrated, setStateHydrated] = useState(stateStore.isHydrated);

  const [isAccountModalVisible, setIsAccountModalVisible] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const [banners, setBanners]       = useState<FirestoreBanner[]>([]);
  const [categories, setCategories] = useState<FirestoreCategory[]>([]);
  const [products, setProducts]     = useState<FirestoreProduct[]>([]);

  const [selectedCat, setSelectedCat] = useState("all");
  const [search, setSearch]           = useState("");
  
  const [totalItems, setTotalItems] = useState(cartStore.totalItems);
  const [quantityMap, setQuantityMap] = useState<Record<string, number>>(
    () => Object.fromEntries(cartStore.items.map((i) => [i.id, i.quantity]))
  );

  useEffect(() => {
    const syncState = (nextState: string | null) => {
      setCurrentState(nextState);
      setStateHydrated(stateStore.isHydrated);
    };
    syncState(stateStore.current);
    return stateStore.subscribe(syncState);
  }, []);

  useEffect(() => {
    // Sync on mount (in case hydration already loaded items)
    const sync = (items: import('../utils/cartStore').CartItem[]) => {
      setTotalItems(items.reduce((s, i) => s + i.quantity, 0));
      setQuantityMap(Object.fromEntries(items.map((i) => [i.id, i.quantity])));
    };
    // Immediately sync current state
    sync(cartStore.items);
    return cartStore.subscribe(sync);
  }, []);
  
  const [bannerIdx, setBannerIdx]     = useState(0);
  const bannerRef = useRef<FlatList>(null);

  const fetchContent = useCallback(async () => {
    if (!stateHydrated) {
      setLoading(true);
      return;
    }

    if (!currentState) {
      setLoading(false);
      router.replace(ROUTES.permissionFlow);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await getStateContent(currentState);
      setBanners(data.banners.filter(b => b.id !== "b1" && !b.title.includes("Local Services")));
      setCategories(data.categories);
    } catch (err) {
      setError("Failed to load state content.");
    } finally {
      setLoading(false);
    }
  }, [currentState, stateHydrated]);

  useFocusEffect(
    useCallback(() => {
      fetchContent();
    }, [fetchContent])
  );

  const [productsLoaded, setProductsLoaded] = useState(false);

  useEffect(() => {
    if (!stateHydrated || !currentState) return;
    
    setProductsLoaded(false);
    const unsubscribe = subscribeToStateProducts(currentState, (liveProducts) => {
      setProducts(liveProducts);
      setProductsLoaded(true);
      cartStore.syncWithProducts(liveProducts);
    });

    return unsubscribe;
  }, [currentState, stateHydrated]);

  // Auto-scroll banner
  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      const next = (bannerIdx + 1) % banners.length;
      setBannerIdx(next);
      bannerRef.current?.scrollToIndex({ index: next, animated: true });
    }, 3500);
    return () => clearInterval(timer);
  }, [bannerIdx, banners.length]);

  // Memoized: only valid categories
  const validCategories = useMemo(() => {
    return categories.filter(c => c.isActive && c.hasPage && c.isVisible);
  }, [categories]);

  const validCategoryIds = useMemo(() => {
    return new Set(validCategories.map(c => c.id));
  }, [validCategories]);

  // Memoized: only recomputes when products/selectedCat/search/validCategories actually change
  const filtered = useMemo(() => {
    return products.filter((p) => {
      // Only include products whose category is valid (active, has page, visible)
      if (!validCategoryIds.has(p.categoryId)) {
        return false;
      }

      const matchSearch = p.title.toLowerCase().includes(search.toLowerCase());
      if (selectedCat === "all" || !selectedCat) {
        return matchSearch;
      }
      
      // Strict match based on categoryId stored in Firestore
      const matchCat = p.categoryId === selectedCat;
      
      return matchCat && matchSearch;
    });
  }, [products, selectedCat, search, validCategoryIds, categories]);

  const addToCart = useCallback((product: FirestoreProduct) => {
    cartStore.add(product);
  }, []);

  const removeFromCart = useCallback((id: string) => {
    cartStore.remove(id);
  }, []);

  const onSelectCat = useCallback((id: string) => setSelectedCat(id), []);

  const keyExtractor = useCallback((item: FirestoreProduct) => item.id, []);

  const renderProduct = useCallback(({ item }: { item: FirestoreProduct }) => (
    <ProductCard
      item={item}
      cartCount={quantityMap[item.id] ?? 0}
      onAdd={() => addToCart(item)}
      onRemove={() => removeFromCart(item.id)}
    />
  ), [quantityMap, addToCart, removeFromCart]);

  const handleLogout = async () => {
    // Sign out from Firebase Auth + clear local session stores
    await logoutUser();
    await stateStore.clear();
    // replace so back button cannot return to home
    router.replace(ROUTES.login);
  };

  const handleAccountPress = async () => {
    let userIsAdmin = false;
    if (auth.currentUser) {
      try {
        const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (snap.exists() && snap.data().role === "admin") {
          userIsAdmin = true;
        }
      } catch (e) {}
    }
    setIsAdmin(userIsAdmin);
    setIsAccountModalVisible(true);
  };
  const handleChangeState = () => {
    router.push(ROUTES.statePicker);
  };

  const ListHeader = useMemo(() => (
    <>
      {/* Banner carousel */}
      {search.length === 0 && selectedCat === "all" && banners.length > 0 ? (
        <View style={styles.bannerSection}>
          <FlatList
            ref={bannerRef}
            data={banners}
            keyExtractor={(b) => b.id}
            renderItem={({ item }) => <BannerSlide item={item} />}
            horizontal
            showsHorizontalScrollIndicator={false}
            pagingEnabled
            getItemLayout={(_, index) => ({
              length: SW,
              offset: SW * index,
              index,
            })}
            onScrollToIndexFailed={(info) => {
              setTimeout(() => {
                bannerRef.current?.scrollToIndex({ index: info.index, animated: true });
              }, 500);
            }}
            onMomentumScrollEnd={(e) => {
              setBannerIdx(Math.round(e.nativeEvent.contentOffset.x / SW));
            }}
          />
          {banners.length > 1 && (
            <View style={styles.bannerDots}>
              {banners.map((_, i) => (
                <View key={i} style={[styles.dot, i === bannerIdx && styles.dotActive]} />
              ))}
            </View>
          )}
        </View>
      ) : null}

      {/* Categories */}
      {validCategories.length > 0 ? (
        <View style={styles.categoriesSection}>
          <Text style={styles.categorySectionTitle}>Shop by category</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRail}
            data={[{ id: "all", name: "All", icon: "grid", color: PRIMARY_COLOR }, ...validCategories]}
            keyExtractor={(cat) => cat.id}
            renderItem={({ item }) => (
              <CategoryCircle
                item={item}
                selected={selectedCat === item.id}
                onSelectCat={onSelectCat}
              />
            )}
          />
        </View>
      ) : null}

      {/* Section title */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {selectedCat === "all" ? "Fresh Recommendations" : validCategories.find(c => c.id === selectedCat)?.name}
        </Text>
        <Text style={styles.sectionCount}>{filtered.length} items</Text>
      </View>
    </>
  ), [banners, bannerIdx, validCategories, selectedCat, search, filtered.length, onSelectCat]);

  if (loading || !productsLoaded) {
    return (
      <View style={[styles.screen, styles.centerContent]}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={styles.loadingText}>Loading fresh products from {currentState}...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.screen, styles.centerContent]}>
        <Text style={styles.emptyEmoji}>!</Text>
        <Text style={styles.emptyText}>{error}</Text>
        <Pressable onPress={fetchContent} style={styles.retryBtn}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </Pressable>
        <Pressable onPress={handleChangeState} style={{ marginTop: 12 }}>
          <Text style={{ color: TEXT_MUTED, fontWeight: "600" }}>Change State</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.appBar}>
        <View style={styles.appBarTop}>
          <View>
            <View style={styles.deliveryRow}>
              <Ionicons name="flash" size={12} color="#DCFCE7" />
              <Text style={styles.deliverToText}>Delivery in 10 minutes</Text>
            </View>
            <Pressable onPress={handleChangeState} style={styles.stateSelector}>
              <Text style={styles.stateSelectorText}>{currentState || "Select Location"}</Text>
              <Ionicons name="chevron-down" size={16} color="#fff" />
            </Pressable>
          </View>
          <View style={styles.appBarRight}>
            <Pressable 
              style={[styles.iconBtn, { flexDirection: 'row' }]} 
              onPress={() => router.push(ROUTES.cart)}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <Ionicons name="cart-outline" size={24} color="#fff" pointerEvents="none" />
              <CartDot count={totalItems} />
            </Pressable>
            <Pressable style={styles.iconBtn} onPress={handleAccountPress} accessibilityRole="button" accessibilityLabel="Open account options">
              <Ionicons name="person-circle-outline" size={26} color="#fff" />
            </Pressable>
          </View>
        </View>

        {/* Search bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={TEXT_MUTED} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search for groceries, fruits...`}
            placeholderTextColor={TEXT_MUTED}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 ? (
            <Pressable onPress={() => setSearch("")} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={18} color={TEXT_MUTED} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={keyExtractor}
        renderItem={renderProduct}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: totalItems > 0 ? insets.bottom + MAIN_TABS_HEIGHT + 110 : insets.bottom + MAIN_TABS_HEIGHT + 24 }
        ]}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>No items</Text>
            <Text style={styles.emptyText}>
              {search.length > 0 
                ? `No matches for "${search}".` 
                : selectedCat !== "all" 
                  ? "No products available in this category." 
                  : "No products available yet."}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        maxToRenderPerBatch={10}
        initialNumToRender={10}
        windowSize={5}
        updateCellsBatchingPeriod={30}
      />

      {totalItems > 0 && (
        <View style={[styles.cartBarContainer, { bottom: MAIN_TABS_HEIGHT - 4 }]}>
          <View style={styles.cartBarInner}>
            <View style={styles.cartBarLeft}>
              <View style={styles.cartBarIconWrap}>
                <Ionicons name="cart" size={24} color="#fff" />
              </View>
              <View>
                <Text style={styles.cartBarItems}>{totalItems} item{totalItems > 1 ? "s" : ""}</Text>
                <Text style={styles.cartBarTotal}>
                  {formatRupees(cartStore.totalPrice)}
                </Text>
              </View>
            </View>
            <Pressable style={styles.cartBarBtn} onPress={() => router.push(ROUTES.cart)}>
              <Text style={styles.cartBarBtnText}>View Cart</Text>
              <Ionicons name="chevron-forward" size={16} color="#fff" />
            </Pressable>
          </View>
        </View>
      )}
      <MainTabs active="dashboard" />
      
      <Modal
        visible={isAccountModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAccountModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setIsAccountModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Your Account</Text>
            <Text style={styles.modalSubtitle}>Delivering to {currentState || "your selected location"}.</Text>

            <View style={styles.modalActionsContainer}>
              <View style={styles.modalCancelWrapper}>
                <Pressable
                  style={styles.modalCancelBtn}
                  onPress={() => setIsAccountModalVisible(false)}
                >
                  <Text style={styles.modalCancelText}>CANCEL</Text>
                </Pressable>
              </View>

              <View style={styles.modalActionsRight}>
                <Pressable
                  style={styles.modalActionBtn}
                  onPress={() => {
                    setIsAccountModalVisible(false);
                    handleLogout();
                  }}
                >
                  <Text style={[styles.modalActionText, { color: '#EF4444' }]}>SIGN OUT</Text>
                </Pressable>
                <Pressable
                  style={styles.modalActionBtn}
                  onPress={() => {
                    setIsAccountModalVisible(false);
                    handleChangeState();
                  }}
                >
                  <Text style={styles.modalActionText}>CHANGE LOCATION</Text>
                </Pressable>
                {isAdmin && (
                  <Pressable
                    style={styles.modalActionBtn}
                    onPress={() => {
                      setIsAccountModalVisible(false);
                      router.push("/admin/dashboard");
                    }}
                  >
                    <Text style={styles.modalActionText}>ADMIN PANEL</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const CARD_W = (SW - 40) / 2; // 16 margin on sides, 8 between cards

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG_COLOR },
  centerContent: { justifyContent: "center", alignItems: "center", padding: 24 },
  loadingText: { color: TEXT_MUTED, marginTop: 16, fontSize: 15, fontWeight: "500" },
  
  // App Bar
  appBar: { backgroundColor: PRIMARY_COLOR, paddingTop: Platform.OS === 'ios' ? 48 : StatusBar.currentHeight ? StatusBar.currentHeight + 8 : 42, paddingBottom: 14, paddingHorizontal: 16, zIndex: 10 },
  appBarTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  deliveryRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 3 },
  deliverToText: { color: "rgba(255,255,255,0.92)", fontSize: 11, fontWeight: "800", letterSpacing: 0.4, textTransform: "uppercase" },
  stateSelector: { flexDirection: "row", alignItems: "center", gap: 4 },
  stateSelectorText: { color: "#fff", fontSize: 19, fontWeight: "900" },
  appBarRight: { flexDirection: "row", gap: 12, alignItems: "center" },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  cartDot: {
    marginLeft: -10, marginTop: -4,
    backgroundColor: "#EF4444",
    borderRadius: 9, width: 18, height: 18,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: PRIMARY_COLOR,
    zIndex: 99, elevation: 10,
  },cartDotText: { color: "#fff", fontSize: 10, fontWeight: "800" },

  // Search
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#F8FAFC", borderRadius: 18, paddingHorizontal: 14, height: 46, borderWidth: 1, borderColor: "rgba(255,255,255,0.55)" },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, color: TEXT_DARK, fontSize: 15, fontWeight: "500" },

  // Scroll / List
  scroll: { flex: 1 },
  scrollContent: { },
  listContent: { paddingHorizontal: 8, backgroundColor: BG_COLOR },
  columnWrapper: { gap: 8, paddingHorizontal: 8, marginBottom: 8 },
  bannerSection: { marginTop: 12, marginBottom: 10 },
  bannerSlide: {
    width: SW,
    height: 132,
    paddingHorizontal: 28,
    borderRadius: 0,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  bannerContent: { flex: 1 },
  bannerTitle: { color: "#fff", fontSize: 20, fontWeight: "900", marginBottom: 4, lineHeight: 25 },
  bannerSub: { color: "rgba(255,255,255,0.9)", fontSize: 13, fontWeight: "500", marginBottom: 14 },
  bannerBtn: { backgroundColor: "#fff", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, alignSelf: "flex-start" },
  bannerBtnText: { color: PRIMARY_COLOR, fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  bannerEmoji: { fontSize: 70, opacity: 0.95 },
  bannerIconFallback: { width: 76, height: 76, borderRadius: 38, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  bannerDots: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#D1D5DB" },
  dotActive: { width: 18, backgroundColor: PRIMARY_COLOR },

  // Categories
  categoriesSection: { backgroundColor: "#fff", paddingTop: 14, paddingBottom: 12, marginTop: 8 },
  categorySectionTitle: { color: TEXT_DARK, fontSize: 15, fontWeight: "900", paddingHorizontal: 16, marginBottom: 12 },
  categoryRail: { paddingHorizontal: 16, gap: 12 },
  categoryItem: { alignItems: "center", width: 86 },
  categoryCircle: { width: 68, height: 68, borderRadius: 18, backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center", marginBottom: 7, borderWidth: 1, borderColor: "#E5E7EB" },
  categoryCircleSelected: { backgroundColor: "#DCFCE7", borderWidth: 2, borderColor: PRIMARY_COLOR },
  categoryEmoji: { fontSize: 26, color: TEXT_DARK, fontWeight: "900" },
  categoryLabel: { color: TEXT_MUTED, fontSize: 11, fontWeight: "800", textAlign: "center", lineHeight: 14, width: 86 },
  categoryLabelSelected: { color: PRIMARY_COLOR, fontWeight: "800" },

  // Products Header
  sectionHeader: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 16, marginTop: 18, marginBottom: 12 },
  sectionTitle: { color: TEXT_DARK, fontSize: 18, fontWeight: "800" },
  sectionCount: { color: TEXT_MUTED, fontSize: 13, fontWeight: "500", paddingBottom: 2 },

  // Grid (kept for reference, layout now handled by FlatList columnWrapper)
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 8, gap: 8 },
  card: {
    width: CARD_W,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 8,
  },
  badge: { position: "absolute", top: 0, left: 0, backgroundColor: "#EF4444", borderTopLeftRadius: 11, borderBottomRightRadius: 8, paddingHorizontal: 8, paddingVertical: 4, zIndex: 1 },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  cardEmojiContainer: { width: "100%", aspectRatio: 1.2, backgroundColor: "#F9FAFB", borderRadius: 8, alignItems: "center", justifyContent: "center", marginBottom: 10, overflow: "hidden" },
  cardEmoji: { fontSize: 48 },
  outOfStockOverlay: { position: "absolute", inset: 0, backgroundColor: "rgba(255,255,255,0.7)", alignItems: "center", justifyContent: "center" },
  outOfStockText: { backgroundColor: "#EF4444", color: "#fff", fontSize: 9, fontWeight: "900", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  cardOutOfStock: { opacity: 0.7 },
  cardName: { color: TEXT_DARK, fontSize: 14, fontWeight: "600", lineHeight: 18, marginBottom: 4 },
  cardMetaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  cardUnit: { color: TEXT_MUTED, fontSize: 12 },
  cityBadge: { flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: "#F3F4F6", paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 },
  cityText: { color: TEXT_MUTED, fontSize: 10, fontWeight: "600" },
  cardRating: { flexDirection: "row", alignItems: "center", gap: 3, marginBottom: 12 },
  cardRatingVal: { color: TEXT_MUTED, fontSize: 11, fontWeight: "600" },
  cardBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: "auto" },
  cardPrice: { color: TEXT_DARK, fontSize: 15, fontWeight: "800" },
  disabledAddBtn: { backgroundColor: "#F3F4F6", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6 },
  disabledAddBtnText: { color: "#9CA3AF", fontSize: 12, fontWeight: "700" },
  
  // Qty Controls
  addBtn: { backgroundColor: "#fff", borderWidth: 1, borderColor: PRIMARY_COLOR, borderRadius: 6, paddingHorizontal: 14, paddingVertical: 6 },
  addBtnText: { color: PRIMARY_COLOR, fontSize: 13, fontWeight: "900", textTransform: "uppercase" },
  qtyControl: { flexDirection: "row", alignItems: "center", backgroundColor: PRIMARY_COLOR, borderRadius: 6, overflow: "hidden" },
  qtyBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  qtyBtnText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  qtyValue: { color: "#fff", fontSize: 13, fontWeight: "800", minWidth: 16, textAlign: "center" },

  // Empty/Error
  emptyState: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 20 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyText: { color: TEXT_MUTED, fontSize: 15, textAlign: "center", fontWeight: "500" },
  retryBtn: { marginTop: 20, backgroundColor: PRIMARY_COLOR, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // Cart bar
  cartBarContainer: { position: "absolute", left: 0, right: 0, padding: 12, backgroundColor: "#fff", borderTopLeftRadius: 16, borderTopRightRadius: 16, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 15 },
  cartBarInner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: PRIMARY_COLOR, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  cartBarLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  cartBarIconWrap: { backgroundColor: "rgba(255,255,255,0.2)", padding: 8, borderRadius: 8 },
  cartBarItems: { color: "rgba(255,255,255,0.9)", fontSize: 12, fontWeight: "600", marginBottom: 2 },
  cartBarTotal: { color: "#fff", fontSize: 18, fontWeight: "900" },
  cartBarBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  cartBarBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: TEXT_DARK,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: TEXT_MUTED,
    marginBottom: 24,
  },
  modalActionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 8,
  },
  modalCancelWrapper: {
    justifyContent: "flex-end",
  },
  modalActionsRight: {
    alignItems: "flex-end",
    gap: 16,
  },
  modalActionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  modalActionText: {
    fontSize: 14,
    fontWeight: "700",
    color: PRIMARY_COLOR,
  },
  modalCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: TEXT_MUTED,
  },
});

// Trigger hot reload















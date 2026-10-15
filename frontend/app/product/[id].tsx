import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable, Dimensions, Platform, Image, Share } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { cartStore } from "../../utils/cartStore";
import { formatRupees } from "../../utils/currency";

const { width: SW } = Dimensions.get("window");

// Flipkart-style Colors
const PRIMARY_COLOR = "#16A34A";
const FK_YELLOW = "#FFC200";
const FK_ORANGE = "#FB641B";
const FK_GREEN = "#388E3C";
const TEXT_DARK = "#212121";
const TEXT_MUTED = "#878787";
const BG_GRAY = "#F1F3F6";

function CartDot({ count }: { count: number }) {
  const scale = useSharedValue(1);

  React.useEffect(() => {
    if (count > 0) {
      scale.value = withSpring(1.4, { damping: 6 }, () => { scale.value = withSpring(1); });
    }
  }, [count]);

  const anim = useAnimatedStyle(() => ({ 
    transform: [{ scale: scale.value }],
    opacity: count > 0 ? 1 : 0
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.cartBadge, anim]}>
      <Text style={styles.cartBadgeText}>{count > 9 ? "9+" : count}</Text>
    </Animated.View>
  );
}

export default function ItemDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Parse product
  const product = useMemo(() => {
    try {
      if (params.product) return JSON.parse(params.product as string);
    } catch (e) {
      console.warn("Failed to parse product data");
    }
    return null;
  }, [params.product]);

  // ── Real-time cart state ─────────────────────────────────────────────────
  // We store cart items in local React state so any cartStore change
  // immediately triggers a re-render — no page refresh needed.
  const [cartItems, setCartItems] = React.useState(cartStore.items);
  React.useEffect(() => {
    // Sync initial state
    setCartItems([...cartStore.items]);
    // Subscribe to future changes
    const unsubscribe = cartStore.subscribe((items) => {
      setCartItems([...items]);
    });
    return unsubscribe;
  }, []);

  if (!product) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text>Item not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20, padding: 10, backgroundColor: PRIMARY_COLOR }}>
          <Text style={{ color: "#fff" }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Simulated Flipkart Data
  const title = product.title || product.name;
  const price = product.price;
  const mrp = Math.round(price * 1.45); // Fake 45% markup for MRP
  const discountPercent = Math.round(((mrp - price) / mrp) * 100);
  const rating = product.rating?.toFixed(1) || "4.3";
  const ratingCount = "4,592";
  
  // Generate a consistent random delivery time between 10 and 55 mins based on product ID
  const hash = product.id.split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0);
  const deliveryMins = 10 + (hash % 45);
  const reviewCount = "384";
  const isOutOfStock = product.availability === "out_of_stock";

  const handleScroll = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    setActiveImageIndex(Math.round(index));
  };

  // Derived from reactive cartItems state — updates instantly
  const quantityInCart = cartItems.find(i => i.id === product.id)?.quantity || 0;
  const totalCartItems = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const totalCartPrice = cartItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);

  const handleBuyNow = () => {
    if (quantityInCart === 0) {
      cartStore.add(product);
    }
    router.push("/cart");
  };

  const handleShare = () => {
    Share.share({
      message: `${title} - ${formatRupees(price)} on quickCart`,
    }).catch(() => undefined);
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      
      {/* ── Flipkart Style Header ────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={TEXT_DARK} />
          </TouchableOpacity>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="search" size={24} color={TEXT_DARK} />
          </TouchableOpacity>
          <Pressable 
            style={[styles.iconBtn, { flexDirection: 'row' }]} 
            onPress={() => router.push("/cart")}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Ionicons name="cart" size={26} color={TEXT_DARK} pointerEvents="none" />
            <CartDot count={totalCartItems} />
          </Pressable>
        </View>
      </View>

      <ScrollView 
        style={styles.scroll} 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]} // Space for bottom bar
        showsVerticalScrollIndicator={false}
      >
        {/* ── Image Carousel (Different Photos Related to Item) ──────────────────────── */}
        <View style={styles.carouselContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {/* Fake Image 1: Main */}
            <View style={styles.imageSlide}>
              <Text style={styles.heroEmoji}>{product.emoji || "🛍️"}</Text>
            </View>
            {/* Fake Image 2: Scaled */}
            <View style={styles.imageSlide}>
              <Text style={[styles.heroEmoji, { transform: [{ scale: 1.2 }] }]}>{product.emoji || "🛍️"}</Text>
            </View>
            {/* Fake Image 3: Rotated */}
            <View style={styles.imageSlide}>
              <Text style={[styles.heroEmoji, { transform: [{ rotate: "15deg" }] }]}>{product.emoji || "🛍️"}</Text>
            </View>
          </ScrollView>
          {product.imageUrl ? (
            <View pointerEvents="none" style={styles.imageOverlay}>
              <Image key={`${product.imageUrl}-${product.updatedAt || ''}`} source={{ uri: product.updatedAt ? (product.imageUrl.includes('?') ? `${product.imageUrl}&t=${product.updatedAt}` : `${product.imageUrl}?t=${product.updatedAt}`) : product.imageUrl }} style={styles.productImage} resizeMode="contain" />
            </View>
          ) : null}
          
          {/* Pagination Dots */}
          {!product.imageUrl && <View style={styles.pagination}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.dot, activeImageIndex === i && styles.dotActive]} />
            ))}
          </View>}
          <Pressable onPress={handleShare} style={styles.shareCircle} accessibilityRole="button" accessibilityLabel="Share product">
            <Ionicons name="share-social" size={20} color={TEXT_MUTED} />
          </Pressable>
        </View>

        {/* ── Title & Rating ─────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.title} numberOfLines={2}>{title}</Text>
          <View style={styles.ratingRow}>
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>{rating}</Text>
              <Ionicons name="star" size={10} color="#fff" />
            </View>
            <Text style={styles.ratingCountText}>{ratingCount} ratings and {reviewCount} reviews</Text>
            <Ionicons name="chevron-forward" size={14} color={TEXT_MUTED} />
          </View>
        </View>

        {/* ── Price & Offers ─────────────────────────────────────────────── */}
        <View style={styles.section}>
          {product.label && <Text style={styles.unitLabel}>{product.label}</Text>}
          <View style={styles.priceRow}>
            <Text style={styles.discountPercent}>{discountPercent}% off</Text>
            <Text style={styles.mrp}>₹{mrp}</Text>
          </View>
          <View style={styles.priceMainRow}>
            <Text style={styles.price}>₹{price}</Text>
            <View style={styles.assuredBadge}>
              <Ionicons name="checkmark-circle" size={12} color="#0369A1" />
              <Text style={styles.assuredTextBold}> quickCart</Text>
            </View>
          </View>
          {isOutOfStock && <Text style={styles.outOfStockText}>Currently Out of Stock</Text>}
        </View>

        <View style={styles.divider} />

        {/* ── Delivery Info ──────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.deliveryRow}>
            <Ionicons name="location-outline" size={20} color={TEXT_DARK} style={{ marginTop: 2 }} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.deliveryTitle}>Delivery in {deliveryMins} mins</Text>
              <Text style={styles.deliveryPromo}>🚚 Free delivery on orders above ₹200</Text>
              {product.city && <Text style={styles.deliverySub}>Shipping from {product.city}</Text>}
            </View>
          </View>
        </View>

        <View style={styles.dividerLarge} />

        {/* ── Product Highlights ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Highlights</Text>
          <View style={styles.highlightRow}>
            <View style={styles.bullet} />
            <Text style={styles.highlightText}>High quality materials</Text>
          </View>
          <View style={styles.highlightRow}>
            <View style={styles.bullet} />
            <Text style={styles.highlightText}>{product.description || "Authentic and original product guaranteed."}</Text>
          </View>
          <View style={styles.highlightRow}>
            <View style={styles.bullet} />
            <Text style={styles.highlightText}>7 Days Replacement Policy</Text>
          </View>
        </View>

        <View style={styles.dividerLarge} />

        {/* ── Fake Ratings & Reviews ─────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <Text style={styles.sectionTitle}>Ratings & Reviews</Text>
            <TouchableOpacity style={styles.rateBtn}>
              <Text style={styles.rateBtnText}>Rate Product</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.overallRatingRow}>
            <Text style={styles.overallRatingNum}>{rating}</Text>
            <Ionicons name="star" size={24} color={TEXT_DARK} style={{ marginLeft: 4, marginTop: 4 }} />
          </View>
          <Text style={styles.ratingCountTextBig}>{ratingCount} ratings and {reviewCount} reviews</Text>

          {/* Review 1 */}
          <View style={styles.reviewItem}>
            <View style={styles.reviewHeader}>
              <View style={[styles.ratingBadge, { backgroundColor: FK_GREEN }]}>
                <Text style={styles.ratingText}>5</Text>
                <Ionicons name="star" size={10} color="#fff" />
              </View>
              <Text style={styles.reviewHeadline}>Simply awesome</Text>
            </View>
            <Text style={styles.reviewBody}>Very good quality for the price! Exactly as shown in the pictures. Highly recommended for everyone.</Text>
            <View style={styles.reviewFooter}>
              <Text style={styles.reviewerName}>Rahul Sharma • Certified Buyer</Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="thumbs-up" size={14} color={TEXT_MUTED} />
                <Text style={styles.likesText}>124</Text>
              </View>
            </View>
          </View>

          {/* Review 2 */}
          <View style={styles.reviewItem}>
            <View style={styles.reviewHeader}>
              <View style={[styles.ratingBadge, { backgroundColor: FK_GREEN }]}>
                <Text style={styles.ratingText}>4</Text>
                <Ionicons name="star" size={10} color="#fff" />
              </View>
              <Text style={styles.reviewHeadline}>Nice product</Text>
            </View>
            <Text style={styles.reviewBody}>Good product, fast delivery by quickCart. The packaging could have been slightly better but the item is flawless.</Text>
            <View style={styles.reviewFooter}>
              <Text style={styles.reviewerName}>Sneha Gupta • Certified Buyer</Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="thumbs-up" size={14} color={TEXT_MUTED} />
                <Text style={styles.likesText}>89</Text>
              </View>
            </View>
          </View>
          
          <TouchableOpacity style={styles.allReviewsBtn}>
            <Text style={styles.allReviewsText}>All {reviewCount} reviews</Text>
            <Ionicons name="chevron-forward" size={16} color={PRIMARY_COLOR} />
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* ── Flipkart Bottom Action Bar ───────────────────────────────────── */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {quantityInCart > 0 ? (
          <View style={styles.qtyControlWrap}>
            <TouchableOpacity style={styles.qtyControlBtn} onPress={() => cartStore.remove(product.id)}>
              <Text style={styles.qtyControlBtnText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.qtyControlValue}>{quantityInCart}</Text>
            <TouchableOpacity style={styles.qtyControlBtn} onPress={() => cartStore.add(product)}>
              <Text style={styles.qtyControlBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.cartBtn} onPress={() => cartStore.add(product)}>
            <Text style={styles.cartBtnText}>Add to cart</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.buyBtn} onPress={handleBuyNow}>
          <View style={{ flexDirection: "column", alignItems: "center" }}>
            <Text style={styles.buyBtnText}>{quantityInCart > 0 ? "View Cart" : "Buy now"}</Text>
            {quantityInCart > 0 && (
              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600", marginTop: 2 }}>
                {totalCartItems} item{totalCartItems > 1 ? "s" : ""} • {formatRupees(totalCartPrice)}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  
  // Header
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 8, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: "#F0F0F0",
    zIndex: 10,
  },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  iconBtn: { padding: 10 },
  cartBadge: {
    marginLeft: -12, marginTop: -4,
    backgroundColor: "#EF4444",
    borderRadius: 9, width: 18, height: 18,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: "#fff",
    zIndex: 99, elevation: 10,
  },
  cartBadgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },

  scroll: { flex: 1, backgroundColor: BG_GRAY },
  scrollContent: { backgroundColor: "#fff" },
  
  // Carousel
  carouselContainer: { width: SW, height: SW * 0.9, backgroundColor: "#fff", position: "relative", borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  imageSlide: { width: SW, height: SW * 0.9, alignItems: "center", justifyContent: "center" },
  productImage: { width: "100%", height: "100%" },
  imageOverlay: { position: "absolute", inset: 0, backgroundColor: "#fff" },
  heroEmoji: { fontSize: 160 },
  pagination: { position: "absolute", bottom: 12, width: "100%", flexDirection: "row", justifyContent: "center", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#D1D5DB" },
  dotActive: { backgroundColor: PRIMARY_COLOR, width: 16 },
  shareCircle: { position: "absolute", top: 16, right: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },

  // Sections
  section: { padding: 16, backgroundColor: "#fff" },
  divider: { height: 1, backgroundColor: "#F0F0F0" },
  dividerLarge: { height: 8, backgroundColor: BG_GRAY },

  // Title & Rating
  title: { fontSize: 16, color: TEXT_DARK, lineHeight: 22 },
  ratingRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  ratingBadge: { flexDirection: "row", alignItems: "center", backgroundColor: FK_GREEN, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, gap: 2 },
  ratingText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  ratingCountText: { color: TEXT_MUTED, fontSize: 13, marginLeft: 8 },

  // Price
  unitLabel: { fontSize: 14, color: TEXT_MUTED, marginBottom: 4 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  discountPercent: { color: FK_GREEN, fontSize: 14, fontWeight: "bold" },
  mrp: { color: TEXT_MUTED, fontSize: 14, textDecorationLine: "line-through" },
  priceMainRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  price: { fontSize: 28, fontWeight: "bold", color: TEXT_DARK },
  assuredBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#E0F2FE", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12, borderWidth: 1, borderColor: "#BAE6FD" },
  assuredTextBold: { color: "#0369A1", fontSize: 10, fontWeight: "bold" },
  outOfStockText: { color: "#D32F2F", fontSize: 14, fontWeight: "bold", marginTop: 8 },

  // Delivery
  deliveryRow: { flexDirection: "row", alignItems: "flex-start" },
  deliveryTitle: { fontSize: 14, color: TEXT_DARK, fontWeight: "500", marginBottom: 4 },
  deliveryPromo: { fontSize: 14, color: "#16A34A", fontWeight: "600", marginBottom: 4 },
  freeText: { color: FK_GREEN, fontWeight: "bold" },
  strikethrough: { color: TEXT_MUTED, textDecorationLine: "line-through" },
  deliverySub: { fontSize: 13, color: TEXT_MUTED },

  // Highlights
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: TEXT_DARK, marginBottom: 12 },
  highlightRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  bullet: { width: 4, height: 4, borderRadius: 2, backgroundColor: TEXT_MUTED, marginTop: 8, marginRight: 12, marginLeft: 4 },
  highlightText: { fontSize: 14, color: TEXT_DARK, flex: 1, lineHeight: 20 },

  // Reviews
  rateBtn: { borderWidth: 1, borderColor: "#E0E0E0", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 },
  rateBtnText: { color: PRIMARY_COLOR, fontSize: 13, fontWeight: "bold" },
  overallRatingRow: { flexDirection: "row", alignItems: "center" },
  overallRatingNum: { fontSize: 32, fontWeight: "bold", color: TEXT_DARK },
  ratingCountTextBig: { color: TEXT_MUTED, fontSize: 14, marginTop: 4, marginBottom: 16 },
  
  reviewItem: { borderTopWidth: 1, borderTopColor: "#F0F0F0", paddingTop: 16, paddingBottom: 16 },
  reviewHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  reviewHeadline: { fontSize: 14, fontWeight: "bold", color: TEXT_DARK, marginLeft: 12 },
  reviewBody: { fontSize: 14, color: TEXT_DARK, lineHeight: 20, marginBottom: 12 },
  reviewFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  reviewerName: { fontSize: 12, color: TEXT_MUTED },
  likesText: { fontSize: 12, color: TEXT_MUTED, marginLeft: 4 },
  
  allReviewsBtn: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderTopWidth: 1, borderTopColor: "#F0F0F0" },
  allReviewsText: { fontSize: 15, fontWeight: "500", color: PRIMARY_COLOR },

  // Bottom Action Bar
  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row",
    borderTopWidth: 1, borderTopColor: "#E0E0E0",
    backgroundColor: "#fff"
  },
  actionBtn: {
    flex: 1, paddingVertical: 18,
    alignItems: "center", justifyContent: "center",
  },
  actionBtnText: { fontSize: 16, fontWeight: "bold" },
  
  cartBtn: { flex: 1, backgroundColor: "#fff", paddingVertical: 18, alignItems: "center", justifyContent: "center" },
  cartBtnText: { color: TEXT_DARK, fontSize: 16, fontWeight: "bold" },
  buyBtn: { flex: 1, backgroundColor: FK_ORANGE, paddingVertical: 18, alignItems: "center", justifyContent: "center" },
  buyBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },

  qtyControlWrap: { flex: 1, backgroundColor: "#fff", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  qtyControlBtn: { paddingHorizontal: 24, paddingVertical: 18, backgroundColor: "#F3F4F6" },
  qtyControlBtnText: { color: PRIMARY_COLOR, fontSize: 18, fontWeight: "900" },
  qtyControlValue: { color: TEXT_DARK, fontSize: 18, fontWeight: "800" },
});

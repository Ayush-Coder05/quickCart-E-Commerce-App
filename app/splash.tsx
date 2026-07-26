import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  Image,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { ROUTES } from "../utils/routes";

const { width, height } = Dimensions.get("window");

// ─── Floating orb decoration ───────────────────────────────────────────────────
function FloatingOrb({
  size,
  color,
  top,
  left,
  delay,
}: {
  size: number;
  color: string;
  top?: number;
  left?: number;
  delay: number;
}) {
  const translateY = useSharedValue(0);
  const opacity    = useSharedValue(0);
  const timersRef  = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 800 }));

    // Recursive float loop - all timer IDs collected for cleanup
    const schedule = (ms: number) => {
      const id = setTimeout(() => {
        translateY.value = withSequence(
          withTiming(-14, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
          withTiming(0,   { duration: 2400, easing: Easing.inOut(Easing.sin) }),
        );
        schedule(4800);
      }, ms);
      timersRef.current.push(id);
    };

    schedule(delay);

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity:   opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position:        "absolute",
          width:           size,
          height:          size,
          borderRadius:    size / 2,
          backgroundColor: color,
          top,
          left,
        },
        style,
      ]}
    />
  );
}

// ─── Main splash/welcome screen ────────────────────────────────────────────────
export default function SplashScreen() {
  // ── Animation shared values ──────────────────────────────────────────────────
  const bgOpacity   = useSharedValue(0);
  const logoScale   = useSharedValue(0.25);
  const logoOpacity = useSharedValue(0);
  const logoTransY  = useSharedValue(-20);
  const taglineY    = useSharedValue(30);
  const taglineOp   = useSharedValue(0);
  const badge1Scale = useSharedValue(0);
  const badge2Scale = useSharedValue(0);
  const badge3Scale = useSharedValue(0);
  const btnY        = useSharedValue(60);
  const btnOp       = useSharedValue(0);
  const skipOp      = useSharedValue(0);
  const shimmerX    = useSharedValue(-width);

  // Ref to collect shimmer timer IDs for cleanup
  const shimmerTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    // ── Background ─────────────────────────────────────────────────────────────
    bgOpacity.value = withTiming(1, { duration: 600 });

    // ── Logo bounce in ─────────────────────────────────────────────────────────
    logoOpacity.value = withDelay(150, withTiming(1, { duration: 700 }));
    logoScale.value   = withDelay(150, withSpring(1, { damping: 11, stiffness: 110 }));
    logoTransY.value  = withDelay(150, withSpring(0, { damping: 13, stiffness: 90 }));

    // ── Tagline ────────────────────────────────────────────────────────────────
    taglineY.value  = withDelay(650, withSpring(0, { damping: 14, stiffness: 90 }));
    taglineOp.value = withDelay(650, withTiming(1, { duration: 500 }));

    // ── Badges staggered pop ───────────────────────────────────────────────────
    badge1Scale.value = withDelay(900,  withSpring(1, { damping: 10, stiffness: 180 }));
    badge2Scale.value = withDelay(1050, withSpring(1, { damping: 10, stiffness: 180 }));
    badge3Scale.value = withDelay(1200, withSpring(1, { damping: 10, stiffness: 180 }));

    // ── CTA button ─────────────────────────────────────────────────────────────
    btnY.value  = withDelay(1350, withSpring(0, { damping: 14, stiffness: 90 }));
    btnOp.value = withDelay(1350, withTiming(1, { duration: 500 }));

    // ── Skip link ──────────────────────────────────────────────────────────────
    skipOp.value = withDelay(1700, withTiming(1, { duration: 600 }));

    // ── Shimmer sweep loop (fixed: reset before animating, cleanup on unmount) ─
    const runShimmer = () => {
      shimmerX.value = -width;
      shimmerX.value = withTiming(width * 2, {
        duration: 1600,
        easing:   Easing.linear,
      });
      const id = setTimeout(runShimmer, 3200);
      shimmerTimersRef.current.push(id);
    };
    const initialId = setTimeout(runShimmer, 1800);
    shimmerTimersRef.current.push(initialId);

    return () => {
      shimmerTimersRef.current.forEach(clearTimeout);
      shimmerTimersRef.current = [];
    };
  }, []);

  // ── Animated styles ──────────────────────────────────────────────────────────
  const bgStyle      = useAnimatedStyle(() => ({ opacity: bgOpacity.value }));
  const logoStyle    = useAnimatedStyle(() => ({
    opacity:   logoOpacity.value,
    transform: [{ scale: logoScale.value }, { translateY: logoTransY.value }],
  }));
  const taglineStyle = useAnimatedStyle(() => ({
    opacity:   taglineOp.value,
    transform: [{ translateY: taglineY.value }],
  }));
  const b1Style      = useAnimatedStyle(() => ({ transform: [{ scale: badge1Scale.value }] }));
  const b2Style      = useAnimatedStyle(() => ({ transform: [{ scale: badge2Scale.value }] }));
  const b3Style      = useAnimatedStyle(() => ({ transform: [{ scale: badge3Scale.value }] }));
  const btnStyle     = useAnimatedStyle(() => ({
    opacity:   btnOp.value,
    transform: [{ translateY: btnY.value }],
  }));
  const skipStyle    = useAnimatedStyle(() => ({ opacity: skipOp.value }));
  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }],
  }));

  const badges = [
    { icon: "⚡", label: "Instant"       },
    { icon: "🏷️", label: "Best Deals"   },
    { icon: "🚀", label: "Fast Delivery" },
  ];
  const badgeStyles = [b1Style, b2Style, b3Style];

  const handleGetStarted = () => {
    router.push(ROUTES.signup);
  };

  const handleSignIn = () => {
    router.push(ROUTES.login);
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Background gradient */}
      <Animated.View style={[StyleSheet.absoluteFill, bgStyle]}>
        <LinearGradient
          colors={["#FFFFFF", "#F9FAFB", "#F3F4F6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Ambient brand-color orbs (Light theme: pale green & yellow) */}
      <FloatingOrb size={260} color="rgba(22,163,74,0.06)"   top={-90}           left={-100}         delay={300} />
      <FloatingOrb size={200} color="rgba(245,158,11,0.06)"   top={height * 0.5}  left={width - 110}  delay={600} />
      <FloatingOrb size={130} color="rgba(22,163,74,0.04)"   top={height * 0.7}  left={-50}          delay={800} />
      <FloatingOrb size={90}  color="rgba(0,0,0,0.02)"       top={height * 0.25} left={width * 0.75} delay={500} />

      {/* Main content */}
      <View style={styles.content}>

        {/* Logo */}
        <Animated.View style={[styles.logoWrapper, logoStyle]}>
          {/* Glow layers behind the logo */}
          <View style={styles.logoGlowGreen} />
          <View style={styles.logoGlowYellow} />
          <Image
            source={require("../assets/images/quickcart-logo.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Tagline */}
        <Animated.Text style={[styles.tagline, taglineStyle]}>
          Shop smarter. Checkout faster.{"\n"}Everything you need, delivered.
        </Animated.Text>

        {/* Feature badges */}
        <View style={styles.badgeRow}>
          {badges.map((b, i) => (
            <Animated.View key={i} style={[styles.badge, badgeStyles[i]]}>
              <Text style={styles.badgeIcon}>{b.icon}</Text>
              <Text style={styles.badgeLabel}>{b.label}</Text>
            </Animated.View>
          ))}
        </View>

        {/* Get Started CTA */}
        <Animated.View style={[styles.btnWrapper, btnStyle]}>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={handleGetStarted}
            style={styles.ctaTouch}
          >
            <LinearGradient
              colors={["#22C55E", "#16A34A", "#15803D"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              {/* Shimmer sweep */}
              <Animated.View style={[styles.shimmer, shimmerStyle]} />
              <Text style={styles.ctaText}>Get Started  →</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Sign-in link */}
        <Animated.View style={skipStyle}>
          <TouchableOpacity onPress={handleSignIn} activeOpacity={0.6}>
            <Text style={styles.skipText}>
              Already have an account?{" "}
              <Text style={styles.skipHighlight}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Version footer */}
      <Animated.Text style={[styles.versionText, skipStyle]}>
        v1.0.0 · quickCart
      </Animated.Text>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },

  // ── Logo ────────────────────────────────────────────────────────────────────
  logoWrapper: {
    width:         width * 0.78,
    height:        width * 0.48,
    marginBottom:  16,
    alignItems:    "center",
    justifyContent:"center",
  },
  logoGlowGreen: {
    position:        "absolute",
    width:           200,
    height:          120,
    borderRadius:    100,
    backgroundColor: "rgba(22,163,74,0.12)",
    top:             10,
    left:            20,
    transform:       [{ scaleX: 1.4 }],
  },
  logoGlowYellow: {
    position:        "absolute",
    width:           160,
    height:          100,
    borderRadius:    80,
    backgroundColor: "rgba(245,158,11,0.12)",
    bottom:          10,
    right:           20,
    transform:       [{ scaleX: 1.3 }],
  },
  logoImage: {
    width:  "100%",
    height: "100%",
  },

  // ── Tagline ─────────────────────────────────────────────────────────────────
  tagline: {
    fontSize:       15,
    color:          "#4B5563",
    textAlign:      "center",
    lineHeight:     23,
    marginBottom:   32,
    fontWeight:     "500",
  },

  // ── Badges ──────────────────────────────────────────────────────────────────
  badgeRow: {
    flexDirection: "row",
    gap:           10,
    marginBottom:  44,
  },
  badge: {
    alignItems:      "center",
    backgroundColor: "#F9FAFB",
    borderWidth:     1,
    borderColor:     "#E5E7EB",
    borderRadius:    14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowColor:     "#000",
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.05,
    shadowRadius:    2,
    elevation:       1,
  },
  badgeIcon: {
    fontSize:     18,
    marginBottom: 5,
  },
  badgeLabel: {
    fontSize:      10,
    color:         "#374151",
    fontWeight:    "700",
    letterSpacing: 0.4,
  },

  // ── CTA button ──────────────────────────────────────────────────────────────
  btnWrapper: {
    width:         "100%",
    marginBottom:  18,
    shadowColor:   "#16A34A",
    shadowOffset:  { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius:  12,
    elevation:     10,
  },
  ctaTouch: {
    borderRadius: 18,
    overflow:     "hidden",
  },
  ctaGradient: {
    paddingVertical:   17,
    paddingHorizontal: 32,
    alignItems:        "center",
    borderRadius:      18,
    overflow:          "hidden",
  },
  shimmer: {
    position:        "absolute",
    top:             0,
    bottom:          0,
    width:           80,
    backgroundColor: "rgba(255,255,255,0.25)",
    transform:       [{ skewX: "-20deg" }],
  },
  ctaText: {
    color:         "#fff",
    fontSize:      17,
    fontWeight:    "800",
    letterSpacing: 0.5,
  },

  // ── Skip link ───────────────────────────────────────────────────────────────
  skipText: {
    color:     "#6B7280",
    fontSize:  13,
    textAlign: "center",
  },
  skipHighlight: {
    color:      "#16A34A",
    fontWeight: "700",
  },

  // ── Footer ──────────────────────────────────────────────────────────────────
  versionText: {
    position:     "absolute",
    bottom:       36,
    alignSelf:    "center",
    color:        "#9CA3AF",
    fontSize:     11,
    letterSpacing: 0.5,
  },
});


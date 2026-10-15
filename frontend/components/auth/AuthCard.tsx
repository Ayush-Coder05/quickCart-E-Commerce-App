import { ReactNode } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Allow internal scroll – use for forms with many fields (e.g. signup) */
  scrollable?: boolean;
}

export function AuthCard({ title, subtitle, children, scrollable = false }: AuthCardProps) {
  const { width } = useWindowDimensions();
  const isWide = width >= 720;

  const innerContent = (
    <View style={[styles.inner, isWide && styles.innerWide]}>
      {/* Brand panel */}
      <View style={[styles.brandPanel, isWide && styles.brandPanelWide]}>
        <Image
          source={require("../../assets/images/quickcart-logo.png")}
          style={[styles.logo, isWide && styles.logoWide]}
          resizeMode="contain"
        />
        <Text style={styles.brandText}>Fresh finds, faster checkout.</Text>
      </View>

      {/* Form panel */}
      <View style={[styles.panel, isWide && styles.panelWide]}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {children}
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboard}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        {scrollable ? (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            automaticallyAdjustKeyboardInsets={true}
          >
            {innerContent}
            <View style={styles.keyboardSpacer} />
          </ScrollView>
        ) : (
          <View style={styles.staticContent}>
            {innerContent}
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  keyboard: {
    flex: 1,
  },
  staticContent: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  inner: {
    gap: 16,
  },
  innerWide: {
    flexDirection: "row",
    alignItems: "center",
    gap: 44,
    paddingHorizontal: 28,
  },
  brandPanel: {
    alignItems: "center",
  },
  brandPanelWide: {
    flex: 1,
    alignItems: "flex-start",
    maxWidth: 420,
  },
  logo: {
    width: "100%",
    maxWidth: 220,
    height: 90,
    alignSelf: "center",
  },
  logoWide: {
    maxWidth: 300,
    height: 130,
  },
  brandText: {
    color: "#6B7280",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    fontWeight: "500",
    marginTop: 2,
  },
  panel: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
  panelWide: {
    flex: 1,
  },
  title: {
    color: "#1F2937",
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: "#6B7280",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 18,
  },
  keyboardSpacer: {
    height: 40,
  },
});

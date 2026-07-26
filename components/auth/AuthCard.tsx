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
}

export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  const { width } = useWindowDimensions();
  const isWide = width >= 720;

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboard}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, isWide ? styles.wideContent : null]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets={true}
        >
          <View style={[styles.brandPanel, isWide ? styles.brandPanelWide : null]}>
            <Image
              source={require("../../assets/images/quickcart-logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.brandText}>Fresh finds, faster checkout.</Text>
          </View>

          <View style={[styles.panel, isWide ? styles.panelWide : null]}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
            {children}
          </View>

          {/* Extra space so content above keyboard is always reachable */}
          <View style={styles.keyboardSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F3F4F6", // Light Gray background
  },
  keyboard: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 36,
    gap: 24,
  },
  wideContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: 44,
    paddingHorizontal: 48,
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
    maxWidth: 300,
    height: 150,
  },
  brandText: {
    color: "#6B7280",
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    fontWeight: "500",
  },
  panel: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    padding: 24,
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
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: "#6B7280",
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 24,
  },
  keyboardSpacer: {
    height: 120,
  },
});


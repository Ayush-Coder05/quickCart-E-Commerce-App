import { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from "react-native-reanimated";

interface OtpInputProps {
  /** Called whenever all 6 digits are filled. */
  onComplete: (otp: string) => void;
  /** Called on every keystroke with the current partial/full value. */
  onChange?: (otp: string) => void;
  error?: string;
  /** Change this value to clear & reset the boxes (e.g. pass Date.now()). */
  resetKey?: number;
}

const CELL_COUNT = 6;
const CELL_SIZE  = 48;

// ── Individual animated cell ───────────────────────────────────────────────────
function OtpCell({
  value,
  isFocused,
  hasError,
  inputRef,
  onChangeText,
  onKeyPress,
  onFocus,
  onBlur,
}: {
  value: string;
  isFocused: boolean;
  hasError: boolean;
  inputRef: (el: TextInput | null) => void;
  onChangeText: (val: string) => void;
  onKeyPress: (key: string) => void;
  onFocus: () => void;
  onBlur: () => void;
}) {
  const scale = useSharedValue(1);

  // Pop animation when digit is filled
  useEffect(() => {
    if (value) {
      scale.value = withSequence(
        withSpring(1.18, { damping: 8,  stiffness: 240 }),
        withSpring(1,    { damping: 10, stiffness: 200 }),
      );
    }
  }, [value]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.cell,
        isFocused && styles.cellFocused,
        !!value    && styles.cellFilled,
        hasError   && styles.cellError,
        animStyle,
      ]}
    >
      <TextInput
        ref={inputRef}
        style={styles.cellInput}
        value={value}
        onChangeText={onChangeText}
        onKeyPress={({ nativeEvent }) => onKeyPress(nativeEvent.key)}
        onFocus={onFocus}
        onBlur={onBlur}
        keyboardType="number-pad"
        maxLength={CELL_COUNT}        // lets the OS paste the whole OTP
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        selectTextOnFocus
        caretHidden={Platform.OS !== "web"}
        placeholder={isFocused ? "" : "·"}
        placeholderTextColor="#9CA3AF"
      />
    </Animated.View>
  );
}

// ── Main OtpInput component ────────────────────────────────────────────────────
export function OtpInput({ onComplete, onChange, error, resetKey }: OtpInputProps) {
  const [digits, setDigits]           = useState<string[]>(Array(CELL_COUNT).fill(""));
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const inputsRef                     = useRef<(TextInput | null)[]>([]);

  // Shake row on error
  const shakeX   = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  // Clear boxes when resetKey changes
  useEffect(() => {
    if (resetKey !== undefined) {
      setDigits(Array(CELL_COUNT).fill(""));
      setTimeout(() => inputsRef.current[0]?.focus(), 80);
    }
  }, [resetKey]);

  // Shake when a new error arrives
  const prevError = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (error && error !== prevError.current) {
      shakeX.value = withSequence(
        withTiming(-9,  { duration: 55 }),
        withTiming(9,   { duration: 55 }),
        withTiming(-7,  { duration: 55 }),
        withTiming(7,   { duration: 55 }),
        withTiming(0,   { duration: 55 }),
      );
    }
    prevError.current = error;
  }, [error]);

  // ── Digit change (handles single key AND paste) ────────────────────────────
  const handleChange = (index: number, rawValue: string) => {
    const cleaned = rawValue.replace(/\D/g, "").slice(0, CELL_COUNT);
    if (!cleaned) return;

    const next = [...digits];
    let lastFilled = index;

    for (let i = 0; i < cleaned.length && index + i < CELL_COUNT; i++) {
      next[index + i] = cleaned[i];
      lastFilled = index + i;
    }

    setDigits(next);
    const otp = next.join("");
    onChange?.(otp);

    const nextFocusIndex = lastFilled + 1;
    if (nextFocusIndex < CELL_COUNT) {
      inputsRef.current[nextFocusIndex]?.focus();
    } else {
      inputsRef.current[CELL_COUNT - 1]?.blur();
      if (next.every((d) => d !== "")) onComplete(otp);
    }
  };

  // ── Backspace ──────────────────────────────────────────────────────────────
  const handleKeyPress = (index: number, key: string) => {
    if (key !== "Backspace") return;

    const next = [...digits];
    if (next[index]) {
      next[index] = "";
    } else if (index > 0) {
      next[index - 1] = "";
      inputsRef.current[index - 1]?.focus();
    }
    setDigits(next);
    onChange?.(next.join(""));
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>OTP</Text>

      <Animated.View style={[styles.row, shakeStyle]}>
        {Array.from({ length: CELL_COUNT }).map((_, i) => (
          <OtpCell
            key={i}
            value={digits[i]}
            isFocused={focusedIndex === i}
            hasError={!!error}
            inputRef={(el) => { inputsRef.current[i] = el; }}
            onChangeText={(val) => handleChange(i, val)}
            onKeyPress={(key) => handleKeyPress(i, key)}
            onFocus={() => setFocusedIndex(i)}
            onBlur={() => setFocusedIndex(null)}
          />
        ))}
      </Animated.View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 8,
  },
  label: {
    color:      "#374151",
    fontSize:   13,
    fontWeight: "700",
    marginBottom: 10,
  },
  row: {
    flexDirection:  "row",
    gap:            10,
    justifyContent: "center",
  },
  cell: {
    width:           CELL_SIZE,
    height:          CELL_SIZE,
    borderRadius:    12,
    borderWidth:     1.5,
    borderColor:     "#D1D5DB",
    backgroundColor: "#F9FAFB",
    alignItems:      "center",
    justifyContent:  "center",
    overflow:        "hidden",
  },
  cellFocused: {
    borderColor:     "#16A34A",
    backgroundColor: "#DCFCE7",
  },
  cellFilled: {
    borderColor:     "#86EFAC",
    backgroundColor: "#F0FDF4",
  },
  cellError: {
    borderColor:     "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  cellInput: {
    width:      CELL_SIZE,
    height:     CELL_SIZE,
    textAlign:  "center",
    color:      "#1F2937",
    fontSize:   22,
    fontWeight: "800",
  },
  error: {
    color:     "#EF4444",
    fontSize:  12,
    lineHeight: 17,
    marginTop: 8,
    textAlign: "center",
  },
});


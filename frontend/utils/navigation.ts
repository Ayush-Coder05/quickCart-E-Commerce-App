/**
 * utils/navigation.ts
 *
 * navigateToHome() resets the entire navigation stack to just [home].
 * This means pressing back on home will exit the app instead of going
 * back to splash / login / signup.
 */

import { CommonActions } from "@react-navigation/native";
import { router } from "expo-router";

export function navigateToHome(navigation: any) {
  navigation.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: "home" }],
    }),
  );
}


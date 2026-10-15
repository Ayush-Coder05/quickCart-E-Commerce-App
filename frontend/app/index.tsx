import { Redirect } from "expo-router";

// Entry point: always show the splash/welcome screen first
export default function Index() {
  return <Redirect href="/splash" />;
}


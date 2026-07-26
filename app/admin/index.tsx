// app/admin/index.tsx - redirect to dashboard
import { Redirect } from "expo-router";
export default function AdminIndex() {
  return <Redirect href="/admin/dashboard" />;
}


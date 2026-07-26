import type { Href } from "expo-router";

export const ROUTES = {
  // ── Auth ─────────────────────────────────────────────────────────────────
  forgotPassword:   "/forgot-password"   as Href,
  login:            "/login"             as Href,
  signup:           "/signup"            as Href,
  otpVerification:  "/otp-verification"  as Href,

  // ── On-boarding ──────────────────────────────────────────────────────────
  permissionFlow:   "/permission-flow"   as Href,
  statePicker:      "/state-picker"      as Href,

  // ── Main app ─────────────────────────────────────────────────────────────
  home:             "/home"              as Href,
  search:           "/search"            as Href,
  orders:           "/orders"            as Href,
  profile:          "/profile"           as Href,
  cart:             "/cart"             as Href,
  checkout:         "/checkout"          as Href,

  // ── Address ──────────────────────────────────────────────────────────────
  address:          "/address"           as Href,

  // ── Admin ────────────────────────────────────────────────────────────────
  adminDashboard:   "/admin/dashboard"   as Href,
  adminCategories:  "/admin/categories"  as Href,
  adminProducts:    "/admin/products"    as Href,
  adminCities:      "/admin/cities"      as Href,
  adminOrders:      "/admin/orders"      as Href,
  adminUsers:       "/admin/users"       as Href,
};




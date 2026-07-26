// ─────────────────────────────────────────────────────────────────────────────
//  utils/indianStates.ts
//
//  Complete list of all 28 Indian states + 8 Union Territories, and a
//  robust normalizer that maps raw geocoding output to exact Firestore
//  document names used in:  /states/{stateName}/banners | categories | products
// ─────────────────────────────────────────────────────────────────────────────

/** All 36 Indian States and Union Territories - alphabetical order. */
export const INDIAN_STATES: string[] = [
  "Andaman & Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra & Nagar Haveli and Daman & Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu & Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

/**
 * Alias map - every known geocoding variant → canonical Firestore document name.
 * Keys are lowercase; values are the exact Firestore document names.
 */
const STATE_ALIASES: Record<string, string> = {
  // Delhi
  delhi: "Delhi",
  "new delhi": "Delhi",
  "nct of delhi": "Delhi",
  "national capital territory of delhi": "Delhi",

  // Uttar Pradesh
  "uttar pradesh": "Uttar Pradesh",
  up: "Uttar Pradesh",

  // Bihar
  bihar: "Bihar",

  // Maharashtra
  maharashtra: "Maharashtra",

  // Karnataka
  karnataka: "Karnataka",

  // Tamil Nadu
  "tamil nadu": "Tamil Nadu",
  tamilnadu: "Tamil Nadu",

  // West Bengal
  "west bengal": "West Bengal",

  // Rajasthan
  rajasthan: "Rajasthan",

  // Gujarat
  gujarat: "Gujarat",

  // Madhya Pradesh
  "madhya pradesh": "Madhya Pradesh",
  mp: "Madhya Pradesh",

  // Andhra Pradesh
  "andhra pradesh": "Andhra Pradesh",

  // Telangana
  telangana: "Telangana",

  // Haryana
  haryana: "Haryana",

  // Kerala
  kerala: "Kerala",

  // Punjab
  punjab: "Punjab",

  // Jharkhand
  jharkhand: "Jharkhand",

  // Assam
  assam: "Assam",

  // Odisha / Orissa
  odisha: "Odisha",
  orissa: "Odisha",

  // Uttarakhand
  uttarakhand: "Uttarakhand",
  uttaranchal: "Uttarakhand",

  // Himachal Pradesh
  "himachal pradesh": "Himachal Pradesh",
  hp: "Himachal Pradesh",

  // Chhattisgarh
  chhattisgarh: "Chhattisgarh",

  // Goa
  goa: "Goa",

  // Manipur
  manipur: "Manipur",

  // Meghalaya
  meghalaya: "Meghalaya",

  // Mizoram
  mizoram: "Mizoram",

  // Nagaland
  nagaland: "Nagaland",

  // Tripura
  tripura: "Tripura",

  // Arunachal Pradesh
  "arunachal pradesh": "Arunachal Pradesh",

  // Sikkim
  sikkim: "Sikkim",

  // Jammu & Kashmir
  "jammu and kashmir": "Jammu & Kashmir",
  "jammu & kashmir": "Jammu & Kashmir",
  "j&k": "Jammu & Kashmir",
  jk: "Jammu & Kashmir",

  // Ladakh
  ladakh: "Ladakh",

  // Chandigarh
  chandigarh: "Chandigarh",

  // Puducherry
  puducherry: "Puducherry",
  pondicherry: "Puducherry",

  // Andaman & Nicobar Islands
  "andaman and nicobar islands": "Andaman & Nicobar Islands",
  "andaman & nicobar islands": "Andaman & Nicobar Islands",
  "andaman nicobar": "Andaman & Nicobar Islands",

  // Lakshadweep
  lakshadweep: "Lakshadweep",

  // Dadra & Nagar Haveli and Daman & Diu
  "dadra and nagar haveli": "Dadra & Nagar Haveli and Daman & Diu",
  "daman and diu": "Dadra & Nagar Haveli and Daman & Diu",
  "dadra & nagar haveli and daman & diu":
    "Dadra & Nagar Haveli and Daman & Diu",
};

/**
 * Convert raw geocoding output to the canonical Firestore document name.
 *
 * Handles:
 *  - Extra whitespace / trailing ", India"
 *  - All known spelling variants and abbreviations
 *  - Case-insensitive matching
 *
 * @param raw  The `region` field from `expo-location` reverseGeocodeAsync
 * @returns    Exact Firestore document name, or `null` if unmappable
 */
export function normalizeStateName(raw: string | null | undefined): string | null {
  if (!raw) return null;

  // Strip trailing country / comma noise - e.g. "Bihar, India" → "Bihar"
  const cleaned = raw
    .replace(/,?\s*(india|in)$/i, "")
    .trim();

  const lower = cleaned.toLowerCase();

  // 1. Exact alias match
  if (STATE_ALIASES[lower]) return STATE_ALIASES[lower];

  // 2. Partial alias match  (handles extra words in geocoding output)
  for (const [alias, canonical] of Object.entries(STATE_ALIASES)) {
    if (lower.includes(alias)) return canonical;
  }

  // 3. Case-insensitive match against canonical list
  const match = INDIAN_STATES.find(
    (s) => s.toLowerCase() === lower,
  );
  if (match) return match;

  return null; // not an Indian state we recognise
}


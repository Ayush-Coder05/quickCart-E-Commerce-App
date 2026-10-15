// ─────────────────────────────────────────────────────────────────────────────
//  utils/currency.ts
//
//  Format numbers as Indian Rupees (INR)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formats a number to the Indian numbering system with the Rupee symbol.
 * E.g., 1499 -> "Rs.  1,499"
 * E.g., 100000 -> "Rs.  1,00,000"
 */
export function formatRupees(amount: number): string {
  if (isNaN(amount)) return "Rs.  0";

  // Use Intl.NumberFormat with the 'en-IN' locale for the Indian numbering system
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0, // Don't show .00 for whole numbers
    maximumFractionDigits: 2,
  }).format(amount);

  // Intl returns something like "Rs. 1,499". Let's add a space if not present.
  return formatted.replace(/^(\D+)/, '$1 ').trim();
}


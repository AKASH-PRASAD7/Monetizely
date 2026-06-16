/**
 * Formatting & helper utilities used across the application.
 */

/**
 * Format a number as USD currency string.
 * @example formatCurrency(12750) → "$12,750.00"
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a number as a compact currency (no decimals when whole).
 * @example formatCurrencyCompact(12750) → "$12,750"
 */
export function formatCurrencyCompact(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a decimal as a percentage string.
 * @example formatPercentage(15) → "15%"
 */
export function formatPercentage(value: number): string {
  return `${value}%`;
}

/**
 * Utility to merge class names (simple version without clsx dependency).
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Generate a URL-safe slug from a string.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .trim();
}

/**
 * Format a date for display.
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Get a date 30 days from now (quote validity).
 */
export function getValidUntilDate(from: Date = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + 30);
  return d;
}

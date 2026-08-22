export function formatCurrency(amount?: number | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString?: string | Date | null): string {
  if (!dateString) return "N/A";
  const date = typeof dateString === "string" ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return "N/A";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatTime(dateString?: string | Date | null): string {
  if (!dateString) return "--:--";
  const date = typeof dateString === "string" ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return "--:--";
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function formatHours(hours?: number | null): string {
  if (hours === undefined || hours === null || isNaN(hours)) return "0 hrs";
  return `${hours.toFixed(1)} hrs`;
}

export function getInitials(firstName?: string | null, lastName?: string | null): string {
  const f = (firstName || "").trim().charAt(0).toUpperCase();
  const l = (lastName || "").trim().charAt(0).toUpperCase();
  return f + l || "CR";
}

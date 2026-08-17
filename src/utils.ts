export function todayISO(): string {
  return isoOf(new Date());
}

export function isoOf(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fmtDateShort(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export function fmtMoney(n: number): string {
  const rounded = Math.round((n || 0) * 100) / 100;
  const neg = rounded < 0;
  const abs = Math.abs(rounded);
  const s = abs.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  return (neg ? "-" : "") + "\u09F3" + s;
}

export const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// ---- Expense allocation logic, mirrors the spreadsheet's SUMIFS/SUMPRODUCT rules ----
export function expenseAppliesToBus(tag: string, busId: string): boolean {
  if (!tag) return false;
  if (tag === "ALL") return true;
  return tag.split(";").map((s) => s.trim()).includes(busId);
}

export function expenseShareForBus(tag: string, fleetSize: number): number {
  if (tag === "ALL") return fleetSize > 0 ? 1 / fleetSize : 0;
  const n = tag.split(";").filter(Boolean).length;
  return n > 0 ? 1 / n : 0;
}

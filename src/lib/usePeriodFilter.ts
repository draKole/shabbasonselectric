import { useState, useEffect, useMemo } from "react";

export type PeriodRange = "this_week" | "this_month" | "last_month" | "ytd" | "all";

const LABELS: Record<PeriodRange, string> = {
  this_week: "This Week",
  this_month: "This Month",
  last_month: "Last Month",
  ytd: "YTD",
  all: "All Time",
};

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay(); // 0=Sun
  const diff = (day + 6) % 7; // Monday start
  x.setDate(x.getDate() - diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function periodRange(range: PeriodRange): { from: Date | null; to: Date | null } {
  const now = new Date();
  if (range === "all") return { from: null, to: null };
  if (range === "this_week") {
    const from = startOfWeek(now);
    return { from, to: now };
  }
  if (range === "this_month") {
    return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
  }
  if (range === "last_month") {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    return { from, to };
  }
  if (range === "ytd") {
    return { from: new Date(now.getFullYear(), 0, 1), to: now };
  }
  return { from: null, to: null };
}

export function usePeriodFilter(storageKey: string, initial: PeriodRange = "this_month") {
  const [range, setRange] = useState<PeriodRange>(() => {
    if (typeof window === "undefined") return initial;
    return (localStorage.getItem(storageKey) as PeriodRange) || initial;
  });
  useEffect(() => {
    try { localStorage.setItem(storageKey, range); } catch {}
  }, [range, storageKey]);

  const { from, to } = useMemo(() => periodRange(range), [range]);
  return { range, setRange, from, to, label: LABELS[range], allRanges: Object.keys(LABELS) as PeriodRange[], rangeLabel: (r: PeriodRange) => LABELS[r] };
}

export function inRange(d: Date | string | null | undefined, from: Date | null, to: Date | null) {
  if (!d) return false;
  const x = typeof d === "string" ? new Date(d) : d;
  if (from && x < from) return false;
  if (to && x > to) return false;
  return true;
}

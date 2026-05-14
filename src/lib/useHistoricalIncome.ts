import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type HistoricalIncome = {
  id: string;
  entry_date: string;
  customer_name: string | null;
  description: string | null;
  amount: number;
  scope: "business" | "personal";
  source: string;
  already_spent: boolean;
  count_in_ytd: boolean;
  count_in_cash: boolean;
  notes: string | null;
  est_materials_pct: number;
  est_materials_amount: number | null;
};

export function estMaterials(i: HistoricalIncome): number {
  if (i.est_materials_amount != null && Number.isFinite(Number(i.est_materials_amount))) {
    return Number(i.est_materials_amount);
  }
  return Number(i.amount || 0) * (Number(i.est_materials_pct ?? 70) / 100);
}

export function useHistoricalIncome(scope: "business" | "personal" | "all", from?: string, to?: string) {
  const [items, setItems] = useState<HistoricalIncome[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    let q: any = (supabase as any).from("historical_income").select("*").order("entry_date", { ascending: false });
    if (scope !== "all") q = q.eq("scope", scope);
    if (from) q = q.gte("entry_date", from);
    if (to) q = q.lte("entry_date", to);
    const { data } = await q;
    setItems((data as any) || []);
    setLoading(false);
  }, [scope, from, to]);

  useEffect(() => { reload(); }, [reload]);

  const ytdAmount = items.filter(i => i.count_in_ytd).reduce((s, i) => s + Number(i.amount || 0), 0);
  const cashAmount = items.filter(i => i.count_in_cash).reduce((s, i) => s + Number(i.amount || 0), 0);
  const total = items.reduce((s, i) => s + Number(i.amount || 0), 0);
  const ytdEstMaterials = items.filter(i => i.count_in_ytd).reduce((s, i) => s + estMaterials(i), 0);

  // Group by month "YYYY-MM"
  const byMonth = new Map<string, { income: number; estMaterials: number; alreadySpent: number; count: number }>();
  items.forEach((i) => {
    const k = (i.entry_date || "").slice(0, 7);
    const cur = byMonth.get(k) || { income: 0, estMaterials: 0, alreadySpent: 0, count: 0 };
    if (i.count_in_ytd) {
      cur.income += Number(i.amount || 0);
      cur.estMaterials += estMaterials(i);
      if (i.already_spent) cur.alreadySpent += Number(i.amount || 0);
      cur.count += 1;
    }
    byMonth.set(k, cur);
  });

  function forMonth(monthKey: string) {
    return byMonth.get(monthKey) || { income: 0, estMaterials: 0, alreadySpent: 0, count: 0 };
  }

  return { items, ytdAmount, cashAmount, total, ytdEstMaterials, byMonth, forMonth, loading, reload };
}

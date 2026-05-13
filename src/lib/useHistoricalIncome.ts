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
};

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

  return { items, ytdAmount, cashAmount, total, loading, reload };
}

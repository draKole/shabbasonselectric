import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type MoneyTotals = {
  collected: number;
  materialsMe: number;
  workerLabor: number;
  otherExp: number;
  netProfit: number;
  paymentCount: number;
};

function inRange(d: string | null | undefined, from: string, to: string) {
  if (!d) return false;
  const k = d.slice(0, 10);
  return k >= from && k <= to;
}

export function monthRange(monthKey: string) {
  // monthKey = "YYYY-MM"
  const [y, m] = monthKey.split("-").map(Number);
  const from = `${monthKey}-01`;
  const last = new Date(y, m, 0).getDate();
  const to = `${monthKey}-${String(last).padStart(2, "0")}`;
  return { from, to };
}

export function yearRange(year: string) {
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

/**
 * Computes net profit from real dated rows:
 * - payments by paid_on
 * - materials by purchased_on (paid_by = 'me')
 * - worker labor by worker_time_entries.work_date
 * - other expenses: prorated by period (jobs.other_expenses attributed to its updated_at month)
 */
export function useMonthMoney(from: string, to: string) {
  const [totals, setTotals] = useState<MoneyTotals>({
    collected: 0, materialsMe: 0, workerLabor: 0, otherExp: 0, netProfit: 0, paymentCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: pays }, { data: mats }, { data: wte }, { data: jobs }] = await Promise.all([
        supabase.from("job_payments").select("amount, paid_on").gte("paid_on", from).lte("paid_on", to),
        supabase.from("job_materials").select("cost, paid_by, purchased_on").eq("paid_by", "me").gte("purchased_on", from).lte("purchased_on", to),
        supabase.from("worker_time_entries").select("amount, work_date").gte("work_date", from).lte("work_date", to),
        supabase.from("jobs").select("other_expenses, updated_at"),
      ]);
      if (cancelled) return;
      const collected = (pays || []).reduce((s, p: any) => s + Number(p.amount || 0), 0);
      const materialsMe = (mats || []).reduce((s, m: any) => s + Number(m.cost || 0), 0);
      const workerLabor = (wte || []).reduce((s, e: any) => s + Number(e.amount || 0), 0);
      const otherExp = (jobs || [])
        .filter((j: any) => inRange(j.updated_at, from, to))
        .reduce((s, j: any) => s + Number(j.other_expenses || 0), 0);
      const netProfit = Math.max(collected - materialsMe - workerLabor - otherExp, 0);
      setTotals({ collected, materialsMe, workerLabor, otherExp, netProfit, paymentCount: (pays || []).length });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [from, to]);

  return { ...totals, loading };
}

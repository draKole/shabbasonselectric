import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MonthlyCashFlow {
  month: string; // "YYYY-MM"
  label: string; // "Jan 2026"
  collected: number;
}

export function useCashFlow() {
  const [monthly, setMonthly] = useState<MonthlyCashFlow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("job_payments")
        .select("amount, paid_on")
        .order("paid_on", { ascending: true });

      const grouped: Record<string, number> = {};
      for (const p of data || []) {
        if (!p.paid_on) continue;
        const month = p.paid_on.slice(0, 7); // "YYYY-MM"
        grouped[month] = (grouped[month] || 0) + Number(p.amount || 0);
      }

      const MONTHS = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
      ];

      const result: MonthlyCashFlow[] = Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, collected]) => {
          const [, m] = month.split("-");
          const monthIdx = parseInt(m, 10) - 1;
          return {
            month,
            label: `${MONTHS[monthIdx] || m} ${month.slice(0, 4)}`,
            collected: Math.round(collected * 100) / 100,
          };
        });

      setMonthly(result);
      setLoading(false);
    })();
  }, []);

  return { monthly, loading };
}
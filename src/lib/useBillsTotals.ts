import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type BillsTotals = {
  paid: number;
  remaining: number;
  pastDue: number;
  unpaidThisMonth: number;
  loading: boolean;
};

export function useBillsTotals(from: string, to: string, type?: "business" | "personal") {
  const [t, setT] = useState<BillsTotals>({ paid: 0, remaining: 0, pastDue: 0, unpaidThisMonth: 0, loading: true });
  useEffect(() => {
    (async () => {
      let q = (supabase as any).from("bill_occurrences").select("amount, due_date, paid, paid_on, bills!inner(bill_type)");
      if (type) q = q.eq("bills.bill_type", type);
      const { data } = await q;
      const arr = (data || []) as any[];
      const paid = arr.filter(b => b.paid && b.paid_on && b.paid_on >= from && b.paid_on <= to).reduce((s, b) => s + Number(b.amount || 0), 0);
      const unpaidThisMonth = arr.filter(b => !b.paid && b.due_date && b.due_date >= from && b.due_date <= to).reduce((s, b) => s + Number(b.amount || 0), 0);
      const pastDue = arr.filter(b => !b.paid && b.due_date && b.due_date < from).reduce((s, b) => s + Number(b.amount || 0), 0);
      setT({ paid, remaining: unpaidThisMonth + pastDue, pastDue, unpaidThisMonth, loading: false });
    })();
  }, [from, to, type]);
  return t;
}

export function useDebtTotals(scope?: "business" | "personal", from?: string, to?: string) {
  const [t, setT] = useState({ remaining: 0, paidThisMonth: 0, loading: true });
  useEffect(() => {
    (async () => {
      let dq = supabase.from("debts").select("current_balance, debt_scope, id");
      if (scope) dq = dq.eq("debt_scope", scope);
      const { data: debts } = await dq;
      const debtArr = (debts || []) as any[];
      const remaining = debtArr.reduce((s, d) => s + Number(d.current_balance || 0), 0);
      let paidThisMonth = 0;
      if (from && to) {
        const ids = debtArr.map(d => d.id);
        if (ids.length) {
          const { data: pays } = await supabase.from("debt_payments").select("amount, paid_on, debt_id")
            .in("debt_id", ids).gte("paid_on", from).lte("paid_on", to);
          paidThisMonth = (pays || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
        }
      }
      setT({ remaining, paidThisMonth, loading: false });
    })();
  }, [scope, from, to]);
  return t;
}

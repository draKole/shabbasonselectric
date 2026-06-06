import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BillOccurrence {
  id: string;
  bill_id: string;
  period_month: string; // date YYYY-MM-01
  due_date: string | null;
  amount: number;
  paid: boolean;
  paid_on: string | null;
  paid_amount: number;
  notes: string | null;
}

export function monthKey(d: Date = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export function useBillOccurrences(periodMonth?: string) {
  return useQuery({
    queryKey: ["bill_occurrences", periodMonth || "all"],
    queryFn: async () => {
      let q = supabase.from("bill_occurrences").select("*").order("due_date");
      if (periodMonth) q = q.eq("period_month", periodMonth);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as BillOccurrence[];
    },
  });
}

export function useToggleBillOccurrencePaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, paid, amount }: { id: string; paid: boolean; amount: number }) => {
      const update: any = paid
        ? { paid: true, paid_on: new Date().toISOString().slice(0, 10), paid_amount: amount }
        : { paid: false, paid_on: null, paid_amount: 0 };
      const { error } = await supabase.from("bill_occurrences").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bill_occurrences"] }),
  });
}

// Trigger generation of current+catch-up occurrences (throttled per browser session)
let _lastGen = 0;
export async function ensureMonthlyOccurrences() {
  const today = new Date().toISOString().slice(0, 10);
  const key = "bill_occ_lastgen";
  try {
    const stored = localStorage.getItem(key);
    if (stored === today) return;
  } catch {}
  if (Date.now() - _lastGen < 60_000) return;
  _lastGen = Date.now();
  try {
    await supabase.functions.invoke("generate-bill-occurrences", { body: {} });
    localStorage.setItem(key, today);
  } catch {/* silent */}
}

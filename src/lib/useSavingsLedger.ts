import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SavingsTxn = {
  id: string;
  worker_id: string;
  entry_date: string;
  txn_type: "withheld" | "released" | "sent" | "adjustment" | "correction" | string;
  amount: number;
  paystub_id: string | null;
  method: string | null;
  notes: string | null;
  created_at: string;
};

function isCredit(t: string) {
  return t === "withheld" || t === "adjustment";
}

export function useSavingsLedger(workerId?: string) {
  const [txns, setTxns] = useState<SavingsTxn[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    let q = (supabase as any).from("worker_savings_ledger").select("*").order("entry_date", { ascending: false });
    if (workerId) q = q.eq("worker_id", workerId);
    const { data } = await q;
    setTxns((data as any) || []);
    setLoading(false);
  }, [workerId]);

  useEffect(() => { reload(); }, [reload]);

  // Per-worker totals
  function totalsFor(wid: string, fromDate?: string, toDate?: string) {
    const rows = txns.filter((t) => t.worker_id === wid &&
      (!fromDate || t.entry_date >= fromDate) &&
      (!toDate || t.entry_date <= toDate));
    let withheld = 0, released = 0, sent = 0, adj = 0;
    rows.forEach((r) => {
      const amt = Number(r.amount || 0);
      if (r.txn_type === "withheld") withheld += amt;
      else if (r.txn_type === "released") released += amt;
      else if (r.txn_type === "sent") sent += amt;
      else if (r.txn_type === "adjustment" || r.txn_type === "correction") adj += amt;
    });
    const balance = withheld - released - sent + adj;
    return { withheld, released, sent, adj, balance };
  }

  function globalBalance() {
    return txns.reduce((s, t) => s + (isCredit(t.txn_type) ? Number(t.amount || 0) : -Number(t.amount || 0)), 0);
  }

  return { txns, loading, reload, totalsFor, globalBalance };
}

export async function recordSavingsTxn(row: {
  worker_id: string;
  txn_type: "withheld" | "released" | "sent" | "adjustment" | "correction";
  amount: number;
  paystub_id?: string | null;
  method?: string | null;
  notes?: string | null;
  entry_date?: string;
}) {
  return (supabase as any).from("worker_savings_ledger").insert({
    worker_id: row.worker_id,
    txn_type: row.txn_type,
    amount: row.amount,
    paystub_id: row.paystub_id ?? null,
    method: row.method ?? null,
    notes: row.notes ?? null,
    entry_date: row.entry_date ?? new Date().toISOString().slice(0, 10),
  });
}

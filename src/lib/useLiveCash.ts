import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type BusinessCash = {
  live_cash: number;
  is_reconciled: boolean;
  reconciliation_date: string | null;
  reconciled_balance: number;
  payments_in: number;
  voucher_cash_in: number;
  historical_in: number;
  materials_out: number;
  worker_pay_out: number;
  bills_out: number;
  debt_out: number;
  transfers_out: number;
  assigned: number;
  voucher_liability: number;
  unassigned: number;
};
export type PersonalCash = {
  live_cash: number;
  is_reconciled: boolean;
  reconciliation_date: string | null;
  reconciled_balance: number;
  transfers_in: number;
  owner_worker_pay_in: number;
  personal_income_in: number;
  personal_exp_out: number;
  bills_out: number;
  debt_out: number;
  assigned: number;
  unassigned: number;
};

export function useLiveCash() {
  const [biz, setBiz] = useState<BusinessCash | null>(null);
  const [per, setPer] = useState<PersonalCash | null>(null);
  const [openJobBalance, setOpenJobBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const [b, p, ba, pa, vl, oj] = await Promise.all([
      (supabase as any).from("v_business_live_cash").select("*").maybeSingle(),
      (supabase as any).from("v_personal_live_cash").select("*").maybeSingle(),
      (supabase as any).from("v_business_assigned").select("*").maybeSingle(),
      (supabase as any).from("v_personal_assigned").select("*").maybeSingle(),
      (supabase as any).from("v_voucher_liability").select("*").maybeSingle(),
      (supabase as any).from("v_open_job_balances").select("*").maybeSingle(),
    ]);
    const bizRow = b.data || {};
    const perRow = p.data || {};
    const bizAssigned = Number(ba.data?.assigned_total || 0);
    const perAssigned = Number(pa.data?.assigned_total || 0);
    const vLiab = Number(vl.data?.outstanding || 0);
    setOpenJobBalance(Number(oj.data?.open_balance || 0));
    setBiz({
      live_cash: Number(bizRow.live_cash || 0),
      payments_in: Number(bizRow.payments_in || 0),
      voucher_cash_in: Number(bizRow.voucher_cash_in || 0),
      historical_in: Number(bizRow.historical_in || 0),
      materials_out: Number(bizRow.materials_out || 0),
      worker_pay_out: Number(bizRow.worker_pay_out || 0),
      bills_out: Number(bizRow.bills_out || 0),
      debt_out: Number(bizRow.debt_out || 0),
      transfers_out: Number(bizRow.transfers_out || 0),
      assigned: bizAssigned,
      voucher_liability: vLiab,
      unassigned: Math.max(0, Number(bizRow.live_cash || 0) - bizAssigned),
      is_reconciled: !!bizRow.is_reconciled,
      reconciliation_date: bizRow.reconciliation_date || null,
      reconciled_balance: Number(bizRow.reconciled_balance || 0),
    });
    setPer({
      live_cash: Number(perRow.live_cash || 0),
      is_reconciled: !!perRow.is_reconciled,
      reconciliation_date: perRow.reconciliation_date || null,
      reconciled_balance: Number(perRow.reconciled_balance || 0),
      transfers_in: Number(perRow.transfers_in || 0),
      owner_worker_pay_in: Number(perRow.owner_worker_pay_in || 0),
      personal_income_in: Number(perRow.personal_income_in || 0),
      personal_exp_out: Number(perRow.personal_exp_out || 0),
      bills_out: Number(perRow.bills_out || 0),
      debt_out: Number(perRow.debt_out || 0),
      assigned: perAssigned,
      unassigned: Math.max(0, Number(perRow.live_cash || 0) - perAssigned),
    });
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);
  return { biz, per, openJobBalance, loading, reload };
}

export function fmtMoney(n: number) {
  return Number(n || 0).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function weekStart(d = new Date()): string {
  const day = d.getDay(); // 0 Sun
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7));
  return monday.toISOString().slice(0, 10);
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGlobalSettings, num, isYes } from "@/lib/useGlobalSettings";

export type MoneyTotals = {
  collected: number;
  materialsMe: number;
  workerLabor: number;       // base worker pay (non-owner, approved)
  workerBurden: number;
  workerTrueCost: number;
  ownerPay: number;          // owner's own labor pay (approved entries) — paid out of business
  pendingHoursCost: number;  // unapproved entries (informational)
  otherExp: number;
  netProfit: number;
  businessNetAfterOwner: number;
  paymentCount: number;
  includeBurden: boolean;
  ownerReducesProfit: boolean;
};

function inRange(d: string | null | undefined, from: string, to: string) {
  if (!d) return false;
  const k = d.slice(0, 10);
  return k >= from && k <= to;
}

export function monthRange(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  const from = `${monthKey}-01`;
  const last = new Date(y, m, 0).getDate();
  const to = `${monthKey}-${String(last).padStart(2, "0")}`;
  return { from, to };
}

export function yearRange(year: string) {
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

export function useMonthMoney(from: string, to: string, mode: "auto" | "force-on" | "force-off" = "auto") {
  const { settings } = useGlobalSettings();
  const [totals, setTotals] = useState<MoneyTotals>({
    collected: 0, materialsMe: 0, workerLabor: 0, workerBurden: 0, workerTrueCost: 0,
    ownerPay: 0, pendingHoursCost: 0, otherExp: 0, netProfit: 0, businessNetAfterOwner: 0,
    paymentCount: 0, includeBurden: false, ownerReducesProfit: true,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: pays }, { data: mats }, { data: wte }, { data: jobs }, { data: workers }] = await Promise.all([
        supabase.from("job_payments").select("amount, paid_on").gte("paid_on", from).lte("paid_on", to),
        supabase.from("job_materials").select("cost, paid_by, purchased_on").eq("paid_by", "me").gte("purchased_on", from).lte("purchased_on", to),
        supabase.from("worker_time_entries").select("amount, work_date, worker_id, approved").gte("work_date", from).lte("work_date", to),
        supabase.from("jobs").select("other_expenses, updated_at"),
        supabase.from("workers").select("id, tax_pct, workers_comp_pct, insurance_pct, ppe_monthly, is_owner"),
      ]);
      if (cancelled) return;

      const collected = (pays || []).reduce((s, p: any) => s + Number(p.amount || 0), 0);
      const materialsMe = (mats || []).reduce((s, m: any) => s + Number(m.cost || 0), 0);

      const workerMap = new Map<string, any>();
      (workers || []).forEach((w: any) => workerMap.set(w.id, w));

      const entriesAll = wte || [];
      const entries = entriesAll.filter((e: any) => e.approved !== false);
      const pending = entriesAll.filter((e: any) => e.approved === false);

      const pendingHoursCost = pending.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);

      let workerLabor = 0;
      let ownerPay = 0;
      entries.forEach((e: any) => {
        const w = workerMap.get(e.worker_id);
        const amt = Number(e.amount || 0);
        if (w?.is_owner) ownerPay += amt;
        else workerLabor += amt;
      });

      // Burden only on non-owner workers
      const gTax = num(settings.default_tax_pct);
      const gBurden = num(settings.default_burden_pct);
      const gWc = num(settings.default_workers_comp_pct);
      const gIns = num(settings.default_insurance_pct);
      const gPpe = num(settings.default_ppe_monthly);

      let burdenFromHours = 0;
      const activeWorkerIds = new Set<string>();
      entries.forEach((e: any) => {
        const w = workerMap.get(e.worker_id) || {};
        if (w.is_owner) return;
        const tax = Number(w.tax_pct ?? 0) || gTax;
        const wc = Number(w.workers_comp_pct ?? 0) || gWc;
        const ins = Number(w.insurance_pct ?? 0) || gIns;
        const pct = (tax + gBurden + wc + ins) / 100;
        burdenFromHours += Number(e.amount || 0) * pct;
        if (e.worker_id) activeWorkerIds.add(e.worker_id);
      });

      const fromD = new Date(from), toD = new Date(to);
      const days = Math.max(1, Math.round((toD.getTime() - fromD.getTime()) / 86400000) + 1);
      const monthFraction = days / 30;
      let ppeCost = 0;
      activeWorkerIds.forEach((id) => {
        const w = workerMap.get(id);
        if (w?.is_owner) return;
        const ppe = Number(w?.ppe_monthly ?? 0) || gPpe;
        ppeCost += ppe * monthFraction;
      });

      const workerBurden = burdenFromHours + ppeCost;
      const workerTrueCost = workerLabor + workerBurden;

      const otherExp = (jobs || [])
        .filter((j: any) => inRange(j.updated_at, from, to))
        .reduce((s, j: any) => s + Number(j.other_expenses || 0), 0);

      const includeBurden =
        mode === "force-on" ? true :
        mode === "force-off" ? false :
        isYes(settings.burden_in_profit);
      const ownerReducesProfit = isYes(settings.owner_pay_reduces_profit);

      const laborCharge = includeBurden ? workerTrueCost : workerLabor;
      const ownerCharge = ownerReducesProfit ? ownerPay : 0;
      const netProfit = Math.max(collected - materialsMe - laborCharge - otherExp - ownerCharge, 0);
      const businessNetAfterOwner = collected - materialsMe - laborCharge - otherExp - ownerPay;

      setTotals({
        collected, materialsMe, workerLabor, workerBurden, workerTrueCost,
        ownerPay, pendingHoursCost, otherExp, netProfit,
        businessNetAfterOwner: Math.max(businessNetAfterOwner, businessNetAfterOwner), // keep sign
        paymentCount: (pays || []).length, includeBurden, ownerReducesProfit,
      });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [from, to, mode, settings]);

  return { ...totals, loading };
}

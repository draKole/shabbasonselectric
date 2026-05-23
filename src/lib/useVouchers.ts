import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type VoucherOffer = {
  id: string;
  name: string;
  amount_paid: number;
  credit_value: number;
  bonus: number;
  labor_only: boolean;
  materials_included: boolean;
  min_job_size: number | null;
  max_per_job: number | null;
  active: boolean;
  terms: string | null;
  display_order: number;
};

export type ServiceVoucher = {
  id: string;
  code: string;
  customer_id: string | null;
  customer_name_snapshot: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  offer_id: string | null;
  amount_paid: number;
  credit_value: number;
  credit_used: number;
  purchase_date: string;
  expires_on: string | null;
  status: "active" | "partial" | "redeemed" | "void" | "refunded" | string;
  payment_method: string | null;
  labor_only: boolean;
  materials_included: boolean;
  terms: string | null;
  notes: string | null;
};

export type VoucherRedemption = {
  id: string;
  voucher_id: string;
  job_id: string | null;
  amount_applied: number;
  applied_on: string;
  notes: string | null;
};

export function makeVoucherCode() {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "SSE-";
  for (let i = 0; i < 8; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}

export function useVouchers() {
  const [offers, setOffers] = useState<VoucherOffer[]>([]);
  const [vouchers, setVouchers] = useState<ServiceVoucher[]>([]);
  const [redemptions, setRedemptions] = useState<VoucherRedemption[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const [{ data: o }, { data: v }, { data: r }] = await Promise.all([
      (supabase as any).from("voucher_offers").select("*").order("display_order"),
      (supabase as any).from("service_vouchers").select("*").order("purchase_date", { ascending: false }),
      (supabase as any).from("voucher_redemptions").select("*").order("applied_on", { ascending: false }),
    ]);
    setOffers((o as any) || []);
    setVouchers((v as any) || []);
    setRedemptions((r as any) || []);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  function totals(fromDate?: string, toDate?: string) {
    const inRange = <T extends { purchase_date?: string; applied_on?: string }>(arr: T[], k: "purchase_date" | "applied_on") =>
      arr.filter((x: any) => (!fromDate || x[k] >= fromDate) && (!toDate || x[k] <= toDate));

    const vIn = inRange(vouchers as any, "purchase_date");
    const rIn = inRange(redemptions as any, "applied_on");

    const cashCollected = vIn.filter((v: any) => v.status !== "void" && v.status !== "refunded")
      .reduce((s: number, v: any) => s + Number(v.amount_paid || 0), 0);
    const creditSold = vIn.filter((v: any) => v.status !== "void" && v.status !== "refunded")
      .reduce((s: number, v: any) => s + Number(v.credit_value || 0), 0);
    const creditRedeemedPeriod = rIn.reduce((s: number, r: any) => s + Number(r.amount_applied || 0), 0);

    // Outstanding liability = remaining credit on active/partial vouchers (regardless of date)
    const outstandingLiability = vouchers
      .filter((v) => v.status === "active" || v.status === "partial")
      .reduce((s, v) => s + Math.max(0, Number(v.credit_value || 0) - Number(v.credit_used || 0)), 0);

    return { cashCollected, creditSold, creditRedeemedPeriod, outstandingLiability, count: vIn.length };
  }

  return { offers, vouchers, redemptions, loading, reload, totals };
}

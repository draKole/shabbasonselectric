import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type GlobalSettings = {
  default_hourly_rate: string;
  default_tax_pct: string;
  default_burden_pct: string;
  default_workers_comp_pct: string;
  default_insurance_pct: string;
  default_ppe_monthly: string;
  burden_in_reports: string; // "yes" | "no"
  burden_in_profit: string;  // "yes" | "no"
  business_name: string;
  business_phone: string;
  business_address: string;
  review_request_text: string;
  google_review_url: string;
  estimate_default_terms: string;
};

export const SETTINGS_DEFAULTS: GlobalSettings = {
  default_hourly_rate: "125",
  default_tax_pct: "0",
  default_burden_pct: "0",
  default_workers_comp_pct: "0",
  default_insurance_pct: "0",
  default_ppe_monthly: "0",
  burden_in_reports: "no",
  burden_in_profit: "no",
  business_name: "Shabba & Sons Electric",
  business_phone: "614-671-8528",
  business_address: "",
  review_request_text:
    "Thanks for choosing Shabba & Sons Electric! If we did good work, please leave us a Google review:",
  google_review_url: "",
  estimate_default_terms:
    "50% deposit due to schedule. Balance due upon completion. Estimate valid for 30 days.",
};

export function useGlobalSettings() {
  const [settings, setSettings] = useState<GlobalSettings>(SETTINGS_DEFAULTS);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const { data } = await supabase.from("app_settings").select("key, value");
    const map: any = { ...SETTINGS_DEFAULTS };
    (data || []).forEach((r: any) => {
      if (r.key in SETTINGS_DEFAULTS) map[r.key] = r.value ?? "";
    });
    setSettings(map);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);
  return { settings, loading, reload };
}

export async function saveGlobalSettings(patch: Partial<GlobalSettings>) {
  const rows = Object.entries(patch).map(([key, value]) => ({
    key, value: String(value ?? ""), updated_at: new Date().toISOString(),
  }));
  if (!rows.length) return { error: null };
  return supabase.from("app_settings").upsert(rows);
}

export function num(s: string | undefined, fallback = 0) {
  const n = Number(s);
  return Number.isFinite(n) ? n : fallback;
}
export function isYes(s: string | undefined) {
  return (s || "").toLowerCase() === "yes" || s === "true" || s === "1";
}

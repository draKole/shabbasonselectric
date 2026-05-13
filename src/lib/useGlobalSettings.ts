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
  // Owner pay
  owner_worker_id: string;
  owner_default_hourly: string;
  owner_weekly_salary: string;
  owner_pay_day: string; // monday..sunday
  owner_pay_mode: string; // hourly | salary | both
  owner_pay_reduces_profit: string; // yes | no
  // Estimate display defaults
  estimate_valid_days: string;
  estimate_default_deposit_pct: string;
  estimate_discount_label: string;
  estimate_show_original: string;
  estimate_show_discount: string;
  estimate_show_final: string;
  estimate_show_materials_note: string;
  // Rate separation
  default_billing_rate: string;
  default_helper_rate: string;
  default_experienced_helper_rate: string;
  business_tax_reserve_pct: string;
  personal_tax_reserve_pct: string;
  // Payroll & tax planning
  fed_withholding_pct: string;
  oh_withholding_pct: string;
  local_withholding_pct: string;
  fica_employee_pct: string;
  fica_employer_pct: string;
  retirement_pct: string;
  retirement_enabled: string; // yes|no
  retirement_note: string;
  pay_period_default: string; // weekly|biweekly|monthly
  paystub_company_name: string;
  paystub_company_phone: string;
  paystub_company_address: string;
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
  owner_worker_id: "",
  owner_default_hourly: "75",
  owner_weekly_salary: "0",
  owner_pay_day: "friday",
  owner_pay_mode: "hourly",
  owner_pay_reduces_profit: "yes",
  estimate_valid_days: "30",
  estimate_default_deposit_pct: "50",
  estimate_discount_label: "Customer Discount",
  estimate_show_original: "yes",
  estimate_show_discount: "yes",
  estimate_show_final: "yes",
  estimate_show_materials_note: "yes",
  default_billing_rate: "125",
  default_helper_rate: "20",
  default_experienced_helper_rate: "27",
  business_tax_reserve_pct: "25",
  personal_tax_reserve_pct: "15",
  fed_withholding_pct: "10",
  oh_withholding_pct: "3.5",
  local_withholding_pct: "2.5",
  fica_employee_pct: "7.65",
  fica_employer_pct: "7.65",
  retirement_pct: "0",
  retirement_enabled: "no",
  retirement_note: "",
  pay_period_default: "weekly",
  paystub_company_name: "Shabba & Sons Electric",
  paystub_company_phone: "614-671-8528",
  paystub_company_address: "",
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

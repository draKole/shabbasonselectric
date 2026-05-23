import { num, isYes, type GlobalSettings } from "@/lib/useGlobalSettings";

export type PaystubInput = {
  hours: number;
  hourly_rate: number;
  worker_wc_pct?: number;
  worker_ins_pct?: number;
  worker_ppe_monthly?: number;
  period_days?: number;
  // Employee Savings (worker-owned) — does NOT reduce gross, reduces net
  savings_enabled?: boolean;
  savings_type?: "percent" | "fixed" | "manual" | string;
  savings_pct?: number;
  savings_fixed?: number;
  savings_manual?: number;
};

export type PaystubBreakdown = {
  hours: number;
  hourly_rate: number;
  gross: number;
  fed_wh: number;
  state_wh: number;
  local_wh: number;
  fica_ee: number;
  fica_er: number;
  retirement: number;
  wc_amt: number;
  ins_amt: number;
  ppe_amt: number;
  employee_savings: number;
  deductions_total: number;
  net_pay: number;
  employer_total_cost: number;
};

export function computePaystub(input: PaystubInput, s: GlobalSettings): PaystubBreakdown {
  const hours = Number(input.hours) || 0;
  const rate = Number(input.hourly_rate) || 0;
  const gross = hours * rate;
  const fed = gross * num(s.fed_withholding_pct) / 100;
  const state = gross * num(s.oh_withholding_pct) / 100;
  const local = gross * num(s.local_withholding_pct) / 100;
  const ficaEe = gross * num(s.fica_employee_pct) / 100;
  const ficaEr = gross * num(s.fica_employer_pct) / 100;
  const retirement = isYes(s.retirement_enabled) ? gross * num(s.retirement_pct) / 100 : 0;
  const wc = gross * (Number(input.worker_wc_pct ?? num(s.default_workers_comp_pct))) / 100;
  const ins = gross * (Number(input.worker_ins_pct ?? num(s.default_insurance_pct))) / 100;
  const ppeMonthly = Number(input.worker_ppe_monthly ?? num(s.default_ppe_monthly));
  const ppe = ppeMonthly * ((input.period_days ?? 7) / 30);

  // Employee Savings — worker-owned. Reduces net pay only, NOT gross.
  let savings = 0;
  if (input.savings_enabled) {
    const type = String(input.savings_type || "percent");
    if (type === "percent") savings = gross * Number(input.savings_pct || 0) / 100;
    else if (type === "fixed") savings = Number(input.savings_fixed || 0);
    else if (type === "manual") savings = Number(input.savings_manual || 0);
  }
  savings = Math.max(0, Number(savings) || 0);

  const taxDeductions = fed + state + local + ficaEe + retirement;
  const deductions = taxDeductions + savings;
  const net = Math.max(gross - deductions, 0);
  const employerCost = gross + ficaEr + wc + ins + ppe;
  return {
    hours, hourly_rate: rate, gross,
    fed_wh: fed, state_wh: state, local_wh: local,
    fica_ee: ficaEe, fica_er: ficaEr, retirement,
    wc_amt: wc, ins_amt: ins, ppe_amt: ppe,
    employee_savings: savings,
    deductions_total: deductions, net_pay: net, employer_total_cost: employerCost,
  };
}

export const PAYSTUB_DISCLAIMER =
  "Estimated Paystub / Payroll Planning — Not official payroll filing unless processed through a licensed payroll/accounting provider.";

export const SAVINGS_NOTE =
  "Worker-owned savings deduction reduces net pay but remains owed to the worker.";

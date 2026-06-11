// Admin-only: scan the database for inconsistencies and return structured findings.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(d: unknown, status = 200) {
  return new Response(JSON.stringify(d), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: auth } } });
    const { data: claims } = await userClient.auth.getClaims(auth.replace("Bearer ", ""));
    if (!claims?.claims) return json({ error: "Bad token" }, 401);
    const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: role } = await admin.from("user_roles").select("role").eq("user_id", claims.claims.sub).eq("role", "admin").maybeSingle();
    if (!role) return json({ error: "Admin only" }, 403);

    const findings: { severity: "info" | "warn" | "error"; code: string; title: string; count: number; detail?: string }[] = [];

    // 1. Jobs with total but no balance
    const { data: badJobs } = await admin.from("jobs").select("id, job_total, balance_due").gt("job_total", 0).is("balance_due", null);
    findings.push({ severity: badJobs?.length ? "error" : "info", code: "jobs_missing_balance", title: "Jobs with total but missing balance", count: badJobs?.length || 0, detail: badJobs?.length ? "Run Recalculate Job Balances." : undefined });

    // 2. Orphan job_payments
    const { data: payments } = await admin.from("job_payments").select("id, job_id");
    const { data: allJobs } = await admin.from("jobs").select("id");
    const jobIds = new Set((allJobs || []).map((j: any) => j.id));
    const orphan = (payments || []).filter((p: any) => p.job_id && !jobIds.has(p.job_id));
    findings.push({ severity: orphan.length ? "warn" : "info", code: "orphan_payments", title: "Payments not linked to any job", count: orphan.length });

    // 3. Bills missing current-month occurrence
    const now = new Date();
    const month = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const { data: bills } = await admin.from("bills").select("id, recurring, recurring_frequency").eq("recurring", true);
    const { data: occs } = await admin.from("bill_occurrences").select("bill_id, period_month").eq("period_month", month);
    const haveOcc = new Set((occs || []).map((o: any) => o.bill_id));
    const missing = (bills || []).filter((b: any) => (b.recurring_frequency || "monthly") === "monthly" && !haveOcc.has(b.id));
    findings.push({ severity: missing.length ? "warn" : "info", code: "missing_bill_occurrences", title: "Recurring bills missing this month's occurrence", count: missing.length, detail: missing.length ? "Click Refresh on the Bills page." : undefined });

    // 4. Voucher status sanity
    const { data: vouchers } = await admin.from("service_vouchers").select("id, status, credit_value, credit_used");
    const stale = (vouchers || []).filter((v: any) => v.status === "redeemed" && Number(v.credit_used || 0) < Number(v.credit_value || 0));
    findings.push({ severity: stale.length ? "warn" : "info", code: "voucher_status_mismatch", title: "Vouchers marked redeemed but credit not fully used", count: stale.length });

    // 5. Worker time entries with no worker or job link
    const { data: te } = await admin.from("worker_time_entries").select("id, worker_id");
    const noWorker = (te || []).filter((t: any) => !t.worker_id);
    findings.push({ severity: noWorker.length ? "warn" : "info", code: "time_no_worker", title: "Time entries missing worker", count: noWorker.length });

    // 6. Negative live cash
    const { data: biz } = await admin.from("v_business_live_cash").select("live_cash").limit(1).maybeSingle();
    const { data: per } = await admin.from("v_personal_live_cash").select("live_cash").limit(1).maybeSingle();
    if (biz && Number(biz.live_cash) < 0) findings.push({ severity: "error", code: "business_cash_negative", title: "Business live cash is negative", count: 1, detail: `${Number(biz.live_cash).toFixed(2)}` });
    if (per && Number(per.live_cash) < 0) findings.push({ severity: "error", code: "personal_cash_negative", title: "Personal live cash is negative", count: 1, detail: `${Number(per.live_cash).toFixed(2)}` });

    // 7. Historical income flagged spent but counted in cash
    const { data: hi } = await admin.from("historical_income").select("id").eq("already_spent", true).eq("count_in_cash", true);
    findings.push({ severity: hi?.length ? "warn" : "info", code: "historical_spent_but_in_cash", title: "Historical income marked spent but still counted in cash", count: hi?.length || 0 });

    // 8. Allocations marked transferred without owner_pay_transfer row
    const { data: alloc } = await admin.from("allocations").select("id, status, owner_pay_amount");
    const { data: tx } = await admin.from("owner_pay_transfers").select("allocation_id");
    const txSet = new Set((tx || []).map((t: any) => t.allocation_id));
    const dangling = (alloc || []).filter((a: any) => a.status === "transferred" && !txSet.has(a.id));
    findings.push({ severity: dangling.length ? "warn" : "info", code: "alloc_transferred_no_txn", title: "Allocations marked transferred but no transfer record", count: dangling.length });

    // 9. Cash reconciliation and fake-cash risks
    const { data: recs } = await admin.from("cash_reconciliations").select("account_type, reconciliation_date").order("reconciliation_date", { ascending: false });
    const bizRec = (recs || []).find((r: any) => r.account_type === "business");
    const perRec = (recs || []).find((r: any) => r.account_type === "personal");
    findings.push({ severity: bizRec ? "info" : "error", code: "business_cash_not_reconciled", title: "Business live cash has not been reconciled", count: bizRec ? 0 : 1 });
    findings.push({ severity: perRec ? "info" : "error", code: "personal_cash_not_reconciled", title: "Personal live cash has not been reconciled", count: perRec ? 0 : 1 });
    const { data: preAlloc } = await admin.from("allocations").select("id").in("status", ["assigned", "allocated"]).lt("period_week", bizRec?.reconciliation_date || "9999-12-31");
    findings.push({ severity: preAlloc?.length ? "error" : "info", code: "allocation_before_reconciliation", title: "Allocation exists from unreconciled cash", count: preAlloc?.length || 0, detail: preAlloc?.length ? "Reverse the bad allocation batch." : undefined });
    const { data: bizCash } = await admin.from("v_business_live_cash").select("live_cash").maybeSingle();
    const pendingOwner = (alloc || []).filter((a: any) => ["assigned", "allocated"].includes(a.status)).reduce((s: number, a: any) => s + Number(a.owner_pay_amount || 0), 0);
    findings.push({ severity: pendingOwner > 0 && Number(bizCash?.live_cash || 0) <= 0 ? "error" : "info", code: "pending_owner_pay_no_cash", title: "Pending owner pay exists but business live cash is $0", count: pendingOwner > 0 && Number(bizCash?.live_cash || 0) <= 0 ? 1 : 0 });

    // 10. Bill occurrence correctness
    const { data: dupOcc } = await admin.rpc("fix_bill_occurrences", {});
    findings.push({ severity: "info", code: "bill_occurrence_refresh", title: "Bill occurrence refresh available", count: Number((dupOcc as any)?.created || 0) + Number((dupOcc as any)?.fixed || 0), detail: `Created ${(dupOcc as any)?.created || 0}, fixed ${(dupOcc as any)?.fixed || 0}, already existed ${(dupOcc as any)?.already_existed || 0}` });
    const { data: badPaidOcc } = await admin.from("bill_occurrences").select("id").eq("paid", true).or("paid_on.is.null,paid_from.is.null,payment_method.is.null");
    findings.push({ severity: badPaidOcc?.length ? "warn" : "info", code: "bill_paid_missing_cash_fields", title: "Bill paid but missing cash source/payment details", count: badPaidOcc?.length || 0 });

    // 11. Debt balances match payments
    const { data: debts } = await admin.from("debts").select("id, starting_balance, current_balance");
    const { data: debtPays } = await admin.from("debt_payments").select("debt_id, amount, paid_from");
    const wrongDebt = (debts || []).filter((d: any) => {
      const paid = (debtPays || []).filter((p: any) => p.debt_id === d.id).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
      return Math.abs(Number(d.current_balance || 0) - Math.max(Number(d.starting_balance || 0) - paid, 0)) > 0.01;
    });
    findings.push({ severity: wrongDebt.length ? "warn" : "info", code: "debt_balance_mismatch", title: "Debt payment not reducing debt balance correctly", count: wrongDebt.length });
    const debtMissingCashSource = (debtPays || []).filter((p: any) => !p.paid_from);
    findings.push({ severity: debtMissingCashSource.length ? "warn" : "info", code: "debt_payment_missing_cash_source", title: "Debt payment missing business/personal cash source", count: debtMissingCashSource.length });

    return json({ ok: true, findings, ran_at: new Date().toISOString() });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

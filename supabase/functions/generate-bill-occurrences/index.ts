// Generate bill occurrences for recurring bills.
// Idempotent — safe to call daily and on app load.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: bills, error } = await admin
    .from("bills")
    .select("id, amount, due_date, recurring, recurring_frequency, created_at")
    .eq("recurring", true);

  if (error) return json({ ok: false, error: error.message }, 500);

  const now = new Date();
  const periods: string[] = [];
  // generate current + previous 2 months catch-up
  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    periods.push(d.toISOString().slice(0, 10));
  }

  let created = 0;
  for (const b of bills || []) {
    for (const period of periods) {
      const dueDay = b.due_date ? new Date(b.due_date as string).getUTCDate() : 1;
      const periodDate = new Date(period + "T00:00:00Z");
      const due = new Date(Date.UTC(periodDate.getUTCFullYear(), periodDate.getUTCMonth(), Math.min(dueDay, 28)));
      const { error: insErr } = await admin
        .from("bill_occurrences")
        .insert({
          bill_id: b.id,
          period_month: period,
          due_date: due.toISOString().slice(0, 10),
          amount: b.amount,
        });
      if (!insErr) created++;
      // unique violation = already exists, ignore
    }
  }

  return json({ ok: true, processed: bills?.length || 0, created });
});

// Lead alert edge function — sends SMS via Twilio connector gateway when a public form is submitted.
// Always returns 200 with sent:true|false so callers never break submission.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type LeadType =
  | "service_request"
  | "contact_form"
  | "voucher_request"
  | "application"
  | "estimate_request";

const TOGGLE_COLUMN: Record<LeadType, string> = {
  service_request: "notify_service_request",
  contact_form: "notify_contact_form",
  voucher_request: "notify_voucher_request",
  application: "notify_application",
  estimate_request: "notify_estimate_request",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let payload: any = {};
  try { payload = await req.json(); } catch { /* ignore */ }

  const leadType = String(payload?.lead_type || "") as LeadType;
  const name = String(payload?.name || "Unknown");
  const phone = String(payload?.phone || "");
  const service = String(payload?.service || "");
  const addr = String(payload?.address_city || "");

  if (!leadType || !TOGGLE_COLUMN[leadType]) {
    return json({ ok: false, error: "invalid lead_type" }, 400);
  }

  const { data: settings, error: sErr } = await admin
    .from("lead_notification_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (sErr) {
    return json({ ok: true, sent: false, reason: "settings_load_failed", detail: sErr.message });
  }

  const log = async (ok: boolean, error?: string) => {
    await admin.from("lead_alert_log").insert({
      lead_type: leadType,
      ok,
      error: error || null,
      payload,
    });
  };

  if (!settings) {
    return json({ ok: true, sent: false, reason: "settings_missing" });
  }
  if (!settings.sms_enabled || !(settings as any)[TOGGLE_COLUMN[leadType]]) {
    return json({ ok: true, sent: false, reason: "disabled" });
  }
  if (!settings.alert_phone || !settings.from_number) {
    await log(false, "alert_phone or from_number missing");
    return json({ ok: true, sent: false, reason: "sms_not_configured" });
  }

  const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!TWILIO_API_KEY || !LOVABLE_API_KEY) {
    await log(false, "twilio_not_connected");
    return json({ ok: true, sent: false, reason: "sms_not_configured" });
  }

  const body = `New Shabba Electric Lead: ${name}${phone ? ", " + phone : ""}${
    service ? ", " + service : ""
  }${addr ? ", " + addr : ""}. Open admin to follow up.`;

  try {
    const res = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: settings.alert_phone,
        From: settings.from_number,
        Body: body.slice(0, 1500),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      await log(false, `twilio ${res.status}: ${JSON.stringify(data).slice(0, 500)}`);
      return json({ ok: true, sent: false, reason: "twilio_error", status: res.status, detail: data });
    }
    await log(true);
    return json({ ok: true, sent: true, sid: data.sid });
  } catch (e) {
    await log(false, (e as Error).message);
    return json({ ok: true, sent: false, reason: "twilio_exception", detail: (e as Error).message });
  }
});

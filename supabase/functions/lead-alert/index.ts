// Lead alert edge function — sends SMS via Twilio using Account SID + Auth Token (Mode A primary).
// Falls back to API Key SID+Secret (Mode B) or Lovable Twilio connector (Mode C) if Mode A is not set.
// Diagnostics mode: POST { diagnostics: true } returns config status without sending.
// Always returns 200 with sent:true|false so callers never break submission.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type LeadType =
  | "service_request" | "contact_form" | "voucher_request" | "application" | "estimate_request";

const TOGGLE_COLUMN: Record<LeadType, string> = {
  service_request: "notify_service_request",
  contact_form: "notify_contact_form",
  voucher_request: "notify_voucher_request",
  application: "notify_application",
  estimate_request: "notify_estimate_request",
};

function trim(v: string | undefined | null) { return (v || "").trim(); }
function normPhone(v: string) {
  const t = trim(v);
  if (!t) return "";
  if (t.startsWith("+")) return t;
  const digits = t.replace(/\D/g, "");
  if (digits.length === 10) return "+1" + digits;
  if (digits.length === 11 && digits.startsWith("1")) return "+" + digits;
  return t;
}

function getAuthMode() {
  const sid = trim(Deno.env.get("TWILIO_ACCOUNT_SID"));
  const token = trim(Deno.env.get("TWILIO_AUTH_TOKEN"));
  const keySid = trim(Deno.env.get("TWILIO_API_KEY_SID"));
  const keySecret = trim(Deno.env.get("TWILIO_API_KEY_SECRET"));
  const fromNum = normPhone(Deno.env.get("TWILIO_FROM_NUMBER") || "");
  const toNum = normPhone(Deno.env.get("LEAD_ALERT_TO_NUMBER") || "");
  const connectorKey = trim(Deno.env.get("TWILIO_API_KEY"));
  const lovableKey = trim(Deno.env.get("LOVABLE_API_KEY"));

  let mode: "A" | "B" | "C" | "none" = "none";
  if (sid && token) mode = "A";
  else if (sid && keySid && keySecret) mode = "B";
  else if (connectorKey && lovableKey) mode = "C";

  return {
    mode,
    has_account_sid: !!sid,
    has_auth_token: !!token,
    has_api_key_sid: !!keySid,
    has_api_key_secret: !!keySecret,
    has_from_number: !!fromNum,
    from_number_formatted: fromNum,
    has_alert_to_number: !!toNum,
    alert_to_number_formatted: toNum,
    has_connector_key: !!connectorKey,
    has_lovable_key: !!lovableKey,
    sid, token, keySid, keySecret, fromNum, toNum, connectorKey, lovableKey,
  };
}

async function sendTwilio(cfg: ReturnType<typeof getAuthMode>, to: string, from: string, body: string) {
  const params = new URLSearchParams({ To: to, From: from, Body: body.slice(0, 1500) });

  if (cfg.mode === "A" || cfg.mode === "B") {
    const username = cfg.mode === "A" ? cfg.sid : cfg.keySid;
    const password = cfg.mode === "A" ? cfg.token : cfg.keySecret;
    const url = `https://api.twilio.com/2010-04-01/Accounts/${cfg.sid}/Messages.json`;
    const basic = btoa(`${username}:${password}`);
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  }

  // Mode C: connector gateway
  const url = "https://connector-gateway.lovable.dev/twilio/Messages.json";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.lovableKey}`,
      "X-Connection-Api-Key": cfg.connectorKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let payload: any = {};
  try { payload = await req.json(); } catch {}

  const cfg = getAuthMode();

  // Diagnostics mode — return config status only
  if (payload?.diagnostics) {
    const { data: settings } = await admin.from("lead_notification_settings").select("*").limit(1).maybeSingle();
    const { data: lastLog } = await admin.from("lead_alert_log").select("*").order("sent_at", { ascending: false }).limit(1).maybeSingle();
    return json({
      ok: true,
      auth_mode: cfg.mode,
      auth_mode_label:
        cfg.mode === "A" ? "Account SID + Auth Token" :
        cfg.mode === "B" ? "Account SID + API Key SID/Secret" :
        cfg.mode === "C" ? "Lovable Twilio connector" : "NOT CONFIGURED",
      has_account_sid: cfg.has_account_sid,
      has_auth_token: cfg.has_auth_token,
      has_api_key_sid: cfg.has_api_key_sid,
      has_api_key_secret: cfg.has_api_key_secret,
      has_from_number: cfg.has_from_number,
      from_number_formatted: cfg.from_number_formatted,
      has_alert_to_number_env: cfg.has_alert_to_number,
      alert_to_number_env: cfg.alert_to_number_formatted,
      alert_phone_db: settings?.alert_phone || null,
      from_number_db: settings?.from_number || null,
      sms_enabled: !!settings?.sms_enabled,
      last_status: lastLog?.ok ? "sent" : (lastLog?.error || null),
      last_sent_at: lastLog?.sent_at || null,
    });
  }

  const leadType = String(payload?.lead_type || "") as LeadType;
  const name = String(payload?.name || "Unknown");
  const phone = String(payload?.phone || "");
  const service = String(payload?.service || "");
  const addr = String(payload?.address_city || "");

  if (!leadType || !TOGGLE_COLUMN[leadType]) {
    return json({ ok: false, error: "invalid lead_type" }, 400);
  }

  const { data: settings, error: sErr } = await admin
    .from("lead_notification_settings").select("*").limit(1).maybeSingle();
  if (sErr) return json({ ok: true, sent: false, reason: "settings_load_failed", detail: sErr.message });

  const log = async (ok: boolean, error?: string) => {
    await admin.from("lead_alert_log").insert({ lead_type: leadType, ok, error: error || null, payload });
  };

  if (!settings) return json({ ok: true, sent: false, reason: "settings_missing" });
  if (!settings.sms_enabled || !(settings as any)[TOGGLE_COLUMN[leadType]]) {
    return json({ ok: true, sent: false, reason: "disabled" });
  }

  // To: prefer DB alert_phone, fallback to env LEAD_ALERT_TO_NUMBER
  const toNum = normPhone(settings.alert_phone || cfg.toNum);
  // From: prefer DB from_number, fallback to env TWILIO_FROM_NUMBER
  const fromNum = normPhone(settings.from_number || cfg.fromNum);

  if (!toNum || !fromNum) {
    await log(false, `missing numbers (to=${!!toNum} from=${!!fromNum})`);
    return json({ ok: true, sent: false, reason: "sms_not_configured", detail: "alert_phone/from_number missing" });
  }

  if (cfg.mode === "none") {
    await log(false, "twilio_not_configured");
    return json({
      ok: true, sent: false, reason: "twilio_not_configured",
      detail: "Set TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN secrets.",
    });
  }

  const body = `New Shabba Electric Lead: ${name}${phone ? ", " + phone : ""}${service ? ", " + service : ""}${addr ? ", " + addr : ""}. Open admin to follow up.`;

  try {
    const result = await sendTwilio(cfg, toNum, fromNum, body);
    if (!result.ok) {
      const code = (result.data as any)?.code;
      const msg = (result.data as any)?.message || "unknown";
      const errStr = `twilio ${result.status} [mode ${cfg.mode}] code=${code}: ${msg}`;
      await log(false, errStr);
      return json({
        ok: true, sent: false, reason: "twilio_error",
        auth_mode: cfg.mode, status: result.status,
        twilio_code: code, twilio_message: msg,
        hint: result.status === 401
          ? "Twilio 401: check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are from the SAME Twilio project (Account SID starts with AC...). API Key SID starts with SK — don't put it in TWILIO_ACCOUNT_SID."
          : undefined,
      });
    }
    await log(true);
    return json({ ok: true, sent: true, sid: (result.data as any)?.sid, auth_mode: cfg.mode });
  } catch (e) {
    await log(false, (e as Error).message);
    return json({ ok: true, sent: false, reason: "twilio_exception", detail: (e as Error).message });
  }
});

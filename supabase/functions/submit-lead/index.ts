// Submit-lead edge function — replaces anon INSERT with Turnstile + rate limiting + validation
// Always returns 200 with { ok: boolean } so callers never break on the client.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const TURNSTILE_SECRET = Deno.env.get("CLOUDFLARE_TURNSTILE_SECRET_KEY") || "";
const RATE_LIMIT_WINDOW_SEC = 60;
const RATE_LIMIT_MAX_ATTEMPTS = 3;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Get client IP from the Supabase gateway (trusted header)
function getClientIP(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  // Create service-role admin client
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const clientIP = getClientIP(req);

  // Parse body
  let body: any;
  try {
    body = await req.json();
  } catch {
    // Log the failed parse attempt
    await admin.from("lead_submission_log").insert({
      ip_address: clientIP,
      turnstile_passed: false,
      accepted: false,
      reject_reason: "invalid_json",
      payload_summary: "parse_failure",
    });
    return json({ ok: false, error: "invalid_json" });
  }

  const turnstileToken = String(body.turnstile_token || "");
  const name = String(body.name || "").trim();
  const phone = String(body.phone || "").trim();
  const email = String(body.email || "").trim();
  const property_address = String(body.property_address || "").trim();
  const lead_source = String(body.lead_source || "Website").trim();
  const service_requested = String(body.service_requested || "").trim();
  const job_description = String(body.job_description || "").trim();
  const estimated_value = Number(body.estimated_value) || 0;

  // STEP A: Rate limit check — count ALL attempts (including failures) BEFORE returning
  const sixtySecAgo = new Date(Date.now() - RATE_LIMIT_WINDOW_SEC * 1000).toISOString();
  const { count: recentAttempts } = await admin
    .from("lead_submission_log")
    .select("*", { count: "exact", head: true })
    .eq("ip_address", clientIP)
    .gte("submitted_at", sixtySecAgo);

  if (recentAttempts && recentAttempts >= RATE_LIMIT_MAX_ATTEMPTS) {
    await admin.from("lead_submission_log").insert({
      ip_address: clientIP,
      turnstile_passed: false,
      accepted: false,
      reject_reason: "rate_limited",
      payload_summary: `name=${name.slice(0, 50)}`,
    });
    return json({ ok: false, error: "rate_limited" });
  }

  // STEP B: Turnstile verification
  let turnstilePassed = false;
  if (TURNSTILE_SECRET) {
    try {
      const cfResp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: TURNSTILE_SECRET,
          response: turnstileToken,
          remoteip: clientIP,
        }),
      });
      const cfData = await cfResp.json();
      turnstilePassed = cfData.success === true;
    } catch {
      turnstilePassed = false;
    }
  } else {
    // No Turnstile configured — allow through (dev mode)
    turnstilePassed = true;
  }

  if (!turnstilePassed) {
    await admin.from("lead_submission_log").insert({
      ip_address: clientIP,
      turnstile_passed: false,
      accepted: false,
      reject_reason: "turnstile_failed",
      payload_summary: `name=${name.slice(0, 50)}`,
    });
    return json({ ok: false, error: "turnstile_failed" });
  }

  // STEP C: Validate fields
  if (!name || name.length > 500) {
    await admin.from("lead_submission_log").insert({
      ip_address: clientIP,
      turnstile_passed: true,
      accepted: false,
      reject_reason: "invalid_name",
      payload_summary: `name=${name.slice(0, 50)}`,
    });
    return json({ ok: false, error: "invalid_name" });
  }

  if (phone.length > 500 || email.length > 500 || property_address.length > 500 ||
      service_requested.length > 500 || job_description.length > 500) {
    await admin.from("lead_submission_log").insert({
      ip_address: clientIP,
      turnstile_passed: true,
      accepted: false,
      reject_reason: "field_too_long",
      payload_summary: `name=${name.slice(0, 50)}`,
    });
    return json({ ok: false, error: "field_too_long" });
  }

  if (estimated_value < 0 || isNaN(estimated_value)) {
    await admin.from("lead_submission_log").insert({
      ip_address: clientIP,
      turnstile_passed: true,
      accepted: false,
      reject_reason: "invalid_estimated_value",
      payload_summary: `name=${name.slice(0, 50)}`,
    });
    return json({ ok: false, error: "invalid_estimated_value" });
  }

  // STEP D: Insert lead via service-role
  try {
    const { data: inserted, error: insertError } = await admin
      .from("leads")
      .insert({
        name,
        phone: phone || null,
        email: email || null,
        property_address: property_address || null,
        lead_source: lead_source || "Website",
        service_requested: service_requested || null,
        job_description: job_description || null,
        estimated_value,
        status: "new_lead",
      })
      .select("id")
      .single();

    if (insertError) {
      await admin.from("lead_submission_log").insert({
        ip_address: clientIP,
        turnstile_passed: true,
        accepted: false,
        reject_reason: "db_insert_error:" + insertError.message.slice(0, 100),
        payload_summary: `name=${name.slice(0, 50)}`,
      });
      return json({ ok: false, error: "server_error" });
    }

    // Log success
    await admin.from("lead_submission_log").insert({
      ip_address: clientIP,
      turnstile_passed: true,
      accepted: true,
      reject_reason: null,
      payload_summary: `name=${name.slice(0, 50)}`,
    });

    return json({ ok: true, id: inserted?.id });
  } catch (err) {
    await admin.from("lead_submission_log").insert({
      ip_address: clientIP,
      turnstile_passed: true,
      accepted: false,
      reject_reason: "exception:" + (err as Error).message.slice(0, 100),
      payload_summary: `name=${name.slice(0, 50)}`,
    });
    return json({ ok: false, error: "server_error" });
  }
});
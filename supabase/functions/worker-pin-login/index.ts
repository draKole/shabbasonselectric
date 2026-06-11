// Public: worker exchanges identifier (email or phone) + PIN for a one-time login.
// Server validates the PIN, resets the worker auth user's password to a fresh random,
// and returns { email, password } so the client can call signInWithPassword.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(d: unknown, status = 200) {
  return new Response(JSON.stringify(d), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function normPhone(s: string) { return s.replace(/[^\d]/g, ""); }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

    const body = await req.json().catch(() => ({}));
    const identifier = String(body?.identifier || "").trim();
    const pin = String(body?.pin || "").trim();
    if (!identifier || !pin) return json({ error: "Identifier and PIN required" }, 400);

    // Lookup worker by email or phone
    const isEmail = identifier.includes("@");
    let query = admin.from("workers").select("id, full_name, email, phone, auth_user_id, login_pin_hash").not("login_pin_hash", "is", null);
    if (isEmail) query = query.eq("email", identifier.toLowerCase());
    else query = query.eq("phone", identifier);

    let { data: workers } = await query;
    if ((!workers || workers.length === 0) && !isEmail) {
      // Try normalized phone match
      const { data: all } = await admin.from("workers").select("id, full_name, email, phone, auth_user_id, login_pin_hash").not("login_pin_hash", "is", null);
      const target = normPhone(identifier);
      workers = (all || []).filter((w: any) => normPhone(w.phone || "") === target);
    }

    const worker = workers && workers[0];
    if (!worker || !worker.auth_user_id) {
      await admin.from("worker_invite_log").insert({ action: "pin_login", success: false, error: "no_worker:" + identifier.slice(0, 40) });
      return json({ error: "No worker found with that login. Ask admin to create your PIN." }, 404);
    }

    const expected = await sha256(pin + ":" + worker.id);
    if (expected !== worker.login_pin_hash) {
      await admin.from("worker_invite_log").insert({ worker_id: worker.id, action: "pin_login", success: false, error: "bad_pin" });
      return json({ error: "Incorrect PIN" }, 401);
    }

    // Reset the auth user's password to a fresh random and return it for one-shot sign-in
    const otp = crypto.randomUUID() + "Aa1!";
    const { error: uErr } = await admin.auth.admin.updateUserById(worker.auth_user_id, { password: otp });
    if (uErr) {
      await admin.from("worker_invite_log").insert({ worker_id: worker.id, action: "pin_login", success: false, error: uErr.message });
      return json({ error: "Login session could not be created: " + uErr.message }, 500);
    }

    // Fetch the auth email (could be synthetic)
    const { data: userData } = await admin.auth.admin.getUserById(worker.auth_user_id);
    const loginEmail = userData?.user?.email || worker.email;
    if (!loginEmail) return json({ error: "Worker has no login email" }, 500);

    await admin.from("workers").update({
      login_last_at: new Date().toISOString(),
      invite_status: "active",
    }).eq("id", worker.id);

    await admin.from("worker_invite_log").insert({ worker_id: worker.id, action: "pin_login", success: true });

    return json({ ok: true, email: loginEmail, password: otp, worker_name: worker.full_name });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

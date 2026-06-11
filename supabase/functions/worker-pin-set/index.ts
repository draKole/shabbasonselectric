// Admin-only: set or reset a worker's login PIN.
// Creates the underlying auth user (with a synthetic email if the worker has no real one)
// so the worker can later sign in by identifier + PIN.
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

function makePin() {
  let pin = "";
  const arr = new Uint32Array(6);
  crypto.getRandomValues(arr);
  for (let i = 0; i < 6; i++) pin += (arr[i] % 10).toString();
  return pin;
}

function syntheticEmail(workerId: string) {
  return `worker-${workerId}@workers.shabba.local`;
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
    const token = auth.replace("Bearer ", "");
    const { data: claims, error: cErr } = await userClient.auth.getClaims(token);
    if (cErr || !claims?.claims) return json({ error: "Bad token" }, 401);
    const callerId = claims.claims.sub as string;

    const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", callerId).eq("role", "admin").maybeSingle();
    if (!roleRow) return json({ error: "Admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const workerId = String(body?.worker_id || "");
    if (!workerId) return json({ error: "worker_id required" }, 400);

    const { data: worker, error: wErr } = await admin.from("workers").select("id, full_name, email, phone, auth_user_id").eq("id", workerId).maybeSingle();
    if (wErr) return json({ error: wErr.message }, 500);
    if (!worker) return json({ error: "Worker not found" }, 404);

    const email = (worker.email || "").trim().toLowerCase();
    const phone = (worker.phone || "").trim();
    if (!email && !phone) {
      await admin.from("worker_invite_log").insert({ worker_id: workerId, action: "pin_set", success: false, error: "no_contact", actor_id: callerId });
      return json({ error: "Worker needs an email or phone before login can be created." }, 400);
    }

    const loginEmail = email || syntheticEmail(workerId);
    const identifier = email || phone;

    // Find or create auth user
    let userId = worker.auth_user_id as string | null;
    if (!userId) {
      // search by email
      const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const found = existing?.users?.find((u: any) => (u.email || "").toLowerCase() === loginEmail);
      if (found) {
        userId = found.id;
      } else {
        const { data: created, error: cErr2 } = await admin.auth.admin.createUser({
          email: loginEmail,
          password: crypto.randomUUID() + "Aa1!",
          email_confirm: true,
          user_metadata: { worker_id: workerId, worker_name: worker.full_name, role: "worker" },
        });
        if (cErr2) {
          await admin.from("worker_invite_log").insert({ worker_id: workerId, action: "pin_set", success: false, error: cErr2.message, actor_id: callerId });
          return json({ error: "Failed to create user: " + cErr2.message }, 500);
        }
        userId = created.user!.id;
      }
    }

    const pin = makePin();
    const hash = await sha256(pin + ":" + workerId);

    await admin.from("workers").update({
      auth_user_id: userId,
      login_pin_hash: hash,
      login_pin_set_at: new Date().toISOString(),
      login_identifier: identifier,
      invite_status: "pin_created",
    }).eq("id", workerId);

    await admin.from("worker_invite_log").insert({ worker_id: workerId, action: "pin_set", success: true, actor_id: callerId });

    const origin = req.headers.get("origin") || req.headers.get("referer") || "";
    const portalUrl = origin ? `${origin.replace(/\/$/, "")}/worker/login` : "/worker/login";

    return json({
      ok: true,
      pin,
      identifier,
      portal_url: portalUrl,
      message: "PIN created. Share these details with the worker.",
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

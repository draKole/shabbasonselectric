// Worker invite edge function — admin-only.
// Creates or resets an auth user for a worker and returns copyable login info.
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

function tempPassword() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 12; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s + "!2";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return json({ error: "Server misconfigured: missing Supabase env vars", code: "env_missing" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized — missing bearer token", code: "no_auth" }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: cErr } = await userClient.auth.getClaims(token);
    if (cErr || !claims?.claims) {
      return json({ error: "Invalid auth token", code: "bad_token", detail: cErr?.message }, 401);
    }
    const callerId = claims.claims.sub as string;

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: roleRow, error: roleErr } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleErr) return json({ error: "Role lookup failed", code: "role_lookup_failed", detail: roleErr.message }, 500);
    if (!roleRow) return json({ error: "Admin only", code: "not_admin" }, 403);

    const body = await req.json().catch(() => ({}));
    const workerId = String(body?.worker_id || "");
    if (!workerId) return json({ error: "worker_id required", code: "missing_worker_id" }, 400);

    const { data: worker, error: wErr } = await admin
      .from("workers")
      .select("id, full_name, email, phone, auth_user_id")
      .eq("id", workerId)
      .maybeSingle();
    if (wErr) return json({ error: "Worker lookup failed", code: "worker_lookup_failed", detail: wErr.message }, 500);
    if (!worker) return json({ error: "Worker not found", code: "worker_not_found" }, 404);

    const email = (worker.email || "").trim();
    const phone = (worker.phone || "").trim();
    if (!email && !phone) {
      return json({
        error: "Worker needs an email or phone before invite can be created.",
        code: "no_contact",
      }, 400);
    }
    if (!email) {
      return json({
        error: "Worker needs an email to receive login credentials. Add an email to the worker profile first.",
        code: "no_email",
      }, 400);
    }

    const password = tempPassword();
    let userId = worker.auth_user_id as string | null;
    let mode: "new" | "reset" = "new";

    // If linked already, just reset password
    if (userId) {
      mode = "reset";
      const { error: uErr } = await admin.auth.admin.updateUserById(userId, { password });
      if (uErr) return json({ error: "Failed to reset password", code: "reset_failed", detail: uErr.message }, 500);
    } else {
      const { data: created, error: cErr2 } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { worker_name: worker.full_name, role: "worker" },
      });

      if (cErr2) {
        // Email may already exist — look it up
        const lower = email.toLowerCase();
        let found: { id: string } | undefined;
        for (let page = 1; page <= 10 && !found; page++) {
          const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page, perPage: 200 });
          if (listErr) return json({ error: "User search failed", code: "list_failed", detail: listErr.message }, 500);
          found = list?.users?.find((u: any) => (u.email || "").toLowerCase() === lower);
          if (!list?.users?.length || list.users.length < 200) break;
        }
        if (!found) {
          return json({ error: "Could not create user", code: "create_failed", detail: cErr2.message }, 500);
        }
        userId = found.id;
        mode = "reset";
        const { error: pwErr } = await admin.auth.admin.updateUserById(userId, { password });
        if (pwErr) return json({ error: "Failed to reset existing user password", code: "reset_failed", detail: pwErr.message }, 500);
      } else {
        userId = created.user!.id;
      }

      const { error: linkErr } = await admin
        .from("workers")
        .update({ auth_user_id: userId, invite_status: "invited" })
        .eq("id", workerId);
      if (linkErr) {
        return json({ error: "Failed to link worker to user", code: "link_failed", detail: linkErr.message }, 500);
      }
    }

    // Mark invited (even on reset)
    await admin.from("workers").update({ invite_status: "invited" }).eq("id", workerId);

    const origin = req.headers.get("origin") || req.headers.get("referer") || "";
    const portalUrl = origin ? `${origin.replace(/\/$/, "")}/worker/login` : "/worker/login";

    return json({
      ok: true,
      mode,
      email,
      password,
      portal_url: portalUrl,
      message: mode === "reset"
        ? "Password reset. Share the new login info with the worker."
        : "Worker login created. Share the login info with the worker.",
    });
  } catch (e) {
    return json({ error: "Unexpected error", code: "unhandled", detail: (e as Error).message }, 500);
  }
});

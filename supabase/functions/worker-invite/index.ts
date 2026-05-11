// Worker invite edge function — admin-only.
// Creates (or resets) an auth user for a worker and links it to the workers row.
// Returns a temporary password for the admin to share with the worker.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function tempPassword() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 12; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s + "!2";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: cErr } = await userClient.auth.getClaims(token);
    if (cErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);
    const callerId = claims.claims.sub as string;

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const workerId = String(body?.worker_id || "");
    if (!workerId) return json({ error: "worker_id required" }, 400);

    const { data: worker, error: wErr } = await admin
      .from("workers")
      .select("id, full_name, email, auth_user_id")
      .eq("id", workerId)
      .maybeSingle();
    if (wErr || !worker) return json({ error: "Worker not found" }, 404);
    if (!worker.email) return json({ error: "Worker needs an email first" }, 400);

    const password = tempPassword();
    let userId = worker.auth_user_id as string | null;

    if (userId) {
      // Reset password
      const { error: uErr } = await admin.auth.admin.updateUserById(userId, { password });
      if (uErr) return json({ error: uErr.message }, 500);
    } else {
      // Try create; if email already exists, link to existing user
      const { data: created, error: cErr2 } = await admin.auth.admin.createUser({
        email: worker.email,
        password,
        email_confirm: true,
        user_metadata: { worker_name: worker.full_name, role: "worker" },
      });
      if (cErr2) {
        // Lookup existing
        const { data: list } = await admin.auth.admin.listUsers();
        const existing = list?.users?.find(
          (u) => (u.email || "").toLowerCase() === worker.email!.toLowerCase()
        );
        if (!existing) return json({ error: cErr2.message }, 500);
        userId = existing.id;
        await admin.auth.admin.updateUserById(userId, { password });
      } else {
        userId = created.user!.id;
      }
      await admin.from("workers").update({ auth_user_id: userId, invite_status: "sent" }).eq("id", workerId);
    }

    return json({
      ok: true,
      email: worker.email,
      password,
      login_url: `${new URL(req.url).origin.replace(/\.functions\..*$/, "")}/worker/login`,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }

  function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

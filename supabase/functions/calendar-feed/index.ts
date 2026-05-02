// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function ics(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const expected = Deno.env.get("CALENDAR_FEED_TOKEN");
    if (!expected || !token || token !== expected) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: jobs } = await supabase
      .from("jobs")
      .select("id, job_type, status, scheduled_start, scheduled_end, address, city, state, description, balance_due, permit_needed, inspection_needed, customers(name, phone)")
      .not("scheduled_start", "is", null);

    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Shabba & Sons//Calendar//EN", "X-WR-CALNAME:Shabba & Sons Jobs"];
    for (const j of jobs || []) {
      const start = new Date(j.scheduled_start);
      const end = j.scheduled_end ? new Date(j.scheduled_end) : new Date(start.getTime() + 60 * 60_000);
      const cust: any = j.customers;
      const desc = `Customer: ${cust?.name || ""}\\nPhone: ${cust?.phone || ""}\\nType: ${j.job_type}\\nStatus: ${j.status}\\nNotes: ${(j.description || "").replace(/\n/g, " ").slice(0, 400)}\\nPermit: ${j.permit_needed}\\nInspection: ${j.inspection_needed}\\nBalance: $${j.balance_due || 0}`;
      lines.push("BEGIN:VEVENT",
        `UID:${j.id}@shabba`,
        `DTSTAMP:${ics(new Date())}`,
        `DTSTART:${ics(start)}`,
        `DTEND:${ics(end)}`,
        `SUMMARY:Shabba Job: ${cust?.name || "Job"} - ${j.job_type}`,
        `LOCATION:${[j.address, j.city, j.state].filter(Boolean).join(", ")}`,
        `DESCRIPTION:${desc}`,
        "END:VEVENT");
    }
    lines.push("END:VCALENDAR");

    return new Response(lines.join("\r\n"), {
      headers: { ...corsHeaders, "Content-Type": "text/calendar; charset=utf-8" },
    });
  } catch (e) {
    return new Response(`Error: ${e.message}`, { status: 500, headers: corsHeaders });
  }
});

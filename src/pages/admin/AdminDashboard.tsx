import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Briefcase, Calendar, CheckCircle2, DollarSign, FileText, Star } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ newLeads: 0, scheduled: 0, completed: 0, openEst: 0, reviewsNeeded: 0, openBalance: 0 });
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const weekEnd = new Date(Date.now() + 7 * 86400_000).toISOString();

      const [{ count: nl }, { count: sched }, { count: comp }, { count: oest }, { count: rr }, { data: bal }, { data: rec }] = await Promise.all([
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "new_lead").gte("created_at", weekAgo),
        supabase.from("jobs").select("id", { count: "exact", head: true }).gte("scheduled_start", new Date().toISOString()).lte("scheduled_start", weekEnd),
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "completed").gte("updated_at", monthStart),
        supabase.from("estimates").select("id", { count: "exact", head: true }).in("status", ["draft", "sent"]),
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "completed"),
        supabase.from("jobs").select("balance_due").neq("payment_status", "paid"),
        supabase.from("jobs").select("id, job_type, status, scheduled_start, address, city, customers(name, phone)").order("created_at", { ascending: false }).limit(10),
      ]);
      setStats({
        newLeads: nl || 0, scheduled: sched || 0, completed: comp || 0,
        openEst: oest || 0, reviewsNeeded: rr || 0,
        openBalance: (bal || []).reduce((s, j: any) => s + Number(j.balance_due || 0), 0),
      });
      setRecent(rec || []);
    })();
  }, []);

  const cards = [
    { label: "New leads (week)", value: stats.newLeads, icon: Briefcase, color: "text-secondary" },
    { label: "Scheduled (week)", value: stats.scheduled, icon: Calendar, color: "text-success" },
    { label: "Completed (month)", value: stats.completed, icon: CheckCircle2, color: "text-success" },
    { label: "Open estimates", value: stats.openEst, icon: FileText, color: "text-secondary" },
    { label: "Reviews needed", value: stats.reviewsNeeded, icon: Star, color: "text-accent-foreground" },
    { label: "Open balance", value: `$${stats.openBalance.toFixed(0)}`, icon: DollarSign, color: "text-success" },
  ];

  return (
    <div className="container-tight py-6 space-y-6">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label} className="p-4">
            <div className="flex items-center gap-3">
              <c.icon className={`h-6 w-6 ${c.color}`} />
              <div>
                <div className="text-2xl font-extrabold">{c.value}</div>
                <div className="text-xs text-muted-foreground">{c.label}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <h2 className="font-bold mb-3">Recent jobs</h2>
        <div className="space-y-2">
          {recent.map((j: any) => (
            <Link key={j.id} to={`/admin/jobs/${j.id}`} className="flex items-center justify-between p-3 rounded-md hover:bg-muted">
              <div>
                <div className="font-semibold">{j.customers?.name || "—"}</div>
                <div className="text-xs text-muted-foreground">{j.job_type} · {j.city || ""} · {j.status}</div>
              </div>
              <div className="text-xs text-muted-foreground">{j.scheduled_start ? new Date(j.scheduled_start).toLocaleString() : "Not scheduled"}</div>
            </Link>
          ))}
          {recent.length === 0 && <div className="text-sm text-muted-foreground p-3">No jobs yet. Submit a test lead from the Schedule page.</div>}
        </div>
      </Card>
    </div>
  );
}

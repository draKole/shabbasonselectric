import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Phone, MessageSquare, MapPin } from "lucide-react";

function normPhone(p?: string | null) {
  return (p || "").replace(/\D/g, "").slice(-10);
}

export default function AdminContacts() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const [{ data: cs }, { data: js }] = await Promise.all([
        supabase.from("customers").select("*").order("created_at", { ascending: false }),
        supabase.from("jobs").select("id, customer_id, status, job_total, balance_due, payment_status, scheduled_start, created_at, address, city"),
      ]);
      setCustomers(cs || []);
      setJobs(js || []);
    })();
  }, []);

  // Group by phone (last 10 digits) — falls back to id when no phone
  const grouped = useMemo(() => {
    const map = new Map<string, { key: string; primary: any; aliases: any[]; jobs: any[] }>();
    for (const c of customers) {
      const key = normPhone(c.phone) || `id:${c.id}`;
      if (!map.has(key)) map.set(key, { key, primary: c, aliases: [], jobs: [] });
      else map.get(key)!.aliases.push(c);
    }
    for (const j of jobs) {
      const cust = customers.find((c) => c.id === j.customer_id);
      if (!cust) continue;
      const key = normPhone(cust.phone) || `id:${cust.id}`;
      map.get(key)?.jobs.push(j);
    }
    return Array.from(map.values()).map((g) => {
      const totalSpent = g.jobs.reduce((s, j) => s + Number(j.job_total || 0), 0);
      const balance = g.jobs.reduce((s, j) => s + Number(j.balance_due || 0), 0);
      const last = g.jobs.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))[0];
      return { ...g, totalSpent, balance, lastJob: last, jobCount: g.jobs.length };
    }).sort((a, b) => b.jobCount - a.jobCount);
  }, [customers, jobs]);

  const filtered = grouped.filter((g) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (g.primary.name || "").toLowerCase().includes(s)
      || (g.primary.phone || "").includes(s)
      || (g.primary.address || "").toLowerCase().includes(s);
  });

  return (
    <div className="container-tight py-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-extrabold">Contacts</h1>
        <span className="text-xs text-muted-foreground">{grouped.length} unique · matched by phone</span>
      </div>
      <Input placeholder="Search by name, phone, address..." value={search} onChange={(e) => setSearch(e.target.value)} />

      <div className="grid gap-2">
        {filtered.map((g) => (
          <Card key={g.key} className="p-4">
            <div className="flex flex-wrap justify-between gap-2">
              <div className="min-w-0">
                <div className="font-bold">{g.primary.name}</div>
                <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
                  {g.primary.phone && <span>{g.primary.phone}</span>}
                  {g.primary.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{[g.primary.address, g.primary.city].filter(Boolean).join(", ")}</span>}
                </div>
                {g.aliases.length > 0 && (
                  <div className="text-[10px] text-muted-foreground mt-0.5">+{g.aliases.length} duplicate entr{g.aliases.length === 1 ? "y" : "ies"} merged by phone</div>
                )}
              </div>
              <div className="flex gap-2">
                {g.primary.phone && <>
                  <a href={`tel:${g.primary.phone}`}><Badge variant="outline" className="gap-1"><Phone className="h-3 w-3" />Call</Badge></a>
                  <a href={`sms:${g.primary.phone}`}><Badge variant="outline" className="gap-1"><MessageSquare className="h-3 w-3" />Text</Badge></a>
                </>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
              <div className="rounded bg-muted/50 p-2"><div className="text-muted-foreground">Jobs</div><div className="font-bold text-base">{g.jobCount}</div></div>
              <div className="rounded bg-muted/50 p-2"><div className="text-muted-foreground">Total billed</div><div className="font-bold text-base">${g.totalSpent.toFixed(0)}</div></div>
              <div className="rounded bg-muted/50 p-2"><div className="text-muted-foreground">Open balance</div><div className={`font-bold text-base ${g.balance > 0 ? "text-destructive" : ""}`}>${g.balance.toFixed(0)}</div></div>
            </div>
            {g.jobs.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {g.jobs.slice(0, 5).map((j) => (
                  <Link key={j.id} to={`/admin/jobs/${j.id}`} className="text-[11px] px-2 py-0.5 rounded bg-secondary/10 hover:bg-secondary/20 text-secondary">
                    {j.status} · {new Date(j.created_at).toLocaleDateString()}
                  </Link>
                ))}
                {g.jobs.length > 5 && <span className="text-[11px] text-muted-foreground self-center">+{g.jobs.length - 5} more</span>}
              </div>
            )}
          </Card>
        ))}
        {filtered.length === 0 && <Card className="p-8 text-center text-muted-foreground">No contacts found.</Card>}
      </div>
    </div>
  );
}

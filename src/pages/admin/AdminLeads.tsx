import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, MessageSquare, MapPin, Plus, Search, Calendar, ArrowUpDown } from "lucide-react";

const STAGES = [
  "new_lead", "contacted", "site_visit_needed", "estimate_needed",
  "estimate_sent", "follow_up", "approved", "scheduled",
  "in_progress", "waiting_on_customer", "waiting_on_material",
  "completed", "invoice_sent", "paid", "lost"
];

const STAGE_LABELS: Record<string, string> = {
  new_lead: "New Lead", contacted: "Contacted", site_visit_needed: "Site Visit Needed",
  estimate_needed: "Estimate Needed", estimate_sent: "Estimate Sent",
  follow_up: "Follow-Up", approved: "Approved", scheduled: "Scheduled",
  in_progress: "In Progress", waiting_on_customer: "Waiting on Customer",
  waiting_on_material: "Waiting on Material", completed: "Completed",
  invoice_sent: "Invoice Sent", paid: "Paid", lost: "Lost",
};

function getStageColor(s: string) {
  if (["new_lead", "contacted"].includes(s)) return "bg-blue-100 text-blue-800 border-blue-200";
  if (["site_visit_needed", "estimate_needed", "estimate_sent", "follow_up"].includes(s)) return "bg-amber-100 text-amber-800 border-amber-200";
  if (["approved", "scheduled"].includes(s)) return "bg-green-100 text-green-800 border-green-200";
  if (["in_progress", "waiting_on_customer", "waiting_on_material"].includes(s)) return "bg-purple-100 text-purple-800 border-purple-200";
  if (["completed", "invoice_sent", "paid"].includes(s)) return "bg-emerald-100 text-emerald-800 border-emerald-200";
  return "bg-gray-100 text-gray-600 border-gray-200";
}

export default function AdminLeads() {
  const [leads, setLeads] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      setLeads(data || []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    let result = leads;
    if (statusFilter) {
      result = result.filter((l) => l.status === statusFilter);
    }
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (l) =>
          (l.name || "").toLowerCase().includes(s) ||
          (l.phone || "").toLowerCase().includes(s) ||
          (l.email || "").toLowerCase().includes(s) ||
          (l.property_address || "").toLowerCase().includes(s)
      );
    }
    return result;
  }, [leads, statusFilter, search]);

  const stageCounts = useMemo(() => {
    const counts: Record<string, { count: number; total: number }> = {};
    STAGES.forEach((s) => {
      const stageLeads = leads.filter((l) => l.status === s);
      counts[s] = {
        count: stageLeads.length,
        total: stageLeads.reduce((a: number, l: any) => a + Number(l.estimated_value || 0), 0),
      };
    });
    return counts;
  }, [leads]);

  return (
    <div className="container-tight py-6 space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-extrabold">Leads</h1>
          <p className="text-sm text-muted-foreground">{leads.length} total</p>
        </div>
        <Link to="/admin/leads/new">
          <Button size="sm" className="gap-1">
            <Plus className="h-4 w-4" /> Add Lead
          </Button>
        </Link>
      </div>

      {/* Stage summary chips */}
      <div className="flex flex-wrap gap-1.5">
        <Badge
          variant="outline"
          className={`cursor-pointer ${!statusFilter ? "ring-2 ring-primary" : ""}`}
          onClick={() => setStatusFilter("")}
        >
          All ({leads.length})
        </Badge>
        {STAGES.filter((s) => stageCounts[s]?.count > 0).map((s) => (
          <Badge
            key={s}
            variant="outline"
            className={`cursor-pointer ${getStageColor(s)} ${statusFilter === s ? "ring-2 ring-primary" : ""}`}
            onClick={() => setStatusFilter(statusFilter === s ? "" : s)}
          >
            {STAGE_LABELS[s]} ({stageCounts[s].count})
          </Badge>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, phone, email, address..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Lead list */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading leads...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl p-8 text-center border">
          <div className="text-4xl mb-3">⚡</div>
          <h2 className="text-lg font-semibold mb-1">No leads yet</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {statusFilter ? "No leads in this stage." : "Your first lead is waiting to be added."}
          </p>
          <Link to="/admin/leads/new">
            <Button>Add Your First Lead</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-2">
          {filtered.map((lead) => {
            const idx = STAGES.indexOf(lead.status);
            const pct = Math.round((idx / (STAGES.length - 1)) * 100);
            return (
              <Link key={lead.id} to={`/admin/leads/${lead.id}`}>
                <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{lead.name}</h3>
                        {Number(lead.estimated_value) > 0 && (
                          <span className="text-sm font-bold text-indigo-600">
                            ${Number(lead.estimated_value).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        {lead.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone}</span>}
                        {lead.email && <span>·</span>}
                        {lead.email && <span className="truncate">{lead.email}</span>}
                      </div>
                      {lead.service_requested && (
                        <p className="text-sm text-muted-foreground mt-1 truncate">{lead.service_requested}</p>
                      )}
                    </div>
                    <Badge variant="outline" className={`flex-shrink-0 ${getStageColor(lead.status)}`}>
                      {STAGE_LABELS[lead.status] || lead.status}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {lead.next_follow_up && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {lead.next_follow_up}
                        </span>
                      )}
                      {lead.lead_source && lead.lead_source !== "Other" && (
                        <span>· {lead.lead_source}</span>
                      )}
                    </div>
                    <div className="w-20 h-1.5 bg-gray-100 rounded-full">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-50">
        <div className="flex justify-around py-2">
          <Link to="/admin" className="flex flex-col items-center gap-0.5 px-4 py-1 text-muted-foreground">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            <span className="text-[10px]">Dashboard</span>
          </Link>
          <Link to="/admin/leads" className="flex flex-col items-center gap-0.5 px-4 py-1 text-primary font-medium">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <span className="text-[10px] font-medium">Leads</span>
          </Link>
          <Link to="/admin/leads/new" className="flex flex-col items-center gap-0.5 px-4 py-1 text-muted-foreground">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            <span className="text-[10px]">Add</span>
          </Link>
          <Link to="/admin/jobs" className="flex flex-col items-center gap-0.5 px-4 py-1 text-muted-foreground">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            <span className="text-[10px]">Jobs</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
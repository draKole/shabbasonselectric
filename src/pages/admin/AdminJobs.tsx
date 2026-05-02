import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { JOB_STATUS_LABELS, JOB_TYPE_LABELS, STATUS_COLOR } from "@/lib/jobTypes";

export default function AdminJobs() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    supabase.from("jobs").select("*, customers(name, phone)").order("created_at", { ascending: false })
      .then(({ data }) => setJobs(data || []));
  }, []);

  const filtered = jobs.filter((j) => {
    if (statusFilter !== "all" && j.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (j.customers?.name || "").toLowerCase().includes(s)
        || (j.address || "").toLowerCase().includes(s)
        || (j.customers?.phone || "").includes(s);
    }
    return true;
  });

  return (
    <div className="container-tight py-6 space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <Input placeholder="Search by name, phone, address..." value={search} onChange={(e) => setSearch(e.target.value)} className="sm:max-w-xs" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:max-w-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(JOB_STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Link to="/admin/jobs/new" className="ml-auto">
          <button className="px-3 py-2 rounded-md bg-success text-success-foreground font-semibold text-sm">+ Quick Add</button>
        </Link>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="p-3">Customer</th>
              <th className="p-3 hidden md:table-cell">Phone</th>
              <th className="p-3 hidden md:table-cell">Address</th>
              <th className="p-3">Type</th>
              <th className="p-3">Status</th>
              <th className="p-3 hidden lg:table-cell">Scheduled</th>
              <th className="p-3">Balance</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((j) => (
              <tr key={j.id} className="border-t border-border hover:bg-muted/40">
                <td className="p-3">
                  <Link to={`/admin/jobs/${j.id}`} className="font-semibold text-secondary hover:underline">
                    {j.customers?.name || "—"}
                  </Link>
                </td>
                <td className="p-3 hidden md:table-cell">{j.customers?.phone || "—"}</td>
                <td className="p-3 hidden md:table-cell">{[j.address, j.city].filter(Boolean).join(", ")}</td>
                <td className="p-3">{JOB_TYPE_LABELS[j.job_type] || j.job_type}</td>
                <td className="p-3">
                  <Badge className={STATUS_COLOR[j.status] || ""}>{JOB_STATUS_LABELS[j.status]}</Badge>
                </td>
                <td className="p-3 hidden lg:table-cell">{j.scheduled_start ? new Date(j.scheduled_start).toLocaleString() : "—"}</td>
                <td className="p-3">${Number(j.balance_due || 0).toFixed(0)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No jobs match.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

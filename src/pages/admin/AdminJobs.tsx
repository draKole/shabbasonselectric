import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { JOB_STATUS_LABELS, JOB_TYPE_LABELS, STATUS_COLOR, PAYMENT_STATUS_LABELS } from "@/lib/jobTypes";
import { Archive, Trash2, ArchiveRestore } from "lucide-react";
import { toast } from "sonner";

export default function AdminJobs() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showArchived, setShowArchived] = useState(false);

  async function load() {
    const { data } = await supabase.from("jobs").select("*, customers(name, phone)").order("created_at", { ascending: false });
    setJobs(data || []);
  }
  useEffect(() => { load(); }, []);

  async function archive(id: string, value: boolean) {
    const { error } = await supabase.from("jobs").update({ archived: value }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(value ? "Job archived" : "Job restored");
    load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("jobs").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Job permanently deleted");
    load();
  }

  const filtered = jobs.filter((j) => {
    if (!showArchived && j.archived) return false;
    if (showArchived && !j.archived) return false;
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
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <Input placeholder="Search by name, phone, address..." value={search} onChange={(e) => setSearch(e.target.value)} className="sm:max-w-xs" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:max-w-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(JOB_STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant={showArchived ? "default" : "outline"} size="sm" onClick={() => setShowArchived(!showArchived)}>
          {showArchived ? "Showing archived" : "Show archived"}
        </Button>
        <Link to="/admin/jobs/new" className="sm:ml-auto">
          <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90">+ Quick Add</Button>
        </Link>
      </div>

      {/* Mobile cards */}
      <div className="grid gap-2 md:hidden">
        {filtered.map((j) => (
          <Card key={j.id} className="p-3">
            <div className="flex justify-between items-start gap-2">
              <Link to={`/admin/jobs/${j.id}`} className="font-bold text-secondary">
                {j.customers?.name || "—"}
              </Link>
              <Badge className={STATUS_COLOR[j.status] || ""}>{JOB_STATUS_LABELS[j.status]}</Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-1">{JOB_TYPE_LABELS[j.job_type]} · {j.city || ""}</div>
            <div className="text-xs mt-1">Balance: <span className="font-semibold">${Number(j.balance_due || 0).toFixed(0)}</span> · {PAYMENT_STATUS_LABELS[j.payment_status] || j.payment_status}</div>
            <div className="flex gap-2 mt-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => archive(j.id, !j.archived)}>
                {j.archived ? <><ArchiveRestore className="h-3 w-3 mr-1" />Restore</> : <><Archive className="h-3 w-3 mr-1" />Archive</>}
              </Button>
              <DeleteBtn onConfirm={() => remove(j.id)} />
            </div>
          </Card>
        ))}
      </div>

      {/* Desktop table */}
      <Card className="overflow-x-auto hidden md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="p-3">Customer</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Address</th>
              <th className="p-3">Type</th>
              <th className="p-3">Status</th>
              <th className="p-3">Payment</th>
              <th className="p-3">Balance</th>
              <th className="p-3 text-right">Actions</th>
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
                <td className="p-3">{j.customers?.phone || "—"}</td>
                <td className="p-3">{[j.address, j.city].filter(Boolean).join(", ")}</td>
                <td className="p-3">{JOB_TYPE_LABELS[j.job_type] || j.job_type}</td>
                <td className="p-3"><Badge className={STATUS_COLOR[j.status] || ""}>{JOB_STATUS_LABELS[j.status]}</Badge></td>
                <td className="p-3">{PAYMENT_STATUS_LABELS[j.payment_status] || j.payment_status}</td>
                <td className="p-3">${Number(j.balance_due || 0).toFixed(0)}</td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => archive(j.id, !j.archived)} title={j.archived ? "Restore" : "Archive"}>
                      {j.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                    </Button>
                    <DeleteBtn onConfirm={() => remove(j.id)} />
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No jobs match.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function DeleteBtn({ onConfirm }: { onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this job?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to permanently delete this job? This cannot be undone.
            All linked materials, payments, photos and timeline events will also be removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={onConfirm}>
            Delete permanently
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

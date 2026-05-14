import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Plus, Clock, DollarSign, Pencil, Archive, ArchiveRestore, Check, X, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { useWorkerDocuments, WORKER_DOC_KEYS, seedWorkerDocs } from "@/lib/useWorkerDocuments";

export default function AdminWorkers() {
  const [workers, setWorkers] = useState<any[]>([]);
  const [time, setTime] = useState<any[]>([]);
  const [pays, setPays] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "hours_week" | "balance" | "role">("name");
  const [docFilter, setDocFilter] = useState<"all" | "missing" | "complete">("all");
  const [allDocs, setAllDocs] = useState<any[]>([]);
  const [openChecklist, setOpenChecklist] = useState<string | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [adding, setAdding] = useState(false);
  const empty = { full_name: "", phone: "", email: "", role: "helper", pay_type: "hourly", hourly_rate: "25", tax_pct: "0", workers_comp_pct: "0", insurance_pct: "0", ppe_monthly: "0", notes: "" };
  const [w, setW] = useState<any>(empty);
  const [te, setTe] = useState({ worker_id: "", job_id: "", work_date: new Date().toISOString().slice(0, 10), hours: "", hourly_rate: "", notes: "" });
  const [pay, setPay] = useState({ worker_id: "", amount: "", paid_on: new Date().toISOString().slice(0, 10), method: "cash", notes: "" });
  const [editEntry, setEditEntry] = useState<any | null>(null);

  async function load() {
    const [a, b, c, d, e] = await Promise.all([
      supabase.from("workers").select("*").order("created_at"),
      supabase.from("worker_time_entries").select("*").order("work_date", { ascending: false }),
      supabase.from("worker_payments").select("*").order("paid_on", { ascending: false }),
      supabase.from("jobs").select("id, address, customers(name)").eq("archived", false).order("created_at", { ascending: false }).limit(100),
      (supabase as any).from("worker_documents").select("*"),
    ]);
    setWorkers(a.data || []); setTime(b.data || []); setPays(c.data || []); setJobs(d.data || []);
    setAllDocs((e.data as any) || []);
  }
  useEffect(() => { load(); }, []);

  function docsFor(workerId: string) {
    return allDocs.filter((d) => d.worker_id === workerId);
  }
  function onboardPct(workerId: string) {
    const ds = docsFor(workerId);
    if (ds.length === 0) return 0;
    const done = ds.filter((d) => d.received).length;
    return Math.round((done / WORKER_DOC_KEYS.length) * 100);
  }

  function hoursThisWeek(id: string) {
    const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10);
    return time.filter((t) => t.worker_id === id && t.work_date >= weekAgo).reduce((s, t) => s + Number(t.hours || 0), 0);
  }

  function openEdit(wk: any) {
    setEditing(wk);
    setW({
      full_name: wk.full_name || "", phone: wk.phone || "", email: wk.email || "",
      role: wk.role || "helper", pay_type: wk.pay_type || "hourly",
      hourly_rate: String(wk.hourly_rate ?? "0"),
      tax_pct: String(wk.tax_pct ?? "0"),
      workers_comp_pct: String(wk.workers_comp_pct ?? "0"),
      insurance_pct: String(wk.insurance_pct ?? "0"),
      ppe_monthly: String(wk.ppe_monthly ?? "0"),
      notes: wk.notes || "",
    });
    setAdding(true);
  }
  function openNew() { setEditing(null); setW(empty); setAdding(true); }

  async function saveWorker() {
    if (!w.full_name) return toast.error("Name required");
    const payload: any = {
      full_name: w.full_name, phone: w.phone, email: w.email,
      role: w.role, pay_type: w.pay_type,
      hourly_rate: Number(w.hourly_rate) || 0,
      tax_pct: Number(w.tax_pct) || 0,
      workers_comp_pct: Number(w.workers_comp_pct) || 0,
      insurance_pct: Number(w.insurance_pct) || 0,
      ppe_monthly: Number(w.ppe_monthly) || 0,
      notes: w.notes,
    };
    const { error } = editing
      ? await supabase.from("workers").update(payload).eq("id", editing.id)
      : await supabase.from("workers").insert(payload);
    if (error) return toast.error(error.message);
    setW(empty); setEditing(null); setAdding(false); load();
    toast.success("Saved");
  }

  async function setActive(id: string, active: boolean) {
    await supabase.from("workers").update({ active }).eq("id", id);
    load();
  }

  async function delWorker(wk: any) {
    if (!confirm(`Delete ${wk.full_name}? This will also delete their time entries and payments. Use Archive instead to keep history.`)) return;
    // Cascade delete to keep totals clean
    await supabase.from("worker_time_entries").delete().eq("worker_id", wk.id);
    await supabase.from("worker_payments").delete().eq("worker_id", wk.id);
    const { error } = await supabase.from("workers").delete().eq("id", wk.id);
    if (error) return toast.error(error.message);
    // Recompute labor on jobs that referenced this worker (trigger handles each entry deletion already)
    load(); toast.success("Worker and records deleted");
  }

  async function logHours() {
    if (!te.worker_id || !te.hours) return toast.error("Pick worker & enter hours");
    const worker = workers.find((x) => x.id === te.worker_id);
    const rate = Number(te.hourly_rate || worker?.hourly_rate || 0);
    const hours = Number(te.hours);
    const { error } = await supabase.from("worker_time_entries").insert({
      worker_id: te.worker_id, job_id: te.job_id || null, work_date: te.work_date,
      hours, hourly_rate: rate, amount: hours * rate, notes: te.notes || null,
    } as any);
    if (error) return toast.error(error.message);
    setTe({ ...te, hours: "", notes: "" }); load(); toast.success("Hours logged");
  }
  async function logPayment() {
    if (!pay.worker_id || !pay.amount) return toast.error("Pick worker & amount");
    const { error } = await supabase.from("worker_payments").insert({
      worker_id: pay.worker_id, amount: Number(pay.amount), paid_on: pay.paid_on, method: pay.method, notes: pay.notes || null,
    } as any);
    if (error) return toast.error(error.message);
    setPay({ ...pay, amount: "", notes: "" }); load(); toast.success("Payment recorded");
  }

  async function saveEntry() {
    if (!editEntry) return;
    const hours = Number(editEntry.hours) || 0;
    const rate = Number(editEntry.hourly_rate) || 0;
    const { error } = await supabase.from("worker_time_entries").update({
      hours, hourly_rate: rate, amount: hours * rate,
      work_date: editEntry.work_date, notes: editEntry.notes || null,
    }).eq("id", editEntry.id);
    if (error) return toast.error(error.message);
    setEditEntry(null); load();
  }
  async function delEntry(id: string) {
    if (!confirm("Delete this time entry?")) return;
    await supabase.from("worker_time_entries").delete().eq("id", id);
    load();
  }

  function balanceFor(id: string) {
    const earned = time.filter((t) => t.worker_id === id).reduce((s, t) => s + Number(t.amount || 0), 0);
    const paid = pays.filter((p) => p.worker_id === id).reduce((s, p) => s + Number(p.amount || 0), 0);
    return { earned, paid, balance: earned - paid };
  }

  const visibleWorkers = workers
    .filter((wk) => showInactive || wk.active)
    .filter((wk) => {
      if (roleFilter === "all") return true;
      if (roleFilter === "owner") return wk.is_owner;
      return (wk.role || "").toLowerCase() === roleFilter || (wk.worker_type || "").toLowerCase() === roleFilter;
    })
    .filter((wk) => {
      if (!search.trim()) return true;
      const s = search.toLowerCase();
      return (wk.full_name || "").toLowerCase().includes(s) || (wk.phone || "").includes(s) || (wk.email || "").toLowerCase().includes(s);
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "hours_week": return hoursThisWeek(b.id) - hoursThisWeek(a.id);
        case "balance": return balanceFor(b.id).balance - balanceFor(a.id).balance;
        case "role": return (a.role || "").localeCompare(b.role || "");
        default: return (a.full_name || "").localeCompare(b.full_name || "");
      }
    });

  return (
    <div className="container-tight py-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-extrabold">Workers & Payroll</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowInactive((v) => !v)}>{showInactive ? "Hide inactive" : "Show inactive"}</Button>
          <Button onClick={openNew} size="sm" className="gap-1"><Plus className="h-4 w-4" />Add Worker</Button>
        </div>
      </div>

      <Card className="p-3 flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[160px]">
          <Label className="text-xs">Search</Label>
          <Input placeholder="Name, phone, email…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="w-40">
          <Label className="text-xs">Role / type</Label>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["all", "owner", "helper", "apprentice", "journeyman", "subcontractor", "electrician", "other"].map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-44">
          <Label className="text-xs">Sort by</Label>
          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="hours_week">Hours this week</SelectItem>
              <SelectItem value="balance">Balance owed</SelectItem>
              <SelectItem value="role">Role</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-xs text-muted-foreground ml-auto">{visibleWorkers.length} of {workers.length}</div>
      </Card>


      <Dialog open={adding} onOpenChange={(o) => { setAdding(o); if (!o) { setEditing(null); setW(empty); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? `Edit ${editing.full_name}` : "New Worker"}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <div className="grid sm:grid-cols-2 gap-2">
              <div><Label>Full Name *</Label><Input value={w.full_name} onChange={(e) => setW({ ...w, full_name: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={w.phone} onChange={(e) => setW({ ...w, phone: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Email</Label><Input value={w.email} onChange={(e) => setW({ ...w, email: e.target.value })} /></div>
              <div><Label>Role</Label>
                <Select value={w.role} onValueChange={(v) => setW({ ...w, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["helper", "apprentice", "journeyman", "subcontractor", "other"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Pay Type</Label>
                <Select value={w.pay_type} onValueChange={(v) => setW({ ...w, pay_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["hourly", "per_job", "salary"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Hourly Rate ($)</Label><Input type="number" value={w.hourly_rate} onChange={(e) => setW({ ...w, hourly_rate: e.target.value })} /></div>
            </div>
            <div className="pt-2 border-t border-border">
              <div className="text-xs font-semibold text-muted-foreground mb-1">Business cost (true labor cost planning)</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div><Label className="text-xs">Tax %</Label><Input type="number" step="0.1" value={w.tax_pct} onChange={(e) => setW({ ...w, tax_pct: e.target.value })} /></div>
                <div><Label className="text-xs">Workers comp %</Label><Input type="number" step="0.1" value={w.workers_comp_pct} onChange={(e) => setW({ ...w, workers_comp_pct: e.target.value })} /></div>
                <div><Label className="text-xs">Insurance %</Label><Input type="number" step="0.1" value={w.insurance_pct} onChange={(e) => setW({ ...w, insurance_pct: e.target.value })} /></div>
                <div><Label className="text-xs">PPE/mo $</Label><Input type="number" value={w.ppe_monthly} onChange={(e) => setW({ ...w, ppe_monthly: e.target.value })} /></div>
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                True labor cost ≈ rate × (1 + (tax + comp + insurance)/100). PPE shown in monthly reports.
              </div>
            </div>
            <Textarea placeholder="Notes" value={w.notes} onChange={(e) => setW({ ...w, notes: e.target.value })} />
            <Button onClick={saveWorker} className="w-full bg-success text-success-foreground hover:bg-success/90">{editing ? "Save changes" : "Save Worker"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-2">
        {visibleWorkers.map((wk) => {
          const b = balanceFor(wk.id);
          const burdenPct = (Number(wk.tax_pct) || 0) + (Number(wk.workers_comp_pct) || 0) + (Number(wk.insurance_pct) || 0);
          const trueRate = Number(wk.hourly_rate || 0) * (1 + burdenPct / 100);
          return (
            <Card key={wk.id} className={`p-4 ${!wk.active ? "opacity-60" : ""}`}>
              <div className="flex justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <div className="font-bold flex items-center gap-2 flex-wrap">
                    {wk.full_name}
                    {wk.is_owner && <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/15 text-success">OWNER</span>}
                    <span className="text-xs text-muted-foreground font-normal">· {wk.role} · ${Number(wk.hourly_rate).toFixed(0)}/hr</span>
                    {!wk.active && <span className="text-xs px-1.5 py-0.5 rounded bg-muted">inactive</span>}
                  </div>
                  {wk.phone && <div className="text-xs text-muted-foreground">{wk.phone}{wk.email ? ` · ${wk.email}` : ""}</div>}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => openEdit(wk)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="outline" onClick={() => setActive(wk.id, !wk.active)}>
                    {wk.active ? <Archive className="h-3.5 w-3.5" /> : <ArchiveRestore className="h-3.5 w-3.5" />}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => delWorker(wk)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 mt-2 text-xs">
                <div className="rounded bg-muted/50 p-2"><div className="text-muted-foreground">Hours/wk</div><div className="font-bold text-base">{hoursThisWeek(wk.id).toFixed(1)}</div></div>
                <div className="rounded bg-muted/50 p-2"><div className="text-muted-foreground">Earned</div><div className="font-bold text-base">${b.earned.toFixed(0)}</div></div>
                <div className="rounded bg-muted/50 p-2"><div className="text-muted-foreground">Paid out</div><div className="font-bold text-base">${b.paid.toFixed(0)}</div></div>
                <div className="rounded bg-muted/50 p-2"><div className="text-muted-foreground">Owe worker</div><div className={`font-bold text-base ${b.balance > 0 ? "text-destructive" : "text-success"}`}>${b.balance.toFixed(0)}</div></div>
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">True hourly cost ≈ ${trueRate.toFixed(0)} (includes extra worker cost)</div>


              {/* time entries for this worker */}
              <div className="mt-3 pt-2 border-t border-border space-y-1">
                {time.filter((t) => t.worker_id === wk.id).slice(0, 6).map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-xs gap-2">
                    <div className="min-w-0 truncate">{t.work_date} · {Number(t.hours).toFixed(2)}h @ ${Number(t.hourly_rate).toFixed(0)} = <b>${Number(t.amount).toFixed(0)}</b>{t.notes ? ` · ${t.notes}` : ""}</div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => setEditEntry(t)}><Pencil className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => delEntry(t.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
        {visibleWorkers.length === 0 && <Card className="p-6 text-center text-muted-foreground">No workers.</Card>}
      </div>

      <Dialog open={!!editEntry} onOpenChange={(o) => !o && setEditEntry(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Time Entry</DialogTitle></DialogHeader>
          {editEntry && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Date</Label><Input type="date" value={editEntry.work_date} onChange={(e) => setEditEntry({ ...editEntry, work_date: e.target.value })} /></div>
                <div><Label>Hours</Label><Input type="number" step="0.25" value={editEntry.hours} onChange={(e) => setEditEntry({ ...editEntry, hours: e.target.value })} /></div>
                <div className="col-span-2"><Label>Rate</Label><Input type="number" value={editEntry.hourly_rate} onChange={(e) => setEditEntry({ ...editEntry, hourly_rate: e.target.value })} /></div>
                <div className="col-span-2"><Label>Notes</Label><Input value={editEntry.notes || ""} onChange={(e) => setEditEntry({ ...editEntry, notes: e.target.value })} /></div>
              </div>
              <Button onClick={saveEntry} className="w-full">Save</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card className="p-4 space-y-2">
        <h2 className="font-bold flex items-center gap-2"><Clock className="h-4 w-4" />Log Hours</h2>
        <div className="grid sm:grid-cols-2 gap-2">
          <div><Label>Worker</Label>
            <Select value={te.worker_id} onValueChange={(v) => setTe({ ...te, worker_id: v })}>
              <SelectTrigger><SelectValue placeholder="Pick worker" /></SelectTrigger>
              <SelectContent>{workers.filter(x => x.active).map((x) => <SelectItem key={x.id} value={x.id}>{x.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Job (optional)</Label>
            <Select value={te.job_id} onValueChange={(v) => setTe({ ...te, job_id: v })}>
              <SelectTrigger><SelectValue placeholder="No job (general)" /></SelectTrigger>
              <SelectContent>{jobs.map((j: any) => <SelectItem key={j.id} value={j.id}>{j.customers?.name || "—"} · {j.address}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Date</Label><Input type="date" value={te.work_date} onChange={(e) => setTe({ ...te, work_date: e.target.value })} /></div>
          <div><Label>Hours</Label><Input type="number" step="0.25" value={te.hours} onChange={(e) => setTe({ ...te, hours: e.target.value })} /></div>
          <div><Label>Rate (override)</Label><Input type="number" placeholder="uses worker default" value={te.hourly_rate} onChange={(e) => setTe({ ...te, hourly_rate: e.target.value })} /></div>
          <div><Label>Notes</Label><Input value={te.notes} onChange={(e) => setTe({ ...te, notes: e.target.value })} /></div>
        </div>
        <Button onClick={logHours} className="w-full">Log Hours</Button>
      </Card>

      <Card className="p-4 space-y-2">
        <h2 className="font-bold flex items-center gap-2"><DollarSign className="h-4 w-4" />Pay Worker</h2>
        <div className="grid sm:grid-cols-2 gap-2">
          <div><Label>Worker</Label>
            <Select value={pay.worker_id} onValueChange={(v) => setPay({ ...pay, worker_id: v })}>
              <SelectTrigger><SelectValue placeholder="Pick worker" /></SelectTrigger>
              <SelectContent>{workers.filter(x => x.active).map((x) => <SelectItem key={x.id} value={x.id}>{x.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Amount</Label><Input type="number" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} /></div>
          <div><Label>Date</Label><Input type="date" value={pay.paid_on} onChange={(e) => setPay({ ...pay, paid_on: e.target.value })} /></div>
          <div><Label>Method</Label>
            <Select value={pay.method} onValueChange={(v) => setPay({ ...pay, method: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["cash", "zelle", "cashapp", "check", "venmo", "other"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <Input placeholder="Notes" value={pay.notes} onChange={(e) => setPay({ ...pay, notes: e.target.value })} />
        <Button onClick={logPayment} className="w-full bg-success text-success-foreground hover:bg-success/90">Record Payment</Button>
      </Card>
    </div>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus, Clock, DollarSign } from "lucide-react";
import { toast } from "sonner";

export default function AdminWorkers() {
  const [workers, setWorkers] = useState<any[]>([]);
  const [time, setTime] = useState<any[]>([]);
  const [pays, setPays] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [adding, setAdding] = useState(false);
  const [w, setW] = useState({ full_name: "", phone: "", role: "helper", pay_type: "hourly", hourly_rate: "25", notes: "" });
  const [te, setTe] = useState({ worker_id: "", job_id: "", work_date: new Date().toISOString().slice(0, 10), hours: "", hourly_rate: "", notes: "" });
  const [pay, setPay] = useState({ worker_id: "", amount: "", paid_on: new Date().toISOString().slice(0, 10), method: "cash", notes: "" });

  async function load() {
    const [a, b, c, d] = await Promise.all([
      supabase.from("workers").select("*").order("created_at"),
      supabase.from("worker_time_entries").select("*").order("work_date", { ascending: false }),
      supabase.from("worker_payments").select("*").order("paid_on", { ascending: false }),
      supabase.from("jobs").select("id, address, customers(name)").eq("archived", false).order("created_at", { ascending: false }).limit(100),
    ]);
    setWorkers(a.data || []); setTime(b.data || []); setPays(c.data || []); setJobs(d.data || []);
  }
  useEffect(() => { load(); }, []);

  async function addWorker() {
    if (!w.full_name) return toast.error("Name required");
    const { error } = await supabase.from("workers").insert({ ...w, hourly_rate: Number(w.hourly_rate) || 0 } as any);
    if (error) return toast.error(error.message);
    setW({ full_name: "", phone: "", role: "helper", pay_type: "hourly", hourly_rate: "25", notes: "" });
    setAdding(false); load(); toast.success("Worker added");
  }
  async function delWorker(id: string) {
    if (!confirm("Delete worker?")) return;
    const { error } = await supabase.from("workers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
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

  function balanceFor(id: string) {
    const earned = time.filter((t) => t.worker_id === id).reduce((s, t) => s + Number(t.amount || 0), 0);
    const paid = pays.filter((p) => p.worker_id === id).reduce((s, p) => s + Number(p.amount || 0), 0);
    return { earned, paid, balance: earned - paid };
  }

  return (
    <div className="container-tight py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Workers & Payroll</h1>
        <Button onClick={() => setAdding(!adding)} size="sm" className="gap-1"><Plus className="h-4 w-4" />Add Worker</Button>
      </div>

      {adding && (
        <Card className="p-4 space-y-2">
          <div className="grid sm:grid-cols-2 gap-2">
            <div><Label>Full Name *</Label><Input value={w.full_name} onChange={(e) => setW({ ...w, full_name: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={w.phone} onChange={(e) => setW({ ...w, phone: e.target.value })} /></div>
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
          <Textarea placeholder="Notes" value={w.notes} onChange={(e) => setW({ ...w, notes: e.target.value })} />
          <Button onClick={addWorker} className="w-full bg-success text-success-foreground hover:bg-success/90">Save Worker</Button>
        </Card>
      )}

      <div className="grid gap-2">
        {workers.map((wk) => {
          const b = balanceFor(wk.id);
          return (
            <Card key={wk.id} className="p-4">
              <div className="flex justify-between gap-2">
                <div>
                  <div className="font-bold">{wk.full_name} <span className="text-xs text-muted-foreground font-normal">· {wk.role} · ${wk.hourly_rate}/hr</span></div>
                  {wk.phone && <div className="text-xs text-muted-foreground">{wk.phone}</div>}
                </div>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => delWorker(wk.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                <div className="rounded bg-muted/50 p-2"><div className="text-muted-foreground">Earned</div><div className="font-bold text-base">${b.earned.toFixed(0)}</div></div>
                <div className="rounded bg-muted/50 p-2"><div className="text-muted-foreground">Paid out</div><div className="font-bold text-base">${b.paid.toFixed(0)}</div></div>
                <div className="rounded bg-muted/50 p-2"><div className="text-muted-foreground">Owe worker</div><div className={`font-bold text-base ${b.balance > 0 ? "text-destructive" : "text-success"}`}>${b.balance.toFixed(0)}</div></div>
              </div>
            </Card>
          );
        })}
        {workers.length === 0 && <Card className="p-6 text-center text-muted-foreground">No workers yet.</Card>}
      </div>

      <Card className="p-4 space-y-2">
        <h2 className="font-bold flex items-center gap-2"><Clock className="h-4 w-4" />Log Hours</h2>
        <div className="grid sm:grid-cols-2 gap-2">
          <div><Label>Worker</Label>
            <Select value={te.worker_id} onValueChange={(v) => setTe({ ...te, worker_id: v })}>
              <SelectTrigger><SelectValue placeholder="Pick worker" /></SelectTrigger>
              <SelectContent>{workers.map((x) => <SelectItem key={x.id} value={x.id}>{x.full_name}</SelectItem>)}</SelectContent>
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
              <SelectContent>{workers.map((x) => <SelectItem key={x.id} value={x.id}>{x.full_name}</SelectItem>)}</SelectContent>
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

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Worker = { id: string; full_name: string; hourly_rate: number };
type Entry = { id: string; worker_id: string; hours: number; hourly_rate: number; amount: number; work_date: string; notes: string | null };

export default function JobWorkerHours({ jobId }: { jobId: string }) {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [v, setV] = useState({ worker_id: "", hours: "", hourly_rate: "", work_date: new Date().toISOString().slice(0, 10), notes: "" });
  const [busy, setBusy] = useState(false);

  async function load() {
    const [{ data: ws }, { data: es }] = await Promise.all([
      supabase.from("workers").select("id, full_name, hourly_rate").eq("active", true).order("full_name"),
      supabase.from("worker_time_entries").select("*").eq("job_id", jobId).order("work_date", { ascending: false }),
    ]);
    setWorkers((ws as any) || []);
    setEntries((es as any) || []);
  }
  useEffect(() => { load(); }, [jobId]);

  function pickWorker(id: string) {
    const w = workers.find((x) => x.id === id);
    setV((cur) => ({ ...cur, worker_id: id, hourly_rate: w ? String(w.hourly_rate) : cur.hourly_rate }));
  }

  async function add() {
    if (!v.worker_id || !v.hours) return toast.error("Pick worker + hours");
    setBusy(true);
    const hours = Number(v.hours);
    const rate = Number(v.hourly_rate || 0);
    const amount = hours * rate;
    const { error } = await supabase.from("worker_time_entries").insert({
      job_id: jobId, worker_id: v.worker_id, hours, hourly_rate: rate, amount,
      work_date: v.work_date, notes: v.notes || null,
    } as any);
    setBusy(false);
    if (error) return toast.error(error.message);
    setV({ worker_id: "", hours: "", hourly_rate: "", work_date: new Date().toISOString().slice(0, 10), notes: "" });
    load();
  }
  async function remove(id: string) {
    if (!confirm("Delete this time entry?")) return;
    await supabase.from("worker_time_entries").delete().eq("id", id);
    load();
  }

  const total = entries.reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalHours = entries.reduce((s, e) => s + Number(e.hours || 0), 0);

  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">Worker Hours</h2>
        <div className="text-xs text-muted-foreground">{totalHours.toFixed(2)} hrs · ${total.toFixed(0)} labor</div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <div className="col-span-2">
          <Label className="text-xs">Worker</Label>
          <Select value={v.worker_id} onValueChange={pickWorker}>
            <SelectTrigger><SelectValue placeholder="Pick worker" /></SelectTrigger>
            <SelectContent>
              {workers.map((w) => <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs">Hours</Label><Input type="number" step="0.25" value={v.hours} onChange={(e) => setV({ ...v, hours: e.target.value })} /></div>
        <div><Label className="text-xs">Rate</Label><Input type="number" step="0.50" value={v.hourly_rate} onChange={(e) => setV({ ...v, hourly_rate: e.target.value })} /></div>
        <div><Label className="text-xs">Date</Label><Input type="date" value={v.work_date} onChange={(e) => setV({ ...v, work_date: e.target.value })} /></div>
        <div className="col-span-2 sm:col-span-5"><Label className="text-xs">Notes</Label><Input value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} /></div>
      </div>
      <Button onClick={add} disabled={busy} size="sm" className="gap-1"><Plus className="h-4 w-4" />Log hours</Button>

      <div className="space-y-1 text-sm">
        {entries.map((e) => {
          const w = workers.find((x) => x.id === e.worker_id);
          return (
            <div key={e.id} className="flex items-center justify-between border-b border-border py-1.5">
              <div>
                <div className="font-semibold">{w?.full_name || "Worker"} · {Number(e.hours).toFixed(2)}h @ ${Number(e.hourly_rate).toFixed(0)}</div>
                <div className="text-xs text-muted-foreground">{e.work_date}{e.notes ? ` · ${e.notes}` : ""}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">${Number(e.amount).toFixed(0)}</span>
                <Button size="sm" variant="ghost" onClick={() => remove(e.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          );
        })}
        {entries.length === 0 && <p className="text-muted-foreground text-xs">No worker hours logged yet.</p>}
      </div>
    </Card>
  );
}

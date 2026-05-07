import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

const STATUS = [
  { v: "not_started", l: "Not started" },
  { v: "in_progress", l: "In progress" },
  { v: "done", l: "Done" },
];

export default function JobTasks({ jobId }: { jobId: string }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [workerId, setWorkerId] = useState<string>("none");

  async function load() {
    const [{ data: t }, { data: w }] = await Promise.all([
      supabase.from("job_tasks").select("*").eq("job_id", jobId).order("display_order").order("created_at"),
      supabase.from("workers").select("id, full_name").eq("active", true),
    ]);
    setTasks(t || []);
    setWorkers(w || []);
  }
  useEffect(() => { load(); }, [jobId]);

  async function add() {
    if (!title.trim()) return;
    const { error } = await supabase.from("job_tasks").insert({
      job_id: jobId, title: title.trim(),
      due_date: due || null,
      worker_id: workerId === "none" ? null : workerId,
    });
    if (error) return toast.error(error.message);
    setTitle(""); setDue(""); setWorkerId("none");
    load();
  }
  async function update(id: string, patch: any) {
    const p = { ...patch };
    if (patch.status === "done") p.completed_at = new Date().toISOString();
    if (patch.status && patch.status !== "done") p.completed_at = null;
    const { error } = await supabase.from("job_tasks").update(p).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }
  async function remove(id: string) {
    await supabase.from("job_tasks").delete().eq("id", id);
    load();
  }

  const done = tasks.filter((t) => t.status === "done").length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  return (
    <Card className="p-5 space-y-3 lg:col-span-2">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold">Checklist / Tasks</h2>
        <div className="text-xs text-muted-foreground">{done}/{tasks.length} done</div>
      </div>
      <Progress value={pct} />

      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
        <Input placeholder="New task…" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="sm:w-40" />
        <Select value={workerId} onValueChange={setWorkerId}>
          <SelectTrigger className="sm:w-44"><SelectValue placeholder="Assign…" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Unassigned</SelectItem>
            {workers.map((w) => <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={add} className="bg-success text-success-foreground hover:bg-success/90"><Plus className="h-4 w-4" /></Button>
      </div>

      <div className="space-y-2">
        {tasks.map((t) => {
          const w = workers.find((x) => x.id === t.worker_id);
          return (
            <div key={t.id} className="flex flex-wrap items-center gap-2 p-2 rounded-md border border-border">
              <Select value={t.status} onValueChange={(v) => update(t.id, { status: v })}>
                <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className={`flex-1 min-w-0 text-sm ${t.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                <div className="font-medium truncate">{t.title}</div>
                <div className="text-xs text-muted-foreground">
                  {w ? w.full_name : "Unassigned"}{t.due_date ? ` · due ${t.due_date}` : ""}
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          );
        })}
        {tasks.length === 0 && <div className="text-sm text-muted-foreground p-2">No tasks yet.</div>}
      </div>
    </Card>
  );
}

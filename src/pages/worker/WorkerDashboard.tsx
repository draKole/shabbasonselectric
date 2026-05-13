import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Clock, CheckCircle2, Camera, LogOut, FileText } from "lucide-react";
import { PaystubModal } from "@/pages/admin/AdminPaystubs";
import { useGlobalSettings } from "@/lib/useGlobalSettings";

type Worker = { id: string; full_name: string; hourly_rate: number; is_owner: boolean; active: boolean };
type Job = { id: string; address: string | null; city: string | null; description: string | null; scheduled_start: string | null; status: string };
type Task = { id: string; title: string; status: string; job_id: string };
type Entry = { id: string; job_id: string | null; work_date: string; hours: number; amount: number; approved: boolean; paid: boolean; notes: string | null };

export default function WorkerDashboard() {
  const nav = useNavigate();
  const { settings } = useGlobalSettings();
  const [worker, setWorker] = useState<Worker | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [paystubs, setPaystubs] = useState<any[]>([]);
  const [viewingStub, setViewingStub] = useState<any>(null);
  const [profile, setProfile] = useState({ full_name: "", phone: "", email: "" });
  const [hours, setHours] = useState({ job_id: "", work_date: new Date().toISOString().slice(0, 10), hours: "", notes: "" });

  async function load() {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) { nav("/worker/login"); return; }
    const { data: ws } = await supabase.from("workers").select("id, full_name, hourly_rate, is_owner, active, phone, email")
      .eq("auth_user_id", sess.session.user.id).maybeSingle();
    if (!ws) { toast.error("No worker profile linked. Ask admin."); await supabase.auth.signOut(); nav("/worker/login"); return; }
    if (!ws.active) { toast.error("Your access was deactivated."); await supabase.auth.signOut(); nav("/worker/login"); return; }
    setWorker(ws as any);
    setProfile({ full_name: ws.full_name || "", phone: (ws as any).phone || "", email: (ws as any).email || "" });
    const [{ data: js }, { data: ts }, { data: es }, { data: ps }] = await Promise.all([
      supabase.from("jobs").select("id, address, city, description, scheduled_start, status").eq("archived", false).order("scheduled_start", { ascending: true, nullsFirst: false }),
      supabase.from("job_tasks").select("id, title, status, job_id").eq("worker_id", ws.id).order("display_order"),
      supabase.from("worker_time_entries").select("id, job_id, work_date, hours, amount, approved, paid, notes")
        .eq("worker_id", ws.id).order("work_date", { ascending: false }).limit(50),
      (supabase as any).from("paystubs").select("*").eq("worker_id", ws.id).order("pay_date", { ascending: false }).limit(20),
    ]);
    setJobs((js as any) || []);
    setTasks((ts as any) || []);
    setEntries((es as any) || []);
    setPaystubs((ps as any) || []);
  }

  async function saveProfile() {
    if (!worker) return;
    const { error } = await supabase.from("workers").update({ full_name: profile.full_name, phone: profile.phone, email: profile.email } as any).eq("id", worker.id);
    if (error) return toast.error(error.message);
    toast.success("Profile saved"); load();
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function logHours() {
    if (!worker) return;
    if (!hours.job_id || !hours.hours) return toast.error("Pick job + hours");
    const h = Number(hours.hours);
    const rate = Number(worker.hourly_rate || 0);
    const { error } = await supabase.from("worker_time_entries").insert({
      worker_id: worker.id, job_id: hours.job_id, work_date: hours.work_date,
      hours: h, hourly_rate: rate, amount: h * rate, notes: hours.notes || null,
      approved: false, paid: false,
    } as any);
    if (error) return toast.error(error.message);
    setHours({ ...hours, hours: "", notes: "" });
    toast.success("Submitted — pending admin approval");
    load();
  }

  async function completeTask(t: Task) {
    await supabase.from("job_tasks").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", t.id);
    load();
  }

  async function uploadPhoto(jobId: string, file: File) {
    const path = `${jobId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("job-photos").upload(path, file, { upsert: false });
    if (error) return toast.error(error.message);
    const { data: pub } = supabase.storage.from("job-photos").getPublicUrl(path);
    await supabase.from("job_photos").insert({ job_id: jobId, photo_url: pub.publicUrl, uploaded_by_admin: false } as any);
    toast.success("Photo uploaded");
  }

  function weekTotal() {
    const start = new Date(); start.setDate(start.getDate() - start.getDay()); // Sunday
    const startStr = start.toISOString().slice(0, 10);
    const inWeek = entries.filter((e) => e.work_date >= startStr);
    const hrs = inWeek.reduce((s, e) => s + Number(e.hours || 0), 0);
    const amt = inWeek.reduce((s, e) => s + Number(e.amount || 0), 0);
    return { hrs, amt, count: inWeek.length };
  }

  if (!worker) return <div className="p-6 text-center text-muted-foreground">Loading…</div>;
  const wk = weekTotal();
  const myJobIds = new Set([...tasks.map(t => t.job_id), ...entries.map(e => e.job_id).filter(Boolean) as string[]]);
  const myJobs = jobs.filter(j => myJobIds.has(j.id));

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold">Hi, {worker.full_name.split(" ")[0]}</h1>
            <p className="text-xs text-muted-foreground">{worker.is_owner ? "Owner-Worker" : "Worker"} · ${Number(worker.hourly_rate).toFixed(0)}/hr</p>
          </div>
          <Button size="sm" variant="outline" onClick={async () => { await supabase.auth.signOut(); nav("/worker/login"); }}>
            <LogOut className="h-3.5 w-3.5 mr-1" /> Sign out
          </Button>
        </div>

        <Card className="p-4 bg-success/5 border-success/40">
          <div className="text-xs text-muted-foreground">This week</div>
          <div className="text-2xl font-extrabold text-success">{wk.hrs.toFixed(2)} hrs · ${wk.amt.toFixed(0)} est.</div>
          <div className="text-xs text-muted-foreground mt-1">{wk.count} entries (pending counts toward estimate)</div>
        </Card>

        <Card className="p-4 space-y-3">
          <h2 className="font-bold flex items-center gap-2"><Clock className="h-4 w-4" /> Log hours</h2>
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2"><Label>Job</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={hours.job_id} onChange={(e) => setHours({ ...hours, job_id: e.target.value })}>
                <option value="">Pick a job…</option>
                {myJobs.map((j) => <option key={j.id} value={j.id}>{j.address || "—"}</option>)}
              </select>
            </div>
            <div><Label>Date</Label><Input type="date" value={hours.work_date} onChange={(e) => setHours({ ...hours, work_date: e.target.value })} /></div>
            <div><Label>Hours</Label><Input type="number" step="0.25" value={hours.hours} onChange={(e) => setHours({ ...hours, hours: e.target.value })} /></div>
            <div className="col-span-2"><Label>Notes</Label><Textarea rows={2} value={hours.notes} onChange={(e) => setHours({ ...hours, notes: e.target.value })} /></div>
          </div>
          <Button onClick={logHours} className="w-full">Submit hours</Button>
        </Card>

        <Card className="p-4 space-y-2">
          <h2 className="font-bold">My jobs ({myJobs.length})</h2>
          {myJobs.length === 0 && <p className="text-xs text-muted-foreground">No assigned jobs yet.</p>}
          {myJobs.map((j) => {
            const myTasks = tasks.filter((t) => t.job_id === j.id);
            return (
              <div key={j.id} className="border-t border-border pt-3 first:border-0 first:pt-0">
                <div className="font-semibold">{j.address || "—"}{j.city ? `, ${j.city}` : ""}</div>
                <div className="text-xs text-muted-foreground">{j.scheduled_start ? new Date(j.scheduled_start).toLocaleString() : "Not scheduled"} · {j.status}</div>
                {j.description && <div className="text-sm mt-1 whitespace-pre-wrap">{j.description}</div>}
                {myTasks.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {myTasks.map((t) => (
                      <li key={t.id} className="flex items-center justify-between text-sm">
                        <span className={t.status === "completed" ? "line-through text-muted-foreground" : ""}>{t.title}</span>
                        {t.status !== "completed" && (
                          <Button size="sm" variant="outline" onClick={() => completeTask(t)} className="gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Done
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-2">
                  <label className="inline-flex items-center gap-2 text-xs cursor-pointer text-secondary">
                    <Camera className="h-4 w-4" /> Upload photo
                    <input type="file" accept="image/*" capture="environment" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(j.id, f); e.target.value = ""; }} />
                  </label>
                </div>
              </div>
            );
          })}
        </Card>

        <Card className="p-4">
          <h2 className="font-bold mb-2">My recent hours</h2>
          <div className="space-y-1 text-sm">
            {entries.slice(0, 15).map((e) => (
              <div key={e.id} className="flex items-center justify-between border-b border-border py-1">
                <div>
                  <div>{e.work_date} · {Number(e.hours).toFixed(2)}h · ${Number(e.amount).toFixed(0)}</div>
                  {e.notes && <div className="text-xs text-muted-foreground">{e.notes}</div>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${e.paid ? "bg-success/15 text-success" : e.approved ? "bg-secondary/15 text-secondary" : "bg-muted"}`}>
                  {e.paid ? "Paid" : e.approved ? "Approved" : "Pending"}
                </span>
              </div>
            ))}
            {entries.length === 0 && <p className="text-xs text-muted-foreground">No hours yet.</p>}
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="font-bold mb-2 flex items-center gap-2"><FileText className="h-4 w-4" /> My paystubs</h2>
          <div className="space-y-1 text-sm">
            {paystubs.map((p) => (
              <button key={p.id} onClick={() => setViewingStub(p)} className="w-full flex items-center justify-between border-b border-border py-2 text-left hover:bg-muted/30">
                <div>
                  <div className="font-semibold">{p.period_start} → {p.period_end}</div>
                  <div className="text-xs text-muted-foreground">Pay date {p.pay_date} · {Number(p.hours).toFixed(2)}h · gross ${Number(p.gross).toFixed(0)} · net ${Number(p.net_pay).toFixed(0)}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${p.status === "paid" ? "bg-success/15 text-success" : "bg-muted"}`}>{p.status}</span>
              </button>
            ))}
            {paystubs.length === 0 && <p className="text-xs text-muted-foreground">No paystubs yet.</p>}
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <h2 className="font-bold">My profile</h2>
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2"><Label>Name</Label><Input value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} /></div>
          </div>
          <Button onClick={saveProfile} variant="outline">Save profile</Button>
        </Card>
      </div>
      {viewingStub && <PaystubModal p={viewingStub} settings={settings} workerName={worker.full_name} onClose={() => setViewingStub(null)} />}
    </div>
  );
}

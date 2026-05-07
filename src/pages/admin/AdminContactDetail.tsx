import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Phone, MessageSquare, ArrowLeft, Plus, Save, Star } from "lucide-react";
import { JOB_STATUS_LABELS, STATUS_COLOR } from "@/lib/jobTypes";
import { toast } from "sonner";
import { useAppSetting } from "@/lib/useAppSettings";

function normPhone(p?: string | null) { return (p || "").replace(/\D/g, "").slice(-10); }
function fmt(n: number) { return `$${Number(n || 0).toFixed(0)}`; }

export default function AdminContactDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [c, setC] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]); // duplicates by phone
  const [jobs, setJobs] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [edit, setEdit] = useState<any>(null);
  const { value: googleUrl } = useAppSetting("google_review_url");

  async function load() {
    const { data: cust } = await supabase.from("customers").select("*").eq("id", id).single();
    if (!cust) return;
    setC(cust);
    setEdit(cust);
    const phoneKey = normPhone(cust.phone);
    let ids = [cust.id];
    if (phoneKey) {
      const { data: all } = await supabase.from("customers").select("id, name, phone").neq("id", cust.id);
      const dupes = (all || []).filter((x) => normPhone(x.phone) === phoneKey);
      setRelated(dupes);
      ids = [cust.id, ...dupes.map((d) => d.id)];
    }
    const { data: js } = await supabase.from("jobs").select("*").in("customer_id", ids).order("created_at", { ascending: false });
    setJobs(js || []);
    const jobIds = (js || []).map((j) => j.id);
    if (jobIds.length) {
      const [{ data: mats }, { data: pays }] = await Promise.all([
        supabase.from("job_materials").select("cost, paid_by, job_id").in("job_id", jobIds),
        supabase.from("job_payments").select("amount, paid_on, job_id").in("job_id", jobIds),
      ]);
      setMaterials(mats || []);
      setPayments(pays || []);
    }
  }
  useEffect(() => { if (id) load(); }, [id]);

  const totals = useMemo(() => {
    const billed = jobs.reduce((s, j) => s + Number(j.job_total || 0), 0);
    const paid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const balance = jobs.reduce((s, j) => s + Number(j.balance_due || 0), 0);
    const matsMe = materials.filter((m) => m.paid_by === "me").reduce((s, m) => s + Number(m.cost || 0), 0);
    const labor = jobs.reduce((s, j) => s + Number(j.worker_labor_cost || 0), 0);
    const otherExp = jobs.reduce((s, j) => s + Number(j.other_expenses || 0), 0);
    const net = Math.max(paid - matsMe - labor - otherExp, 0);
    return { billed, paid, balance, matsMe, labor, otherExp, net };
  }, [jobs, payments, materials]);

  async function save() {
    const { error } = await supabase.from("customers").update({
      name: edit.name, phone: edit.phone, email: edit.email, address: edit.address, city: edit.city, notes: edit.notes,
    }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    load();
  }
  async function archive() {
    if (!confirm("Delete this contact? Jobs will remain.")) return;
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    navigate("/admin/contacts");
  }

  if (!c) return <div className="container-tight py-6">Loading…</div>;

  const reviewMsg = `Hey ${c.name || ""}, thank you for choosing Shabba & Sons Electric. If you were happy with the work, could you leave us a quick Google review? It helps our family business grow. ${googleUrl || ""}`.trim();

  return (
    <div className="container-tight py-6 space-y-4">
      <Link to="/admin/contacts" className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to contacts
      </Link>

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold">{c.name}</h1>
            <p className="text-muted-foreground text-sm">{c.phone} {c.email && `· ${c.email}`}</p>
            <p className="text-muted-foreground text-sm">{[c.address, c.city].filter(Boolean).join(", ")}</p>
            {related.length > 0 && (
              <p className="text-[11px] text-muted-foreground mt-1">+{related.length} duplicate contact{related.length === 1 ? "" : "s"} merged by phone</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {c.phone && <>
              <a href={`tel:${c.phone}`}><Button size="sm" className="bg-success text-success-foreground hover:bg-success/90 gap-1"><Phone className="h-4 w-4" />Call</Button></a>
              <a href={`sms:${c.phone}?&body=${encodeURIComponent(`Hi ${c.name}, this is Shabba — `)}`}><Button size="sm" variant="outline" className="gap-1"><MessageSquare className="h-4 w-4" />Text</Button></a>
              <a href={`sms:${c.phone}?&body=${encodeURIComponent(reviewMsg)}`}><Button size="sm" variant="outline" className="gap-1"><Star className="h-4 w-4" />Review</Button></a>
            </>}
            <Link to={`/admin/jobs/new?customer_id=${c.id}`}>
              <Button size="sm" className="gap-1"><Plus className="h-4 w-4" />New Job</Button>
            </Link>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
        <Stat label="Jobs" value={jobs.length} />
        <Stat label="Billed" value={fmt(totals.billed)} />
        <Stat label="Collected" value={fmt(totals.paid)} />
        <Stat label="Open balance" value={fmt(totals.balance)} danger={totals.balance > 0} />
        <Stat label="Materials (me)" value={fmt(totals.matsMe)} />
        <Stat label="Labor" value={fmt(totals.labor)} />
        <Stat label="Net profit" value={fmt(totals.net)} success />
      </div>

      <Card className="p-5">
        <h2 className="font-bold mb-3">Job history ({jobs.length})</h2>
        <div className="space-y-2">
          {jobs.map((j) => (
            <Link key={j.id} to={`/admin/jobs/${j.id}`} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-md hover:bg-muted border border-border">
              <div>
                <div className="font-semibold">{j.job_title || j.job_type}</div>
                <div className="text-xs text-muted-foreground">{new Date(j.created_at).toLocaleDateString()} · {j.address || ""}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={STATUS_COLOR[j.status] || ""}>{JOB_STATUS_LABELS[j.status] || j.status}</Badge>
                <span className="text-sm font-bold">{fmt(j.job_total)}</span>
                {Number(j.balance_due) > 0 && <span className="text-xs text-destructive">bal {fmt(j.balance_due)}</span>}
              </div>
            </Link>
          ))}
          {jobs.length === 0 && <div className="text-sm text-muted-foreground p-3">No jobs yet.</div>}
        </div>
      </Card>

      <Card className="p-5 space-y-3">
        <h2 className="font-bold">Edit contact</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label>Name</Label><Input value={edit.name || ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
          <div><Label>Phone</Label><Input value={edit.phone || ""} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></div>
          <div><Label>Email</Label><Input value={edit.email || ""} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></div>
          <div><Label>City</Label><Input value={edit.city || ""} onChange={(e) => setEdit({ ...edit, city: e.target.value })} /></div>
          <div className="sm:col-span-2"><Label>Address</Label><Input value={edit.address || ""} onChange={(e) => setEdit({ ...edit, address: e.target.value })} /></div>
          <div className="sm:col-span-2"><Label>Notes</Label><Textarea value={edit.notes || ""} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></div>
        </div>
        <div className="flex gap-2">
          <Button onClick={save} className="gap-1"><Save className="h-4 w-4" />Save</Button>
          <Button variant="outline" onClick={archive}>Delete contact</Button>
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value, success, danger }: { label: string; value: any; success?: boolean; danger?: boolean }) {
  return (
    <Card className={`p-3 ${success ? "border-success/40 bg-success/5" : ""}`}>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`text-lg font-extrabold ${success ? "text-success" : danger ? "text-destructive" : ""}`}>{value}</div>
    </Card>
  );
}

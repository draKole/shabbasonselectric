import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Copy, MessageSquare, Save } from "lucide-react";
import { BUSINESS } from "@/lib/business";
import { ESTIMATE_TEMPLATES } from "@/lib/estimateTemplates";

type JobOpt = { id: string; address: string | null; customer: { name: string; phone: string | null } | null };

export default function AdminEstimates() {
  const [params] = useSearchParams();
  const initialJobId = params.get("job") || "";
  const [jobs, setJobs] = useState<JobOpt[]>([]);
  const [jobId, setJobId] = useState<string>(initialJobId);
  const [v, setV] = useState({ name: "", address: "", scope: "", total: "", deposit: "", materials: "Included" });
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("jobs")
        .select("id, address, customer:customers(name, phone)")
        .eq("archived", false)
        .order("created_at", { ascending: false })
        .limit(50);
      setJobs((data as any) || []);
    })();
  }, []);

  function applyTemplate(id: string) {
    const t = ESTIMATE_TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    setV((cur) => ({
      ...cur,
      scope: cur.scope ? `${cur.scope}\n${t.scope}` : t.scope,
      total: String((Number(cur.total) || 0) + t.total),
      deposit: String((Number(cur.deposit) || 0) + t.deposit),
      materials: t.materials,
    }));
  }

  function applyJob(id: string) {
    setJobId(id);
    const j = jobs.find((x) => x.id === id);
    if (j) {
      setV((cur) => ({ ...cur, name: j.customer?.name || cur.name, address: j.address || cur.address }));
      if (j.customer?.phone) setPhone(j.customer.phone);
    }
  }

  const text = `SCOPE OF WORK — ELECTRICAL

Customer: ${v.name}
Address: ${v.address}

Work Includes:
${v.scope.split("\n").map((l) => l.trim() ? `* ${l.trim()}` : "").filter(Boolean).join("\n")}

Materials: ${v.materials}
Total: $${v.total || "0"}
Deposit Required: $${v.deposit || "0"}
Balance Due Upon Completion: $${(Number(v.total || 0) - Number(v.deposit || 0)).toFixed(0)}

${BUSINESS.name}
${BUSINESS.phone}`;

  async function saveToJob() {
    if (!jobId) {
      toast.error("Pick a job to save this estimate to");
      return;
    }
    setSaving(true);
    try {
      const { error: eErr } = await supabase.from("estimates").insert({
        job_id: jobId,
        scope: v.scope,
        total_price: Number(v.total) || 0,
        deposit_required: Number(v.deposit) || 0,
        materials_included: v.materials.toLowerCase().includes("included"),
        status: "sent",
        sent_at: new Date().toISOString(),
      });
      if (eErr) throw eErr;
      const { error: jErr } = await supabase.from("jobs").update({
        estimate_amount: Number(v.total) || 0,
        deposit_required: Number(v.deposit) || 0,
        job_total: Number(v.total) || 0,
        status: "estimate_sent",
      }).eq("id", jobId);
      if (jErr) throw jErr;
      toast.success("Estimate saved to job");
    } catch (e: any) {
      toast.error(e.message || "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container-tight py-6 grid gap-4 lg:grid-cols-2">
      <Card className="p-5 space-y-3">
        <h1 className="text-xl font-extrabold">Estimate Builder</h1>

        <div>
          <Label>Attach to Job (optional)</Label>
          <Select value={jobId} onValueChange={applyJob}>
            <SelectTrigger><SelectValue placeholder="Select an active job…" /></SelectTrigger>
            <SelectContent>
              {jobs.map((j) => (
                <SelectItem key={j.id} value={j.id}>
                  {j.customer?.name || "—"} · {j.address || "no address"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Add Service Template</Label>
          <Select onValueChange={applyTemplate}>
            <SelectTrigger><SelectValue placeholder="Pick a template to add…" /></SelectTrigger>
            <SelectContent>
              {ESTIMATE_TEMPLATES.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.label} · ${t.total}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">Templates add to scope and totals — pick multiple.</p>
        </div>

        <div><Label>Customer Name</Label><Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></div>
        <div><Label>Address</Label><Input value={v.address} onChange={(e) => setV({ ...v, address: e.target.value })} /></div>
        <div><Label>Scope (one line per item)</Label><Textarea rows={6} value={v.scope} onChange={(e) => setV({ ...v, scope: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Total ($)</Label><Input type="number" value={v.total} onChange={(e) => setV({ ...v, total: e.target.value })} /></div>
          <div><Label>Deposit ($)</Label><Input type="number" value={v.deposit} onChange={(e) => setV({ ...v, deposit: e.target.value })} /></div>
        </div>
        <div><Label>Materials</Label><Input value={v.materials} onChange={(e) => setV({ ...v, materials: e.target.value })} placeholder="Included / Provided by customer" /></div>
        <div><Label>Customer phone (for SMS)</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+16145551234" /></div>
      </Card>

      <Card className="p-5">
        <h2 className="font-bold mb-2">Preview</h2>
        <pre className="bg-muted p-3 rounded text-xs whitespace-pre-wrap font-mono">{text}</pre>
        <div className="mt-3 flex gap-2 flex-wrap">
          <Button onClick={() => { navigator.clipboard.writeText(text); toast.success("Copied"); }} className="gap-1"><Copy className="h-4 w-4" />Copy Text</Button>
          {phone && (
            <a href={`sms:${phone.replace(/[^\d+]/g, "")}?&body=${encodeURIComponent(text)}`}>
              <Button variant="outline" className="gap-1"><MessageSquare className="h-4 w-4" />Send by SMS</Button>
            </a>
          )}
          <Button onClick={saveToJob} disabled={saving || !jobId} className="gap-1 bg-success text-success-foreground hover:bg-success/90">
            <Save className="h-4 w-4" /> Save to Job
          </Button>
        </div>
        {!jobId && <p className="text-xs text-muted-foreground mt-2">Pick a job above to save this estimate and update the job total.</p>}
      </Card>
    </div>
  );
}

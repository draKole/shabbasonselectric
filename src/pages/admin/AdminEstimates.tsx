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
import { Copy, MessageSquare, Save, Plus, Trash2, Link as LinkIcon } from "lucide-react";
import { BUSINESS } from "@/lib/business";

type Item = { description: string; qty: number; price: number };
type JobOpt = { id: string; address: string | null; customer: { name: string; phone: string | null } | null };

export default function AdminEstimates() {
  const [params] = useSearchParams();
  const initialJobId = params.get("job") || "";
  const [jobs, setJobs] = useState<JobOpt[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [jobId, setJobId] = useState<string>(initialJobId);
  const [v, setV] = useState({ name: "", address: "", scope: "", deposit: "", materials: "Included", terms: "" });
  const [items, setItems] = useState<Item[]>([]);
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    (async () => {
      const [{ data }, { data: tpl }] = await Promise.all([
        supabase.from("jobs").select("id, address, customer:customers(name, phone)").eq("archived", false).order("created_at", { ascending: false }).limit(50),
        supabase.from("estimate_templates").select("*").eq("active", true).order("display_order"),
      ]);
      setJobs((data as any) || []);
      setTemplates(tpl || []);
    })();
  }, []);

  const lineTotal = items.reduce((s, it) => s + Number(it.qty || 0) * Number(it.price || 0), 0);
  const total = lineTotal;

  function applyTemplate(id: string) {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setItems((cur) => [...cur, { description: t.label + (t.scope ? `\n${t.scope}` : ""), qty: 1, price: Number(t.total) || 0 }]);
    setV((cur) => ({ ...cur, deposit: String((Number(cur.deposit) || 0) + Number(t.deposit || 0)), materials: t.materials || cur.materials }));
  }
  function applyJob(id: string) {
    setJobId(id);
    const j = jobs.find((x) => x.id === id);
    if (j) {
      setV((cur) => ({ ...cur, name: j.customer?.name || cur.name, address: j.address || cur.address }));
      if (j.customer?.phone) setPhone(j.customer.phone);
    }
  }
  function addItem() { setItems((c) => [...c, { description: "", qty: 1, price: 0 }]); }
  function updateItem(i: number, patch: Partial<Item>) {
    setItems((c) => c.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  }
  function removeItem(i: number) { setItems((c) => c.filter((_, idx) => idx !== i)); }

  const text = `SCOPE OF WORK — ELECTRICAL

Customer: ${v.name}
Address: ${v.address}

Work Includes:
${items.length
  ? items.map((it) => `* ${it.description} (${it.qty} × $${Number(it.price).toFixed(2)} = $${(it.qty * it.price).toFixed(2)})`).join("\n")
  : v.scope.split("\n").map((l) => l.trim() ? `* ${l.trim()}` : "").filter(Boolean).join("\n")}

Materials: ${v.materials}
Total: $${total.toFixed(2)}
Deposit Required: $${Number(v.deposit || 0).toFixed(2)}
Balance Due Upon Completion: $${(total - Number(v.deposit || 0)).toFixed(2)}

${BUSINESS.name}
${BUSINESS.phone}`;

  async function saveToJob() {
    if (!jobId) return toast.error("Pick a job to save this estimate to");
    setSaving(true);
    try {
      const { data: ins, error: eErr } = await supabase.from("estimates").insert({
        job_id: jobId,
        scope: v.scope,
        line_items: items as any,
        total_price: total,
        deposit_required: Number(v.deposit) || 0,
        materials_included: v.materials.toLowerCase().includes("included"),
        terms: v.terms || null,
        status: "sent",
        sent_at: new Date().toISOString(),
      }).select("share_token").single();
      if (eErr) throw eErr;
      const { error: jErr } = await supabase.from("jobs").update({
        estimate_amount: total,
        deposit_required: Number(v.deposit) || 0,
        job_total: total,
        status: "estimate_sent",
      }).eq("id", jobId);
      if (jErr) throw jErr;
      const url = `${window.location.origin}/estimate/${ins?.share_token}`;
      setShareUrl(url);
      toast.success("Estimate saved — share link ready");
    } catch (e: any) {
      toast.error(e.message || "Could not save");
    } finally { setSaving(false); }
  }

  return (
    <div className="container-tight py-6 grid gap-4 lg:grid-cols-2">
      <Card className="p-5 space-y-3">
        <h1 className="text-xl font-extrabold">Estimate Builder</h1>

        <div>
          <Label>Attach to Job</Label>
          <Select value={jobId} onValueChange={applyJob}>
            <SelectTrigger><SelectValue placeholder="Select an active job…" /></SelectTrigger>
            <SelectContent>
              {jobs.map((j) => (
                <SelectItem key={j.id} value={j.id}>{j.customer?.name || "—"} · {j.address || "no address"}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Add Service Template</Label>
          <Select onValueChange={applyTemplate}>
            <SelectTrigger><SelectValue placeholder="Pick a template to add…" /></SelectTrigger>
            <SelectContent>
              {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.label} · ${t.total}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div><Label>Customer Name</Label><Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></div>
          <div><Label>Address</Label><Input value={v.address} onChange={(e) => setV({ ...v, address: e.target.value })} /></div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <Label>Line items</Label>
            <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3.5 w-3.5" /> Add</Button>
          </div>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-[1fr_70px_90px_auto] gap-2 items-start">
                <Textarea rows={2} value={it.description} onChange={(e) => updateItem(i, { description: e.target.value })} placeholder="Description" />
                <Input type="number" value={it.qty} onChange={(e) => updateItem(i, { qty: Number(e.target.value) })} />
                <Input type="number" step="0.01" value={it.price} onChange={(e) => updateItem(i, { price: Number(e.target.value) })} />
                <Button size="sm" variant="ghost" onClick={() => removeItem(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
            {items.length === 0 && (
              <div>
                <Label>Or free-text scope</Label>
                <Textarea rows={4} value={v.scope} onChange={(e) => setV({ ...v, scope: e.target.value })} />
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div><Label>Total ($)</Label><Input type="number" value={total.toFixed(2)} disabled /></div>
          <div><Label>Deposit ($)</Label><Input type="number" value={v.deposit} onChange={(e) => setV({ ...v, deposit: e.target.value })} /></div>
        </div>
        <div><Label>Materials</Label><Input value={v.materials} onChange={(e) => setV({ ...v, materials: e.target.value })} /></div>
        <div><Label>Terms (optional)</Label><Textarea rows={2} value={v.terms} onChange={(e) => setV({ ...v, terms: e.target.value })} /></div>
        <div><Label>Customer phone (for SMS)</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
      </Card>

      <Card className="p-5">
        <h2 className="font-bold mb-2">Preview</h2>
        <pre className="bg-muted p-3 rounded text-xs whitespace-pre-wrap font-mono">{text}</pre>
        <div className="mt-3 flex gap-2 flex-wrap">
          <Button onClick={() => { navigator.clipboard.writeText(text); toast.success("Copied"); }} className="gap-1"><Copy className="h-4 w-4" />Copy Text</Button>
          {phone && (
            <a href={`sms:${phone.replace(/[^\d+]/g, "")}?&body=${encodeURIComponent(text + (shareUrl ? `\n\nView/Print: ${shareUrl}` : ""))}`}>
              <Button variant="outline" className="gap-1"><MessageSquare className="h-4 w-4" />Send by SMS</Button>
            </a>
          )}
          <Button onClick={saveToJob} disabled={saving || !jobId} className="gap-1 bg-success text-success-foreground hover:bg-success/90">
            <Save className="h-4 w-4" /> Save & Get Link
          </Button>
        </div>
        {shareUrl && (
          <div className="mt-3 p-3 rounded-md bg-success/5 border border-success/30 text-sm break-all">
            <div className="flex items-center gap-1 font-semibold mb-1"><LinkIcon className="h-3.5 w-3.5" /> Customer share link</div>
            <a href={shareUrl} target="_blank" rel="noreferrer" className="underline text-secondary">{shareUrl}</a>
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success("Link copied"); }}>Copy link</Button>
              <a href={shareUrl} target="_blank" rel="noreferrer"><Button size="sm" variant="outline">Open</Button></a>
            </div>
          </div>
        )}
        {!jobId && <p className="text-xs text-muted-foreground mt-2">Pick a job above to save and generate a share link.</p>}
      </Card>
    </div>
  );
}

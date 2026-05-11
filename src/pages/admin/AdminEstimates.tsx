import { useEffect, useMemo, useState } from "react";
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
import { useGlobalSettings, num } from "@/lib/useGlobalSettings";

type Item = {
  title: string;
  description: string;
  qty: number;
  unit_price: number;
  discount: number;            // per unit discount
  final_unit_price: number;    // computed
  customer_supplied?: string;
};
type JobOpt = { id: string; address: string | null; customer: { name: string; phone: string | null } | null };

const blankItem = (): Item => ({ title: "", description: "", qty: 1, unit_price: 0, discount: 0, final_unit_price: 0 });

export default function AdminEstimates() {
  const [params] = useSearchParams();
  const initialJobId = params.get("job") || "";
  const { settings } = useGlobalSettings();
  const [jobs, setJobs] = useState<JobOpt[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [jobId, setJobId] = useState<string>(initialJobId);
  const [v, setV] = useState({ name: "", address: "", deposit: "", materials: "Included", terms: "" });
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

  useEffect(() => {
    setV((cur) => ({ ...cur, terms: cur.terms || settings.estimate_default_terms || "" }));
  }, [settings.estimate_default_terms]);

  const sums = useMemo(() => items.map((it) => {
    const qty = Number(it.qty || 1);
    const unit = Number(it.unit_price || 0);
    const disc = Number(it.discount || 0);
    const final = Math.max(unit - disc, 0);
    return { qty, unit, disc, final, originalLine: qty * unit, finalLine: qty * final, discountLine: qty * disc };
  }), [items]);
  const originalSubtotal = sums.reduce((s, x) => s + x.originalLine, 0);
  const finalSubtotal = sums.reduce((s, x) => s + x.finalLine, 0);
  const totalDiscount = originalSubtotal - finalSubtotal;
  const total = finalSubtotal;

  // Auto-set deposit from default %
  useEffect(() => {
    if (!v.deposit && total > 0) {
      const pct = num(settings.estimate_default_deposit_pct, 50);
      setV((cur) => ({ ...cur, deposit: ((total * pct) / 100).toFixed(0) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  function applyTemplate(id: string) {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setItems((cur) => [...cur, {
      title: t.label,
      description: t.scope || "",
      qty: 1,
      unit_price: Number(t.total) || 0,
      discount: 0,
      final_unit_price: Number(t.total) || 0,
      customer_supplied: undefined,
    }]);
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
  function addItem() { setItems((c) => [...c, blankItem()]); }
  function updateItem(i: number, patch: Partial<Item>) {
    setItems((c) => c.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  }
  function removeItem(i: number) { setItems((c) => c.filter((_, idx) => idx !== i)); }

  // Plain-text preview for SMS / copy
  const text = useMemo(() => {
    const lines: string[] = [];
    lines.push("SCOPE OF WORK — ELECTRICAL", "");
    lines.push(`Customer: ${v.name}`);
    lines.push(`Job Address: ${v.address}`, "");
    lines.push("Work Includes:");
    items.forEach((it, i) => {
      const n = sums[i];
      lines.push(`${i + 1}. ${it.title || "Service"}`);
      (it.description || "").split(/\r?\n/).map(s => s.trim()).filter(Boolean).forEach((d) => lines.push(`   - ${d}`));
      if (n.disc > 0) {
        lines.push(`   Original Price: $${n.originalLine.toFixed(2)}`);
        lines.push(`   Discounted Price: $${n.finalLine.toFixed(2)}`);
      } else {
        lines.push(`   Price: $${n.finalLine.toFixed(2)}`);
      }
      lines.push("");
    });
    if (v.materials) lines.push(`Materials: ${v.materials}`, "");
    if (totalDiscount > 0) {
      lines.push(`Original Total: $${originalSubtotal.toFixed(2)}`);
      lines.push(`${settings.estimate_discount_label || "Customer Discount"}: -$${totalDiscount.toFixed(2)}`);
    }
    lines.push(`Final Agreed Total: $${total.toFixed(2)}`);
    lines.push(`Deposit Required: $${Number(v.deposit || 0).toFixed(2)}`);
    lines.push(`Balance Due Upon Completion: $${(total - Number(v.deposit || 0)).toFixed(2)}`, "");
    lines.push(`Estimate valid for ${num(settings.estimate_valid_days, 30)} days.`, "");
    lines.push(settings.business_name || "Shabba & Sons Electric");
    lines.push(settings.business_phone || "614-671-8528");
    return lines.join("\n");
  }, [items, sums, v, total, totalDiscount, originalSubtotal, settings]);

  async function saveToJob() {
    if (!jobId) return toast.error("Pick a job to save this estimate to");
    setSaving(true);
    try {
      const lineItemsForDb = items.map((it, i) => ({
        title: it.title,
        description: it.description,
        qty: it.qty,
        unit_price: it.unit_price,
        discount: it.discount,
        final_unit_price: sums[i].final,
        price: sums[i].final, // legacy compat
        customer_supplied: it.customer_supplied || null,
        materials_included: v.materials.toLowerCase().includes("included"),
      }));
      const { data: ins, error: eErr } = await supabase.from("estimates").insert({
        job_id: jobId,
        scope: items.map(it => it.title).filter(Boolean).join(", "),
        line_items: lineItemsForDb as any,
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
            <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3.5 w-3.5" /> Add line</Button>
          </div>
          <div className="space-y-3">
            {items.map((it, i) => {
              const n = sums[i];
              return (
                <div key={i} className="rounded-md border border-border p-2 space-y-2">
                  <div className="flex items-start gap-2">
                    <Input placeholder="Title (e.g. 100A Panel Swap)" value={it.title} onChange={(e) => updateItem(i, { title: e.target.value })} />
                    <Button size="sm" variant="ghost" onClick={() => removeItem(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                  <Textarea rows={3} placeholder="Scope bullets (one per line)" value={it.description} onChange={(e) => updateItem(i, { description: e.target.value })} />
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div><Label className="text-xs">Qty</Label><Input type="number" value={it.qty} onChange={(e) => updateItem(i, { qty: Number(e.target.value) || 1 })} /></div>
                    <div><Label className="text-xs">Original $</Label><Input type="number" step="0.01" value={it.unit_price} onChange={(e) => updateItem(i, { unit_price: Number(e.target.value) })} /></div>
                    <div><Label className="text-xs">Discount $</Label><Input type="number" step="0.01" value={it.discount} onChange={(e) => updateItem(i, { discount: Number(e.target.value) })} /></div>
                    <div><Label className="text-xs">Final line</Label><Input value={`$${n.finalLine.toFixed(2)}`} disabled /></div>
                  </div>
                  <Input placeholder="Customer-supplied note (optional, e.g. EV charger by customer)" value={it.customer_supplied || ""} onChange={(e) => updateItem(i, { customer_supplied: e.target.value })} />
                </div>
              );
            })}
            {items.length === 0 && <p className="text-xs text-muted-foreground">No line items yet. Add one above.</p>}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-sm border-t pt-3">
          <div><div className="text-muted-foreground text-xs">Original</div><div className="font-bold">${originalSubtotal.toFixed(2)}</div></div>
          <div><div className="text-muted-foreground text-xs">Discount</div><div className="font-bold text-success">-${totalDiscount.toFixed(2)}</div></div>
          <div><div className="text-muted-foreground text-xs">Final Total</div><div className="font-extrabold text-lg">${total.toFixed(2)}</div></div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div><Label>Deposit ($)</Label><Input type="number" value={v.deposit} onChange={(e) => setV({ ...v, deposit: e.target.value })} /></div>
          <div><Label>Materials</Label><Input value={v.materials} onChange={(e) => setV({ ...v, materials: e.target.value })} /></div>
        </div>
        <div><Label>Terms</Label><Textarea rows={2} value={v.terms} onChange={(e) => setV({ ...v, terms: e.target.value })} /></div>
        <div><Label>Customer phone (for SMS)</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
      </Card>

      <Card className="p-5">
        <h2 className="font-bold mb-2">Preview (text)</h2>
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

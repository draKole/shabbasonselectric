import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAllocationPresets, type Preset, type Bucket } from "@/lib/useAllocations";
import { useGlobalSettings, saveGlobalSettings, isYes, type GlobalSettings } from "@/lib/useGlobalSettings";
import { Plus, Trash2, Check, Star, ArrowUp, ArrowDown } from "lucide-react";

export default function AdminSettings() {
  const [busy, setBusy] = useState(false);
  const { presets, reload, active } = useAllocationPresets();
  const { settings, reload: reloadSettings } = useGlobalSettings();
  const [form, setForm] = useState<GlobalSettings>(settings);
  const [defaultPresetId, setDefaultPresetId] = useState<string>("");

  useEffect(() => { setForm(settings); }, [settings]);
  useEffect(() => { if (active && !defaultPresetId) setDefaultPresetId(active.id); }, [active, defaultPresetId]);

  function set<K extends keyof GlobalSettings>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function saveAll() {
    setBusy(true);
    const { error } = await saveGlobalSettings(form);
    if (defaultPresetId) {
      await supabase.from("allocation_presets").update({ is_active: false }).neq("id", defaultPresetId);
      await supabase.from("allocation_presets").update({ is_active: true }).eq("id", defaultPresetId);
    }
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Settings saved");
    reloadSettings();
    reload();
  }

  const [recalcing, setRecalcing] = useState(false);
  async function recalcAll() {
    setRecalcing(true);
    try {
      const { data: jobs } = await supabase.from("jobs").select("id");
      const { data: debts } = await supabase.from("debts").select("id");
      const jobIds = (jobs || []).map((j: any) => j.id);
      const debtIds = (debts || []).map((d: any) => d.id);
      // Recompute each job's totals + worker labor, and each debt
      await Promise.all([
        ...jobIds.map((id) => supabase.rpc("recompute_job_totals", { _job_id: id } as any)),
        ...jobIds.map((id) => supabase.rpc("recompute_job_worker_labor", { _job_id: id } as any)),
        ...debtIds.map((id) => supabase.rpc("recompute_debt_balance", { _debt_id: id } as any)),
      ]);
      toast.success(`Recalculated ${jobIds.length} jobs and ${debtIds.length} debts`);
    } catch (e: any) {
      toast.error(e.message || "Recalc failed");
    } finally {
      setRecalcing(false);
    }
  }

  return (
    <div className="container-tight py-6 max-w-3xl space-y-6">
      <h1 className="text-2xl font-extrabold">Settings</h1>

      <Card className="p-5 space-y-4">
        <div>
          <h2 className="font-bold">Business Info</h2>
          <p className="text-xs text-muted-foreground">Used in estimates, review requests, and the public site copy.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label>Business Name</Label><Input value={form.business_name} onChange={(e) => set("business_name", e.target.value)} /></div>
          <div><Label>Business Phone</Label><Input value={form.business_phone} onChange={(e) => set("business_phone", e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>Business Address (optional)</Label><Input value={form.business_address} onChange={(e) => set("business_address", e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>Google Review Link</Label><Input value={form.google_review_url} onChange={(e) => set("google_review_url", e.target.value)} placeholder="https://g.page/r/.../review" /></div>
          <div className="sm:col-span-2"><Label>Review Request Text</Label><Textarea value={form.review_request_text} onChange={(e) => set("review_request_text", e.target.value)} rows={2} /></div>
          <div className="sm:col-span-2"><Label>Estimate Default Terms</Label><Textarea value={form.estimate_default_terms} onChange={(e) => set("estimate_default_terms", e.target.value)} rows={3} /></div>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <div>
          <h2 className="font-bold">Money Defaults & Worker Burden</h2>
          <p className="text-xs text-muted-foreground">Defaults pre-fill new jobs/workers. Burden % is for business profit planning, not payroll filing.</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div><Label>Default Hourly Rate ($)</Label><Input type="number" step="1" value={form.default_hourly_rate} onChange={(e) => set("default_hourly_rate", e.target.value)} /></div>
          <div><Label>Default Tax %</Label><Input type="number" step="0.1" value={form.default_tax_pct} onChange={(e) => set("default_tax_pct", e.target.value)} /></div>
          <div><Label>Worker Burden %</Label><Input type="number" step="0.1" value={form.default_burden_pct} onChange={(e) => set("default_burden_pct", e.target.value)} /></div>
          <div><Label>Workers Comp %</Label><Input type="number" step="0.1" value={form.default_workers_comp_pct} onChange={(e) => set("default_workers_comp_pct", e.target.value)} /></div>
          <div><Label>Insurance %</Label><Input type="number" step="0.1" value={form.default_insurance_pct} onChange={(e) => set("default_insurance_pct", e.target.value)} /></div>
          <div><Label>PPE / Tools $/mo per worker</Label><Input type="number" step="1" value={form.default_ppe_monthly} onChange={(e) => set("default_ppe_monthly", e.target.value)} /></div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t">
          <label className="flex items-center justify-between rounded-md border border-border p-3 cursor-pointer">
            <div>
              <div className="font-semibold text-sm">Include burden in Reports?</div>
              <div className="text-xs text-muted-foreground">Show true worker cost on Reports.</div>
            </div>
            <Switch checked={isYes(form.burden_in_reports)} onCheckedChange={(c) => set("burden_in_reports", c ? "yes" : "no")} />
          </label>
          <label className="flex items-center justify-between rounded-md border border-border p-3 cursor-pointer">
            <div>
              <div className="font-semibold text-sm">Include burden in Job Profit?</div>
              <div className="text-xs text-muted-foreground">Subtract true worker cost from net profit.</div>
            </div>
            <Switch checked={isYes(form.burden_in_profit)} onCheckedChange={(c) => set("burden_in_profit", c ? "yes" : "no")} />
          </label>
        </div>
        <div>
          <Label>Default Allocation Preset</Label>
          <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={defaultPresetId} onChange={(e) => setDefaultPresetId(e.target.value)}>
            {presets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <Button onClick={saveAll} disabled={busy}>{busy ? "Saving..." : "Save Settings"}</Button>
      </Card>

      <Card className="p-5 space-y-4">
        <div>
          <h2 className="font-bold">Owner Pay (Owner-Worker)</h2>
          <p className="text-xs text-muted-foreground">You can pay yourself from the business as an owner-worker. This shows separately from regular worker labor.</p>
        </div>
        <OwnerPicker value={form.owner_worker_id} onChange={(v) => set("owner_worker_id", v)} />
        <div className="grid sm:grid-cols-3 gap-3">
          <div><Label>Owner hourly rate ($)</Label><Input type="number" value={form.owner_default_hourly} onChange={(e) => set("owner_default_hourly", e.target.value)} /></div>
          <div><Label>Weekly salary/draw ($)</Label><Input type="number" value={form.owner_weekly_salary} onChange={(e) => set("owner_weekly_salary", e.target.value)} /></div>
          <div><Label>Pay day</Label>
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.owner_pay_day} onChange={(e) => set("owner_pay_day", e.target.value)}>
              {["monday","tuesday","wednesday","thursday","friday","saturday","sunday"].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div><Label>Pay mode</Label>
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.owner_pay_mode} onChange={(e) => set("owner_pay_mode", e.target.value)}>
              <option value="hourly">Hourly only</option>
              <option value="salary">Weekly salary only</option>
              <option value="both">Both (hourly + weekly draw)</option>
            </select>
          </div>
          <label className="sm:col-span-2 flex items-center justify-between rounded-md border border-border p-3 cursor-pointer">
            <div><div className="font-semibold text-sm">Owner pay reduces business profit?</div>
              <div className="text-xs text-muted-foreground">Recommended ON — owner pay is a real business expense.</div></div>
            <Switch checked={isYes(form.owner_pay_reduces_profit)} onCheckedChange={(c) => set("owner_pay_reduces_profit", c ? "yes" : "no")} />
          </label>
        </div>
        <Button onClick={saveAll} disabled={busy} variant="outline">Save Owner Settings</Button>
      </Card>

      <Card className="p-5 space-y-4">
        <div>
          <h2 className="font-bold">Estimate Defaults</h2>
          <p className="text-xs text-muted-foreground">Controls what shows on customer-facing estimates.</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div><Label>Valid days</Label><Input type="number" value={form.estimate_valid_days} onChange={(e) => set("estimate_valid_days", e.target.value)} /></div>
          <div><Label>Default deposit %</Label><Input type="number" value={form.estimate_default_deposit_pct} onChange={(e) => set("estimate_default_deposit_pct", e.target.value)} /></div>
          <div><Label>Discount label</Label><Input value={form.estimate_discount_label} onChange={(e) => set("estimate_discount_label", e.target.value)} /></div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {([
            ["estimate_show_original","Show original price"],
            ["estimate_show_discount","Show discount line"],
            ["estimate_show_final","Show final agreed price"],
            ["estimate_show_materials_note","Show materials note"],
          ] as [keyof GlobalSettings, string][]).map(([k,label]) => (
            <label key={k} className="flex items-center justify-between rounded-md border border-border p-3 cursor-pointer">
              <div className="font-semibold text-sm">{label}</div>
              <Switch checked={isYes(form[k])} onCheckedChange={(c) => set(k, c ? "yes" : "no")} />
            </label>
          ))}
        </div>
        <Button onClick={saveAll} disabled={busy} variant="outline">Save Estimate Settings</Button>
      </Card>

      <Card className="p-5 space-y-2">
        <h2 className="font-bold">Recalculate All Totals</h2>
        <p className="text-xs text-muted-foreground">If money numbers ever look stale, this safely recomputes job totals (paid/balance/labor) and debt balances from the actual transactions. Does not delete any data.</p>
        <Button onClick={recalcAll} disabled={recalcing} variant="outline">{recalcing ? "Recalculating..." : "Recalculate Now"}</Button>
      </Card>

      <Card className="p-5 space-y-4">
        <div>
          <h2 className="font-bold">Money Allocation Presets</h2>
          <p className="text-xs text-muted-foreground mt-1">
            These splits apply to <b>net profit</b> (money you keep after job expenses), not gross income. The active preset is shown on the Money Tracker.
          </p>
        </div>
        {presets.map((p) => (
          <PresetEditor key={p.id} preset={p} onChange={reload} />
        ))}
        <Button variant="outline" onClick={async () => {
          await supabase.from("allocation_presets").insert({ name: "New Preset", buckets: [{ name: "Bucket 1", percent: 100, color: "primary", enabled: true }] as any });
          reload();
        }} className="gap-1"><Plus className="h-4 w-4" /> Add Preset</Button>
      </Card>
    </div>
  );
}

function PresetEditor({ preset, onChange }: { preset: Preset; onChange: () => void }) {
  const [name, setName] = useState(preset.name);
  const [buckets, setBuckets] = useState<Bucket[]>(preset.buckets || []);
  const total = buckets.reduce((s, b) => s + (b.enabled === false ? 0 : Number(b.percent) || 0), 0);
  const valid = total === 100;

  function update(i: number, patch: Partial<Bucket>) {
    setBuckets((cur) => cur.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  }
  function move(i: number, dir: -1 | 1) {
    setBuckets((cur) => {
      const next = [...cur];
      const j = i + dir;
      if (j < 0 || j >= next.length) return cur;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  function add() { setBuckets([...buckets, { name: "New Bucket", percent: 0, color: "muted", enabled: true }]); }
  function remove(i: number) { setBuckets(buckets.filter((_, idx) => idx !== i)); }

  async function save() {
    if (!valid) return toast.error("Allocations must equal 100% before saving.");
    const { error } = await supabase.from("allocation_presets").update({ name, buckets: buckets as any }).eq("id", preset.id);
    if (error) return toast.error(error.message);
    toast.success("Preset saved");
    onChange();
}

function OwnerPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [workers, setWorkers] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("workers").select("id, full_name, is_owner").order("full_name").then(({ data }) => setWorkers(data || []));
  }, []);
  return (
    <div>
      <Label>Which worker is the owner?</Label>
      <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={value} onChange={async (e) => {
        const id = e.target.value;
        onChange(id);
        // Sync workers.is_owner so labor split is accurate
        if (id) {
          await supabase.from("workers").update({ is_owner: false }).neq("id", id);
          await supabase.from("workers").update({ is_owner: true, worker_type: "owner" }).eq("id", id);
        }
      }}>
        <option value="">— None —</option>
        {workers.map((w) => <option key={w.id} value={w.id}>{w.full_name}{w.is_owner ? " (current owner)" : ""}</option>)}
      </select>
      <p className="text-xs text-muted-foreground mt-1">If the owner-worker isn't in the list, add them in Workers first.</p>
    </div>
  );
}
  async function makeActive() {
    await supabase.from("allocation_presets").update({ is_active: false }).neq("id", preset.id);
    await supabase.from("allocation_presets").update({ is_active: true }).eq("id", preset.id);
    toast.success(`${name} is now active`);
    onChange();
  }
  async function del() {
    if (!confirm(`Delete preset "${preset.name}"?`)) return;
    await supabase.from("allocation_presets").delete().eq("id", preset.id);
    onChange();
  }

  return (
    <div className={`rounded-md border p-3 ${preset.is_active ? "border-success/50 bg-success/5" : "border-border"}`}>
      <div className="flex items-center gap-2 mb-3">
        <Input value={name} onChange={(e) => setName(e.target.value)} className="font-bold" />
        {preset.is_active ? (
          <span className="text-xs px-2 py-1 rounded bg-success text-success-foreground flex items-center gap-1"><Star className="h-3 w-3" /> Active</span>
        ) : (
          <Button size="sm" variant="outline" onClick={makeActive}>Make Active</Button>
        )}
        <Button size="sm" variant="outline" onClick={del}><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>

      <div className="space-y-2">
        {buckets.map((b, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-center">
            <Input className="col-span-5" value={b.name} onChange={(e) => update(i, { name: e.target.value })} />
            <Input className="col-span-3" type="number" value={b.percent} onChange={(e) => update(i, { percent: Number(e.target.value) })} />
            <select className="col-span-2 h-9 rounded-md border border-input bg-background px-2 text-sm" value={b.color || "muted"} onChange={(e) => update(i, { color: e.target.value })}>
              <option value="primary">Primary</option><option value="secondary">Secondary</option><option value="success">Success</option><option value="accent">Accent</option><option value="destructive">Destructive</option><option value="muted">Muted</option>
            </select>
            <div className="col-span-2 flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => move(i, -1)}><ArrowUp className="h-3 w-3" /></Button>
              <Button size="sm" variant="ghost" onClick={() => move(i, 1)}><ArrowDown className="h-3 w-3" /></Button>
              <Button size="sm" variant="ghost" onClick={() => remove(i)}><Trash2 className="h-3 w-3" /></Button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className={`text-sm font-semibold ${valid ? "text-success" : "text-destructive"}`}>
          Total: {total}% {valid ? "✓" : "(must equal 100%)"}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={add} className="gap-1"><Plus className="h-3.5 w-3.5" /> Bucket</Button>
          <Button size="sm" onClick={save} disabled={!valid} className="gap-1"><Check className="h-3.5 w-3.5" /> Save</Button>
        </div>
      </div>
    </div>
  );
}

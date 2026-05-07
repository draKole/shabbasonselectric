import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { setAppSetting } from "@/lib/useAppSettings";
import { toast } from "sonner";
import { useAllocationPresets, type Preset, type Bucket } from "@/lib/useAllocations";
import { Plus, Trash2, Check, Star, ArrowUp, ArrowDown } from "lucide-react";

export default function AdminSettings() {
  const [google, setGoogle] = useState("");
  const [busy, setBusy] = useState(false);
  const { presets, reload } = useAllocationPresets();

  useEffect(() => {
    supabase.from("app_settings").select("value").eq("key", "google_review_url").maybeSingle()
      .then(({ data }) => setGoogle(data?.value || ""));
  }, []);

  async function save() {
    setBusy(true);
    const { error } = await setAppSetting("google_review_url", google.trim());
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
  }

  return (
    <div className="container-tight py-6 max-w-3xl space-y-6">
      <h1 className="text-2xl font-extrabold">Settings</h1>

      <Card className="p-5 space-y-3">
        <h2 className="font-bold">Google Review Link</h2>
        <div>
          <Label>URL</Label>
          <Input value={google} onChange={(e) => setGoogle(e.target.value)} placeholder="https://g.page/r/.../review" />
          <p className="text-xs text-muted-foreground mt-1">Used everywhere the site shows "Leave a Google Review".</p>
        </div>
        <Button onClick={save} disabled={busy}>{busy ? "Saving..." : "Save"}</Button>
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

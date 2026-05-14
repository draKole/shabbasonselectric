import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, Plus, AlertTriangle, Pencil } from "lucide-react";
import { estMaterials, type HistoricalIncome } from "@/lib/useHistoricalIncome";

function fmt(n: number) { return Number(n || 0).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }); }

export default function AdminHistoricalIncome() {
  const [items, setItems] = useState<HistoricalIncome[]>([]);
  const [editing, setEditing] = useState<HistoricalIncome | null>(null);
  const [form, setForm] = useState({
    entry_date: new Date().toISOString().slice(0, 10),
    customer_name: "", description: "", amount: "",
    scope: "business" as "business" | "personal",
    already_spent: true, count_in_ytd: true, count_in_cash: false, notes: "",
    est_materials_pct: "70", est_materials_amount: "",
  });

  async function load() {
    const { data } = await (supabase as any).from("historical_income").select("*").order("entry_date", { ascending: false });
    setItems((data as any) || []);
  }
  useEffect(() => { load(); }, []);

  async function add() {
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) return toast.error("Enter amount");
    const { error } = await (supabase as any).from("historical_income").insert({
      entry_date: form.entry_date, customer_name: form.customer_name || null,
      description: form.description || null, amount: amt, scope: form.scope, source: "manual_screenshot_catchup",
      already_spent: form.already_spent, count_in_ytd: form.count_in_ytd,
      count_in_cash: form.already_spent ? false : form.count_in_cash,
      notes: form.notes || null,
      est_materials_pct: parseFloat(form.est_materials_pct) || 70,
      est_materials_amount: form.est_materials_amount ? parseFloat(form.est_materials_amount) : null,
    });
    if (error) return toast.error(error.message);
    setForm({ ...form, customer_name: "", description: "", amount: "", notes: "", est_materials_amount: "" });
    toast.success("Added"); load();
  }
  async function del(id: string) {
    if (!confirm("Delete?")) return;
    await (supabase as any).from("historical_income").delete().eq("id", id);
    load();
  }
  async function saveEdit() {
    if (!editing) return;
    const { error } = await (supabase as any).from("historical_income").update({
      entry_date: editing.entry_date, customer_name: editing.customer_name,
      description: editing.description, amount: Number(editing.amount) || 0,
      already_spent: editing.already_spent, count_in_ytd: editing.count_in_ytd,
      count_in_cash: editing.already_spent ? false : editing.count_in_cash,
      notes: editing.notes,
      est_materials_pct: Number(editing.est_materials_pct) || 70,
      est_materials_amount: editing.est_materials_amount,
    }).eq("id", editing.id);
    if (error) return toast.error(error.message);
    setEditing(null); load();
  }

  const totalYtd = items.filter(i => i.count_in_ytd).reduce((s, i) => s + Number(i.amount || 0), 0);
  const totalCash = items.filter(i => i.count_in_cash).reduce((s, i) => s + Number(i.amount || 0), 0);
  const totalEstMats = items.filter(i => i.count_in_ytd).reduce((s, i) => s + estMaterials(i), 0);

  // Group by month
  const monthMap = new Map<string, HistoricalIncome[]>();
  items.forEach((i) => {
    const k = (i.entry_date || "").slice(0, 7);
    if (!monthMap.has(k)) monthMap.set(k, []);
    monthMap.get(k)!.push(i);
  });
  const months = Array.from(monthMap.keys()).sort().reverse();

  return (
    <div className="container-tight py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">Historical Income Catch-up</h1>
        <p className="text-xs text-muted-foreground">Log past income from screenshots so YTD reports stay accurate. Items marked <b>Already spent</b> count for YTD but do NOT inflate current cash.</p>
      </div>

      <div className="rounded-md border border-warning/40 bg-warning/10 p-3 flex items-start gap-2 text-xs">
        <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
        <div>
          <b>Use this only for old catch-up money.</b> New money should be entered through Jobs and Payments. Materials should come from Job Materials. Don't keep adding monthly totals here.
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Card className="p-4"><div className="text-xs text-muted-foreground">YTD imported income</div><div className="text-2xl font-extrabold">{fmt(totalYtd)}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Counts in current cash</div><div className="text-2xl font-extrabold">{fmt(totalCash)}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Est. historical materials</div><div className="text-2xl font-extrabold">{fmt(totalEstMats)}</div></Card>
      </div>

      <Card className="p-4 space-y-3">
        <h2 className="font-bold flex items-center gap-2"><Plus className="h-4 w-4" /> Add Catch-up Entry</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <div><Label>Date</Label><Input type="date" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} /></div>
          <div><Label>Customer / source</Label><Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} placeholder="(optional)" /></div>
          <div><Label>Amount</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
          <div className="sm:col-span-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div><Label>Scope</Label>
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value as any })}>
              <option value="business">Business</option><option value="personal">Personal</option>
            </select>
          </div>
          <div><Label>Est. materials %</Label><Input type="number" step="1" value={form.est_materials_pct} onChange={(e) => setForm({ ...form, est_materials_pct: e.target.value })} /></div>
          <div><Label>Override $ (optional)</Label><Input type="number" step="0.01" value={form.est_materials_amount} onChange={(e) => setForm({ ...form, est_materials_amount: e.target.value })} placeholder="auto from %" /></div>
          <div />
          <label className="flex items-center justify-between rounded-md border p-2 text-sm"><span>Already spent</span><Switch checked={form.already_spent} onCheckedChange={(c) => setForm({ ...form, already_spent: c, count_in_cash: c ? false : form.count_in_cash })} /></label>
          <label className="flex items-center justify-between rounded-md border p-2 text-sm"><span>Count in YTD</span><Switch checked={form.count_in_ytd} onCheckedChange={(c) => setForm({ ...form, count_in_ytd: c })} /></label>
          <label className="flex items-center justify-between rounded-md border p-2 text-sm"><span>Count in current cash</span><Switch disabled={form.already_spent} checked={form.count_in_cash} onCheckedChange={(c) => setForm({ ...form, count_in_cash: c })} /></label>
          <div className="sm:col-span-3"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <p className="text-[11px] text-muted-foreground">Estimated materials — historical catch-up, verify later.</p>
        <Button onClick={add}>Add Entry</Button>
      </Card>

      {months.map((mk) => {
        const list = monthMap.get(mk)!;
        const monthTotal = list.reduce((s, i) => s + Number(i.amount || 0), 0);
        const monthMats = list.reduce((s, i) => s + estMaterials(i), 0);
        return (
          <Card key={mk} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold">{mk} <span className="text-xs text-muted-foreground font-normal">· {list.length} entries</span></h2>
              <div className="text-xs text-muted-foreground">Income {fmt(monthTotal)} · Est. materials {fmt(monthMats)} · Est. profit {fmt(monthTotal - monthMats)}</div>
            </div>
            <div className="space-y-1">
              {list.map((i) => (
                <div key={i.id} className="flex items-center justify-between border-b border-border py-2 text-sm gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{i.entry_date} · {fmt(Number(i.amount))} <span className="text-[10px] uppercase text-muted-foreground">{i.scope}</span></div>
                    <div className="text-xs text-muted-foreground truncate">{i.customer_name || ""}{i.description ? ` — ${i.description}` : ""}</div>
                    <div className="text-[10px] text-muted-foreground">est mats {fmt(estMaterials(i))} ({i.est_materials_pct}%) · {i.already_spent ? "spent · " : ""}{i.count_in_ytd ? "YTD ✓ " : ""}{i.count_in_cash ? "Cash ✓" : ""}</div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(i)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => del(i.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        );
      })}
      {items.length === 0 && <Card className="p-6 text-center text-muted-foreground text-sm">No entries yet.</Card>}

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <Card className="bg-background w-full max-w-md p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold">Edit entry</h3>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Date</Label><Input type="date" value={editing.entry_date} onChange={(e) => setEditing({ ...editing, entry_date: e.target.value })} /></div>
              <div><Label>Amount</Label><Input type="number" value={editing.amount as any} onChange={(e) => setEditing({ ...editing, amount: Number(e.target.value) })} /></div>
              <div><Label>Customer</Label><Input value={editing.customer_name || ""} onChange={(e) => setEditing({ ...editing, customer_name: e.target.value })} /></div>
              <div><Label>Description</Label><Input value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
              <div><Label>Est mats %</Label><Input type="number" value={editing.est_materials_pct as any} onChange={(e) => setEditing({ ...editing, est_materials_pct: Number(e.target.value) })} /></div>
              <div><Label>Override $</Label><Input type="number" value={editing.est_materials_amount ?? "" as any} onChange={(e) => setEditing({ ...editing, est_materials_amount: e.target.value === "" ? null : Number(e.target.value) })} placeholder="auto" /></div>
            </div>
            <label className="flex items-center justify-between rounded-md border p-2 text-sm"><span>Already spent</span><Switch checked={editing.already_spent} onCheckedChange={(c) => setEditing({ ...editing, already_spent: c, count_in_cash: c ? false : editing.count_in_cash })} /></label>
            <Textarea rows={2} value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} placeholder="Notes" />
            <div className="flex gap-2">
              <Button onClick={saveEdit} className="flex-1">Save</Button>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

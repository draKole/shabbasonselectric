import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

function fmt(n: number) { return Number(n || 0).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }); }

export default function AdminHistoricalIncome() {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({
    entry_date: new Date().toISOString().slice(0, 10),
    customer_name: "", description: "", amount: "",
    scope: "business" as "business" | "personal",
    already_spent: true, count_in_ytd: true, count_in_cash: false, notes: "",
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
      description: form.description || null, amount: amt, scope: form.scope, source: "manual_import",
      already_spent: form.already_spent, count_in_ytd: form.count_in_ytd, count_in_cash: form.count_in_cash,
      notes: form.notes || null,
    });
    if (error) return toast.error(error.message);
    setForm({ ...form, customer_name: "", description: "", amount: "", notes: "" });
    toast.success("Added"); load();
  }
  async function del(id: string) {
    if (!confirm("Delete?")) return;
    await (supabase as any).from("historical_income").delete().eq("id", id);
    load();
  }

  const totalYtd = items.filter(i => i.count_in_ytd).reduce((s, i) => s + Number(i.amount || 0), 0);
  const totalCash = items.filter(i => i.count_in_cash).reduce((s, i) => s + Number(i.amount || 0), 0);

  return (
    <div className="container-tight py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">Historical Income Import</h1>
        <p className="text-xs text-muted-foreground">Log past income from screenshots or manual records so YTD reports stay accurate. Items marked <b>Already spent</b> still count for YTD but do NOT inflate current cash.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Card className="p-4"><div className="text-xs text-muted-foreground">YTD imported income</div><div className="text-2xl font-extrabold">{fmt(totalYtd)}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Counts in current cash</div><div className="text-2xl font-extrabold">{fmt(totalCash)}</div></Card>
      </div>

      <Card className="p-4 space-y-3">
        <h2 className="font-bold flex items-center gap-2"><Plus className="h-4 w-4" /> Add Income Entry</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <div><Label>Date / month</Label><Input type="date" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} /></div>
          <div><Label>Customer / source</Label><Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} placeholder="(optional)" /></div>
          <div><Label>Amount</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
          <div className="sm:col-span-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div><Label>Scope</Label>
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value as any })}>
              <option value="business">Business</option><option value="personal">Personal</option>
            </select>
          </div>
          <label className="flex items-center justify-between rounded-md border p-2 text-sm"><span>Already spent</span><Switch checked={form.already_spent} onCheckedChange={(c) => setForm({ ...form, already_spent: c, count_in_cash: c ? false : form.count_in_cash })} /></label>
          <label className="flex items-center justify-between rounded-md border p-2 text-sm"><span>Count in YTD</span><Switch checked={form.count_in_ytd} onCheckedChange={(c) => setForm({ ...form, count_in_ytd: c })} /></label>
          <label className="flex items-center justify-between rounded-md border p-2 text-sm"><span>Count in current cash</span><Switch checked={form.count_in_cash} onCheckedChange={(c) => setForm({ ...form, count_in_cash: c })} /></label>
          <div className="sm:col-span-3"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <Button onClick={add}>Add Entry</Button>
      </Card>

      <Card className="p-4">
        <h2 className="font-bold mb-2">Entries ({items.length})</h2>
        <div className="space-y-1">
          {items.map((i) => (
            <div key={i.id} className="flex items-center justify-between border-b border-border py-2 text-sm">
              <div>
                <div className="font-semibold">{i.entry_date} · {fmt(i.amount)} · <span className="text-xs uppercase text-muted-foreground">{i.scope}</span></div>
                <div className="text-xs text-muted-foreground">{i.customer_name || ""}{i.description ? ` — ${i.description}` : ""}</div>
                <div className="text-[10px] text-muted-foreground">{i.already_spent ? "Already spent · " : ""}{i.count_in_ytd ? "YTD ✓ " : ""}{i.count_in_cash ? "Cash ✓" : ""}{i.notes ? ` · ${i.notes}` : ""}</div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => del(i.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
            </div>
          ))}
          {items.length === 0 && <p className="text-xs text-muted-foreground">No entries yet.</p>}
        </div>
      </Card>
    </div>
  );
}

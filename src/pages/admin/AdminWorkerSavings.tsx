import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useSavingsLedger, recordSavingsTxn } from "@/lib/useSavingsLedger";
import { useGlobalSettings } from "@/lib/useGlobalSettings";
import { PiggyBank } from "lucide-react";

function fmt(n: number) { return Number(n || 0).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }); }

export default function AdminWorkerSavings() {
  const { settings } = useGlobalSettings();
  const [workers, setWorkers] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const { txns, totalsFor, reload } = useSavingsLedger();
  const selected = workers.find(w => w.id === selectedId);

  async function loadWorkers() {
    const { data } = await supabase.from("workers").select("*").eq("active", true).order("full_name");
    setWorkers(data || []);
    if (!selectedId && data?.[0]) setSelectedId(data[0].id);
  }
  useEffect(() => { loadWorkers(); }, []);

  async function saveSettings(patch: any) {
    if (!selected) return;
    const { error } = await (supabase as any).from("workers").update(patch).eq("id", selected.id);
    if (error) return toast.error(error.message);
    toast.success("Saved"); loadWorkers();
  }

  async function addTxn(txn_type: "released" | "sent" | "adjustment" | "correction", amount: number, notes: string, method?: string) {
    if (!selected) return;
    if (!amount) return toast.error("Enter amount");
    const { error } = await recordSavingsTxn({ worker_id: selected.id, txn_type, amount, notes, method });
    if (error) return toast.error(error.message);
    toast.success("Recorded"); reload();
  }

  const t = selected ? totalsFor(selected.id) : null;
  const year = new Date().getFullYear();
  const ytdT = selected ? totalsFor(selected.id, `${year}-01-01`, `${year}-12-31`) : null;
  const wTxns = selected ? txns.filter(x => x.worker_id === selected.id) : [];

  const [actionForm, setActionForm] = useState({ type: "released" as const, amount: "", notes: "", method: "cash" });

  return (
    <div className="container-tight py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2"><PiggyBank className="h-6 w-6" /> Employee Savings</h1>
          <p className="text-xs text-muted-foreground">Worker-owned savings deduction. Not retirement, not company profit, not forfeitable.</p>
        </div>
      </div>

      <Card className="p-3">
        <Label className="text-xs">Worker</Label>
        <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={selectedId} onChange={e => setSelectedId(e.target.value)}>
          {workers.map(w => <option key={w.id} value={w.id}>{w.full_name}{w.savings_enabled ? " · savings ON" : ""}</option>)}
        </select>
      </Card>

      {selected && t && ytdT && (
        <>
          <div className="grid sm:grid-cols-4 gap-3">
            <Stat label="Current savings balance (owed to worker)" value={fmt(t.balance)} highlight />
            <Stat label={`Withheld YTD ${year}`} value={fmt(ytdT.withheld)} />
            <Stat label="Released YTD" value={fmt(ytdT.released)} />
            <Stat label="Sent to destination YTD" value={fmt(ytdT.sent)} />
          </div>

          <Card className="p-4 space-y-3">
            <h2 className="font-bold">Deduction settings</h2>
            {!selected.savings_auth_received && selected.savings_enabled && (
              <div className="rounded-md bg-destructive/10 border border-destructive/40 p-2 text-xs text-destructive">
                ⚠ Authorization NOT received — savings deduction should not be applied without written authorization.
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="flex items-center justify-between rounded-md border border-border p-3">
                <div><div className="font-semibold text-sm">Savings enabled</div></div>
                <Switch checked={!!selected.savings_enabled} onCheckedChange={c => saveSettings({ savings_enabled: c })} />
              </label>
              <label className="flex items-center justify-between rounded-md border border-border p-3">
                <div><div className="font-semibold text-sm">Authorization received</div>
                  <div className="text-xs text-muted-foreground">Written authorization from worker</div></div>
                <Switch checked={!!selected.savings_auth_received} onCheckedChange={c => saveSettings({ savings_auth_received: c, savings_auth_date: c ? new Date().toISOString().slice(0,10) : null })} />
              </label>
              <div>
                <Label>Type</Label>
                <Select value={selected.savings_type || "percent"} onValueChange={v => saveSettings({ savings_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percent of gross</SelectItem>
                    <SelectItem value="fixed">Fixed amount per pay period</SelectItem>
                    <SelectItem value="manual">Manual amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Percent (%)</Label><Input type="number" step="0.1" defaultValue={selected.savings_pct} onBlur={e => saveSettings({ savings_pct: Number(e.target.value) })} /></div>
              <div><Label>Fixed amount ($)</Label><Input type="number" step="0.01" defaultValue={selected.savings_fixed} onBlur={e => saveSettings({ savings_fixed: Number(e.target.value) })} /></div>
              <div><Label>Destination</Label><Input defaultValue={selected.savings_destination || ""} onBlur={e => saveSettings({ savings_destination: e.target.value })} placeholder="e.g. Personal savings account" /></div>
              <div className="sm:col-span-2"><Label>Notes</Label><Textarea rows={2} defaultValue={selected.savings_notes || ""} onBlur={e => saveSettings({ savings_notes: e.target.value })} /></div>
            </div>
            <p className="text-[11px] text-muted-foreground italic border-t pt-2">{settings.savings_policy_text}</p>
          </Card>

          <Card className="p-4 space-y-3">
            <h2 className="font-bold">Record transaction (release / send / adjust)</h2>
            <div className="grid sm:grid-cols-4 gap-2">
              <div><Label>Type</Label>
                <Select value={actionForm.type} onValueChange={(v: any) => setActionForm({ ...actionForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="released">Released to worker</SelectItem>
                    <SelectItem value="sent">Sent to destination</SelectItem>
                    <SelectItem value="adjustment">Adjustment (+)</SelectItem>
                    <SelectItem value="correction">Correction (−)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Amount</Label><Input type="number" step="0.01" value={actionForm.amount} onChange={e => setActionForm({ ...actionForm, amount: e.target.value })} /></div>
              <div><Label>Method</Label><Input value={actionForm.method} onChange={e => setActionForm({ ...actionForm, method: e.target.value })} /></div>
              <div className="flex items-end">
                <Button className="w-full" onClick={async () => {
                  await addTxn(actionForm.type as any, Number(actionForm.amount), actionForm.notes, actionForm.method);
                  setActionForm({ ...actionForm, amount: "", notes: "" });
                }}>Record</Button>
              </div>
              <div className="sm:col-span-4"><Label>Notes</Label><Input value={actionForm.notes} onChange={e => setActionForm({ ...actionForm, notes: e.target.value })} /></div>
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="font-bold mb-2">Transaction history</h2>
            <div className="text-sm divide-y divide-border">
              {wTxns.length === 0 && <p className="text-xs text-muted-foreground py-2">No transactions yet.</p>}
              {wTxns.map(x => (
                <div key={x.id} className="py-2 flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{x.txn_type} · {fmt(Number(x.amount))}</div>
                    <div className="text-xs text-muted-foreground">{x.entry_date}{x.method ? ` · ${x.method}` : ""}{x.notes ? ` · ${x.notes}` : ""}{x.paystub_id ? ` · from paystub` : ""}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: any) {
  return (
    <Card className={`p-3 ${highlight ? "bg-success/5 border-success/40" : ""}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-xl font-extrabold ${highlight ? "text-success" : ""}`}>{value}</div>
    </Card>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const METHODS = ["cash","Zelle","Cash App","Apple Pay","check","Chase","card","other"];

export default function JobPayments({ jobId, jobTotal, amountPaid, balance }: { jobId: string; jobTotal: number; amountPaid: number; balance: number }) {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({ amount: "", method: "cash", paid_on: new Date().toISOString().slice(0,10), notes: "", is_deposit: false });

  async function load() {
    const { data } = await supabase.from("job_payments").select("*").eq("job_id", jobId).order("paid_on", { ascending: false });
    setItems(data || []);
  }
  useEffect(() => { load(); }, [jobId]);

  async function add() {
    if (!form.amount) return toast.error("Amount required");
    const { error } = await supabase.from("job_payments").insert({
      job_id: jobId,
      amount: Number(form.amount),
      method: form.method,
      paid_on: form.paid_on,
      notes: form.notes || null,
      is_deposit: form.is_deposit,
    });
    if (error) return toast.error(error.message);
    setForm({ amount: "", method: "cash", paid_on: new Date().toISOString().slice(0,10), notes: "", is_deposit: false });
    toast.success("Payment recorded");
    load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("job_payments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  // Suggested split (May emergency mode)
  const amt = Number(form.amount) || 0;
  const split = { debt: amt * 0.75, taxes: amt * 0.10, bills: amt * 0.15 };

  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">Payments</h2>
        <div className="text-xs text-muted-foreground">
          Total: <b className="text-foreground">${jobTotal.toFixed(2)}</b> · Paid: <b className="text-foreground">${amountPaid.toFixed(2)}</b> · Balance: <b className="text-foreground">${balance.toFixed(2)}</b>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Open Balance = Job Total minus Amount Paid. Recording payments updates this automatically.</p>

      <div className="grid grid-cols-2 gap-2">
        <div><Label>Amount</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
        <div><Label>Method</Label>
          <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Date</Label><Input type="date" value={form.paid_on} onChange={(e) => setForm({ ...form, paid_on: e.target.value })} /></div>
        <div className="flex items-end gap-2">
          <Checkbox id="dep" checked={form.is_deposit} onCheckedChange={(v) => setForm({ ...form, is_deposit: !!v })} />
          <Label htmlFor="dep" className="cursor-pointer">This is a deposit</Label>
        </div>
        <div className="col-span-2"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
      </div>

      {amt > 0 && (
        <div className="rounded-md bg-muted p-3 text-xs space-y-0.5">
          <div className="font-semibold">Suggested split (May emergency mode):</div>
          <div>Emergency debt 75%: <b>${split.debt.toFixed(2)}</b></div>
          <div>Taxes 10%: <b>${split.taxes.toFixed(2)}</b></div>
          <div>Survival bills 15%: <b>${split.bills.toFixed(2)}</b></div>
        </div>
      )}

      <Button onClick={add} className="gap-1"><Plus className="h-4 w-4" />Record payment</Button>

      <div className="divide-y divide-border">
        {items.map((i) => (
          <div key={i.id} className="py-2 flex items-center justify-between">
            <div className="text-sm">
              <div className="font-semibold">${Number(i.amount).toFixed(2)} <span className="text-muted-foreground font-normal">· {i.method}{i.is_deposit ? " · deposit" : ""}</span></div>
              <div className="text-xs text-muted-foreground">{i.paid_on}{i.notes ? ` · ${i.notes}` : ""}</div>
            </div>
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(i.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        {items.length === 0 && <div className="text-sm text-muted-foreground py-2">No payments yet.</div>}
      </div>
    </Card>
  );
}

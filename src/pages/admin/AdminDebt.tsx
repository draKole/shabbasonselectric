import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, DollarSign, Save } from "lucide-react";

type Debt = {
  id: string;
  name: string;
  starting_balance: number;
  current_balance: number;
  minimum_payment: number;
  due_date: string | null;
  interest_rate: number | null;
  priority: string;
  debt_type: string;
  notes: string | null;
  paid_off: boolean;
};
type Payment = { id: string; debt_id: string; amount: number; paid_on: string; method: string; notes: string | null };

const TYPES = ["credit card", "personal loan", "family debt", "business debt", "emergency debt", "vehicle", "other"];
const PRIORITIES = ["critical", "high", "normal", "low"];
const METHODS = ["cash", "card", "check", "zelle", "venmo", "cashapp", "transfer", "other"];

const empty: Partial<Debt> = { name: "", starting_balance: 0, minimum_payment: 0, priority: "normal", debt_type: "other" };

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default function AdminDebt() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Debt>>(empty);
  const [payOpen, setPayOpen] = useState(false);
  const [payDebt, setPayDebt] = useState<Debt | null>(null);
  const [payAmt, setPayAmt] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [payNotes, setPayNotes] = useState("");

  async function load() {
    const [{ data: d }, { data: p }] = await Promise.all([
      supabase.from("debts").select("*").order("priority"),
      supabase.from("debt_payments").select("*").order("paid_on", { ascending: false }),
    ]);
    setDebts((d as any) || []);
    setPayments((p as any) || []);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing.name) return toast.error("Name required");
    const start = Number(editing.starting_balance) || 0;
    const payload: any = {
      name: editing.name,
      starting_balance: start,
      current_balance: editing.id ? undefined : start,
      minimum_payment: Number(editing.minimum_payment) || 0,
      due_date: editing.due_date || null,
      interest_rate: editing.interest_rate ? Number(editing.interest_rate) : null,
      priority: editing.priority,
      debt_type: editing.debt_type,
      notes: editing.notes || null,
    };
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
    const { error } = editing.id
      ? await supabase.from("debts").update(payload).eq("id", editing.id)
      : await supabase.from("debts").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setOpen(false); setEditing(empty); load();
  }
  async function del(id: string) {
    if (!confirm("Delete this debt and all its payments?")) return;
    await supabase.from("debts").delete().eq("id", id);
    load();
  }
  async function logPayment() {
    if (!payDebt || !payAmt) return;
    const { error } = await supabase.from("debt_payments").insert({
      debt_id: payDebt.id,
      amount: Number(payAmt),
      method: payMethod,
      notes: payNotes || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Payment logged");
    setPayOpen(false); setPayAmt(""); setPayNotes(""); setPayDebt(null); load();
  }

  const total = debts.reduce((s, d) => s + Number(d.current_balance), 0);
  const totalStart = debts.reduce((s, d) => s + Number(d.starting_balance), 0);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const paidMonth = payments.filter((p) => p.paid_on >= monthStart).reduce((s, p) => s + Number(p.amount), 0);
  const next = debts.filter((d) => !d.paid_off && d.due_date).sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1))[0];

  return (
    <div className="container-tight py-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-extrabold">Debt Tracker</h1>
          <p className="text-sm text-muted-foreground">Pay it down. Track every payment.</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(empty); }}>
          <DialogTrigger asChild><Button className="gap-1"><Plus className="h-4 w-4" /> Add Debt</Button></DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing.id ? "Edit Debt" : "New Debt"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Starting Balance ($)</Label><Input type="number" value={editing.starting_balance ?? ""} onChange={(e) => setEditing({ ...editing, starting_balance: Number(e.target.value) })} /></div>
                <div><Label>Min Payment ($)</Label><Input type="number" value={editing.minimum_payment ?? ""} onChange={(e) => setEditing({ ...editing, minimum_payment: Number(e.target.value) })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Due Date</Label><Input type="date" value={editing.due_date || ""} onChange={(e) => setEditing({ ...editing, due_date: e.target.value })} /></div>
                <div><Label>Interest %</Label><Input type="number" value={editing.interest_rate ?? ""} onChange={(e) => setEditing({ ...editing, interest_rate: Number(e.target.value) })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Type</Label>
                  <Select value={editing.debt_type} onValueChange={(v) => setEditing({ ...editing, debt_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Priority</Label>
                  <Select value={editing.priority} onValueChange={(v) => setEditing({ ...editing, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PRIORITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Notes</Label><Textarea value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></div>
              <Button onClick={save} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4"><div className="text-xs text-muted-foreground">Total debt</div><div className="text-2xl font-extrabold text-destructive">{fmt(total)}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Paid this month</div><div className="text-2xl font-extrabold text-success">{fmt(paidMonth)}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Original total</div><div className="text-2xl font-extrabold">{fmt(totalStart)}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Next due</div><div className="text-base font-bold">{next ? `${next.name} · ${next.due_date}` : "—"}</div></Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {debts.map((d) => {
          const start = Number(d.starting_balance) || 1;
          const paid = start - Number(d.current_balance);
          const pct = Math.min(100, Math.max(0, (paid / start) * 100));
          return (
            <Card key={d.id} className={`p-4 ${d.paid_off ? "border-success/40 bg-success/5" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold flex items-center gap-2">{d.name}
                    <span className="text-xs px-1.5 py-0.5 rounded bg-muted">{d.debt_type}</span>
                    {d.priority === "critical" && <span className="text-xs px-1.5 py-0.5 rounded bg-destructive text-destructive-foreground">critical</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">Min {fmt(Number(d.minimum_payment))} {d.due_date && `· due ${d.due_date}`} {d.interest_rate && `· ${d.interest_rate}%`}</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-extrabold">{fmt(Number(d.current_balance))}</div>
                  <div className="text-xs text-muted-foreground">of {fmt(start)}</div>
                </div>
              </div>
              <Progress value={pct} className="mt-3" />
              <div className="text-xs text-muted-foreground mt-1">{pct.toFixed(0)}% paid down</div>
              <div className="flex gap-1 mt-3 flex-wrap">
                <Button size="sm" onClick={() => { setPayDebt(d); setPayOpen(true); }} className="bg-success text-success-foreground hover:bg-success/90 gap-1"><DollarSign className="h-3.5 w-3.5" /> Log Payment</Button>
                <Button size="sm" variant="outline" onClick={() => { setEditing(d); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="outline" onClick={() => del(d.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </Card>
          );
        })}
        {debts.length === 0 && <div className="text-sm text-muted-foreground p-3">No debts tracked yet.</div>}
      </div>

      <Card className="p-4">
        <h2 className="font-bold mb-2">Recent Payments</h2>
        <div className="space-y-1 text-sm">
          {payments.slice(0, 15).map((p) => {
            const d = debts.find((x) => x.id === p.debt_id);
            return (
              <div key={p.id} className="flex justify-between border-b border-border py-1.5">
                <span>{d?.name || "—"} <span className="text-xs text-muted-foreground">· {p.method}</span></span>
                <span className="font-semibold">{fmt(Number(p.amount))} <span className="text-xs text-muted-foreground">{p.paid_on}</span></span>
              </div>
            );
          })}
          {payments.length === 0 && <div className="text-muted-foreground">No payments yet.</div>}
        </div>
      </Card>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Payment — {payDebt?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Amount ($)</Label><Input type="number" value={payAmt} onChange={(e) => setPayAmt(e.target.value)} /></div>
            <div><Label>Method</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Notes</Label><Textarea value={payNotes} onChange={(e) => setPayNotes(e.target.value)} /></div>
            <Button onClick={logPayment} className="w-full bg-success text-success-foreground hover:bg-success/90">Save Payment</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

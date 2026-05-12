import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Check, AlertTriangle } from "lucide-react";

type Bill = {
  id: string;
  name: string;
  amount: number;
  due_date: string | null;
  category: string;
  bill_type: string;
  priority: string;
  paid: boolean;
  paid_on: string | null;
  notes: string | null;
  recurring: boolean;
  recurring_frequency: string | null;
};

const CATEGORIES = ["personal", "business", "family", "debt", "housing", "vehicle", "phone", "insurance", "storage", "credit card", "other"];
const BILL_TYPES = ["business", "personal"];
const PRIORITIES = ["critical", "important", "normal", "low"];
const FREQS = ["weekly", "monthly", "yearly"];

const empty: Partial<Bill> = { name: "", amount: 0, category: "other", bill_type: "business", priority: "normal", paid: false, recurring: false };

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default function AdminBills() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Bill>>(empty);
  const [filter, setFilter] = useState<"all" | "business" | "personal" | "paid" | "unpaid" | "past_due">("all");

  async function load() {
    const { data } = await supabase.from("bills").select("*").order("due_date", { ascending: true, nullsFirst: false });
    setBills((data as any) || []);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing.name) return toast.error("Name required");
    const payload: any = {
      name: editing.name,
      amount: Number(editing.amount) || 0,
      due_date: editing.due_date || null,
      category: editing.category || "other",
      bill_type: editing.bill_type || "business",
      priority: editing.priority || "normal",
      paid: !!editing.paid,
      paid_on: editing.paid ? (editing.paid_on || new Date().toISOString().slice(0, 10)) : null,
      notes: editing.notes || null,
      recurring: !!editing.recurring,
      recurring_frequency: editing.recurring ? (editing.recurring_frequency || "monthly") : null,
    };
    const { error } = editing.id
      ? await supabase.from("bills").update(payload).eq("id", editing.id)
      : await supabase.from("bills").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setOpen(false);
    setEditing(empty);
    load();
  }

  async function togglePaid(b: Bill) {
    const paid = !b.paid;
    await supabase.from("bills").update({ paid, paid_on: paid ? new Date().toISOString().slice(0, 10) : null }).eq("id", b.id);
    load();
  }
  async function del(id: string) {
    if (!confirm("Delete this bill?")) return;
    await supabase.from("bills").delete().eq("id", id);
    load();
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const ymStart = monthStart.toISOString().slice(0, 10);
  const ymEnd = monthEnd.toISOString().slice(0, 10);
  const inMonth = bills.filter((b) => b.due_date && b.due_date >= ymStart && b.due_date <= ymEnd);
  const totalMonth = inMonth.reduce((s, b) => s + Number(b.amount), 0);
  // Paid this month = bills marked paid whose paid_on falls inside this month (regardless of due_date)
  const paidMonth = bills.filter((b) => b.paid && b.paid_on && b.paid_on >= ymStart && b.paid_on <= ymEnd).reduce((s, b) => s + Number(b.amount), 0);
  // Remaining = unpaid due this month + ALL past-due unpaid (carry over until paid)
  const pastDue = bills.filter((b) => !b.paid && b.due_date && b.due_date < ymStart);
  const unpaidThisMonth = inMonth.filter((b) => !b.paid).reduce((s, b) => s + Number(b.amount), 0);
  const pastDueAmt = pastDue.reduce((s, b) => s + Number(b.amount), 0);
  const remainingMonth = unpaidThisMonth + pastDueAmt;
  const critical = bills.filter((b) => !b.paid && b.priority === "critical");

  return (
    <div className="container-tight py-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-extrabold">Bills</h1>
          <p className="text-sm text-muted-foreground">Track everything you owe so nothing slips.</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(empty); }}>
          <DialogTrigger asChild><Button className="gap-1"><Plus className="h-4 w-4" /> Add Bill</Button></DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing.id ? "Edit Bill" : "New Bill"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Amount ($)</Label><Input type="number" value={editing.amount ?? ""} onChange={(e) => setEditing({ ...editing, amount: Number(e.target.value) })} /></div>
                <div><Label>Due Date</Label><Input type="date" value={editing.due_date || ""} onChange={(e) => setEditing({ ...editing, due_date: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Bill Type</Label>
                  <Select value={editing.bill_type || "business"} onValueChange={(v) => setEditing({ ...editing, bill_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{BILL_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Category</Label>
                  <Select value={editing.category} onValueChange={(v) => setEditing({ ...editing, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={editing.priority} onValueChange={(v) => setEditing({ ...editing, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2"><Switch checked={!!editing.recurring} onCheckedChange={(v) => setEditing({ ...editing, recurring: v })} /><Label>Recurring</Label></div>
              {editing.recurring && (
                <div><Label>Frequency</Label>
                  <Select value={editing.recurring_frequency || "monthly"} onValueChange={(v) => setEditing({ ...editing, recurring_frequency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{FREQS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex items-center gap-2"><Switch checked={!!editing.paid} onCheckedChange={(v) => setEditing({ ...editing, paid: v, paid_on: v ? (editing.paid_on || new Date().toISOString().slice(0, 10)) : null })} /><Label>Paid</Label></div>
              {editing.paid && (
                <div><Label>Paid On</Label><Input type="date" value={editing.paid_on || ""} onChange={(e) => setEditing({ ...editing, paid_on: e.target.value })} /></div>
              )}
              <div><Label>Notes</Label><Textarea value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></div>
              <Button onClick={save} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4"><div className="text-xs text-muted-foreground">Total this month</div><div className="text-2xl font-extrabold">{fmt(totalMonth)}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Paid this month</div><div className="text-2xl font-extrabold text-success">{fmt(paidMonth)}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Remaining this month</div><div className="text-2xl font-extrabold">{fmt(remainingMonth)}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Past due</div><div className="text-2xl font-extrabold text-destructive">{pastDue.length}</div></Card>
      </div>

      {critical.length > 0 && (
        <Card className="p-4 border-destructive/40 bg-destructive/5">
          <div className="flex items-center gap-2 font-bold text-destructive"><AlertTriangle className="h-4 w-4" /> Critical bills unpaid</div>
          <div className="mt-2 text-sm">{critical.map((b) => `${b.name} (${fmt(Number(b.amount))})`).join(" · ")}</div>
        </Card>
      )}

      <Card className="p-4">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <h2 className="font-bold">All Bills</h2>
          <div className="flex gap-1 flex-wrap">
            {(["all","business","personal","unpaid","paid","past_due"] as const).map((f) => (
              <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>{f.replace("_"," ")}</Button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          {bills.filter((b) => {
            if (filter === "all") return true;
            if (filter === "business" || filter === "personal") return b.bill_type === filter;
            if (filter === "paid") return b.paid;
            if (filter === "unpaid") return !b.paid;
            if (filter === "past_due") return !b.paid && b.due_date && new Date(b.due_date) < now;
            return true;
          }).map((b) => {
            const overdue = !b.paid && b.due_date && new Date(b.due_date) < now;
            return (
              <div key={b.id} className={`flex flex-wrap items-center justify-between gap-2 p-3 rounded-md border ${b.paid ? "border-success/30 bg-success/5" : overdue ? "border-destructive/40 bg-destructive/5" : "border-border"}`}>
                <div className="min-w-0">
                  <div className="font-semibold flex items-center gap-2">
                    {b.name}
                    <span className={`text-xs px-1.5 py-0.5 rounded ${b.bill_type === "personal" ? "bg-accent text-accent-foreground" : "bg-primary/10 text-primary"}`}>{b.bill_type}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-muted">{b.category}</span>
                    {b.priority === "critical" && <span className="text-xs px-1.5 py-0.5 rounded bg-destructive text-destructive-foreground">critical</span>}
                    {b.recurring && <span className="text-xs px-1.5 py-0.5 rounded bg-secondary/20 text-secondary">{b.recurring_frequency}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">{fmt(Number(b.amount))} {b.due_date && `· due ${b.due_date}`} {b.paid && b.paid_on && `· paid ${b.paid_on}`}</div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant={b.paid ? "outline" : "default"} onClick={() => togglePaid(b)} className={b.paid ? "" : "bg-success text-success-foreground hover:bg-success/90"}>
                    <Check className="h-3.5 w-3.5" /> {b.paid ? "Unmark" : "Mark Paid"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditing(b); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="outline" onClick={() => del(b.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            );
          })}
          {bills.length === 0 && <div className="text-sm text-muted-foreground p-3">No bills yet. Add one to start tracking.</div>}
        </div>
      </Card>
    </div>
  );
}

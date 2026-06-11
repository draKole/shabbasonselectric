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
import { Plus, Pencil, Trash2, Check, AlertTriangle, RefreshCw } from "lucide-react";
import { ensureMonthlyOccurrences, monthKey } from "@/lib/useBillOccurrences";

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
  const [occurrences, setOccurrences] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Bill>>(empty);
  const [filter, setFilter] = useState<"all" | "business" | "personal" | "paid" | "unpaid" | "past_due">("all");
  const currentMonth = monthKey();

  async function load() {
    const [b, o] = await Promise.all([
      supabase.from("bills").select("*").order("due_date", { ascending: true, nullsFirst: false }),
      (supabase as any).from("bill_occurrences").select("*"),
    ]);
    setBills((b.data as any) || []);
    setOccurrences((o.data as any) || []);
  }
  useEffect(() => {
    ensureMonthlyOccurrences().finally(load);
  }, []);

  function currentOcc(billId: string) {
    return occurrences.find((o) => o.bill_id === billId && o.period_month === currentMonth);
  }
  function isPaidThisMonth(b: Bill) {
    if (b.recurring) {
      const occ = currentOcc(b.id);
      return !!occ?.paid;
    }
    return b.paid;
  }
  async function regenerateOccurrences() {
    try {
      const { data } = await supabase.functions.invoke("generate-bill-occurrences", { body: {} });
      try { localStorage.removeItem("bill_occ_lastgen"); } catch {}
      toast.success(`Created ${data?.created || 0} missing occurrences, fixed ${data?.fixed || 0} stale statuses, ${data?.already_existed || 0} already existed.`);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed"); }
  }

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

  const [payDialog, setPayDialog] = useState<{ bill: Bill; occ: any | null } | null>(null);

  async function unmarkPaid(b: Bill) {
    if (b.recurring) {
      const occ = currentOcc(b.id);
      if (occ) {
        await (supabase as any).from("bill_occurrences").update({ paid: false, paid_on: null, paid_amount: 0, paid_from: null, payment_method: null }).eq("id", occ.id);
      }
    } else {
      await supabase.from("bills").update({ paid: false, paid_on: null }).eq("id", b.id);
    }
    toast.success("Unmarked paid");
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
  const currentOccs = occurrences.filter((o) => o.period_month === currentMonth);
  const totalMonth = currentOccs.reduce((s, o) => s + Number(o.amount), 0);
  const paidMonth = occurrences.filter((o) => o.paid && o.paid_on && o.paid_on >= ymStart && o.paid_on <= ymEnd).reduce((s, o) => s + Number(o.paid_amount || o.amount || 0), 0);
  const pastDue = occurrences.filter((o) => !o.paid && o.due_date && o.due_date < ymStart);
  const unpaidThisMonth = currentOccs.filter((o) => !o.paid).reduce((s, o) => s + Number(o.amount), 0);
  const pastDueAmt = pastDue.reduce((s, o) => s + Number(o.amount), 0);
  const remainingMonth = unpaidThisMonth + pastDueAmt;
  const critical = bills.filter((b) => !b.paid && b.priority === "critical");

  return (
    <div className="container-tight py-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-extrabold">Bills</h1>
          <p className="text-sm text-muted-foreground">Track everything you owe. Recurring bills reset to unpaid each new month.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={regenerateOccurrences} className="gap-1"><RefreshCw className="h-3.5 w-3.5" />Refresh month</Button>
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
            const paidNow = isPaidThisMonth(b);
            if (filter === "all") return true;
            if (filter === "business" || filter === "personal") return b.bill_type === filter;
            if (filter === "paid") return paidNow;
            if (filter === "unpaid") return !paidNow;
            if (filter === "past_due") return !paidNow && b.due_date && new Date(b.due_date) < now;
            return true;
          }).map((b) => {
            const paidNow = isPaidThisMonth(b);
            const overdue = !paidNow && b.due_date && new Date(b.due_date) < now;
            const occ = b.recurring ? currentOcc(b.id) : null;
            return (
              <div key={b.id} className={`flex flex-wrap items-center justify-between gap-2 p-3 rounded-md border ${paidNow ? "border-success/30 bg-success/5" : overdue ? "border-destructive/40 bg-destructive/5" : "border-border"}`}>
                <div className="min-w-0">
                  <div className="font-semibold flex items-center gap-2">
                    {b.name}
                    <span className={`text-xs px-1.5 py-0.5 rounded ${b.bill_type === "personal" ? "bg-accent text-accent-foreground" : "bg-primary/10 text-primary"}`}>{b.bill_type}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-muted">{b.category}</span>
                    {b.priority === "critical" && <span className="text-xs px-1.5 py-0.5 rounded bg-destructive text-destructive-foreground">critical</span>}
                    {b.recurring && <span className="text-xs px-1.5 py-0.5 rounded bg-secondary/20 text-secondary">{b.recurring_frequency}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {fmt(Number(b.amount))} {b.due_date && `· due ${b.due_date}`}
                    {b.recurring && occ?.paid && ` · paid this month ${occ.paid_on}`}
                    {!b.recurring && b.paid && b.paid_on && ` · paid ${b.paid_on}`}
                  </div>
                </div>
                <div className="flex gap-1">
                  {paidNow ? (
                    <Button size="sm" variant="outline" onClick={() => unmarkPaid(b)}><Check className="h-3.5 w-3.5" /> Unmark</Button>
                  ) : (
                    <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90 gap-1" onClick={() => setPayDialog({ bill: b, occ: b.recurring ? currentOcc(b.id) : null })}>
                      <Check className="h-3.5 w-3.5" /> Mark Paid
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => { setEditing(b); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="outline" onClick={() => del(b.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            );
          })}
          {bills.length === 0 && <div className="text-sm text-muted-foreground p-3">No bills yet. Add one to start tracking.</div>}
        </div>
      </Card>

      <MarkPaidDialog payDialog={payDialog} onClose={(refresh) => { setPayDialog(null); if (refresh) load(); }} />
    </div>
  );
}

function MarkPaidDialog({ payDialog, onClose }: { payDialog: { bill: Bill; occ: any | null } | null; onClose: (refresh?: boolean) => void }) {
  const [f, setF] = useState<{ paid_date: string; paid_from: string; payment_method: string; notes: string; affects_live_cash: boolean }>({
    paid_date: new Date().toISOString().slice(0, 10),
    paid_from: "business", payment_method: "cash", notes: "", affects_live_cash: true,
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (payDialog) setF({
      paid_date: new Date().toISOString().slice(0, 10),
      paid_from: payDialog.bill.bill_type || "business",
      payment_method: "cash", notes: "", affects_live_cash: true,
    });
  }, [payDialog]);

  if (!payDialog) return null;
  const { bill, occ } = payDialog;

  async function save() {
    setBusy(true);
    try {
      if (bill.recurring) {
        // Create occurrence if missing (current month)
        const period = new Date().toISOString().slice(0, 7) + "-01";
        if (!occ) {
          await (supabase as any).from("bill_occurrences").insert({
            bill_id: bill.id, period_month: period, amount: bill.amount,
            paid: true, paid_on: f.paid_date, paid_amount: bill.amount,
            paid_from: f.paid_from, payment_method: f.payment_method, notes: f.notes || null, affects_live_cash: f.affects_live_cash,
          });
        } else {
          await (supabase as any).from("bill_occurrences").update({
            paid: true, paid_on: f.paid_date, paid_amount: Number(bill.amount),
            paid_from: f.paid_from, payment_method: f.payment_method, notes: f.notes || null, affects_live_cash: f.affects_live_cash,
          }).eq("id", occ.id);
        }
      } else {
        await supabase.from("bills").update({ paid: true, paid_on: f.paid_date, paid_from: f.paid_from, payment_method: f.payment_method, affects_live_cash: f.affects_live_cash } as any).eq("id", bill.id);
      }
      toast.success("Marked paid");
      onClose(true);
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setBusy(false); }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Mark paid — {bill.name}</DialogTitle></DialogHeader>
        <div className="space-y-2 text-sm">
          <div className="text-xs text-muted-foreground">{bill.recurring ? "Marks current month occurrence only. Future months stay unpaid." : "Marks this bill as paid."}</div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Paid date</Label><Input type="date" value={f.paid_date} onChange={(e) => setF({ ...f, paid_date: e.target.value })} /></div>
            <div><Label>Paid from</Label>
              <Select value={f.paid_from} onValueChange={(v) => setF({ ...f, paid_from: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="business">Business wallet / bank</SelectItem>
                  <SelectItem value="personal">Personal wallet / bank</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Payment method</Label>
              <Select value={f.payment_method} onValueChange={(v) => setF({ ...f, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["cash", "card", "bank_transfer", "zelle", "cashapp", "check", "other"].map((m) => <SelectItem key={m} value={m}>{m.replace("_", " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Notes</Label><Input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
            <label className="col-span-2 flex items-center justify-between rounded-md border border-border p-3 cursor-pointer">
              <span className="text-sm">Already paid before cash reset / do not affect live cash</span>
              <Switch checked={!f.affects_live_cash} onCheckedChange={(v) => setF({ ...f, affects_live_cash: !v })} />
            </label>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onClose()}>Cancel</Button>
            <Button onClick={save} disabled={busy} className="bg-success text-success-foreground hover:bg-success/90">Mark Paid</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

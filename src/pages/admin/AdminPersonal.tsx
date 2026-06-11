import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { DollarSign, Receipt, CreditCard, TrendingUp, Plus, Trash2, Wallet, ArrowRightLeft, PieChart } from "lucide-react";
import { useMonthMoney, monthRange } from "@/lib/useMonthMoney";
import { useBillsTotals, useDebtTotals } from "@/lib/useBillsTotals";
import { useGlobalSettings, num } from "@/lib/useGlobalSettings";
import { usePersonalExpenses, PERSONAL_EXPENSE_CATEGORIES, PERSONAL_INCOME_CATEGORIES } from "@/lib/usePersonalExpenses";
import { useLiveCash, fmtMoney as fmt } from "@/lib/useLiveCash";
import { CashReconciliationCard, ReconciliationWarning } from "@/components/admin/CashReconciliationCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PERSONAL_ASSIGN = ["Bills", "Debt", "Emergency", "Car / Transportation", "Savings", "Investing", "Spending", "Other"];

export default function AdminPersonal() {
  const monthKey = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const mr = useMemo(() => monthRange(monthKey), [monthKey]);

  const month = useMonthMoney(mr.from, mr.to);
  const bills = useBillsTotals(mr.from, mr.to, "personal");
  const debt = useDebtTotals("personal", mr.from, mr.to);
  const { settings } = useGlobalSettings();
  const exp = usePersonalExpenses(mr.from, mr.to);
  const live = useLiveCash();

  const ownerPay = month.ownerPay;
  const ownerDraw = exp.ownerDraw;
  const otherIncome = exp.otherIncome;
  const personalIncome = ownerPay + ownerDraw + otherIncome;
  const taxReserve = personalIncome * num(settings.personal_tax_reserve_pct) / 100;
  const remainingCash = personalIncome - bills.paid - debt.paidThisMonth - exp.totalExpenses;

  const [form, setForm] = useState({
    expense_date: new Date().toISOString().slice(0, 10),
    amount: "", category: "Food", method: "cash", notes: "", recurring: false, is_income: false,
  });
  const categories = form.is_income ? PERSONAL_INCOME_CATEGORIES : PERSONAL_EXPENSE_CATEGORIES;

  async function addExpense() {
    if (!form.amount) return toast.error("Enter an amount");
    const { error } = await (supabase as any).from("personal_expenses").insert({
      expense_date: form.expense_date, amount: Number(form.amount), category: form.category, method: form.method,
      notes: form.notes || null, recurring: form.recurring, is_income: form.is_income,
    });
    if (error) return toast.error(error.message);
    toast.success(form.is_income ? "Income logged" : "Expense logged");
    setForm({ ...form, amount: "", notes: "" });
    exp.reload(); live.reload();
  }

  async function delItem(id: string) {
    if (!confirm("Delete this entry?")) return;
    await (supabase as any).from("personal_expenses").delete().eq("id", id);
    exp.reload(); live.reload();
  }

  return (
    <div className="container-tight py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">Personal</h1>
        <p className="text-sm text-muted-foreground">Your owner pay, draws, and personal money. Business cash is in <Link to="/admin/business" className="underline">Business</Link>.</p>
      </div>

      {/* LIVE CASH */}
      <section className="space-y-2">
        <h2 className="font-bold text-sm uppercase text-muted-foreground flex items-center gap-2"><Wallet className="h-4 w-4" />Live Cash</h2>
        <ReconciliationWarning show={!!live.per && !live.per.is_reconciled} />
        {live.per?.is_reconciled && live.per.live_cash < 0 && <Card className="p-3 text-sm border-destructive/40 bg-destructive/5 text-destructive">Cash mismatch detected: spending exceeds logged income after reconciliation. Add income/owner transfer or set a new cash reconciliation.</Card>}
        {!live.per ? <Card className="p-4 text-sm text-muted-foreground">Loading…</Card> : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat icon={<Wallet className="h-5 w-5" />} label="Personal Live Cash" value={fmt(live.per.live_cash)} highlight />
            <Stat icon={<PieChart className="h-5 w-5" />} label="Assigned (not spent)" value={fmt(live.per.assigned)} />
            <Stat icon={<Wallet className="h-5 w-5" />} label="Unassigned available" value={fmt(live.per.unassigned)} />
            <Stat icon={<ArrowRightLeft className="h-5 w-5" />} label="Owner pay received" value={fmt(live.per.transfers_in)} sub="From business" />
            <Stat icon={<DollarSign className="h-5 w-5" />} label="Other personal income" value={fmt(live.per.personal_income_in)} />
            <Stat icon={<Receipt className="h-5 w-5" />} label="Personal bills paid (cash)" value={fmt(live.per.bills_out)} />
            <Stat icon={<CreditCard className="h-5 w-5" />} label="Personal debt paid (cash)" value={fmt(live.per.debt_out)} />
            <Stat icon={<Receipt className="h-5 w-5" />} label="Personal expenses" value={fmt(live.per.personal_exp_out)} />
          </div>
        )}
      </section>

      <CashReconciliationCard accountType="personal" currentBalance={live.per?.live_cash || 0} reconciliationDate={live.per?.reconciliation_date} onDone={live.reload} />

      <PersonalAssignmentsPanel onDone={live.reload} />

      {/* This month */}
      <section className="space-y-2 pt-4 border-t border-border">
        <h2 className="font-bold text-sm uppercase text-muted-foreground">This Month</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={<DollarSign className="h-5 w-5" />} label="Owner pay" value={fmt(ownerPay)} sub="From hours worked" />
          <Stat icon={<DollarSign className="h-5 w-5" />} label="Owner draw" value={fmt(ownerDraw)} sub="Logged draws" />
          <Stat icon={<DollarSign className="h-5 w-5" />} label="Other income" value={fmt(otherIncome)} />
          <Stat icon={<DollarSign className="h-5 w-5" />} label="Total personal income" value={fmt(personalIncome)} highlight />
          <Stat icon={<Receipt className="h-5 w-5" />} label="Bills paid" value={fmt(bills.paid)} />
          <Stat icon={<Receipt className="h-5 w-5" />} label="Bills remaining" value={fmt(bills.remaining)} sub={bills.pastDue > 0 ? `${fmt(bills.pastDue)} past due` : undefined} />
          <Stat icon={<CreditCard className="h-5 w-5" />} label="Debt paid" value={fmt(debt.paidThisMonth)} sub={`Remaining: ${fmt(debt.remaining)}`} />
          <Stat icon={<TrendingUp className="h-5 w-5" />} label="Cash remaining (month)" value={fmt(remainingCash)} />
        </div>
        <div className="text-xs text-muted-foreground">Personal tax reserve: {fmt(taxReserve)} ({settings.personal_tax_reserve_pct || 0}%)</div>
      </section>

      {/* Logger */}
      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold flex items-center gap-2"><Plus className="h-4 w-4" /> Log Personal Expense or Income</h2>
          <div className="flex items-center gap-2 text-xs">
            <span className={form.is_income ? "text-muted-foreground" : "font-semibold"}>Expense</span>
            <Switch checked={form.is_income} onCheckedChange={(v) => setForm({ ...form, is_income: v, category: v ? "Owner Draw" : "Food" })} />
            <span className={form.is_income ? "font-semibold" : "text-muted-foreground"}>Income</span>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          <div><Label>Date</Label><Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} /></div>
          <div><Label>Amount</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
          <div><Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Method</Label>
            <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["cash", "debit", "credit", "zelle", "cashapp", "check", "venmo", "transfer", "other"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <div className="flex items-center gap-2">
              <Switch checked={form.recurring} onCheckedChange={(v) => setForm({ ...form, recurring: v })} />
              <Label className="cursor-pointer">Recurring</Label>
            </div>
          </div>
          <div className="sm:col-span-2 lg:col-span-3"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
        </div>
        <Button onClick={addExpense} className="w-full">Add {form.is_income ? "Income" : "Expense"}</Button>
        <div className="pt-3 border-t border-border">
          <div className="text-sm font-semibold mb-2">This month ({exp.items.length})</div>
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {exp.items.map((it) => (
              <div key={it.id} className="flex items-center justify-between gap-2 text-sm border-b border-border py-1">
                <div className="min-w-0 flex-1">
                  <div className="truncate">
                    <span className="font-semibold">{fmt(Number(it.amount))}</span>
                    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${it.is_income ? "bg-success/15 text-success" : "bg-muted"}`}>{it.is_income ? "INCOME" : "EXPENSE"}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{it.category} · {it.method}</span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{it.expense_date}{it.notes ? ` · ${it.notes}` : ""}{it.recurring ? " · recurring" : ""}</div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => delItem(it.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
              </div>
            ))}
            {exp.items.length === 0 && <div className="text-xs text-muted-foreground">Nothing logged this month yet.</div>}
          </div>
        </div>
      </Card>
    </div>
  );
}

function PersonalAssignmentsPanel({ onDone }: { onDone: () => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ category: PERSONAL_ASSIGN[0], amount: "", notes: "" });
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await (supabase as any).from("personal_assignments").select("*").order("created_at", { ascending: false });
    setItems(data || []);
  }
  useEffect(() => { load(); }, []);

  async function add() {
    if (!f.amount) return toast.error("Amount required");
    setBusy(true);
    // map category → allowed target_type
    const targetType = f.category === "Bills" ? "bill_occurrence" : f.category === "Debt" ? "debt" : f.category === "Emergency" ? "emergency" : "other";
    const { error } = await (supabase as any).from("personal_assignments").insert({
      target_type: targetType, amount: Number(f.amount), notes: `${f.category}${f.notes ? ` — ${f.notes}` : ""}`, status: "assigned",
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Assigned");
    setF({ ...f, amount: "", notes: "" }); setOpen(false);
    load(); onDone();
  }
  async function setStatus(id: string, status: string) {
    await (supabase as any).from("personal_assignments").update({ status }).eq("id", id);
    load(); onDone();
  }
  async function del(id: string) {
    if (!confirm("Delete this assignment?")) return;
    await (supabase as any).from("personal_assignments").delete().eq("id", id);
    load(); onDone();
  }

  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-bold flex items-center gap-2"><PieChart className="h-4 w-4" />Personal Assignments</h3>
        <Button size="sm" onClick={() => setOpen(true)} className="gap-1"><Plus className="h-4 w-4" />Assign</Button>
      </div>
      <p className="text-xs text-muted-foreground">Assigned money reduces Unassigned cash but stays in Live Cash until spent.</p>
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {items.map((it) => (
          <div key={it.id} className="flex items-center justify-between gap-2 border-b border-border py-1.5 text-sm">
            <div className="min-w-0">
              <div className="font-semibold">{fmt(Number(it.amount))} <span className="text-xs text-muted-foreground">· {it.target_type}</span></div>
              <div className="text-xs text-muted-foreground">{it.notes}</div>
            </div>
            <div className="flex items-center gap-1">
              <Select value={it.status} onValueChange={(v) => setStatus(it.id, v)}>
                <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{["assigned", "paid", "spent"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <Button size="sm" variant="ghost" onClick={() => del(it.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="text-xs text-muted-foreground p-2">No assignments yet.</div>}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign personal money</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            <div><Label>Category</Label>
              <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PERSONAL_ASSIGN.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Amount</Label><Input type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></div>
            <div><Label>Notes</Label><Input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
            <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={add} disabled={busy}>Assign</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Stat({ icon, label, value, sub, highlight }: { icon: React.ReactNode; label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <Card className={`p-4 ${highlight ? "border-success/50 bg-success/5" : ""}`}>
      <div className="flex items-center gap-2 text-muted-foreground text-xs">{icon}{label}</div>
      <div className={`text-2xl font-extrabold mt-1 ${highlight ? "text-success" : ""}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </Card>
  );
}

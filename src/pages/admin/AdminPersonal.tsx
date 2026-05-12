import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Link } from "react-router-dom";
import { DollarSign, Receipt, CreditCard, TrendingUp, Plus, Trash2 } from "lucide-react";
import { useMonthMoney, monthRange } from "@/lib/useMonthMoney";
import { useBillsTotals, useDebtTotals } from "@/lib/useBillsTotals";
import { useAllocationPresets, bucketColorClass } from "@/lib/useAllocations";
import { useGlobalSettings, num } from "@/lib/useGlobalSettings";
import { usePersonalExpenses, PERSONAL_EXPENSE_CATEGORIES, PERSONAL_INCOME_CATEGORIES } from "@/lib/usePersonalExpenses";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function fmt(n: number) { return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }); }

export default function AdminPersonal() {
  const monthKey = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const mr = useMemo(() => monthRange(monthKey), [monthKey]);

  const month = useMonthMoney(mr.from, mr.to);
  const bills = useBillsTotals(mr.from, mr.to, "personal");
  const debt = useDebtTotals("personal", mr.from, mr.to);
  const { presets, active } = useAllocationPresets("personal");
  const { settings } = useGlobalSettings();
  const exp = usePersonalExpenses(mr.from, mr.to);

  const ownerPay = month.ownerPay;
  const ownerDraw = exp.ownerDraw;
  const otherIncome = exp.otherIncome;
  const personalIncome = ownerPay + ownerDraw + otherIncome;
  const taxReserve = personalIncome * num(settings.personal_tax_reserve_pct) / 100;
  const remainingCash = personalIncome - bills.paid - debt.paidThisMonth - exp.totalExpenses;
  const allocBase = Math.max(personalIncome - taxReserve, 0);
  const preset = active || presets[0];

  // Form
  const [form, setForm] = useState({
    expense_date: new Date().toISOString().slice(0, 10),
    amount: "",
    category: "Food",
    method: "cash",
    notes: "",
    recurring: false,
    is_income: false,
  });

  async function addExpense() {
    if (!form.amount) return toast.error("Enter an amount");
    const { error } = await (supabase as any).from("personal_expenses").insert({
      expense_date: form.expense_date,
      amount: Number(form.amount),
      category: form.category,
      method: form.method,
      notes: form.notes || null,
      recurring: form.recurring,
      is_income: form.is_income,
    });
    if (error) return toast.error(error.message);
    toast.success(form.is_income ? "Income logged" : "Expense logged");
    setForm({ ...form, amount: "", notes: "" });
    exp.reload();
  }

  async function delItem(id: string) {
    if (!confirm("Delete this entry?")) return;
    await (supabase as any).from("personal_expenses").delete().eq("id", id);
    exp.reload();
  }

  const categories = form.is_income ? PERSONAL_INCOME_CATEGORIES : PERSONAL_EXPENSE_CATEGORIES;

  return (
    <div className="container-tight py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">Personal</h1>
        <p className="text-sm text-muted-foreground">Your owner pay, draws, and personal money. Business cash is in <Link to="/admin/business" className="underline">Business</Link>.</p>
      </div>

      <section className="space-y-2">
        <h2 className="font-bold text-sm uppercase text-muted-foreground">Money In</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={<DollarSign className="h-5 w-5" />} label="Owner pay (this month)" value={fmt(ownerPay)} sub="From hours worked on jobs" />
          <Stat icon={<DollarSign className="h-5 w-5" />} label="Owner draw" value={fmt(ownerDraw)} sub="Money taken from business" />
          <Stat icon={<DollarSign className="h-5 w-5" />} label="Other personal income" value={fmt(otherIncome)} />
          <Stat icon={<DollarSign className="h-5 w-5" />} label="Total personal income" value={fmt(personalIncome)} highlight />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-bold text-sm uppercase text-muted-foreground">Money Out</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={<Receipt className="h-5 w-5" />} label="Personal bills paid" value={fmt(bills.paid)} />
          <Stat icon={<Receipt className="h-5 w-5" />} label="Personal bills remaining" value={fmt(bills.remaining)} sub={bills.pastDue > 0 ? `${fmt(bills.pastDue)} past due` : undefined} />
          <Stat icon={<Receipt className="h-5 w-5" />} label="Personal expenses logged" value={fmt(exp.totalExpenses)} />
          <Stat icon={<CreditCard className="h-5 w-5" />} label="Personal debt paid" value={fmt(debt.paidThisMonth)} sub={`Remaining: ${fmt(debt.remaining)}`} />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-bold text-sm uppercase text-muted-foreground">Cash & Reserves</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Stat icon={<TrendingUp className="h-5 w-5" />} label="Personal cash remaining" value={fmt(remainingCash)} sub="Income − bills − debt − expenses" highlight />
          <Stat icon={<DollarSign className="h-5 w-5" />} label="Personal tax reserve" value={fmt(taxReserve)} sub={`${settings.personal_tax_reserve_pct || 0}% of income — set aside`} />
        </div>
      </section>

      {/* Personal Expense Logger */}
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

        {/* Recent list */}
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

      <Card className="p-5">
        <h2 className="font-bold mb-1">Personal Allocations</h2>
        <p className="text-xs text-muted-foreground mb-3">Splits <b>personal income after tax reserve ({fmt(allocBase)})</b>. Edit in <Link to="/admin/settings" className="underline">Settings</Link>.</p>
        {allocBase <= 0 && <div className="text-sm text-muted-foreground p-3 rounded bg-muted">No personal income available to allocate.</div>}
        {allocBase > 0 && preset && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {preset.buckets.filter((b: any) => b.enabled !== false).map((b: any, i: number) => (
              <div key={i} className={`rounded-md p-3 ${bucketColorClass(b.color)}`}>
                <div className="text-xs font-semibold">{b.name} ({b.percent}%)</div>
                <div className="text-xl font-extrabold">{fmt(allocBase * (Number(b.percent) || 0) / 100)}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4 text-xs text-muted-foreground">
        Personal expenses, debt, and bills do not reduce business profit. Pay them from owner pay or owner draw.
      </Card>
    </div>
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

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, TrendingUp, Receipt, Wallet, Info } from "lucide-react";

type Payment = { id: string; amount: number; paid_on: string; method: string; is_deposit: boolean; job_id: string };
type Material = { id: string; cost: number; purchased_on: string; paid_by: string; job_id: string };

const TAX_PCT = 0.10;
const DEBT_PCT = 0.75;
const BILLS_PCT = 0.15;

function monthKey(d: string) {
  return d.slice(0, 7); // YYYY-MM
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default function AdminMoney() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: m }] = await Promise.all([
        supabase.from("job_payments").select("id, amount, paid_on, method, is_deposit, job_id").order("paid_on", { ascending: false }),
        supabase.from("job_materials").select("id, cost, purchased_on, paid_by, job_id"),
      ]);
      setPayments((p as any) || []);
      setMaterials((m as any) || []);
      setLoading(false);
    })();
  }, []);

  const months = useMemo(() => {
    const set = new Set<string>();
    payments.forEach((p) => set.add(monthKey(p.paid_on)));
    materials.forEach((m) => set.add(monthKey(m.purchased_on)));
    set.add(month);
    return Array.from(set).sort().reverse();
  }, [payments, materials, month]);

  const monthData = useMemo(() => {
    const pInMonth = payments.filter((p) => monthKey(p.paid_on) === month);
    const mInMonth = materials.filter((m) => monthKey(m.purchased_on) === month);
    const collected = pInMonth.reduce((s, p) => s + Number(p.amount || 0), 0);
    const materialsMe = mInMonth.filter((m) => m.paid_by === "me").reduce((s, m) => s + Number(m.cost || 0), 0);
    const grossProfit = collected - materialsMe;
    const taxes = collected * TAX_PCT;
    const debt = collected * DEBT_PCT;
    const bills = collected * BILLS_PCT;
    return { collected, materialsMe, grossProfit, taxes, debt, bills, count: pInMonth.length };
  }, [payments, materials, month]);

  const ytd = useMemo(() => {
    const year = month.slice(0, 4);
    const collected = payments.filter((p) => p.paid_on.startsWith(year)).reduce((s, p) => s + Number(p.amount || 0), 0);
    const materialsMe = materials.filter((m) => m.purchased_on.startsWith(year) && m.paid_by === "me").reduce((s, m) => s + Number(m.cost || 0), 0);
    return { collected, materialsMe, profit: collected - materialsMe, taxes: collected * TAX_PCT };
  }, [payments, materials, month]);

  if (loading) return <div className="container-tight py-6 text-sm text-muted-foreground">Loading money tracker…</div>;

  return (
    <div className="container-tight py-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Money Tracker</h1>
          <p className="text-sm text-muted-foreground">Monthly income, materials, profit, and tax split.</p>
        </div>
        <div className="w-44">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {months.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={<DollarSign className="h-5 w-5" />} label="Collected this month" value={fmt(monthData.collected)} sub={`${monthData.count} payments`} />
        <Stat icon={<Receipt className="h-5 w-5" />} label="Materials (paid by me)" value={fmt(monthData.materialsMe)} sub="Reduces profit" />
        <Stat icon={<TrendingUp className="h-5 w-5" />} label="Gross profit" value={fmt(monthData.grossProfit)} sub="Collected − materials" />
        <Stat icon={<Wallet className="h-5 w-5" />} label="Set aside for taxes (10%)" value={fmt(monthData.taxes)} sub="Self-employment + state" />
      </div>

      <Card className="p-5">
        <h2 className="font-bold flex items-center gap-2"><Info className="h-4 w-4" /> Suggested Split (Emergency Mode)</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Of every dollar collected: 75% goes to debt, 10% to taxes, 15% to bills. Use these targets for {month}:
        </p>
        <div className="grid gap-3 sm:grid-cols-3 mt-4">
          <SplitRow label="Debt (75%)" value={fmt(monthData.debt)} color="bg-destructive/10 text-destructive" />
          <SplitRow label="Taxes (10%)" value={fmt(monthData.taxes)} color="bg-accent text-accent-foreground" />
          <SplitRow label="Bills (15%)" value={fmt(monthData.bills)} color="bg-secondary/10 text-secondary" />
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-bold">Year to Date ({month.slice(0, 4)})</h2>
        <div className="grid gap-3 sm:grid-cols-4 mt-3 text-sm">
          <div><div className="text-muted-foreground">Collected</div><div className="text-lg font-bold">{fmt(ytd.collected)}</div></div>
          <div><div className="text-muted-foreground">Materials (me)</div><div className="text-lg font-bold">{fmt(ytd.materialsMe)}</div></div>
          <div><div className="text-muted-foreground">Gross Profit</div><div className="text-lg font-bold">{fmt(ytd.profit)}</div></div>
          <div><div className="text-muted-foreground">Tax Reserve (10%)</div><div className="text-lg font-bold">{fmt(ytd.taxes)}</div></div>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-bold mb-3">Recent Payments</h2>
        <div className="space-y-2 text-sm">
          {payments.slice(0, 15).map((p) => (
            <div key={p.id} className="flex items-center justify-between border-b border-border py-2">
              <div>
                <div className="font-semibold">{fmt(Number(p.amount))} {p.is_deposit && <span className="ml-1 text-xs text-secondary">deposit</span>}</div>
                <div className="text-xs text-muted-foreground">{p.paid_on} · {p.method}</div>
              </div>
            </div>
          ))}
          {payments.length === 0 && <p className="text-muted-foreground">No payments logged yet.</p>}
        </div>
      </Card>
    </div>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs">{icon}{label}</div>
      <div className="text-2xl font-extrabold mt-1">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </Card>
  );
}

function SplitRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`rounded-md p-3 ${color}`}>
      <div className="text-xs font-semibold">{label}</div>
      <div className="text-xl font-extrabold">{value}</div>
    </div>
  );
}

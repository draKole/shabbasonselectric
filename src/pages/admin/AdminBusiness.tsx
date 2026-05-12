import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { DollarSign, Receipt, Users, TrendingUp, Briefcase, CreditCard } from "lucide-react";
import { useMonthMoney, monthRange } from "@/lib/useMonthMoney";
import { useBillsTotals, useDebtTotals } from "@/lib/useBillsTotals";
import { useAllocationPresets, bucketColorClass } from "@/lib/useAllocations";
import { useGlobalSettings, num } from "@/lib/useGlobalSettings";

function fmt(n: number) { return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }); }

export default function AdminBusiness() {
  const monthKey = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const mr = useMemo(() => monthRange(monthKey), [monthKey]);
  const money = useMonthMoney(mr.from, mr.to);
  const bills = useBillsTotals(mr.from, mr.to, "business");
  const debt = useDebtTotals("business", mr.from, mr.to);
  const { presets, active } = useAllocationPresets("business");
  const { settings } = useGlobalSettings();

  const businessProfit = money.netProfit; // already accounts for owner pay & burden settings
  const cashAfterBills = businessProfit - bills.paid;
  const taxReserve = businessProfit * num(settings.business_tax_reserve_pct) / 100;
  const preset = active || presets[0];

  return (
    <div className="container-tight py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">Business</h1>
        <p className="text-sm text-muted-foreground">Company money — revenue, expenses, business profit. Personal pay is in <Link to="/admin/personal" className="underline">Personal</Link>.</p>
      </div>

      <section className="space-y-2">
        <h2 className="font-bold text-sm uppercase text-muted-foreground">Income</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={<DollarSign className="h-5 w-5" />} label="Gross collected (month)" value={fmt(money.collected)} sub={`${money.paymentCount} payments`} />
          <Stat icon={<Briefcase className="h-5 w-5" />} label="Payments count" value={String(money.paymentCount)} sub="job_payments" />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-bold text-sm uppercase text-muted-foreground">Expenses</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={<Receipt className="h-5 w-5" />} label="Materials (paid by me)" value={fmt(money.materialsMe)} />
          <Stat icon={<Users className="h-5 w-5" />} label="Worker labor" value={fmt(money.workerLabor)} sub="Non-owner workers" />
          {money.includeBurden && <Stat icon={<Users className="h-5 w-5" />} label="Worker burden" value={fmt(money.workerBurden)} />}
          <Stat icon={<Users className="h-5 w-5" />} label="Owner-worker pay" value={fmt(money.ownerPay)} sub={money.ownerReducesProfit ? "Reduces business profit" : "Tracked separately"} />
          <Stat icon={<Receipt className="h-5 w-5" />} label="Other job expenses" value={fmt(money.otherExp)} />
          <Stat icon={<Receipt className="h-5 w-5" />} label="Business bills paid (month)" value={fmt(bills.paid)} />
          <Stat icon={<Receipt className="h-5 w-5" />} label="Business bills remaining" value={fmt(bills.remaining)} sub={bills.pastDue > 0 ? `${fmt(bills.pastDue)} past due` : undefined} />
          <Stat icon={<CreditCard className="h-5 w-5" />} label="Business debt remaining" value={fmt(debt.remaining)} sub={`Paid this month: ${fmt(debt.paidThisMonth)}`} />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-bold text-sm uppercase text-muted-foreground">Profit</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Stat icon={<TrendingUp className="h-5 w-5" />} label="Business job profit" value={fmt(businessProfit)} highlight />
          <Stat icon={<TrendingUp className="h-5 w-5" />} label="Cash after business bills" value={fmt(cashAfterBills)} sub="Profit − bills paid" />
          <Stat icon={<DollarSign className="h-5 w-5" />} label="Business tax reserve" value={fmt(taxReserve)} sub={`${settings.business_tax_reserve_pct || 0}% of profit`} />
        </div>
      </section>

      <Card className="p-5">
        <h2 className="font-bold mb-1">Business Allocations</h2>
        <p className="text-xs text-muted-foreground mb-3">Splits <b>business profit ({fmt(businessProfit)})</b> only. Edit in <Link to="/admin/settings" className="underline">Settings</Link>.</p>
        {businessProfit <= 0 && <div className="text-sm text-muted-foreground p-3 rounded bg-muted">No business profit yet — nothing to allocate.</div>}
        {businessProfit > 0 && preset && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {preset.buckets.filter((b: any) => b.enabled !== false).map((b: any, i: number) => (
              <div key={i} className={`rounded-md p-3 ${bucketColorClass(b.color)}`}>
                <div className="text-xs font-semibold">{b.name} ({b.percent}%)</div>
                <div className="text-xl font-extrabold">{fmt(businessProfit * (Number(b.percent) || 0) / 100)}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4 text-xs text-muted-foreground">
        Business profit and owner personal pay are separate. Owner pay is personal income; business profit stays in the company.
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

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { DollarSign, Receipt, CreditCard, TrendingUp } from "lucide-react";
import { useMonthMoney, monthRange } from "@/lib/useMonthMoney";
import { useBillsTotals, useDebtTotals } from "@/lib/useBillsTotals";
import { useAllocationPresets, bucketColorClass } from "@/lib/useAllocations";
import { useGlobalSettings, num } from "@/lib/useGlobalSettings";

function fmt(n: number) { return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }); }

export default function AdminPersonal() {
  const monthKey = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const mr = useMemo(() => monthRange(monthKey), [monthKey]);

  // Week range
  const weekStart = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - 6);
    return d.toISOString().slice(0, 10);
  }, []);
  const today = new Date().toISOString().slice(0, 10);

  const month = useMonthMoney(mr.from, mr.to);
  const week = useMonthMoney(weekStart, today);
  const bills = useBillsTotals(mr.from, mr.to, "personal");
  const debt = useDebtTotals("personal", mr.from, mr.to);
  const { presets, active } = useAllocationPresets("personal");
  const { settings } = useGlobalSettings();

  const ownerPayWeek = week.ownerPay;
  const ownerPayMonth = month.ownerPay;
  const personalIncome = ownerPayMonth; // owner draw could be added later
  const remainingCash = personalIncome - bills.paid - debt.paidThisMonth;
  const taxReserve = personalIncome * num(settings.personal_tax_reserve_pct) / 100;
  const preset = active || presets[0];

  return (
    <div className="container-tight py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">Personal</h1>
        <p className="text-sm text-muted-foreground">Your owner pay & personal money. Business cash is in <Link to="/admin/business" className="underline">Business</Link>.</p>
      </div>

      <section className="space-y-2">
        <h2 className="font-bold text-sm uppercase text-muted-foreground">Money In</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={<DollarSign className="h-5 w-5" />} label="Owner pay (this week)" value={fmt(ownerPayWeek)} sub="Past 7 days" />
          <Stat icon={<DollarSign className="h-5 w-5" />} label="Owner pay (this month)" value={fmt(ownerPayMonth)} highlight />
          <Stat icon={<DollarSign className="h-5 w-5" />} label="Personal income (month)" value={fmt(personalIncome)} sub="Owner pay + draw" />
          <Stat icon={<DollarSign className="h-5 w-5" />} label="Personal tax reserve" value={fmt(taxReserve)} sub={`${settings.personal_tax_reserve_pct || 0}% of pay`} />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-bold text-sm uppercase text-muted-foreground">Money Out</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={<Receipt className="h-5 w-5" />} label="Personal bills paid (month)" value={fmt(bills.paid)} />
          <Stat icon={<Receipt className="h-5 w-5" />} label="Personal bills remaining" value={fmt(bills.remaining)} sub={bills.pastDue > 0 ? `${fmt(bills.pastDue)} past due` : undefined} />
          <Stat icon={<CreditCard className="h-5 w-5" />} label="Personal debt remaining" value={fmt(debt.remaining)} />
          <Stat icon={<CreditCard className="h-5 w-5" />} label="Personal debt paid (month)" value={fmt(debt.paidThisMonth)} />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-bold text-sm uppercase text-muted-foreground">Cash</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Stat icon={<TrendingUp className="h-5 w-5" />} label="Personal remaining cash" value={fmt(remainingCash)} sub="Pay − personal bills − personal debt" highlight />
        </div>
      </section>

      <Card className="p-5">
        <h2 className="font-bold mb-1">Personal Allocations</h2>
        <p className="text-xs text-muted-foreground mb-3">Splits <b>owner pay ({fmt(personalIncome)})</b> only. Edit in <Link to="/admin/settings" className="underline">Settings</Link>.</p>
        {personalIncome <= 0 && <div className="text-sm text-muted-foreground p-3 rounded bg-muted">No owner pay this month yet.</div>}
        {personalIncome > 0 && preset && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {preset.buckets.filter((b: any) => b.enabled !== false).map((b: any, i: number) => (
              <div key={i} className={`rounded-md p-3 ${bucketColorClass(b.color)}`}>
                <div className="text-xs font-semibold">{b.name} ({b.percent}%)</div>
                <div className="text-xl font-extrabold">{fmt(personalIncome * (Number(b.percent) || 0) / 100)}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4 text-xs text-muted-foreground">
        Personal debt and bills do not reduce business profit. Pay them from owner pay or owner draw.
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

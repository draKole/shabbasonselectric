import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { DollarSign, Receipt, Users, TrendingUp, CreditCard, Info } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useMonthMoney, monthRange } from "@/lib/useMonthMoney";
import { useBillsTotals, useDebtTotals } from "@/lib/useBillsTotals";
import { useAllocationPresets, bucketColorClass } from "@/lib/useAllocations";
import { useGlobalSettings, num } from "@/lib/useGlobalSettings";
import { usePersonalExpenses } from "@/lib/usePersonalExpenses";

function fmt(n: number) { return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }); }

export default function AdminBusiness() {
  const monthKey = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const mr = useMemo(() => monthRange(monthKey), [monthKey]);
  const money = useMonthMoney(mr.from, mr.to);
  const bills = useBillsTotals(mr.from, mr.to, "business");
  const debt = useDebtTotals("business", mr.from, mr.to);
  const { presets, active } = useAllocationPresets("business");
  const { settings } = useGlobalSettings();
  const exp = usePersonalExpenses(mr.from, mr.to);

  const totalLabor = money.workerLabor + money.ownerPay + (money.includeBurden ? money.workerBurden : 0);
  const businessProfit = money.netProfit; // already accounts for owner pay + burden settings
  const ownerDraws = exp.ownerDraw;
  const cashAfterObligations = businessProfit - bills.paid - ownerDraws;
  const taxReserve = businessProfit * num(settings.business_tax_reserve_pct) / 100;
  const allocBase = Math.max(businessProfit - taxReserve, 0);
  const preset = active || presets[0];

  return (
    <div className="container-tight py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">Business</h1>
        <p className="text-sm text-muted-foreground">Company money — revenue, costs, and business profit. Personal pay is in <Link to="/admin/personal" className="underline">Personal</Link>.</p>
      </div>

      {/* 1. Money In */}
      <section className="space-y-2">
        <h2 className="font-bold text-sm uppercase text-muted-foreground">1. Money In</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Stat icon={<DollarSign className="h-5 w-5" />} label="Gross collected (month)" value={fmt(money.collected)} sub={`${money.paymentCount} payments`} />
        </div>
      </section>

      {/* 2. Job Costs */}
      <section className="space-y-2">
        <h2 className="font-bold text-sm uppercase text-muted-foreground">2. Job Costs</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={<Receipt className="h-5 w-5" />} label="Materials (paid by me)" value={fmt(money.materialsMe)} />
          <Stat icon={<Users className="h-5 w-5" />} label="Non-owner worker pay" value={fmt(money.workerLabor)} />
          <Stat icon={<Users className="h-5 w-5" />} label="Owner-worker pay" value={fmt(money.ownerPay)} sub={money.ownerReducesProfit ? "Reduces business profit" : "Tracked separately"} />
          <Stat icon={<Users className="h-5 w-5" />} label="Extra worker cost" value={fmt(money.workerBurden)} sub={money.includeBurden ? "Included in profit" : "Planning only"} />
          <Stat icon={<Receipt className="h-5 w-5" />} label="Other job expenses" value={fmt(money.otherExp)} />
          <Stat icon={<Users className="h-5 w-5" />} label="Total labor cost" value={fmt(totalLabor)} sub="Workers + owner + extra" />
        </div>
        <Card className="p-3 text-xs text-muted-foreground flex gap-2"><Info className="h-3.5 w-3.5 mt-0.5 shrink-0" /> <span><b>Extra Worker Cost</b> includes tax reserve, workers comp, insurance, PPE, tools, and other costs of having workers.</span></Card>
      </section>

      {/* 3. Profit */}
      <section className="space-y-2">
        <h2 className="font-bold text-sm uppercase text-muted-foreground">3. Business Profit</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Stat icon={<TrendingUp className="h-5 w-5" />} label="Business job profit" value={fmt(businessProfit)} sub="Collected − job costs" highlight />
        </div>
      </section>

      {/* 4. Obligations */}
      <section className="space-y-2">
        <h2 className="font-bold text-sm uppercase text-muted-foreground">4. Business Obligations</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={<Receipt className="h-5 w-5" />} label="Business bills paid" value={fmt(bills.paid)} />
          <Stat icon={<Receipt className="h-5 w-5" />} label="Business bills remaining" value={fmt(bills.remaining)} sub={bills.pastDue > 0 ? `${fmt(bills.pastDue)} past due` : undefined} />
          <Stat icon={<CreditCard className="h-5 w-5" />} label="Business debt payments (month)" value={fmt(debt.paidThisMonth)} sub={`Remaining: ${fmt(debt.remaining)}`} />
          <Stat icon={<DollarSign className="h-5 w-5" />} label="Business tax reserve" value={fmt(taxReserve)} sub={`${settings.business_tax_reserve_pct || 0}% of profit`} />
        </div>
      </section>

      {/* 5. Cash */}
      <section className="space-y-2">
        <h2 className="font-bold text-sm uppercase text-muted-foreground">5. Business Cash</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Stat icon={<TrendingUp className="h-5 w-5" />} label="Cash after obligations" value={fmt(cashAfterObligations)} sub="Profit − bills − draws" highlight />
          <Stat icon={<DollarSign className="h-5 w-5" />} label="Owner draws taken" value={fmt(ownerDraws)} sub="Money sent to personal" />
        </div>
      </section>

      <Card className="p-5">
        <h2 className="font-bold mb-1">Business Allocations</h2>
        <p className="text-xs text-muted-foreground mb-3">Splits <b>business profit after tax reserve ({fmt(allocBase)})</b>. Buckets keep the company afloat: payroll reserve, insurance, tools, marketing, growth. Edit in <Link to="/admin/settings" className="underline">Settings</Link>.</p>
        {allocBase <= 0 && <div className="text-sm text-muted-foreground p-3 rounded bg-muted">No business profit available to allocate.</div>}
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

      <Collapsible>
        <CollapsibleTrigger className="text-xs underline text-muted-foreground">Show labor breakdown</CollapsibleTrigger>
        <CollapsibleContent className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <Mini label="Non-owner pay" value={fmt(money.workerLabor)} />
          <Mini label="Owner-worker pay" value={fmt(money.ownerPay)} />
          <Mini label="Extra worker cost" value={fmt(money.workerBurden)} />
          <Mini label="Total labor cost" value={fmt(totalLabor)} />
        </CollapsibleContent>
      </Collapsible>

      <Card className="p-4 text-xs text-muted-foreground">
        Business profit and owner personal pay stay separate. Owner-worker pay is tracked as a business labor cost AND counted as personal income on the Personal page.
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

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="font-bold">{value}</div>
    </div>
  );
}

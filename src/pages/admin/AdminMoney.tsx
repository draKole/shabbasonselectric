import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DollarSign, TrendingUp, Receipt, Info, Users, ChevronDown, CreditCard } from "lucide-react";
import { useAllocationPresets, bucketColorClass } from "@/lib/useAllocations";
import { useLiveCash, fmtMoney } from "@/lib/useLiveCash";
import { useMonthMoney, monthRange, yearRange } from "@/lib/useMonthMoney";
import { useBillsTotals, useDebtTotals } from "@/lib/useBillsTotals";
import { useGlobalSettings, num } from "@/lib/useGlobalSettings";
import { usePersonalExpenses } from "@/lib/usePersonalExpenses";
import { Link } from "react-router-dom";

type Payment = { id: string; amount: number; paid_on: string; method: string; is_deposit: boolean };

function fmt(n: number) { return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }); }

export default function AdminMoney() {
  const [recent, setRecent] = useState<Payment[]>([]);
  const [month, setMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const { presets: bizPresets, active: bizActive } = useAllocationPresets("business");
  const { presets: personalPresets, active: personalActive } = useAllocationPresets("personal");
  const { biz: liveBiz, per: livePer, loading: liveLoading } = useLiveCash();

  useEffect(() => {
    supabase.from("job_payments").select("id, amount, paid_on, method, is_deposit")
      .order("paid_on", { ascending: false }).limit(15)
      .then(({ data }) => setRecent((data as any) || []));
  }, []);

  const mr = monthRange(month);
  const yr = yearRange(month.slice(0, 4));
  const m = useMonthMoney(mr.from, mr.to);
  const ytd = useMonthMoney(yr.from, yr.to);
  const bizBills = useBillsTotals(mr.from, mr.to, "business");
  const personalBills = useBillsTotals(mr.from, mr.to, "personal");
  const personalDebt = useDebtTotals("personal", mr.from, mr.to);
  const exp = usePersonalExpenses(mr.from, mr.to);
  const { settings } = useGlobalSettings();

  const totalLabor = m.workerLabor + m.ownerPay + (m.includeBurden ? m.workerBurden : 0);
  const businessProfit = m.netProfit;
  const ownerDraw = exp.ownerDraw;
  const cashAfterObligations = businessProfit - bizBills.paid - ownerDraw;
  const bizTaxReserve = businessProfit * num(settings.business_tax_reserve_pct) / 100;
  const bizAllocBase = Math.max(businessProfit - bizTaxReserve, 0);

  const personalIncome = m.ownerPay + ownerDraw + exp.otherIncome;
  const personalTaxReserve = personalIncome * num(settings.personal_tax_reserve_pct) / 100;
  const personalCash = personalIncome - personalBills.paid - personalDebt.paidThisMonth - exp.totalExpenses;
  const personalAllocBase = Math.max(personalIncome - personalTaxReserve, 0);

  const months = useMemo(() => {
    const arr: string[] = [];
    const now = new Date();
    for (let i = 0; i < 18; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      arr.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    if (!arr.includes(month)) arr.unshift(month);
    return arr;
  }, [month]);

  return (
    <div className="container-tight py-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Money Tracker</h1>
          <p className="text-sm text-muted-foreground">Business and personal money — separate but in one place.</p>
        </div>
        <div className="w-44">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{months.map((mm) => <SelectItem key={mm} value={mm}>{mm}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {/* A. Business */}
      <Card className="p-5 space-y-3">
        <h2 className="font-bold flex items-center gap-2"><Users className="h-4 w-4 text-secondary" /> Business Money</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={<DollarSign className="h-5 w-5" />} label="Gross collected" value={fmt(m.collected)} sub={`${m.paymentCount} payments`} />
          <Stat icon={<Receipt className="h-5 w-5" />} label="Materials" value={fmt(m.materialsMe)} />
          <Stat icon={<Users className="h-5 w-5" />} label="Total labor cost" value={fmt(totalLabor)} sub="Workers + owner + extra" />
          <Stat icon={<Receipt className="h-5 w-5" />} label="Other job expenses" value={fmt(m.otherExp)} />
          <Stat icon={<TrendingUp className="h-5 w-5" />} label="Business profit" value={fmt(businessProfit)} highlight />
          <Stat icon={<Receipt className="h-5 w-5" />} label="Business bills paid" value={fmt(bizBills.paid)} />
          <Stat icon={<Receipt className="h-5 w-5" />} label="Business bills remaining" value={fmt(bizBills.remaining)} />
          <Stat icon={<TrendingUp className="h-5 w-5" />} label="Cash after obligations" value={fmt(cashAfterObligations)} sub="Profit − bills − draws" />
        </div>
        <Collapsible>
          <CollapsibleTrigger className="text-xs underline text-muted-foreground flex items-center gap-1"><ChevronDown className="h-3 w-3" /> Labor breakdown</CollapsibleTrigger>
          <CollapsibleContent className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <Mini label="Non-owner worker pay" value={fmt(m.workerLabor)} />
            <Mini label="Owner-worker pay" value={fmt(m.ownerPay)} />
            <Mini label="Extra worker cost" value={fmt(m.workerBurden)} />
            <Mini label="Total labor cost" value={fmt(totalLabor)} />
            <div className="sm:col-span-2 lg:col-span-4 text-[11px] text-muted-foreground">Extra Worker Cost includes tax reserve, workers comp, insurance, PPE, tools, and other costs of having workers.</div>
          </CollapsibleContent>
        </Collapsible>
        {m.pendingHoursCost > 0 && (
          <div className="text-xs p-2 rounded bg-secondary/10 text-secondary"><b>{fmt(m.pendingHoursCost)}</b> in pending (un-approved) worker hours — not yet counted in profit.</div>
        )}
      </Card>

      {/* B. Personal */}
      <Card className="p-5 space-y-3">
        <h2 className="font-bold flex items-center gap-2"><DollarSign className="h-4 w-4 text-success" /> Personal Money</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={<DollarSign className="h-5 w-5" />} label="Owner pay" value={fmt(m.ownerPay)} sub="From hours worked" />
          <Stat icon={<DollarSign className="h-5 w-5" />} label="Owner draw" value={fmt(ownerDraw)} sub="From business cash" />
          <Stat icon={<DollarSign className="h-5 w-5" />} label="Personal tax reserve" value={fmt(personalTaxReserve)} sub={`${settings.personal_tax_reserve_pct || 0}% of income`} />
          <Stat icon={<Receipt className="h-5 w-5" />} label="Personal bills paid" value={fmt(personalBills.paid)} />
          <Stat icon={<Receipt className="h-5 w-5" />} label="Personal expenses" value={fmt(exp.totalExpenses)} />
          <Stat icon={<CreditCard className="h-5 w-5" />} label="Personal debt paid" value={fmt(personalDebt.paidThisMonth)} />
          <Stat icon={<TrendingUp className="h-5 w-5" />} label="Personal cash remaining" value={fmt(personalCash)} highlight />
        </div>
        <div className="text-xs text-muted-foreground">Log expenses & draws on the <Link to="/admin/personal" className="underline">Personal page</Link>.</div>
      </Card>

      {/* C. Allocations */}
      <Card className="p-5 space-y-4">
        <h2 className="font-bold flex items-center gap-2"><Info className="h-4 w-4" /> Allocations</h2>

        <div>
          <div className="text-sm font-semibold mb-2">Business — splits {fmt(bizAllocBase)} (profit after tax reserve)</div>
          {bizAllocBase <= 0 && <div className="text-xs text-muted-foreground p-2 rounded bg-muted">No business profit to allocate.</div>}
          {bizAllocBase > 0 && (bizActive || bizPresets[0]) && (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {(bizActive || bizPresets[0])!.buckets.filter((b: any) => b.enabled !== false).map((b: any, i: number) => (
                <div key={i} className={`rounded-md p-2 ${bucketColorClass(b.color)}`}>
                  <div className="text-[11px] font-semibold">{b.name} ({b.percent}%)</div>
                  <div className="text-lg font-extrabold">{fmt(bizAllocBase * (Number(b.percent) || 0) / 100)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-border">
          <div className="text-sm font-semibold mb-2">Personal — splits {fmt(personalAllocBase)} (income after tax reserve)</div>
          {personalAllocBase <= 0 && <div className="text-xs text-muted-foreground p-2 rounded bg-muted">No personal income to allocate.</div>}
          {personalAllocBase > 0 && (personalActive || personalPresets[0]) && (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {(personalActive || personalPresets[0])!.buckets.filter((b: any) => b.enabled !== false).map((b: any, i: number) => (
                <div key={i} className={`rounded-md p-2 ${bucketColorClass(b.color)}`}>
                  <div className="text-[11px] font-semibold">{b.name} ({b.percent}%)</div>
                  <div className="text-lg font-extrabold">{fmt(personalAllocBase * (Number(b.percent) || 0) / 100)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground">Allocations only use available cash, not historical already-spent income. Edit presets in <Link to="/admin/settings" className="underline">Settings</Link>.</div>
      </Card>

      <Card className="p-5">
        <h2 className="font-bold">Year to Date ({month.slice(0, 4)})</h2>
        <div className="grid gap-3 sm:grid-cols-5 mt-3 text-sm">
          <div><div className="text-muted-foreground">Collected</div><div className="text-lg font-bold">{fmt(ytd.collected)}</div></div>
          <div><div className="text-muted-foreground">Materials</div><div className="text-lg font-bold">{fmt(ytd.materialsMe)}</div></div>
          <div><div className="text-muted-foreground">Total labor</div><div className="text-lg font-bold">{fmt(ytd.workerLabor + ytd.ownerPay + (ytd.includeBurden ? ytd.workerBurden : 0))}</div></div>
          <div><div className="text-muted-foreground">Other exp.</div><div className="text-lg font-bold">{fmt(ytd.otherExp)}</div></div>
          <div><div className="text-muted-foreground">Business profit</div><div className="text-lg font-bold text-success">{fmt(ytd.netProfit)}</div></div>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-bold mb-3">Recent Payments</h2>
        <div className="space-y-2 text-sm">
          {recent.map((p) => (
            <div key={p.id} className="flex items-center justify-between border-b border-border py-2">
              <div>
                <div className="font-semibold">{fmt(Number(p.amount))} {p.is_deposit && <span className="ml-1 text-xs text-secondary">deposit</span>}</div>
                <div className="text-xs text-muted-foreground">{p.paid_on} · {p.method}</div>
              </div>
            </div>
          ))}
          {recent.length === 0 && <p className="text-muted-foreground">No payments logged yet.</p>}
        </div>
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

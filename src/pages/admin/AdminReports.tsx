import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useMonthMoney, monthRange, yearRange } from "@/lib/useMonthMoney";
import { useBillsTotals, useDebtTotals } from "@/lib/useBillsTotals";
import { useGlobalSettings, isYes, num } from "@/lib/useGlobalSettings";
import { usePersonalExpenses } from "@/lib/usePersonalExpenses";
import { useHistoricalIncome } from "@/lib/useHistoricalIncome";
import { Download } from "lucide-react";

function csv(rows: (string | number)[][]) {
  return rows.map((r) => r.map((c) => {
    const s = String(c ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(",")).join("\n");
}
function dl(name: string, content: string) {
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}
function fmt(n: number) { return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }); }

export default function AdminReports() {
  const { settings } = useGlobalSettings();
  const burdenOn = isYes(settings.burden_in_reports);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const mr = useMemo(() => monthRange(month), [month]);
  const year = month.slice(0, 4);
  const yr = useMemo(() => yearRange(year), [year]);

  const m = useMonthMoney(mr.from, mr.to, burdenOn ? "force-on" : "force-off");
  const ym = useMonthMoney(yr.from, yr.to, burdenOn ? "force-on" : "force-off");
  const bizBills = useBillsTotals(mr.from, mr.to, "business");
  const personalBills = useBillsTotals(mr.from, mr.to, "personal");
  const ybizBills = useBillsTotals(yr.from, yr.to, "business");
  const bizDebt = useDebtTotals("business", mr.from, mr.to);
  const personalDebt = useDebtTotals("personal", mr.from, mr.to);
  const ybizDebt = useDebtTotals("business", yr.from, yr.to);
  const exp = usePersonalExpenses(mr.from, mr.to);
  const hist = useHistoricalIncome("business", yr.from, yr.to);

  // Payroll: paystubs in month + YTD
  const [paystubsMonth, setPaystubsMonth] = useState<any[]>([]);
  const [paystubsYTD, setPaystubsYTD] = useState<any[]>([]);
  const [openBalances, setOpenBalances] = useState<any[]>([]);
  const [reviewsNeeded, setReviewsNeeded] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: pm }, { data: py }, { data: ob }, { data: rn }] = await Promise.all([
        (supabase as any).from("paystubs").select("*").gte("pay_date", mr.from).lte("pay_date", mr.to),
        (supabase as any).from("paystubs").select("*").gte("pay_date", yr.from).lte("pay_date", yr.to),
        supabase.from("jobs").select("id, balance_due, customers(name, phone)").gt("balance_due", 0).eq("archived", false),
        supabase.from("jobs").select("id, job_type, updated_at, customers(name, phone)")
          .in("status", ["completed", "paid"]).eq("review_requested", false),
      ]);
      setPaystubsMonth((pm as any) || []);
      setPaystubsYTD((py as any) || []);
      setOpenBalances(ob || []); setReviewsNeeded(rn || []);
    })();
  }, [mr.from, mr.to, yr.from, yr.to]);

  // ==== Calculations ====
  const totalLabor = m.workerLabor + m.ownerPay + (burdenOn ? m.workerBurden : 0);
  const businessProfit = m.netProfit;
  const bizTaxReserve = businessProfit * num(settings.business_tax_reserve_pct) / 100;
  const ownerDraw = exp.ownerDraw;
  const bizCash = businessProfit - bizBills.paid - ownerDraw;
  const personalIncome = m.ownerPay + ownerDraw + exp.otherIncome;
  const personalTaxReserve = personalIncome * num(settings.personal_tax_reserve_pct) / 100;
  const personalCash = personalIncome - personalBills.paid - personalDebt.paidThisMonth - exp.totalExpenses;

  // Payroll tab
  const sumP = (arr: any[], k: string) => arr.reduce((s, p) => s + Number(p[k] || 0), 0);
  const pGross = sumP(paystubsMonth, "gross");
  const pNet = sumP(paystubsMonth, "net_pay");
  const pDed = sumP(paystubsMonth, "deductions_total");
  const pEmpCost = sumP(paystubsMonth, "employer_total_cost");
  const pExtra = pEmpCost - pGross;
  const ytdGross = sumP(paystubsYTD, "gross");
  const ytdNet = sumP(paystubsYTD, "net_pay");
  const ytdDed = sumP(paystubsYTD, "deductions_total");
  const ytdEmpCost = sumP(paystubsYTD, "employer_total_cost");

  // Tax planning tab
  const fedWH = sumP(paystubsMonth, "fed_wh");
  const ohWH = sumP(paystubsMonth, "state_wh");
  const localWH = sumP(paystubsMonth, "local_wh");
  const ficaEE = sumP(paystubsMonth, "fica_ee");
  const ficaER = sumP(paystubsMonth, "fica_er");
  const totalEstTaxes = fedWH + ohWH + localWH + ficaEE + ficaER + bizTaxReserve;

  // YTD tab
  const ytdActualPayments = ym.collected;
  const ytdHistorical = hist.ytdAmount;
  const ytdHistoricalSpent = hist.items.filter(i => i.already_spent).reduce((s, i) => s + Number(i.amount || 0), 0);
  const ytdHistoricalCash = hist.cashAmount;
  const ytdTotalIncome = ytdActualPayments + ytdHistorical;
  const ytdMaterials = ym.materialsMe;
  const ytdLabor = ym.workerLabor + ym.ownerPay + (burdenOn ? ym.workerBurden : 0);
  const ytdProfit = ym.netProfit;

  function exportMonth() {
    const rows: (string | number)[][] = [
      ["Section", "Metric", "Amount"],
      ["Business", "Gross collected", m.collected.toFixed(2)],
      ["Business", "Materials", m.materialsMe.toFixed(2)],
      ["Business", "Non-owner worker pay", m.workerLabor.toFixed(2)],
      ["Business", "Owner-Worker Pay", m.ownerPay.toFixed(2)],
      ["Business", "Extra Worker Cost", m.workerBurden.toFixed(2)],
      ["Business", "Total Cost to Business (labor)", totalLabor.toFixed(2)],
      ["Business", "Other job expenses", m.otherExp.toFixed(2)],
      ["Business", "Business profit", businessProfit.toFixed(2)],
      ["Business", "Bills paid", bizBills.paid.toFixed(2)],
      ["Business", "Debt paid", bizDebt.paidThisMonth.toFixed(2)],
      ["Business", "Tax reserve", bizTaxReserve.toFixed(2)],
      ["Business", "Cash after obligations", bizCash.toFixed(2)],
      ["Personal", "Owner-Worker Pay", m.ownerPay.toFixed(2)],
      ["Personal", "Owner Draw", ownerDraw.toFixed(2)],
      ["Personal", "Other income", exp.otherIncome.toFixed(2)],
      ["Personal", "Tax reserve", personalTaxReserve.toFixed(2)],
      ["Personal", "Personal expenses", exp.totalExpenses.toFixed(2)],
      ["Personal", "Personal bills paid", personalBills.paid.toFixed(2)],
      ["Personal", "Personal debt paid", personalDebt.paidThisMonth.toFixed(2)],
      ["Personal", "Cash remaining", personalCash.toFixed(2)],
      ["Payroll", "Worker gross", pGross.toFixed(2)],
      ["Payroll", "Worker net", pNet.toFixed(2)],
      ["Payroll", "Deductions", pDed.toFixed(2)],
      ["Payroll", "Extra Worker Cost", pExtra.toFixed(2)],
      ["Payroll", "Total Cost to Business", pEmpCost.toFixed(2)],
    ];
    dl(`shabba-money-${month}.csv`, csv(rows));
  }
  function exportOpenBalances() {
    const rows: (string | number)[][] = [["Customer", "Phone", "Open balance"]];
    openBalances.forEach((j: any) => rows.push([j.customers?.name || "", j.customers?.phone || "", Number(j.balance_due || 0).toFixed(2)]));
    dl(`shabba-open-balances.csv`, csv(rows));
  }

  return (
    <div className="container-tight py-6 space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label>Month</Label>
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
        <Button variant="outline" onClick={exportMonth} className="gap-1"><Download className="h-4 w-4" /> Export month CSV</Button>
        <div className="text-xs text-muted-foreground ml-auto">YTD = {year}</div>
      </div>

      <Tabs defaultValue="business">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="tax">Tax Planning</TabsTrigger>
          <TabsTrigger value="ytd">YTD</TabsTrigger>
        </TabsList>

        <TabsContent value="business" className="space-y-4">
          <Card className="p-5 space-y-3">
            <h2 className="font-bold">Business Report — {month}</h2>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              <Stat label="Gross collected" value={fmt(m.collected)} />
              <Stat label="Materials paid by me" value={fmt(m.materialsMe)} />
              <Stat label="Non-owner worker pay" value={fmt(m.workerLabor)} />
              <Stat label="Owner-Worker Pay" value={fmt(m.ownerPay)} />
              <Stat label="Other job expenses" value={fmt(m.otherExp)} />
              <Stat label="Extra Worker Cost" value={fmt(m.workerBurden)} />
              <Stat label="Total Cost to Business (labor)" value={fmt(totalLabor)} />
              <Stat label="Business bills paid" value={fmt(bizBills.paid)} />
              <Stat label="Business debt paid" value={fmt(bizDebt.paidThisMonth)} />
              <Stat label="Tax reserve" value={fmt(bizTaxReserve)} />
              <Stat label="Business profit" value={fmt(businessProfit)} highlight />
              <Stat label="Cash after obligations" value={fmt(bizCash)} highlight />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold">Open balances ({openBalances.length})</h2>
              <Button size="sm" variant="outline" onClick={exportOpenBalances}><Download className="h-3.5 w-3.5" /></Button>
            </div>
            <div className="text-sm space-y-1">
              {openBalances.slice(0, 25).map((j: any) => (
                <div key={j.id} className="flex justify-between gap-2 border-b border-border py-1">
                  <span className="truncate">{j.customers?.name || "—"}</span>
                  <b>${Number(j.balance_due || 0).toFixed(0)}</b>
                </div>
              ))}
              {openBalances.length === 0 && <div className="text-muted-foreground">No open balances.</div>}
            </div>
            <div className="mt-2 text-sm text-right">Total: <b>${openBalances.reduce((s: number, j: any) => s + Number(j.balance_due || 0), 0).toFixed(0)}</b></div>
          </Card>
        </TabsContent>

        <TabsContent value="personal" className="space-y-4">
          <Card className="p-5 space-y-3">
            <h2 className="font-bold">Personal Report — {month}</h2>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              <Stat label="Owner-Worker Pay" value={fmt(m.ownerPay)} />
              <Stat label="Owner Draw / Transfer to Personal" value={fmt(ownerDraw)} />
              <Stat label="Other personal income" value={fmt(exp.otherIncome)} />
              <Stat label="Personal bills paid" value={fmt(personalBills.paid)} />
              <Stat label="Personal debts paid" value={fmt(personalDebt.paidThisMonth)} />
              <Stat label="Personal expenses" value={fmt(exp.totalExpenses)} />
              <Stat label="Tax reserve" value={fmt(personalTaxReserve)} />
              <Stat label="Personal remaining cash" value={fmt(personalCash)} highlight />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="space-y-4">
          <Card className="p-5 space-y-3">
            <h2 className="font-bold">Payroll Report — {month}</h2>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              <Stat label="Worker gross pay" value={fmt(pGross)} />
              <Stat label="Tax / deductions withheld" value={fmt(pDed)} />
              <Stat label="Worker net pay" value={fmt(pNet)} />
              <Stat label="Extra Worker Cost (employer)" value={fmt(pExtra)} />
              <Stat label="Total Cost to Business" value={fmt(pEmpCost)} highlight />
              <Stat label="Owner-Worker Pay (logged)" value={fmt(m.ownerPay)} />
              <Stat label="Non-owner worker pay (logged)" value={fmt(m.workerLabor)} />
              <Stat label="Paystubs in month" value={String(paystubsMonth.length)} />
            </div>
          </Card>
          <Card className="p-5 space-y-3">
            <h2 className="font-bold">YTD Payroll Totals — {year}</h2>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
              <Stat label="YTD gross" value={fmt(ytdGross)} />
              <Stat label="YTD deductions" value={fmt(ytdDed)} />
              <Stat label="YTD net" value={fmt(ytdNet)} />
              <Stat label="YTD total cost to business" value={fmt(ytdEmpCost)} highlight />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="tax" className="space-y-4">
          <Card className="p-5 space-y-3">
            <h2 className="font-bold">Tax Planning — {month}</h2>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              <Stat label="Federal WH (paystubs)" value={fmt(fedWH)} />
              <Stat label="Ohio WH (paystubs)" value={fmt(ohWH)} />
              <Stat label="Columbus/local WH" value={fmt(localWH)} />
              <Stat label="FICA — employee" value={fmt(ficaEE)} />
              <Stat label="FICA — employer" value={fmt(ficaER)} />
              <Stat label={`Business tax reserve (${num(settings.business_tax_reserve_pct)}%)`} value={fmt(bizTaxReserve)} />
              <Stat label={`Personal tax reserve (${num(settings.personal_tax_reserve_pct)}%)`} value={fmt(personalTaxReserve)} />
              <Stat label="Total estimated taxes" value={fmt(totalEstTaxes)} highlight />
            </div>
            <p className="text-[11px] text-muted-foreground">Estimates only — for planning. Not a tax filing.</p>
          </Card>
        </TabsContent>

        <TabsContent value="ytd" className="space-y-4">
          <Card className="p-5 space-y-3">
            <h2 className="font-bold">YTD Report — {year}</h2>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              <Stat label="Historical imported income" value={fmt(ytdHistorical)} />
              <Stat label="Already spent (historical)" value={fmt(ytdHistoricalSpent)} />
              <Stat label="Current cash from historical" value={fmt(ytdHistoricalCash)} />
              <Stat label="Actual job payments YTD" value={fmt(ytdActualPayments)} />
              <Stat label="Total YTD business income" value={fmt(ytdTotalIncome)} highlight />
              <Stat label="YTD materials" value={fmt(ytdMaterials)} />
              <Stat label="YTD labor (all)" value={fmt(ytdLabor)} />
              <Stat label="YTD bills paid" value={fmt(ybizBills.paid)} />
              <Stat label="YTD debt paid" value={fmt(ybizDebt.paidThisMonth)} />
              <Stat label="YTD profit (jobs only)" value={fmt(ytdProfit)} highlight />
            </div>
            <p className="text-[11px] text-muted-foreground">
              "Already spent" historical income counts in YTD income, but NOT in current cash.
            </p>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="p-4">
        <h2 className="font-bold mb-2">Review requests needed ({reviewsNeeded.length})</h2>
        <div className="text-sm space-y-1">
          {reviewsNeeded.slice(0, 25).map((r: any) => (
            <div key={r.id} className="flex justify-between gap-2 border-b border-border py-1">
              <span className="truncate">{r.customers?.name || "—"}</span>
              <span className="text-xs text-muted-foreground">{new Date(r.updated_at).toLocaleDateString()}</span>
            </div>
          ))}
          {reviewsNeeded.length === 0 && <div className="text-muted-foreground">All caught up.</div>}
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card className={`p-3 ${highlight ? "bg-success/5 border-success/40" : ""}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-xl font-extrabold ${highlight ? "text-success" : ""}`}>{value}</div>
    </Card>
  );
}

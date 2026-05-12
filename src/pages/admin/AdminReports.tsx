import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useMonthMoney, monthRange } from "@/lib/useMonthMoney";
import { useBillsTotals, useDebtTotals } from "@/lib/useBillsTotals";
import { useGlobalSettings, isYes, num } from "@/lib/useGlobalSettings";
import { usePersonalExpenses } from "@/lib/usePersonalExpenses";
import { Download, ChevronDown } from "lucide-react";

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

export default function AdminReports() {
  const { settings } = useGlobalSettings();
  const burdenOn = isYes(settings.burden_in_reports);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const mr = useMemo(() => monthRange(month), [month]);
  const m = useMonthMoney(mr.from, mr.to, burdenOn ? "force-on" : "force-off");
  const bizBills = useBillsTotals(mr.from, mr.to, "business");
  const personalBills = useBillsTotals(mr.from, mr.to, "personal");
  const bizDebt = useDebtTotals("business", mr.from, mr.to);
  const personalDebt = useDebtTotals("personal", mr.from, mr.to);
  const exp = usePersonalExpenses(mr.from, mr.to);
  const [openBalances, setOpenBalances] = useState<any[]>([]);
  const [reviewsNeeded, setReviewsNeeded] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: ob }, { data: rn }] = await Promise.all([
        supabase.from("jobs").select("id, balance_due, customers(name, phone)").gt("balance_due", 0).eq("archived", false),
        supabase.from("jobs").select("id, job_type, updated_at, customers(name, phone)")
          .in("status", ["completed", "paid"]).eq("review_requested", false),
      ]);
      setOpenBalances(ob || []); setReviewsNeeded(rn || []);
    })();
  }, [month]);

  const totalLabor = m.workerLabor + m.ownerPay + (burdenOn ? m.workerBurden : 0);
  const businessProfit = m.netProfit;
  const bizTaxReserve = businessProfit * num(settings.business_tax_reserve_pct) / 100;
  const ownerDraw = exp.ownerDraw;
  const bizCash = businessProfit - bizBills.paid - ownerDraw;
  const personalIncome = m.ownerPay + ownerDraw + exp.otherIncome;
  const personalTaxReserve = personalIncome * num(settings.personal_tax_reserve_pct) / 100;
  const personalCash = personalIncome - personalBills.paid - personalDebt.paidThisMonth - exp.totalExpenses;

  function exportMonth() {
    const rows: (string | number)[][] = [
      ["Section", "Metric", "Amount"],
      ["Business", "Gross collected", m.collected.toFixed(2)],
      ["Business", "Materials", m.materialsMe.toFixed(2)],
      ["Business", "Non-owner worker pay", m.workerLabor.toFixed(2)],
      ["Business", "Owner-worker pay", m.ownerPay.toFixed(2)],
      ["Business", "Extra worker cost", m.workerBurden.toFixed(2)],
      ["Business", "Total labor cost", totalLabor.toFixed(2)],
      ["Business", "Other job expenses", m.otherExp.toFixed(2)],
      ["Business", "Business profit", businessProfit.toFixed(2)],
      ["Business", "Bills paid", bizBills.paid.toFixed(2)],
      ["Business", "Debt paid", bizDebt.paidThisMonth.toFixed(2)],
      ["Business", "Tax reserve", bizTaxReserve.toFixed(2)],
      ["Business", "Cash after obligations", bizCash.toFixed(2)],
      ["Personal", "Owner pay", m.ownerPay.toFixed(2)],
      ["Personal", "Owner draw", ownerDraw.toFixed(2)],
      ["Personal", "Other income", exp.otherIncome.toFixed(2)],
      ["Personal", "Tax reserve", personalTaxReserve.toFixed(2)],
      ["Personal", "Personal expenses", exp.totalExpenses.toFixed(2)],
      ["Personal", "Personal bills paid", personalBills.paid.toFixed(2)],
      ["Personal", "Personal debt paid", personalDebt.paidThisMonth.toFixed(2)],
      ["Personal", "Cash remaining", personalCash.toFixed(2)],
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
        <div className="text-xs text-muted-foreground ml-auto">Reports use actual dated transactions.</div>
      </div>

      {/* Business Report */}
      <Card className="p-5 space-y-3">
        <h2 className="font-bold">Business Report</h2>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Gross collected" value={fmt(m.collected)} />
          <Stat label="Materials" value={fmt(m.materialsMe)} />
          <Stat label="Non-owner pay" value={fmt(m.workerLabor)} />
          <Stat label="Owner-worker pay" value={fmt(m.ownerPay)} />
          <Stat label="Extra worker cost" value={fmt(m.workerBurden)} />
          <Stat label="Total labor cost" value={fmt(totalLabor)} />
          <Stat label="Other job expenses" value={fmt(m.otherExp)} />
          <Stat label="Business profit" value={fmt(businessProfit)} highlight />
          <Stat label="Business bills paid" value={fmt(bizBills.paid)} />
          <Stat label="Business bills remaining" value={fmt(bizBills.remaining)} />
          <Stat label="Business debt paid" value={fmt(bizDebt.paidThisMonth)} />
          <Stat label="Business tax reserve" value={fmt(bizTaxReserve)} />
          <Stat label="Business cash" value={fmt(bizCash)} />
        </div>
      </Card>

      {/* Personal Report */}
      <Card className="p-5 space-y-3">
        <h2 className="font-bold">Personal Report</h2>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Owner pay" value={fmt(m.ownerPay)} />
          <Stat label="Owner draw" value={fmt(ownerDraw)} />
          <Stat label="Other personal income" value={fmt(exp.otherIncome)} />
          <Stat label="Personal tax reserve" value={fmt(personalTaxReserve)} />
          <Stat label="Personal expenses" value={fmt(exp.totalExpenses)} />
          <Stat label="Personal bills paid" value={fmt(personalBills.paid)} />
          <Stat label="Personal debt paid" value={fmt(personalDebt.paidThisMonth)} />
          <Stat label="Personal cash remaining" value={fmt(personalCash)} highlight />
        </div>
      </Card>

      {/* Labor Report */}
      <Card className="p-5 space-y-3">
        <h2 className="font-bold">Labor Report</h2>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          <Stat label="Owner labor" value={fmt(m.ownerPay)} />
          <Stat label="Non-owner labor" value={fmt(m.workerLabor)} />
          <Stat label="Extra worker cost" value={fmt(m.workerBurden)} />
          <Stat label="Total labor cost" value={fmt(totalLabor)} highlight />
        </div>
        <Collapsible>
          <CollapsibleTrigger className="text-xs underline text-muted-foreground flex items-center gap-1"><ChevronDown className="h-3 w-3" /> What is "Extra Worker Cost"?</CollapsibleTrigger>
          <CollapsibleContent className="mt-2 text-xs text-muted-foreground p-3 rounded bg-muted">
            Extra Worker Cost includes tax reserve, workers comp, insurance, PPE, tools, and other costs of having workers. This is for planning — not payroll filing.
          </CollapsibleContent>
        </Collapsible>
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

function fmt(n: number) { return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }); }

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card className={`p-3 ${highlight ? "bg-success/5 border-success/40" : ""}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-xl font-extrabold ${highlight ? "text-success" : ""}`}>{value}</div>
    </Card>
  );
}

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMonthMoney, monthRange } from "@/lib/useMonthMoney";
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

export default function AdminReports() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const mr = useMemo(() => monthRange(month), [month]);
  const money = useMonthMoney(mr.from, mr.to);
  const [openBalances, setOpenBalances] = useState<any[]>([]);
  const [billsDue, setBillsDue] = useState<any[]>([]);
  const [debts, setDebts] = useState<any[]>([]);
  const [reviewsNeeded, setReviewsNeeded] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: ob }, { data: bd }, { data: d }, { data: rn }] = await Promise.all([
        supabase.from("jobs").select("id, balance_due, customers(name, phone)").gt("balance_due", 0).eq("archived", false),
        supabase.from("bills").select("*").eq("paid", false).order("due_date", { ascending: true }),
        supabase.from("debts").select("*").eq("paid_off", false),
        supabase.from("jobs").select("id, job_type, updated_at, customers(name, phone)")
          .in("status", ["completed", "paid"]).eq("review_requested", false),
      ]);
      setOpenBalances(ob || []); setBillsDue(bd || []); setDebts(d || []); setReviewsNeeded(rn || []);
    })();
  }, [month]);

  function exportMonth() {
    const rows: (string | number)[][] = [
      ["Metric", "Amount"],
      ["Income (collected)", money.collected.toFixed(2)],
      ["Materials (paid by me)", money.materialsMe.toFixed(2)],
      ["Worker labor", money.workerLabor.toFixed(2)],
      ["Other expenses", money.otherExp.toFixed(2)],
      ["Net profit", money.netProfit.toFixed(2)],
    ];
    dl(`shabba-money-${month}.csv`, csv(rows));
  }
  function exportOpenBalances() {
    const rows: (string | number)[][] = [["Customer", "Phone", "Open balance"]];
    openBalances.forEach((j: any) => rows.push([j.customers?.name || "", j.customers?.phone || "", Number(j.balance_due || 0).toFixed(2)]));
    dl(`shabba-open-balances.csv`, csv(rows));
  }

  const totalDebt = debts.reduce((s: number, d: any) => s + Number(d.current_balance || 0), 0);
  const startDebt = debts.reduce((s: number, d: any) => s + Number(d.starting_balance || 0), 0);
  const debtPaidPct = startDebt > 0 ? Math.round(((startDebt - totalDebt) / startDebt) * 100) : 0;

  return (
    <div className="container-tight py-6 space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label>Month</Label>
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
        <Button variant="outline" onClick={exportMonth} className="gap-1"><Download className="h-4 w-4" /> Export month CSV</Button>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Income" value={`$${money.collected.toFixed(0)}`} />
        <Stat label="Materials (me)" value={`$${money.materialsMe.toFixed(0)}`} />
        <Stat label="Worker labor" value={`$${money.workerLabor.toFixed(0)}`} />
        <Stat label="Other expenses" value={`$${money.otherExp.toFixed(0)}`} />
        <Stat label="NET PROFIT" value={`$${money.netProfit.toFixed(0)}`} highlight />
      </div>

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
        <h2 className="font-bold mb-2">Bills due ({billsDue.length})</h2>
        <div className="text-sm space-y-1">
          {billsDue.slice(0, 25).map((b: any) => (
            <div key={b.id} className="flex justify-between gap-2 border-b border-border py-1">
              <span className="truncate">{b.name} {b.due_date ? `· ${b.due_date}` : ""}</span>
              <b>${Number(b.amount || 0).toFixed(0)}</b>
            </div>
          ))}
          {billsDue.length === 0 && <div className="text-muted-foreground">All bills paid.</div>}
        </div>
        <div className="mt-2 text-sm text-right">Total: <b>${billsDue.reduce((s: number, b: any) => s + Number(b.amount || 0), 0).toFixed(0)}</b></div>
      </Card>

      <Card className="p-4">
        <h2 className="font-bold mb-2">Debt payoff progress</h2>
        <div className="text-sm">
          Total remaining: <b>${totalDebt.toFixed(0)}</b> of <b>${startDebt.toFixed(0)}</b> · {debtPaidPct}% paid
        </div>
        <div className="mt-2 h-2 rounded bg-muted overflow-hidden">
          <div className="h-full bg-success" style={{ width: `${debtPaidPct}%` }} />
        </div>
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

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card className={`p-3 ${highlight ? "bg-success/5 border-success/40" : ""}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-xl font-extrabold ${highlight ? "text-success" : ""}`}>{value}</div>
    </Card>
  );
}

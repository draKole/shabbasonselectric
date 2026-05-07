import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, TrendingUp, Receipt, Wallet, Info, Users } from "lucide-react";
import { useAllocationPresets, bucketColorClass } from "@/lib/useAllocations";
import { Link } from "react-router-dom";

type Payment = { id: string; amount: number; paid_on: string; method: string; is_deposit: boolean; job_id: string };
type Material = { id: string; cost: number; purchased_on: string; paid_by: string; job_id: string };
type JobExp = { id: string; other_expenses: number; worker_labor_cost: number; updated_at: string };

function monthKey(d: string) { return d.slice(0, 7); }
function fmt(n: number) { return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }); }

export default function AdminMoney() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [jobs, setJobs] = useState<JobExp[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const { presets, active } = useAllocationPresets();
  const [presetId, setPresetId] = useState<string | null>(null);

  useEffect(() => { if (active && !presetId) setPresetId(active.id); }, [active, presetId]);

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: m }, { data: j }] = await Promise.all([
        supabase.from("job_payments").select("id, amount, paid_on, method, is_deposit, job_id").order("paid_on", { ascending: false }),
        supabase.from("job_materials").select("id, cost, purchased_on, paid_by, job_id"),
        supabase.from("jobs").select("id, other_expenses, worker_labor_cost, updated_at"),
      ]);
      setPayments((p as any) || []);
      setMaterials((m as any) || []);
      setJobs((j as any) || []);
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
    // Approximate worker labor + other expenses by jobs that had payments in this month
    const activeJobIds = new Set(pInMonth.map((p) => p.job_id));
    const expJobs = jobs.filter((j) => activeJobIds.has(j.id));
    const workerLabor = expJobs.reduce((s, j) => s + Number(j.worker_labor_cost || 0), 0);
    const otherExp = expJobs.reduce((s, j) => s + Number(j.other_expenses || 0), 0);
    const netProfit = Math.max(collected - materialsMe - workerLabor - otherExp, 0);
    return { collected, materialsMe, workerLabor, otherExp, netProfit, count: pInMonth.length };
  }, [payments, materials, jobs, month]);

  const ytd = useMemo(() => {
    const year = month.slice(0, 4);
    const yp = payments.filter((p) => p.paid_on.startsWith(year));
    const collected = yp.reduce((s, p) => s + Number(p.amount || 0), 0);
    const materialsMe = materials.filter((m) => m.purchased_on.startsWith(year) && m.paid_by === "me").reduce((s, m) => s + Number(m.cost || 0), 0);
    const ids = new Set(yp.map((p) => p.job_id));
    const expJobs = jobs.filter((j) => ids.has(j.id));
    const workerLabor = expJobs.reduce((s, j) => s + Number(j.worker_labor_cost || 0), 0);
    const otherExp = expJobs.reduce((s, j) => s + Number(j.other_expenses || 0), 0);
    const net = Math.max(collected - materialsMe - workerLabor - otherExp, 0);
    return { collected, materialsMe, workerLabor, otherExp, net };
  }, [payments, materials, jobs, month]);

  const selectedPreset = presets.find((p) => p.id === presetId) || active;

  if (loading) return <div className="container-tight py-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="container-tight py-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Money Tracker</h1>
          <p className="text-sm text-muted-foreground">Net profit after all job expenses — that's what gets allocated.</p>
        </div>
        <div className="flex gap-2">
          <div className="w-44">
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{months.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat icon={<DollarSign className="h-5 w-5" />} label="Gross collected" value={fmt(monthData.collected)} sub={`${monthData.count} payments`} />
        <Stat icon={<Receipt className="h-5 w-5" />} label="Materials (me)" value={fmt(monthData.materialsMe)} sub="Subtracted" />
        <Stat icon={<Users className="h-5 w-5" />} label="Worker labor" value={fmt(monthData.workerLabor)} sub="Subtracted" />
        <Stat icon={<Receipt className="h-5 w-5" />} label="Other expenses" value={fmt(monthData.otherExp)} sub="Subtracted" />
        <Stat icon={<TrendingUp className="h-5 w-5" />} label="NET PROFIT" value={fmt(monthData.netProfit)} sub="What you keep" highlight />
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="font-bold flex items-center gap-2"><Info className="h-4 w-4" /> Allocation Split (Net Profit)</h2>
          <div className="w-56">
            <Select value={presetId || ""} onValueChange={setPresetId}>
              <SelectTrigger><SelectValue placeholder="Pick preset" /></SelectTrigger>
              <SelectContent>
                {presets.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}{p.is_active ? " (active)" : ""}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Allocations are based on <b>net profit ({fmt(monthData.netProfit)})</b> after job expenses, not total customer payment.
          Edit presets in <Link to="/admin/settings" className="underline">Settings</Link>.
        </p>
        {monthData.netProfit === 0 && (
          <div className="text-sm text-muted-foreground p-3 rounded bg-muted">No net profit this month yet — nothing to allocate. (Allocations only apply to take-home profit.)</div>
        )}
        {monthData.netProfit > 0 && selectedPreset && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {selectedPreset.buckets.filter((b: any) => b.enabled !== false).map((b: any, i: number) => (
              <div key={i} className={`rounded-md p-3 ${bucketColorClass(b.color)}`}>
                <div className="text-xs font-semibold">{b.name} ({b.percent}%)</div>
                <div className="text-xl font-extrabold">{fmt(monthData.netProfit * (Number(b.percent) || 0) / 100)}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="font-bold">Year to Date ({month.slice(0, 4)})</h2>
        <div className="grid gap-3 sm:grid-cols-5 mt-3 text-sm">
          <div><div className="text-muted-foreground">Collected</div><div className="text-lg font-bold">{fmt(ytd.collected)}</div></div>
          <div><div className="text-muted-foreground">Materials</div><div className="text-lg font-bold">{fmt(ytd.materialsMe)}</div></div>
          <div><div className="text-muted-foreground">Worker labor</div><div className="text-lg font-bold">{fmt(ytd.workerLabor)}</div></div>
          <div><div className="text-muted-foreground">Other exp.</div><div className="text-lg font-bold">{fmt(ytd.otherExp)}</div></div>
          <div><div className="text-muted-foreground">Net Profit</div><div className="text-lg font-bold text-success">{fmt(ytd.net)}</div></div>
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

function Stat({ icon, label, value, sub, highlight }: { icon: React.ReactNode; label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <Card className={`p-4 ${highlight ? "border-success/50 bg-success/5" : ""}`}>
      <div className="flex items-center gap-2 text-muted-foreground text-xs">{icon}{label}</div>
      <div className={`text-2xl font-extrabold mt-1 ${highlight ? "text-success" : ""}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </Card>
  );
}

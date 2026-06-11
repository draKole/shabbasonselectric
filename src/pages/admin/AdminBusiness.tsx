import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { DollarSign, Receipt, Users, TrendingUp, CreditCard, Info, Wallet, Ticket, ArrowRightLeft, PieChart, Plus, Trash2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useMonthMoney, monthRange } from "@/lib/useMonthMoney";
import { useBillsTotals, useDebtTotals } from "@/lib/useBillsTotals";
import { useAllocationPresets, bucketColorClass } from "@/lib/useAllocations";
import { useGlobalSettings, num } from "@/lib/useGlobalSettings";
import { usePersonalExpenses } from "@/lib/usePersonalExpenses";
import { useLiveCash, fmtMoney as fmt, weekStart } from "@/lib/useLiveCash";
import { CashReconciliationCard, ReconciliationWarning } from "@/components/admin/CashReconciliationCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const BIZ_CATEGORIES = ["Business Bills", "Business Debt", "Reserve", "Tools / Equipment", "Payroll Reserve", "Insurance", "Marketing", "Permits / Software", "Other"];

export default function AdminBusiness() {
  const monthKey = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const mr = useMemo(() => monthRange(monthKey), [monthKey]);
  const money = useMonthMoney(mr.from, mr.to);
  const bills = useBillsTotals(mr.from, mr.to, "business");
  const debt = useDebtTotals("business", mr.from, mr.to);
  const { presets, active } = useAllocationPresets("business");
  const { settings } = useGlobalSettings();
  const exp = usePersonalExpenses(mr.from, mr.to);
  const live = useLiveCash();

  const totalLabor = money.workerLabor + money.ownerPay + (money.includeBurden ? money.workerBurden : 0);
  const businessProfit = money.netProfit;
  const ownerDraws = exp.ownerDraw;
  const cashAfterObligations = businessProfit - bills.paid - ownerDraws;
  const taxReserve = businessProfit * num(settings.business_tax_reserve_pct) / 100;
  const allocBase = Math.max(businessProfit - taxReserve, 0);
  const preset = active || presets[0];

  return (
    <div className="container-tight py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">Business</h1>
        <p className="text-sm text-muted-foreground">Company money — live cash, allocations, and obligations. Personal pay is in <Link to="/admin/personal" className="underline">Personal</Link>.</p>
      </div>

      {/* LIVE CASH SECTION */}
      <section className="space-y-2">
        <h2 className="font-bold text-sm uppercase text-muted-foreground flex items-center gap-2"><Wallet className="h-4 w-4" /> Live Cash</h2>
        <ReconciliationWarning show={live.biz && !live.biz.is_reconciled} />
        {!live.biz ? <Card className="p-4 text-sm text-muted-foreground">Loading…</Card> : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat icon={<Wallet className="h-5 w-5" />} label="Business Live Cash" value={fmt(live.biz.live_cash)} sub="Cash currently in business" highlight />
            <Stat icon={<DollarSign className="h-5 w-5" />} label="Accounts Receivable / Open Job Balances" value={fmt(live.openJobBalance)} sub="Still owed, not cash" />
            <Stat icon={<PieChart className="h-5 w-5" />} label="Assigned (not spent)" value={fmt(live.biz.assigned)} />
            <Stat icon={<Wallet className="h-5 w-5" />} label="Unassigned available" value={fmt(live.biz.unassigned)} sub="Live cash − assigned" />
            <Stat icon={<Ticket className="h-5 w-5" />} label="Voucher liability" value={fmt(live.biz.voucher_liability)} sub="Owed in labor credit" />
            <Stat icon={<DollarSign className="h-5 w-5" />} label="Payments in" value={fmt(live.biz.payments_in)} />
            <Stat icon={<Ticket className="h-5 w-5" />} label="Voucher cash in" value={fmt(live.biz.voucher_cash_in)} />
            <Stat icon={<ArrowRightLeft className="h-5 w-5" />} label="Owner pay transferred" value={fmt(live.biz.transfers_out)} sub="Sent to personal" />
            <Stat icon={<Receipt className="h-5 w-5" />} label="Business bills paid" value={fmt(live.biz.bills_out)} />
          </div>
        )}
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        <WeeklyAllocationCard unassigned={live.biz?.unassigned || 0} onDone={live.reload} />
        <OwnerPayTransferCard onDone={live.reload} />
      </div>

      <CashReconciliationCard accountType="business" currentBalance={live.biz?.live_cash || 0} reconciliationDate={live.biz?.reconciliation_date} onDone={live.reload} />

      <BusinessAssignmentsPanel onDone={live.reload} />

      {/* Existing month sections retained below */}
      <section className="space-y-2 pt-4 border-t border-border">
        <h2 className="font-bold text-sm uppercase text-muted-foreground">This Month</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Stat icon={<DollarSign className="h-5 w-5" />} label="Gross collected (month)" value={fmt(money.collected)} sub={`${money.paymentCount} payments`} />
          <Stat icon={<TrendingUp className="h-5 w-5" />} label="Business job profit" value={fmt(businessProfit)} sub="Collected − job costs" highlight />
          <Stat icon={<TrendingUp className="h-5 w-5" />} label="Cash after obligations" value={fmt(cashAfterObligations)} sub="Profit − bills − draws" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={<Receipt className="h-5 w-5" />} label="Materials" value={fmt(money.materialsMe)} />
          <Stat icon={<Users className="h-5 w-5" />} label="Worker pay" value={fmt(money.workerLabor)} />
          <Stat icon={<Users className="h-5 w-5" />} label="Owner pay" value={fmt(money.ownerPay)} />
          <Stat icon={<Users className="h-5 w-5" />} label="Total labor cost" value={fmt(totalLabor)} />
          <Stat icon={<Receipt className="h-5 w-5" />} label="Business bills remaining" value={fmt(bills.remaining)} sub={bills.pastDue > 0 ? `${fmt(bills.pastDue)} past due` : undefined} />
          <Stat icon={<CreditCard className="h-5 w-5" />} label="Business debt (month)" value={fmt(debt.paidThisMonth)} sub={`Remaining: ${fmt(debt.remaining)}`} />
          <Stat icon={<DollarSign className="h-5 w-5" />} label="Business tax reserve" value={fmt(taxReserve)} sub={`${settings.business_tax_reserve_pct || 0}% of profit`} />
        </div>
      </section>

      <Card className="p-5">
        <h2 className="font-bold mb-1">Business Allocation Preset</h2>
        <p className="text-xs text-muted-foreground mb-3">Splits <b>business profit after tax reserve ({fmt(allocBase)})</b>. Buckets keep the company afloat. Edit in <Link to="/admin/settings" className="underline">Settings</Link>.</p>
        {allocBase <= 0 && <div className="text-sm text-muted-foreground p-3 rounded bg-muted">No business profit available to allocate this month.</div>}
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
        <CollapsibleTrigger className="text-xs underline text-muted-foreground">Labor breakdown</CollapsibleTrigger>
        <CollapsibleContent className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <Mini label="Non-owner pay" value={fmt(money.workerLabor)} />
          <Mini label="Owner-worker pay" value={fmt(money.ownerPay)} />
          <Mini label="Extra worker cost" value={fmt(money.workerBurden)} />
          <Mini label="Total labor cost" value={fmt(totalLabor)} />
        </CollapsibleContent>
      </Collapsible>

      <Card className="p-4 text-xs text-muted-foreground flex gap-2"><Info className="h-3.5 w-3.5 mt-0.5 shrink-0" /><span><b>Live Cash</b> = money still physically in the business. Allocating money does <b>not</b> reduce live cash — it reduces unassigned cash. Money leaves live cash when bills are paid, owner pay is transferred, or workers are paid.</span></Card>
    </div>
  );
}

function WeeklyAllocationCard({ unassigned, onDone }: { unassigned: number; onDone: () => void }) {
  const { active, presets } = useAllocationPresets("business");
  const preset = active || presets[0];
  const week = weekStart();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(Math.floor(unassigned)));
  const [busy, setBusy] = useState(false);
  const [existing, setExisting] = useState<any | null>(null);

  useEffect(() => { setAmount(String(Math.floor(unassigned))); }, [unassigned]);
  useEffect(() => {
    supabase.from("allocations").select("*").eq("period_week", week).eq("source_type", "manual_business").maybeSingle()
      .then(({ data }) => setExisting(data || null));
  }, [week, open]);

  function pct(name: string) {
    const b = preset?.buckets?.find((x: any) => x.name?.toLowerCase().includes(name));
    return Number(b?.percent || 0);
  }
  const ownerPct = pct("owner") || 85;
  const overheadPct = pct("overhead") || 10;
  const reservePct = pct("reserve") || 5;

  async function run() {
    const amt = Number(amount);
    if (amt <= 0) return toast.error("Enter an amount");
    if (existing) return toast.error("Allocation already exists for this week");
    setBusy(true);
    const owner = +(amt * ownerPct / 100).toFixed(2);
    const overhead = +(amt * overheadPct / 100).toFixed(2);
    const reserve = +(amt * reservePct / 100).toFixed(2);
    const { error } = await (supabase as any).from("allocations").insert({
      period_week: week, source_type: "manual_business",
      gross_amount: amt, net_amount: amt,
      owner_pay_amount: owner, overhead_amount: overhead, reserve_amount: reserve,
      status: "allocated", notes: `Weekly allocation ${ownerPct}/${overheadPct}/${reservePct}`,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Weekly allocation created");
    setOpen(false);
    onDone();
  }

  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-bold flex items-center gap-2"><PieChart className="h-4 w-4" />Weekly Allocation</h3>
        <span className="text-xs text-muted-foreground">Week of {week}</span>
      </div>
      <div className="text-sm text-muted-foreground">Unassigned business cash available: <b className="text-foreground">{fmt(unassigned)}</b></div>
      <div className="text-xs">Split: Owner Pay {ownerPct}% · Overhead {overheadPct}% · Reserve {reservePct}%</div>
      {existing && <div className="text-xs p-2 rounded bg-muted">Weekly allocation already exists for this period ({fmt(Number(existing.gross_amount))}).</div>}
      <Button onClick={() => setOpen(true)} disabled={unassigned <= 0 || !!existing} className="w-full gap-1"><Plus className="h-4 w-4" />Run Weekly Allocation</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Preview Weekly Allocation</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <div><Label>Amount to allocate</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
            <div className="grid grid-cols-3 gap-2">
              <Preview label={`Owner ${ownerPct}%`} v={Number(amount) * ownerPct / 100} />
              <Preview label={`Overhead ${overheadPct}%`} v={Number(amount) * overheadPct / 100} />
              <Preview label={`Reserve ${reservePct}%`} v={Number(amount) * reservePct / 100} />
            </div>
            <p className="text-xs text-muted-foreground">Live Cash stays the same. Unassigned cash decreases. Owner pay can then be transferred to Personal.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={run} disabled={busy}>Confirm</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
function Preview({ label, v }: { label: string; v: number }) {
  return <div className="rounded border border-border p-2"><div className="text-[10px] text-muted-foreground">{label}</div><div className="font-bold">{fmt(v)}</div></div>;
}

function OwnerPayTransferCard({ onDone }: { onDone: () => void }) {
  const [allocations, setAllocations] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [pick, setPick] = useState<any | null>(null);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  async function load() {
    const [a, t] = await Promise.all([
      supabase.from("allocations").select("*").gt("owner_pay_amount", 0).order("period_week", { ascending: false }),
      supabase.from("owner_pay_transfers").select("*"),
    ]);
    setAllocations(a.data || []);
    setTransfers(t.data || []);
  }
  useEffect(() => { load(); }, []);

  function transferredFor(allocId: string) {
    return transfers.filter((t) => t.allocation_id === allocId).reduce((s, t) => s + Number(t.amount || 0), 0);
  }
  const pending = allocations.filter((a) => a.status === "allocated" || a.status === "assigned").map((a) => ({
    ...a, remaining: Math.max(0, Number(a.owner_pay_amount || 0) - transferredFor(a.id)),
  })).filter((a) => a.remaining > 0);

  async function transfer() {
    if (!pick) return;
    const amt = Number(amount);
    if (amt <= 0 || amt > pick.remaining) return toast.error("Invalid amount");
    setBusy(true);
    const { error } = await (supabase as any).from("owner_pay_transfers").insert({
      allocation_id: pick.id, amount: amt, transferred_on: date, status: "paid", notes: "Owner pay to personal",
    });
    if (!error) {
      const newStatus = amt >= pick.remaining ? "transferred" : "allocated";
      await supabase.from("allocations").update({ status: newStatus }).eq("id", pick.id);
    }
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Transferred to personal");
    setPick(null); setAmount("");
    load(); onDone();
  }

  return (
    <Card className="p-4 space-y-2">
      <h3 className="font-bold flex items-center gap-2"><ArrowRightLeft className="h-4 w-4" />Transfer Owner Pay to Personal</h3>
      <div className="text-xs text-muted-foreground">Pending owner pay (allocated but not transferred):</div>
      {pending.length === 0 ? <div className="text-sm text-muted-foreground p-2 rounded bg-muted">Nothing pending. Run a weekly allocation first.</div> :
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {pending.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-2 border-b border-border py-1.5 text-sm">
              <div className="min-w-0">
                <div className="font-semibold">{fmt(a.remaining)} <span className="text-xs text-muted-foreground">remaining</span></div>
                <div className="text-xs text-muted-foreground">Week {a.period_week} · alloc {fmt(Number(a.owner_pay_amount))}</div>
              </div>
              <Button size="sm" onClick={() => { setPick(a); setAmount(String(a.remaining)); }}>Transfer</Button>
            </div>
          ))}
        </div>}
      <Dialog open={!!pick} onOpenChange={(o) => !o && setPick(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Transfer owner pay</DialogTitle></DialogHeader>
          {pick && <div className="space-y-3 text-sm">
            <div className="text-xs text-muted-foreground">Week {pick.period_week} · {fmt(pick.remaining)} available</div>
            <div><Label>Amount</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
            <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setPick(null)}>Cancel</Button>
              <Button onClick={transfer} disabled={busy}>Confirm transfer</Button>
            </div>
          </div>}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function BusinessAssignmentsPanel({ onDone }: { onDone: () => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ category: BIZ_CATEGORIES[0], amount: "", notes: "" });
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await (supabase as any).from("business_assignments").select("*").order("assigned_on", { ascending: false });
    setItems(data || []);
  }
  useEffect(() => { load(); }, []);

  async function add() {
    if (!f.amount) return toast.error("Amount required");
    setBusy(true);
    const { error } = await (supabase as any).from("business_assignments").insert({
      category: f.category, target_type: "category", amount: Number(f.amount), notes: f.notes || null, status: "assigned",
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Assigned");
    setF({ ...f, amount: "", notes: "" }); setOpen(false);
    load(); onDone();
  }
  async function setStatus(id: string, status: string) {
    await (supabase as any).from("business_assignments").update({ status }).eq("id", id);
    load(); onDone();
  }
  async function del(id: string) {
    if (!confirm("Delete this assignment?")) return;
    await (supabase as any).from("business_assignments").delete().eq("id", id);
    load(); onDone();
  }

  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-bold flex items-center gap-2"><PieChart className="h-4 w-4" />Business Assignments</h3>
        <Button size="sm" onClick={() => setOpen(true)} className="gap-1"><Plus className="h-4 w-4" />Assign</Button>
      </div>
      <p className="text-xs text-muted-foreground">Assigned money reduces Unassigned cash but stays in Live Cash until spent.</p>
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {items.map((it) => (
          <div key={it.id} className="flex items-center justify-between gap-2 border-b border-border py-1.5 text-sm">
            <div className="min-w-0">
              <div className="font-semibold">{fmt(Number(it.amount))} <span className="text-xs text-muted-foreground">· {it.category}</span></div>
              <div className="text-xs text-muted-foreground">{it.assigned_on}{it.notes ? ` · ${it.notes}` : ""}</div>
            </div>
            <div className="flex items-center gap-1">
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${it.status === "assigned" ? "bg-secondary/15 text-secondary" : it.status === "spent" ? "bg-success/15 text-success" : "bg-muted"}`}>{it.status}</span>
              <Select value={it.status} onValueChange={(v) => setStatus(it.id, v)}>
                <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{["assigned", "spent", "cancelled", "reversed"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <Button size="sm" variant="ghost" onClick={() => del(it.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="text-xs text-muted-foreground p-2">No assignments yet.</div>}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign business money</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            <div><Label>Category</Label>
              <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{BIZ_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Amount</Label><Input type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></div>
            <div><Label>Notes</Label><Input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
            <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={add} disabled={busy}>Assign</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
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

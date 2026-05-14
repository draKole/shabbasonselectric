import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useGlobalSettings } from "@/lib/useGlobalSettings";
import { computePaystub, PAYSTUB_DISCLAIMER } from "@/lib/paystubs";
import { Trash2, Printer, Check } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function fmt(n: number) { return Number(n || 0).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }); }

type Worker = { id: string; full_name: string; role?: string; hourly_rate: number; workers_comp_pct: number; insurance_pct: number; ppe_monthly: number; is_owner: boolean };

export default function AdminPaystubs() {
  const { settings } = useGlobalSettings();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [paystubs, setPaystubs] = useState<any[]>([]);
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
  const [form, setForm] = useState({ worker_id: "", period_start: weekAgo, period_end: today, pay_date: today, notes: "" });
  const [previewEntries, setPreviewEntries] = useState<any[]>([]);
  const [viewing, setViewing] = useState<any>(null);
  const [filterWorker, setFilterWorker] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterFrom, setFilterFrom] = useState<string>("");
  const [filterTo, setFilterTo] = useState<string>("");

  async function load() {
    const [{ data: ws }, { data: ps }] = await Promise.all([
      supabase.from("workers").select("id, full_name, role, hourly_rate, workers_comp_pct, insurance_pct, ppe_monthly, is_owner").eq("active", true).order("full_name"),
      (supabase as any).from("paystubs").select("*").order("pay_date", { ascending: false }).limit(100),
    ]);
    setWorkers((ws as any) || []);
    // attach worker name from ws
    const wmap = new Map<string, any>(((ws as any) || []).map((w: any) => [w.id, w]));
    setPaystubs(((ps as any) || []).map((p: any) => ({ ...p, workers: wmap.get(p.worker_id) || { full_name: "", role: "" } })));
  }
  useEffect(() => { load(); }, []);

  useEffect(() => {
    async function loadEntries() {
      if (!form.worker_id) { setPreviewEntries([]); return; }
      const { data } = await supabase.from("worker_time_entries").select("*")
        .eq("worker_id", form.worker_id).eq("paid", false).eq("approved", true)
        .gte("work_date", form.period_start).lte("work_date", form.period_end);
      setPreviewEntries((data as any) || []);
    }
    loadEntries();
  }, [form.worker_id, form.period_start, form.period_end]);

  const worker = workers.find(w => w.id === form.worker_id);
  const totalHours = previewEntries.reduce((s, e) => s + Number(e.hours || 0), 0);
  const rate = worker?.hourly_rate || 0;
  const periodDays = Math.max(1, Math.round((new Date(form.period_end).getTime() - new Date(form.period_start).getTime()) / 86400000) + 1);
  const breakdown = useMemo(() => worker ? computePaystub({
    hours: totalHours, hourly_rate: rate,
    worker_wc_pct: worker.workers_comp_pct, worker_ins_pct: worker.insurance_pct, worker_ppe_monthly: worker.ppe_monthly,
    period_days: periodDays,
  }, settings) : null, [worker, totalHours, rate, periodDays, settings]);

  async function generate() {
    if (!worker || !breakdown) return toast.error("Pick a worker");
    if (totalHours <= 0) return toast.error("No approved unpaid hours in this range");
    const { data: created, error } = await (supabase as any).from("paystubs").insert({
      worker_id: worker.id, period_start: form.period_start, period_end: form.period_end, pay_date: form.pay_date,
      ...breakdown, notes: form.notes || null, status: "draft",
    }).select("id").single();
    if (error) return toast.error(error.message);
    // link entries
    await supabase.from("worker_time_entries").update({ paystub_id: created.id, paid: true, paid_at: new Date().toISOString(), status: "paid" } as any)
      .in("id", previewEntries.map(e => e.id));
    toast.success("Paystub generated"); load();
  }

  async function markPaid(p: any) {
    await (supabase as any).from("paystubs").update({ status: "paid" }).eq("id", p.id);
    load();
  }
  async function voidPaystub(p: any) {
    if (!confirm("Void/delete this paystub? Linked time entries will be marked unpaid.")) return;
    await supabase.from("worker_time_entries").update({ paid: false, paid_at: null, paystub_id: null, status: "approved" } as any).eq("paystub_id", p.id);
    await (supabase as any).from("paystubs").delete().eq("id", p.id);
    load();
  }

  return (
    <div className="container-tight py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">Paystubs</h1>
        <p className="text-xs text-muted-foreground">{PAYSTUB_DISCLAIMER}</p>
      </div>

      <Card className="p-4 space-y-3">
        <h2 className="font-bold">Generate Paystub</h2>
        <div className="grid sm:grid-cols-4 gap-3">
          <div><Label>Worker</Label>
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.worker_id} onChange={(e) => setForm({ ...form, worker_id: e.target.value })}>
              <option value="">Pick worker…</option>
              {workers.map(w => <option key={w.id} value={w.id}>{w.full_name}{w.is_owner ? " (owner)" : ""}</option>)}
            </select>
          </div>
          <div><Label>Period start</Label><Input type="date" value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} /></div>
          <div><Label>Period end</Label><Input type="date" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} /></div>
          <div><Label>Pay date</Label><Input type="date" value={form.pay_date} onChange={(e) => setForm({ ...form, pay_date: e.target.value })} /></div>
          <div className="sm:col-span-4"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        {worker && breakdown && (
          <div className="rounded-md bg-muted/40 p-3 text-sm">
            <div className="font-semibold mb-1">Preview · {totalHours.toFixed(2)} hrs × ${rate.toFixed(2)}/hr ({previewEntries.length} entries)</div>
            <div className="grid sm:grid-cols-3 gap-1">
              <Row label="Gross" v={breakdown.gross} />
              <Row label="Federal WH" v={breakdown.fed_wh} neg />
              <Row label="Ohio WH" v={breakdown.state_wh} neg />
              <Row label="Local WH" v={breakdown.local_wh} neg />
              <Row label="FICA (employee)" v={breakdown.fica_ee} neg />
              {breakdown.retirement > 0 && <Row label="Retirement (planning)" v={breakdown.retirement} neg />}
              <Row label="Net Pay" v={breakdown.net_pay} bold />
              <Row label="Employer FICA" v={breakdown.fica_er} muted />
              <Row label="Workers Comp" v={breakdown.wc_amt} muted />
              <Row label="Insurance" v={breakdown.ins_amt} muted />
              <Row label="PPE/Tools" v={breakdown.ppe_amt} muted />
              <Row label="Total Cost to Business" v={breakdown.employer_total_cost} bold />
            </div>
          </div>
        )}
        <Button onClick={generate} disabled={!worker || totalHours <= 0}>Generate Paystub</Button>
      </Card>

      {(() => {
        const year = new Date().getFullYear();
        const ytdStart = `${year}-01-01`;
        const ytdMap = new Map<string, { gross: number; net: number; ded: number }>();
        paystubs.forEach((p) => {
          if (p.pay_date < ytdStart) return;
          const cur = ytdMap.get(p.worker_id) || { gross: 0, net: 0, ded: 0 };
          cur.gross += Number(p.gross || 0);
          cur.net += Number(p.net_pay || 0);
          cur.ded += Number(p.deductions_total || 0);
          ytdMap.set(p.worker_id, cur);
        });
        const filtered = paystubs.filter((p) => {
          if (filterWorker !== "all" && p.worker_id !== filterWorker) return false;
          if (filterStatus !== "all" && (p.status || "") !== filterStatus) return false;
          if (filterFrom && p.pay_date < filterFrom) return false;
          if (filterTo && p.pay_date > filterTo) return false;
          return true;
        });
        return (
          <>
            <Card className="p-4">
              <h2 className="font-bold mb-2">YTD by worker — {year}</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                {workers.map((w) => {
                  const v = ytdMap.get(w.id) || { gross: 0, net: 0, ded: 0 };
                  return (
                    <div key={w.id} className="rounded border border-border p-2">
                      <div className="font-semibold">{w.full_name}</div>
                      <div className="text-xs grid grid-cols-3 gap-1 mt-1">
                        <div><div className="text-muted-foreground">Gross</div><b>{fmt(v.gross)}</b></div>
                        <div><div className="text-muted-foreground">Deduct</div><b>{fmt(v.ded)}</b></div>
                        <div><div className="text-muted-foreground">Net</div><b>{fmt(v.net)}</b></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="font-bold">Recent Paystubs</h2>
                <span className="text-xs text-muted-foreground">{filtered.length} shown</span>
              </div>
              <div className="grid sm:grid-cols-4 gap-2">
                <div>
                  <Label className="text-xs">Worker</Label>
                  <Select value={filterWorker} onValueChange={setFilterWorker}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All workers</SelectItem>
                      {workers.map((w) => <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="draft">Unpaid (draft)</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="void">Void</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Pay date from</Label><Input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} /></div>
                <div><Label className="text-xs">Pay date to</Label><Input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} /></div>
              </div>
              <div className="space-y-1">
                {filtered.map((p) => (
                  <div key={p.id} className="flex items-center justify-between border-b border-border py-2 text-sm">
                    <div>
                      <div className="font-semibold">{p.workers?.full_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{p.period_start} → {p.period_end} · paid {p.pay_date} · {Number(p.hours).toFixed(2)}h · gross {fmt(p.gross)} · net {fmt(p.net_pay)}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`text-xs px-2 py-0.5 rounded ${p.status === "paid" ? "bg-success/15 text-success" : "bg-muted"}`}>{p.status}</span>
                      <Button size="sm" variant="ghost" onClick={() => setViewing(p)}>View</Button>
                      {p.status !== "paid" && <Button size="sm" variant="ghost" onClick={() => markPaid(p)}><Check className="h-3.5 w-3.5" /></Button>}
                      <Button size="sm" variant="ghost" onClick={() => voidPaystub(p)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  </div>
                ))}
                {filtered.length === 0 && <p className="text-xs text-muted-foreground">No paystubs match.</p>}
              </div>
            </Card>
          </>
        );
      })()}

      {viewing && <PaystubModal p={viewing} settings={settings} workerName={viewing.workers?.full_name || "Worker"} workerRole={viewing.workers?.role || ""} onClose={() => setViewing(null)} />}
    </div>
  );
}

function Row({ label, v, neg, bold, muted }: { label: string; v: number; neg?: boolean; bold?: boolean; muted?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold border-t pt-1" : ""} ${muted ? "text-muted-foreground" : ""}`}>
      <span>{label}</span>
      <span>{neg ? "−" : ""}{fmt(v)}</span>
    </div>
  );
}

export function PaystubModal({ p, settings, workerName, workerRole, onClose }: { p: any; settings: any; workerName: string; workerRole?: string; onClose: () => void }) {
  const periodLabel = `${p.period_start} → ${p.period_end}`;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-auto print:bg-transparent print:p-0 print:items-start" onClick={onClose}>
      <div className="bg-background w-full max-w-2xl rounded-lg shadow-xl p-6 print:shadow-none print:rounded-none" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4 print:hidden">
          <h3 className="font-bold">Paystub Detail</h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="h-3.5 w-3.5 mr-1" /> Print / Save PDF</Button>
            <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
          </div>
        </div>

        {/* Company header */}
        <div className="border-b-2 border-foreground pb-3 mb-4">
          <div className="text-2xl font-extrabold tracking-tight">{settings.paystub_company_name || "Shabba & Sons Electric"}</div>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-secondary">Estimated Paystub / Payroll Planning</div>
          <div className="text-xs text-muted-foreground mt-1">
            {settings.paystub_company_phone || "614-671-8528"}
            {settings.paystub_company_address ? ` · ${settings.paystub_company_address}` : ""}
          </div>
        </div>

        {/* Employee info */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-4">
          <div><span className="text-muted-foreground">Employee:</span> <b>{workerName}</b></div>
          <div><span className="text-muted-foreground">Pay Date:</span> <b>{p.pay_date}</b></div>
          <div><span className="text-muted-foreground">Role:</span> <b>{workerRole || "—"}</b></div>
          <div><span className="text-muted-foreground">Pay Period:</span> <b>{periodLabel}</b></div>
        </div>

        {/* Earnings */}
        <div className="mb-4">
          <div className="text-xs uppercase font-bold text-muted-foreground border-b border-border pb-1 mb-1">Earnings</div>
          <table className="w-full text-sm">
            <tbody>
              <tr><td className="py-1">Regular hours</td><td className="text-right">{Number(p.hours).toFixed(2)} h</td></tr>
              <tr><td className="py-1">Hourly rate</td><td className="text-right">{fmt(p.hourly_rate)}/hr</td></tr>
              <tr className="border-t"><td className="py-1 font-bold">Gross pay</td><td className="text-right font-bold">{fmt(p.gross)}</td></tr>
            </tbody>
          </table>
        </div>

        {/* Deductions */}
        <div className="mb-4">
          <div className="text-xs uppercase font-bold text-muted-foreground border-b border-border pb-1 mb-1">Estimated Deductions</div>
          <table className="w-full text-sm">
            <tbody>
              <tr><td className="py-1">Federal withholding</td><td className="text-right">−{fmt(p.fed_wh)}</td></tr>
              <tr><td className="py-1">Ohio withholding</td><td className="text-right">−{fmt(p.state_wh)}</td></tr>
              <tr><td className="py-1">Columbus / local withholding</td><td className="text-right">−{fmt(p.local_wh)}</td></tr>
              <tr><td className="py-1">FICA (employee)</td><td className="text-right">−{fmt(p.fica_ee)}</td></tr>
              {Number(p.retirement) > 0 && <tr><td className="py-1">Retirement (planning)</td><td className="text-right">−{fmt(p.retirement)}</td></tr>}
              <tr className="border-t"><td className="py-1 font-bold">Total deductions</td><td className="text-right font-bold">−{fmt(p.deductions_total)}</td></tr>
            </tbody>
          </table>
        </div>

        {/* Net pay */}
        <div className="mb-4 rounded-md bg-success/10 border border-success/40 p-3 flex justify-between items-center">
          <div className="text-sm font-bold uppercase tracking-wide">Net Pay</div>
          <div className="text-2xl font-extrabold text-success">{fmt(p.net_pay)}</div>
        </div>

        {/* Employer planning cost */}
        <div className="mb-3">
          <div className="text-xs uppercase font-bold text-muted-foreground border-b border-border pb-1 mb-1">Employer Planning Cost (not deducted from worker)</div>
          <table className="w-full text-sm text-muted-foreground">
            <tbody>
              <tr><td className="py-0.5">Employer FICA</td><td className="text-right">{fmt(p.fica_er)}</td></tr>
              <tr><td className="py-0.5">Workers comp (estimate)</td><td className="text-right">{fmt(p.wc_amt)}</td></tr>
              <tr><td className="py-0.5">Insurance (estimate)</td><td className="text-right">{fmt(p.ins_amt)}</td></tr>
              <tr><td className="py-0.5">PPE / tools allowance</td><td className="text-right">{fmt(p.ppe_amt)}</td></tr>
              <tr className="border-t"><td className="py-1 font-bold text-foreground">Total Cost to Business</td><td className="text-right font-bold text-foreground">{fmt(p.employer_total_cost)}</td></tr>
            </tbody>
          </table>
        </div>

        {p.notes && <div className="text-xs text-muted-foreground italic mb-2">Notes: {p.notes}</div>}

        <p className="text-[10px] text-muted-foreground mt-4 italic border-t pt-2">{PAYSTUB_DISCLAIMER}</p>
      </div>
    </div>
  );
}

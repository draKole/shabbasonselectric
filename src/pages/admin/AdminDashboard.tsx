import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, Calendar, CheckCircle2, DollarSign, FileText, Star, Copy, Check, TrendingUp, Receipt, Users, ListChecks } from "lucide-react";
import { useAppSetting } from "@/lib/useAppSettings";
import { useMonthMoney, monthRange } from "@/lib/useMonthMoney";
import { useBillsTotals, useDebtTotals } from "@/lib/useBillsTotals";
import { usePersonalExpenses } from "@/lib/usePersonalExpenses";
import { toast } from "sonner";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ newLeads: 0, scheduled: 0, completed: 0, openEst: 0, reviewsNeeded: 0, openBalance: 0 });
  const [recent, setRecent] = useState<any[]>([]);
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [todayTasks, setTodayTasks] = useState<any[]>([]);
  const [billsPaidMonth, setBillsPaidMonth] = useState(0);
  const [billsRemaining, setBillsRemaining] = useState(0);
  const { value: googleUrl } = useAppSetting("google_review_url");
  const monthKey = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const mr = useMemo(() => monthRange(monthKey), [monthKey]);
  const money = useMonthMoney(mr.from, mr.to);
  const bizBills = useBillsTotals(mr.from, mr.to, "business");
  const personalBills = useBillsTotals(mr.from, mr.to, "personal");
  const personalDebt = useDebtTotals("personal", mr.from, mr.to);
  const exp = usePersonalExpenses(mr.from, mr.to);
  const totalLabor = money.workerLabor + money.ownerPay + (money.includeBurden ? money.workerBurden : 0);
  const ownerDraw = exp.ownerDraw;
  const personalIncome = money.ownerPay + ownerDraw + exp.otherIncome;
  const personalCash = personalIncome - personalBills.paid - personalDebt.paidThisMonth - exp.totalExpenses;
  const businessCashAfterBills = money.netProfit - bizBills.paid - ownerDraw;


  useEffect(() => {
    (async () => {
      const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const weekEnd = new Date(Date.now() + 7 * 86400_000).toISOString();

      const [{ count: nl }, { count: sched }, { count: comp }, { count: oest }, { count: rr }, { data: bal }, { data: rec }] = await Promise.all([
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "new_lead").gte("created_at", weekAgo),
        supabase.from("jobs").select("id", { count: "exact", head: true }).gte("scheduled_start", new Date().toISOString()).lte("scheduled_start", weekEnd),
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "completed").gte("updated_at", monthStart),
        supabase.from("estimates").select("id", { count: "exact", head: true }).in("status", ["draft", "sent"]),
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "completed"),
        supabase.from("jobs").select("balance_due").neq("payment_status", "paid"),
        supabase.from("jobs").select("id, job_type, status, scheduled_start, address, city, customers(name, phone)").order("created_at", { ascending: false }).limit(10),
      ]);
      setStats({
        newLeads: nl || 0, scheduled: sched || 0, completed: comp || 0,
        openEst: oest || 0, reviewsNeeded: rr || 0,
        openBalance: (bal || []).reduce((s, j: any) => s + Number(j.balance_due || 0), 0),
      });
      setRecent(rec || []);
      const { data: fu } = await supabase
        .from("jobs")
        .select("id, status, updated_at, job_type, customers(name, phone)")
        .in("status", ["completed", "paid"])
        .eq("review_requested", false)
        .order("updated_at", { ascending: false })
        .limit(20);
      setFollowUps((fu || []).filter((j: any) => j.customers?.phone));
      const today = new Date().toISOString().slice(0, 10);
      const { data: tasks } = await supabase
        .from("job_tasks")
        .select("id, title, status, due_date, job_id, jobs(customers(name))")
        .neq("status", "done")
        .or(`due_date.lte.${today},due_date.is.null`)
        .order("due_date", { ascending: true })
        .limit(15);
      setTodayTasks(tasks || []);

      // Bills paid this month vs remaining (paid_on date based)
      const { data: bills } = await supabase.from("bills").select("amount, due_date, paid, paid_on");
      const bills_arr = bills || [];
      const paid = bills_arr.filter((b: any) => b.paid && b.paid_on && b.paid_on >= mr.from && b.paid_on <= mr.to)
        .reduce((s: number, b: any) => s + Number(b.amount || 0), 0);
      const unpaidThis = bills_arr.filter((b: any) => !b.paid && b.due_date && b.due_date >= mr.from && b.due_date <= mr.to)
        .reduce((s: number, b: any) => s + Number(b.amount || 0), 0);
      const pastDue = bills_arr.filter((b: any) => !b.paid && b.due_date && b.due_date < mr.from)
        .reduce((s: number, b: any) => s + Number(b.amount || 0), 0);
      setBillsPaidMonth(paid);
      setBillsRemaining(unpaidThis + pastDue);
    })();
  }, [mr.from, mr.to]);

  async function completeTask(id: string) {
    const { error } = await supabase.from("job_tasks").update({ status: "done", completed_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    setTodayTasks((prev) => prev.filter((t) => t.id !== id));
  }

  function reviewText(name?: string) {
    return `Thank you for choosing Shabba & Sons Electric${name ? `, ${name}` : ""}. If you were happy with the work, I'd really appreciate a quick Google review. It helps my family business grow. ${googleUrl || "[Google Review Link]"}`;
  }
  async function copyText(name?: string) {
    await navigator.clipboard.writeText(reviewText(name));
    toast.success("Copied review request");
  }
  async function markRequested(id: string) {
    const { error } = await supabase.from("jobs").update({ review_requested: true, review_requested_at: new Date().toISOString() } as any).eq("id", id);
    if (error) return toast.error(error.message);
    setFollowUps((prev) => prev.filter((j) => j.id !== id));
    toast.success("Marked as requested");
  }

  const cards = [
    { label: "New leads (week)", value: stats.newLeads, icon: Briefcase, color: "text-secondary" },
    { label: "Scheduled (week)", value: stats.scheduled, icon: Calendar, color: "text-success" },
    { label: "Completed (month)", value: stats.completed, icon: CheckCircle2, color: "text-success" },
    { label: "Open estimates", value: stats.openEst, icon: FileText, color: "text-secondary" },
    { label: "Reviews needed", value: stats.reviewsNeeded, icon: Star, color: "text-accent-foreground" },
    { label: "Open balance", value: `$${stats.openBalance.toFixed(0)}`, icon: DollarSign, color: "text-success" },
  ];

  return (
    <div className="container-tight py-6 space-y-6">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label} className="p-4">
            <div className="flex items-center gap-3">
              <c.icon className={`h-6 w-6 ${c.color}`} />
              <div>
                <div className="text-2xl font-extrabold">{c.value}</div>
                <div className="text-xs text-muted-foreground">{c.label}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold flex items-center gap-2"><TrendingUp className="h-4 w-4 text-success" /> Money this month</h2>
          <Link to="/admin/money" className="text-xs underline text-muted-foreground">Open Money Tracker →</Link>
        </div>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          <MoneyMini icon={<DollarSign className="h-4 w-4" />} label="Gross collected" value={`$${money.collected.toFixed(0)}`} />
          <MoneyMini icon={<Receipt className="h-4 w-4" />} label="Materials (me)" value={`$${money.materialsMe.toFixed(0)}`} />
          <MoneyMini icon={<Users className="h-4 w-4" />} label="Worker labor" value={`$${money.workerLabor.toFixed(0)}`} />
          <MoneyMini icon={<Receipt className="h-4 w-4" />} label="Other expenses" value={`$${money.otherExp.toFixed(0)}`} />
          <MoneyMini icon={<TrendingUp className="h-4 w-4" />} label="NET PROFIT" value={`$${money.netProfit.toFixed(0)}`} highlight />
        </div>
        <div className="mt-3 grid gap-3 grid-cols-2 sm:grid-cols-3">
          <MoneyMini icon={<Receipt className="h-4 w-4" />} label="Bills paid this month" value={`$${billsPaidMonth.toFixed(0)}`} />
          <MoneyMini icon={<Receipt className="h-4 w-4" />} label="Bills remaining" value={`$${billsRemaining.toFixed(0)}`} />
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">Bills are tracked separately from job profit. Net Profit = payments − materials − worker labor − other job expenses.</p>
        {money.netProfit > 0 && activePreset && (
          <div className="mt-3">
            <div className="text-xs text-muted-foreground mb-1">Allocation: {activePreset.name}</div>
            <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
              {activePreset.buckets.filter((b: any) => b.enabled !== false).map((b: any, i: number) => (
                <div key={i} className={`rounded-md p-2 text-xs ${bucketColorClass(b.color)}`}>
                  <div className="font-semibold">{b.name} ({b.percent}%)</div>
                  <div className="text-base font-extrabold">${(money.netProfit * (Number(b.percent) || 0) / 100).toFixed(0)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {money.netProfit === 0 && !money.loading && (
          <div className="mt-3 text-xs text-muted-foreground">No net profit yet this month — allocations only apply to take-home.</div>
        )}
      </Card>

      <Card className="p-4 bg-muted/40 border-secondary/30">
        <h2 className="font-bold mb-2">How leads & money work</h2>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
          <div><b>New Lead</b> — someone requested work, not confirmed.</div>
          <div><b>Contacted</b> — I replied or called them.</div>
          <div><b>Estimate Scheduled</b> — going to look at the job.</div>
          <div><b>Estimate Sent</b> — I gave them a price.</div>
          <div><b>Approved / Scheduled</b> — accepted, on calendar.</div>
          <div><b>In Progress</b> — work has started.</div>
          <div><b>Materials Needed</b> — paused until materials ready.</div>
          <div><b>Waiting on Inspection</b> — done, awaiting inspection.</div>
          <div><b>Completed</b> — work finished.</div>
          <div><b>Paid</b> — customer paid in full.</div>
          <div><b>Cancelled / Lost Lead</b> — did not move forward.</div>
          <div><b>Archived</b> — hidden from active list, kept in records.</div>
        </div>
        <div className="mt-3 pt-3 border-t border-border grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
          <div><b>Open Balance</b> = Job Total − Amount Paid.</div>
          <div><b>Materials Cost</b> = money I spent on materials.</div>
          <div><b>Profit Estimate</b> = Job Total − materials I paid.</div>
          <div><b>Hourly Comparison</b> = hourly value vs flat rate charged.</div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold flex items-center gap-2"><ListChecks className="h-4 w-4 text-secondary" /> Today's Tasks</h2>
          <span className="text-xs text-muted-foreground">{todayTasks.length} due / overdue</span>
        </div>
        <div className="space-y-2">
          {todayTasks.map((t: any) => (
            <div key={t.id} className="flex items-center justify-between gap-2 p-2 rounded-md border border-border">
              <Link to={`/admin/jobs/${t.job_id}`} className="min-w-0 flex-1">
                <div className="font-medium truncate">{t.title}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {t.jobs?.customers?.name || "—"}{t.due_date ? ` · due ${t.due_date}` : ""}
                </div>
              </Link>
              <Button size="sm" onClick={() => completeTask(t.id)} className="bg-success text-success-foreground hover:bg-success/90"><Check className="h-3.5 w-3.5" /></Button>
            </div>
          ))}
          {todayTasks.length === 0 && <div className="text-sm text-muted-foreground p-2">No open tasks.</div>}
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold flex items-center gap-2"><Star className="h-4 w-4 text-accent" /> Review Follow-Ups</h2>
          <span className="text-xs text-muted-foreground">{followUps.length} pending</span>
        </div>
        {!googleUrl && (
          <div className="text-xs text-muted-foreground mb-2">
            Tip: <Link to="/admin/setup" className="underline">Add your Google review link in Settings</Link> so the message includes it.
          </div>
        )}
        <div className="space-y-2">
          {followUps.map((j: any) => (
            <div key={j.id} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-md border border-border">
              <div className="min-w-0">
                <div className="font-semibold">{j.customers?.name || "—"}</div>
                <div className="text-xs text-muted-foreground">{j.job_type} · {new Date(j.updated_at).toLocaleDateString()} · {j.customers?.phone}</div>
              </div>
              <div className="flex gap-2">
                <Button asChild size="sm" variant="outline">
                  <a href={`sms:${j.customers?.phone}?&body=${encodeURIComponent(reviewText(j.customers?.name))}`}>Text</a>
                </Button>
                <Button size="sm" variant="outline" onClick={() => copyText(j.customers?.name)}><Copy className="h-3.5 w-3.5" /></Button>
                <Button size="sm" onClick={() => markRequested(j.id)} className="bg-success text-success-foreground hover:bg-success/90"><Check className="h-3.5 w-3.5" /> Mark sent</Button>
              </div>
            </div>
          ))}
          {followUps.length === 0 && <div className="text-sm text-muted-foreground p-3">All caught up!</div>}
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="font-bold mb-3">Recent jobs</h2>
        <div className="space-y-2">
          {recent.map((j: any) => (
            <Link key={j.id} to={`/admin/jobs/${j.id}`} className="flex items-center justify-between p-3 rounded-md hover:bg-muted">
              <div>
                <div className="font-semibold">{j.customers?.name || "—"}</div>
                <div className="text-xs text-muted-foreground">{j.job_type} · {j.city || ""} · {j.status}</div>
              </div>
              <div className="text-xs text-muted-foreground">{j.scheduled_start ? new Date(j.scheduled_start).toLocaleString() : "Not scheduled"}</div>
            </Link>
          ))}
          {recent.length === 0 && <div className="text-sm text-muted-foreground p-3">No jobs yet. Submit a test lead from the Schedule page.</div>}
        </div>
      </Card>
    </div>
  );
}

function MoneyMini({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-md p-3 border ${highlight ? "bg-success/5 border-success/40" : "bg-muted/40 border-border"}`}>
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">{icon}{label}</div>
      <div className={`text-xl font-extrabold mt-0.5 ${highlight ? "text-success" : ""}`}>{value}</div>
    </div>
  );
}

import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, AlertTriangle, DollarSign, Clock, BarChart3, Calculator, ExternalLink } from "lucide-react";
import { useJobProfitability } from "@/lib/useJobProfitability";
import { useArAging } from "@/lib/useArAging";
import { useCashFlow } from "@/lib/useCashFlow";

export default function AdminCfoDashboard() {
  const { jobs, flaggedJobs, loading: profitLoading } = useJobProfitability();
  const { buckets, grandTotal, loading: arLoading } = useArAging();
  const { monthly, loading: cashLoading } = useCashFlow();

  // Pricing framework: avg effective hourly rate from jobs with actual_hours
  const jobsWithHours = jobs.filter((j) => j.job_total > 0);
  const hourlyJobs = jobsWithHours.filter((j) => {
    // We don't have actual_hours in the JobProfitability interface currently
    // We'll compute from the raw data - but for now use available data
    return false;
  });

  // Calculate average effective hourly from jobs data
  // Since the hook doesn't expose actual_hours directly, we use the raw data
  // The effective hourly calculation requires actual_hours which is tracked per job

  return (
    <div className="container-tight py-6 space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-secondary" /> AI CFO
          </h1>
          <p className="text-sm text-muted-foreground">Financial intelligence & insights</p>
        </div>
      </div>

      {/* 1. Profitability Alerts */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" /> Profitability Alerts
          </h2>
          <Badge variant="outline" className={flaggedJobs.length > 0 ? "bg-red-50 text-red-700 border-red-200" : ""}>
            {profitLoading ? "..." : `${flaggedJobs.length} flagged`}
          </Badge>
        </div>
        {profitLoading ? (
          <div className="text-sm text-muted-foreground py-4">Analyzing jobs...</div>
        ) : flaggedJobs.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4">
            No profitability issues found. All completed jobs have healthy margins.
          </div>
        ) : (
          <div className="space-y-2">
            {flaggedJobs.map((j) => (
              <Link key={j.id} to={`/admin/jobs/${j.id}`} className="flex items-start justify-between p-3 rounded-md border border-border hover:bg-muted/40 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold flex items-center gap-2">
                    {j.customer_name}
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                      j.profit_margin < 10 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      {j.profit_margin}%
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{j.job_type}</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {j.flags.map((f) => (
                      <Badge key={f} variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">
                        {f}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-bold text-sm">${j.profit.toFixed(0)}</div>
                  <div className="text-[10px] text-muted-foreground">of ${j.job_total.toFixed(0)}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
        <div className="mt-2 text-[11px] text-muted-foreground italic">
          Profit margin estimate, based on recorded costs.
        </div>
      </Card>

      {/* 2. AR Aging */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold flex items-center gap-2">
            <Clock className="h-4 w-4 text-secondary" /> Accounts Receivable
          </h2>
          <span className="text-lg font-extrabold">${grandTotal.toFixed(0)}</span>
        </div>
        {arLoading ? (
          <div className="text-sm text-muted-foreground py-4">Loading AR data...</div>
        ) : grandTotal === 0 ? (
          <div className="text-sm text-muted-foreground py-4">No outstanding balances. All caught up!</div>
        ) : (
          <div className="space-y-2">
            {buckets.map((bucket) => (
              <div key={bucket.key}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium">{bucket.label}</span>
                  <span className="font-bold">{bucket.count} jobs · ${bucket.total.toFixed(0)}</span>
                </div>
                {bucket.items.length > 0 && (
                  <div className="space-y-1 mb-3">
                    {bucket.items.map((item) => (
                      <Link key={item.id} to={`/admin/jobs/${item.id}`}
                        className="flex items-center justify-between p-2 rounded text-xs hover:bg-muted/40 transition-colors">
                        <span className="truncate">{item.customer_name} — {item.job_type}</span>
                        <span className="font-semibold text-destructive">${item.balance_due.toFixed(0)}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="mt-2 text-[11px] text-muted-foreground italic">
          Aged by last activity date.
        </div>
      </Card>

      {/* 3. Pricing Framework */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold flex items-center gap-2">
            <Calculator className="h-4 w-4 text-success" /> Pricing Framework
          </h2>
        </div>
        <div className="text-sm text-muted-foreground py-4">
          Track actual hours per job to see your effective hourly rate.
        </div>
        {jobsWithHours.length > 0 ? (
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
            {/* Will show effective hourly once actual_hours is populated */}
            <div className="rounded-md p-3 bg-muted/40 border border-border">
              <div className="text-[11px] text-muted-foreground">Completed Jobs</div>
              <div className="text-xl font-extrabold mt-0.5">{jobs.length}</div>
            </div>
            <div className="rounded-md p-3 bg-muted/40 border border-border">
              <div className="text-[11px] text-muted-foreground">Avg Job Value</div>
              <div className="text-xl font-extrabold mt-0.5">
                ${jobs.length > 0 ? (jobs.reduce((s, j) => s + j.job_total, 0) / jobs.length).toFixed(0) : 0}
              </div>
            </div>
            <div className="rounded-md p-3 bg-muted/40 border border-border">
              <div className="text-[11px] text-muted-foreground">Avg Margin</div>
              <div className="text-xl font-extrabold mt-0.5">
                {jobs.length > 0
                  ? (jobs.reduce((s, j) => s + j.profit_margin, 0) / jobs.length).toFixed(1) + "%"
                  : "—"}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            Track actual hours per job to see your effective hourly rate.
          </div>
        )}
      </Card>

      {/* 4. Cash Flow Trend */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-success" /> Cash Flow Trend
          </h2>
          <Badge variant="outline">{monthly.length} months</Badge>
        </div>
        {cashLoading ? (
          <div className="text-sm text-muted-foreground py-4">Loading cash flow...</div>
        ) : monthly.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4">No payment records yet. Payments will appear here once recorded.</div>
        ) : (
          <div className="space-y-1">
            {(() => {
              const maxCollected = Math.max(...monthly.map((x) => x.collected));
              return monthly.map((m) => (
                <div key={m.month} className="flex items-center gap-3 p-2 rounded hover:bg-muted/40">
                  <span className="text-sm font-medium w-20">{m.label}</span>
                  <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-success rounded-full transition-all"
                      style={{ width: `${(m.collected / maxCollected) * 100}%` }}
                    />
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <span className="font-bold text-sm">${m.collected.toFixed(0)}</span>
                  </div>
                </div>
              ));
            })()}
          </div>
        )}
        <div className="mt-2 text-[11px] text-muted-foreground italic">
          Based on job_payments.paid_on dates.
        </div>
      </Card>
    </div>
  );
}
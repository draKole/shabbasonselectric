import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function JobHourly({ job, update }: { job: any; update: (patch: any) => void }) {
  const rate = Number(job.hourly_rate || 125);
  const actual = Number(job.actual_hours || 0);
  const total = Number(job.job_total || job.estimate_amount || 0);
  const matsMe = Number(job.materials_cost || 0);
  const hourlyValue = actual * rate;
  const flatNet = total - matsMe;
  const diff = total - hourlyValue;
  const profit = total - matsMe;

  return (
    <Card className="p-5 space-y-3">
      <h2 className="font-bold">Hourly Comparison & Profit</h2>
      <p className="text-xs text-muted-foreground">
        Hourly Comparison shows what you would have made hourly versus what you actually charged. Profit = Job Total minus materials you paid for.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Job total ($)</Label><Input type="number" step="0.01" defaultValue={job.job_total || 0} onBlur={(e) => update({ job_total: Number(e.target.value) })} /></div>
        <div><Label>Hourly rate ($)</Label><Input type="number" step="0.01" defaultValue={rate} onBlur={(e) => update({ hourly_rate: Number(e.target.value) })} /></div>
        <div><Label>Estimated hours</Label><Input type="number" step="0.25" defaultValue={job.estimated_hours || 0} onBlur={(e) => update({ estimated_hours: Number(e.target.value) })} /></div>
        <div><Label>Actual hours</Label><Input type="number" step="0.25" defaultValue={job.actual_hours || 0} onBlur={(e) => update({ actual_hours: Number(e.target.value) })} /></div>
      </div>
      <div className="rounded-md bg-muted p-3 text-sm space-y-1">
        <div>Hourly value (actual × rate): <b>${hourlyValue.toFixed(2)}</b></div>
        <div>Flat charged: <b>${total.toFixed(2)}</b></div>
        <div>Difference: <b className={diff >= 0 ? "text-success" : "text-destructive"}>{diff >= 0 ? "+" : ""}${diff.toFixed(2)}</b></div>
        <div className="pt-1 border-t border-border">Materials I paid: <b>${matsMe.toFixed(2)}</b></div>
        <div>Estimated gross profit: <b className="text-success">${profit.toFixed(2)}</b></div>
        {actual > 0 && diff < 0 && (
          <div className="text-destructive font-semibold pt-1">⚠ You charged less than your hourly value.</div>
        )}
      </div>
    </Card>
  );
}

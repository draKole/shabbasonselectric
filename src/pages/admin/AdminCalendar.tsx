import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { JOB_TYPE_LABELS, STATUS_COLOR, JOB_STATUS_LABELS } from "@/lib/jobTypes";

export default function AdminCalendar() {
  const [jobs, setJobs] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("jobs").select("*, customers(name, phone)")
      .not("scheduled_start", "is", null)
      .eq("archived", false)
      .not("status", "in", "(completed,paid,cancelled,lost_lead)")
      .order("scheduled_start")
      .then(({ data }) => setJobs(data || []));
  }, []);

  // Group by date
  const groups = jobs.reduce((acc: Record<string, any[]>, j) => {
    const d = new Date(j.scheduled_start).toDateString();
    (acc[d] = acc[d] || []).push(j);
    return acc;
  }, {});

  return (
    <div className="container-tight py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Calendar</h1>
        <Link to="/admin/setup" className="text-sm text-secondary hover:underline">Get subscribe URL →</Link>
      </div>
      {Object.keys(groups).length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">No scheduled jobs yet.</Card>
      )}
      {Object.entries(groups).map(([date, items]) => (
        <Card key={date} className="overflow-hidden">
          <div className="bg-muted px-4 py-2 font-bold text-sm">{date}</div>
          <div className="divide-y divide-border">
            {(items as any[]).map((j) => (
              <Link key={j.id} to={`/admin/jobs/${j.id}`} className="block p-3 hover:bg-muted/40">
                <div className="flex items-start gap-3">
                  <div className="text-xs font-mono w-16 shrink-0 text-muted-foreground">
                    {new Date(j.scheduled_start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">{j.customers?.name} · {JOB_TYPE_LABELS[j.job_type]}</div>
                    <div className="text-xs text-muted-foreground">{[j.address, j.city].filter(Boolean).join(", ")}</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${STATUS_COLOR[j.status] || ""}`}>{JOB_STATUS_LABELS[j.status]}</span>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

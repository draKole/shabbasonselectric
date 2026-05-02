import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { JOB_STATUS_LABELS, JOB_TYPE_LABELS, PIPELINE_COLUMNS } from "@/lib/jobTypes";
import { toast } from "sonner";

export default function AdminPipeline() {
  const [jobs, setJobs] = useState<any[]>([]);

  async function load() {
    const { data } = await supabase.from("jobs").select("id, status, job_type, customers(name, phone), city").order("updated_at", { ascending: false });
    setJobs(data || []);
  }
  useEffect(() => { load(); }, []);

  async function move(id: string, status: string) {
    const { error } = await supabase.from("jobs").update({ status: status as any }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  return (
    <div className="container-tight py-6">
      <h1 className="text-2xl font-extrabold mb-4">Pipeline</h1>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {PIPELINE_COLUMNS.map((col) => {
          const items = jobs.filter((j) => j.status === col.id);
          return (
            <div key={col.id} className="min-w-[260px] w-[260px] shrink-0">
              <div className="font-bold text-xs uppercase tracking-wide text-muted-foreground mb-2 px-1">
                {col.title} <span className="text-secondary">({items.length})</span>
              </div>
              <div className="space-y-2">
                {items.map((j) => (
                  <Card key={j.id} className="p-3">
                    <Link to={`/admin/jobs/${j.id}`} className="font-semibold text-sm hover:text-secondary">
                      {j.customers?.name || "—"}
                    </Link>
                    <div className="text-xs text-muted-foreground mt-0.5">{JOB_TYPE_LABELS[j.job_type]}</div>
                    {j.city && <div className="text-xs text-muted-foreground">{j.city}</div>}
                    <Select value={j.status} onValueChange={(v) => move(j.id, v)}>
                      <SelectTrigger className="mt-2 h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(JOB_STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

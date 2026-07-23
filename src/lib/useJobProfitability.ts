import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface JobProfitability {
  id: string;
  customer_name: string;
  job_type: string;
  job_total: number;
  materials_cost: number;
  labor_amount: number;
  profit: number;
  profit_margin: number;
  flags: string[];
}

export function useJobProfitability() {
  const [jobs, setJobs] = useState<JobProfitability[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("jobs")
        .select("id, job_type, job_total, materials_cost, labor_amount, actual_hours, customers(name)")
        .in("status", ["completed", "paid"])
        .order("updated_at", { ascending: false })
        .limit(50);

      const results: JobProfitability[] = (data || [])
        .filter((j: any) => Number(j.job_total) > 0)
        .map((j: any) => {
          const total = Number(j.job_total) || 0;
          const materials = Number(j.materials_cost) || 0;
          const labor = Number(j.labor_amount) || 0;
          const cost = materials + labor;
          const profit = total - cost;
          const margin = total > 0 ? (profit / total) * 100 : 0;
          const flags: string[] = [];
          if (margin < 15) flags.push("Profit margin under 15%");
          if (materials > total * 0.5) flags.push("Materials cost > 50% of job total");
          return {
            id: j.id,
            customer_name: j.customers?.name || "—",
            job_type: j.job_type || "—",
            job_total: total,
            materials_cost: materials,
            labor_amount: labor,
            profit,
            profit_margin: Math.round(margin * 10) / 10,
            flags,
          };
        });

      setJobs(results);
      setLoading(false);
    })();
  }, []);

  const flaggedJobs = jobs.filter((j) => j.flags.length > 0);

  return { jobs, flaggedJobs, loading };
}
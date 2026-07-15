import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ArItem {
  id: string;
  customer_name: string;
  job_type: string;
  balance_due: number;
  updated_at: string;
  days_outstanding: number;
  bucket: "0-30" | "31-60" | "61-90" | "90+";
}

export interface ArBucket {
  label: string;
  key: ArItem["bucket"];
  total: number;
  count: number;
  items: ArItem[];
}

export function useArAging() {
  const [buckets, setBuckets] = useState<ArBucket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const now = Date.now();

      const { data } = await supabase
        .from("jobs")
        .select("id, job_type, balance_due, updated_at, customers(name)")
        .neq("payment_status", "paid")
        .gt("balance_due", 0)
        .order("updated_at", { ascending: false });

      const raw: ArItem[] = (data || []).map((j: any) => {
        const updated = j.updated_at;
        const days = Math.floor((now - new Date(updated).getTime()) / 86400_000);
        let bucket: ArItem["bucket"] = "90+";
        if (days <= 30) bucket = "0-30";
        else if (days <= 60) bucket = "31-60";
        else if (days <= 90) bucket = "61-90";
        return {
          id: j.id,
          customer_name: j.customers?.name || "—",
          job_type: j.job_type || "—",
          balance_due: Number(j.balance_due) || 0,
          updated_at: updated,
          days_outstanding: days,
          bucket,
        };
      });

      const bucketDefs: { label: string; key: ArItem["bucket"] }[] = [
        { label: "0–30 days", key: "0-30" },
        { label: "31–60 days", key: "31-60" },
        { label: "61–90 days", key: "61-90" },
        { label: "90+ days", key: "90+" },
      ];

      const result: ArBucket[] = bucketDefs.map((bd) => {
        const items = raw.filter((r) => r.bucket === bd.key);
        return {
          label: bd.label,
          key: bd.key,
          total: items.reduce((s, i) => s + i.balance_due, 0),
          count: items.length,
          items,
        };
      });

      setBuckets(result);
      setLoading(false);
    })();
  }, []);

  const grandTotal = buckets.reduce((s, b) => s + b.total, 0);

  return { buckets, grandTotal, loading };
}
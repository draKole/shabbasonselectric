import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Bucket = { name: string; percent: number; color?: string; enabled?: boolean };
export type Preset = { id: string; name: string; buckets: Bucket[]; is_active: boolean; scope?: string };

export function useAllocationPresets(scope?: "business" | "personal") {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    let q = supabase.from("allocation_presets").select("*").order("created_at");
    if (scope) q = q.eq("scope", scope);
    const { data } = await q;
    setPresets((data as any) || []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [scope]);

  return { presets, loading, reload: load, active: presets.find((p) => p.is_active) || presets[0] };
}

export function bucketColorClass(c?: string) {
  switch (c) {
    case "destructive": return "bg-destructive/10 text-destructive";
    case "accent": return "bg-accent text-accent-foreground";
    case "secondary": return "bg-secondary/10 text-secondary";
    case "success": return "bg-success/10 text-success";
    case "primary": return "bg-primary/10 text-primary";
    default: return "bg-muted text-foreground";
  }
}

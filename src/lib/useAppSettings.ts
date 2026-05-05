import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useAppSetting(key: string) {
  const [value, setValue] = useState<string>("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from("app_settings").select("value").eq("key", key).maybeSingle()
      .then(({ data }) => { setValue(data?.value || ""); setLoading(false); });
  }, [key]);
  return { value, loading };
}

export async function setAppSetting(key: string, value: string) {
  return supabase.from("app_settings").upsert({ key, value, updated_at: new Date().toISOString() });
}

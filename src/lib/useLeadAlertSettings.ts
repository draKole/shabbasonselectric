import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LeadAlertSettings {
  id: string;
  sms_enabled: boolean;
  alert_phone: string | null;
  alert_email: string | null;
  from_number: string | null;
  notify_service_request: boolean;
  notify_contact_form: boolean;
  notify_voucher_request: boolean;
  notify_application: boolean;
  notify_estimate_request: boolean;
}

export function useLeadAlertSettings() {
  return useQuery({
    queryKey: ["lead_alert_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_notification_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as LeadAlertSettings | null;
    },
  });
}

export function useUpdateLeadAlertSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<LeadAlertSettings> & { id: string }) => {
      const { error } = await supabase
        .from("lead_notification_settings")
        .update(patch)
        .eq("id", patch.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lead_alert_settings"] }),
  });
}

export type LeadType =
  | "service_request" | "contact_form" | "voucher_request" | "application" | "estimate_request";

// Fire-and-forget; never throws.
export async function sendLeadAlert(input: {
  lead_type: LeadType;
  name: string;
  phone?: string;
  service?: string;
  address_city?: string;
}) {
  try {
    await supabase.functions.invoke("lead-alert", { body: input });
  } catch (e) {
    console.warn("Lead alert failed:", e);
  }
}

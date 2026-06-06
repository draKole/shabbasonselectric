import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PropertyType =
  | "personal_home" | "investment" | "rental" | "commercial" | "nonprofit" | "other";

export const PROPERTY_TYPE_LABEL: Record<PropertyType, string> = {
  personal_home: "Personal Home",
  investment: "Investment Property",
  rental: "Rental Property",
  commercial: "Commercial",
  nonprofit: "Church / Nonprofit",
  other: "Other",
};

export interface Property {
  id: string;
  customer_id: string;
  nickname: string | null;
  property_type: PropertyType;
  owner_name: string | null;
  owner_phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  notes: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export function useProperties(customerId?: string | null) {
  return useQuery({
    queryKey: ["properties", customerId || "all"],
    queryFn: async () => {
      let q = supabase.from("properties").select("*").order("is_primary", { ascending: false }).order("created_at");
      if (customerId) q = q.eq("customer_id", customerId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Property[];
    },
    enabled: customerId === undefined ? true : !!customerId,
  });
}

export function useUpsertProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: Partial<Property> & { customer_id: string }) => {
      if (p.id) {
        const { data, error } = await supabase.from("properties").update(p).eq("id", p.id).select().single();
        if (error) throw error;
        return data as Property;
      }
      const { data, error } = await supabase.from("properties").insert(p as any).select().single();
      if (error) throw error;
      return data as Property;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["properties"] });
      if (vars.customer_id) qc.invalidateQueries({ queryKey: ["properties", vars.customer_id] });
    },
  });
}

export function useDeleteProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("properties").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["properties"] }),
  });
}

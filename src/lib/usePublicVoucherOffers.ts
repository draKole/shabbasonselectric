import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { VoucherOffer } from "@/lib/useVouchers";

/** Public-safe fetch of active voucher offers, sorted best-bonus first. */
export function usePublicVoucherOffers() {
  const [offers, setOffers] = useState<VoucherOffer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    supabase
      .from("voucher_offers")
      .select("*")
      .eq("active", true)
      .order("display_order", { ascending: true })
      .then(({ data }) => {
        if (!alive) return;
        const list = (data || []) as VoucherOffer[];
        setOffers(list);
        setLoading(false);
      });
    return () => { alive = false; };
  }, []);

  const best = pickBest(offers);
  return { offers, best, loading };
}

function pickBest(offers: VoucherOffer[]): VoucherOffer | null {
  if (!offers.length) return null;
  return [...offers].sort((a, b) => {
    const ba = (a.credit_value || 0) - (a.amount_paid || 0);
    const bb = (b.credit_value || 0) - (b.amount_paid || 0);
    if (bb !== ba) return bb - ba;
    return (b.credit_value || 0) - (a.credit_value || 0);
  })[0];
}

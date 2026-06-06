import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Ticket, Phone, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useGlobalSettings } from "@/lib/useGlobalSettings";

function fmt(n: number) { return Number(n || 0).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }); }

export default function ServiceVouchers() {
  const { settings } = useGlobalSettings();
  const [offers, setOffers] = useState<any[]>([]);
  const [picked, setPicked] = useState<string>("");
  const [form, setForm] = useState({ customer_name: "", phone: "", email: "", notes: "" });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    (supabase as any).from("voucher_offers").select("*").eq("active", true).order("display_order").then(({ data }: any) => {
      setOffers(data || []);
      if (data?.[0]) setPicked(data[0].id);
    });
  }, []);

  async function submit() {
    if (!form.customer_name || !form.phone) return toast.error("Name and phone required");
    if (!picked) return toast.error("Pick an offer");
    const { error } = await (supabase as any).from("voucher_requests").insert({
      customer_name: form.customer_name, phone: form.phone, email: form.email || null,
      offer_id: picked, notes: form.notes || null, status: "new",
    });
    if (error) return toast.error(error.message);
    try {
      const { sendLeadAlert } = await import("@/lib/useLeadAlertSettings");
      sendLeadAlert({ lead_type: "voucher_request", name: form.customer_name, phone: form.phone, service: "Voucher request" });
    } catch {}
    setSubmitted(true);
    toast.success("Request submitted — we'll be in touch");
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container-tight py-10 space-y-6 max-w-3xl">
        <header className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 text-secondary font-bold uppercase text-xs tracking-wider"><Ticket className="h-4 w-4" /> Prepaid Service Vouchers</div>
          <h1 className="text-4xl font-extrabold">Prepay now, get bonus labor credit.</h1>
          <p className="text-muted-foreground">Lock in a discount on your next {settings.business_name || "Shabba & Sons Electric"} electrical service.</p>
        </header>

        <div className="grid sm:grid-cols-3 gap-3">
          {offers.map(o => (
            <button key={o.id} onClick={() => setPicked(o.id)}
              className={`rounded-lg border-2 p-4 text-left transition-colors ${picked === o.id ? "border-secondary bg-secondary/5" : "border-border bg-card"}`}>
              <div className="text-xs text-muted-foreground">Pay</div>
              <div className="text-3xl font-extrabold">{fmt(o.amount_paid)}</div>
              <div className="text-xs text-muted-foreground mt-2">Get</div>
              <div className="text-2xl font-bold text-success">{fmt(o.credit_value)} labor credit</div>
              {Number(o.bonus) > 0 && <div className="text-xs text-success mt-1">+{fmt(o.bonus)} bonus</div>}
              <div className="text-[10px] text-muted-foreground mt-2">{o.labor_only ? "Labor only" : "Includes materials"}</div>
            </button>
          ))}
        </div>

        {!submitted ? (
          <Card className="p-5 space-y-3">
            <h2 className="font-bold">Request your voucher</h2>
            <div className="grid sm:grid-cols-2 gap-2">
              <div><Label>Name *</Label><Input value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} /></div>
              <div><Label>Phone *</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Email</Label><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="What kind of work might you need?" /></div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={submit} className="flex-1 min-w-[160px]">Request Voucher</Button>
              <a href={`tel:${settings.business_phone || "6146718528"}`}><Button variant="outline"><Phone className="h-4 w-4 mr-1" /> Call</Button></a>
              <a href="/schedule"><Button variant="outline"><Calendar className="h-4 w-4 mr-1" /> Schedule consult</Button></a>
            </div>
            <p className="text-[11px] text-muted-foreground">This is a prepayment for future electrical labor. Not a loan, investment, or financing product.</p>
          </Card>
        ) : (
          <Card className="p-6 text-center bg-success/5 border-success/40">
            <h2 className="text-xl font-bold text-success">Got it — thanks!</h2>
            <p className="text-sm text-muted-foreground mt-1">We'll contact you to confirm payment and issue your voucher certificate.</p>
          </Card>
        )}

        <Card className="p-4 text-xs text-muted-foreground whitespace-pre-wrap">
          <div className="font-bold uppercase text-foreground mb-1">Terms</div>
          {settings.voucher_default_terms}
        </Card>
      </div>
    </div>
  );
}

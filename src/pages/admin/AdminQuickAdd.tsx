import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { JOB_TYPE_LABELS, JOB_STATUS_LABELS } from "@/lib/jobTypes";
import { useGlobalSettings } from "@/lib/useGlobalSettings";
import { toast } from "sonner";

export default function AdminQuickAdd() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const customerId = params.get("customer_id");
  const { settings } = useGlobalSettings();
  const [busy, setBusy] = useState(false);
  const [existingCustomer, setExistingCustomer] = useState<any>(null);
  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [showSuggest, setShowSuggest] = useState(false);
  const [v, setV] = useState({
    name: "", phone: "", address: "", city: "Columbus",
    job_type: "electrical_repair", status: "scheduled",
    description: "",
    scheduled: "",
    job_total: "", amount_paid: "",
    payment_method: "cash",
    materials_paid_by_me: true,
    materials_cost: "", materials_notes: "",
    estimated_hours: "", actual_hours: "", hourly_rate: "",
    review_requested: false,
  });

  useEffect(() => {
    supabase.from("customers").select("id, name, phone, email, address, city").order("created_at", { ascending: false })
      .then(({ data }) => setAllCustomers(data || []));
  }, []);

  function attachContact(c: any) {
    setExistingCustomer(c);
    setV((cur) => ({ ...cur, name: c.name || "", phone: c.phone || "", address: c.address || "", city: c.city || cur.city }));
    setContactSearch("");
    setShowSuggest(false);
  }

  useEffect(() => {
    if (!customerId) return;
    supabase.from("customers").select("*").eq("id", customerId).single().then(({ data }) => {
      if (data) attachContact(data);
    });
  }, [customerId]);

  // Phone match suggestion (if typing a new contact and phone matches an existing one)
  const phoneDigits = (v.phone || "").replace(/\D/g, "").slice(-10);
  const phoneMatch = !existingCustomer && phoneDigits.length >= 7
    ? allCustomers.find((c) => (c.phone || "").replace(/\D/g, "").slice(-10) === phoneDigits)
    : null;

  const suggestions = contactSearch.trim().length >= 1
    ? allCustomers.filter((c) => {
        const s = contactSearch.toLowerCase();
        return (c.name || "").toLowerCase().includes(s)
          || (c.phone || "").includes(s)
          || (c.address || "").toLowerCase().includes(s);
      }).slice(0, 8)
    : [];

  const total = Number(v.job_total || 0);
  const paid = Number(v.amount_paid || 0);
  const matCost = Number(v.materials_cost || 0);
  const balance = Math.max(total - paid, 0);
  const profitEst = total - (v.materials_paid_by_me ? matCost : 0);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      let cId = existingCustomer?.id;
      if (!cId) {
        // Auto-attach to phone match if not yet attached
        const pd = (v.phone || "").replace(/\D/g, "").slice(-10);
        const match = pd.length >= 7 ? allCustomers.find((c) => (c.phone || "").replace(/\D/g, "").slice(-10) === pd) : null;
        if (match) {
          cId = match.id;
        } else {
          const { data: c, error: ce } = await supabase.from("customers").insert({
            name: v.name, phone: v.phone || null, address: v.address || null, city: v.city || null,
          }).select().single();
          if (ce) throw ce;
          cId = c.id;
        }
      }
      // Sync any contact field tweaks back to the customer record
      if (cId) {
        await supabase.from("customers").update({
          name: v.name, phone: v.phone || null, address: v.address || null, city: v.city || null,
        }).eq("id", cId);
      }

      const { data: j, error: je } = await supabase.from("jobs").insert({
        customer_id: cId,
        job_type: v.job_type as any,
        status: v.status as any,
        address: v.address || null,
        city: v.city || null,
        description: v.description || null,
        scheduled_start: v.scheduled ? new Date(v.scheduled).toISOString() : null,
        job_total: total,
        estimate_amount: total,
        hourly_rate: Number(v.hourly_rate || 125),
        estimated_hours: Number(v.estimated_hours || 0),
        actual_hours: Number(v.actual_hours || 0),
        review_requested: v.review_requested,
        review_requested_at: v.review_requested ? new Date().toISOString() : null,
      } as any).select().single();
      if (je) throw je;

      if (matCost > 0) {
        await supabase.from("job_materials").insert({
          job_id: j.id,
          description: v.materials_notes || "Materials",
          vendor: v.materials_notes || null,
          cost: matCost,
          paid_by: v.materials_paid_by_me ? "me" : "customer",
        } as any);
      }
      if (paid > 0) {
        await supabase.from("job_payments").insert({
          job_id: j.id, amount: paid, method: v.payment_method, paid_on: new Date().toISOString().slice(0, 10),
        } as any);
      }
      toast.success("Job created");
      navigate(`/admin/jobs/${j.id}`);
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally { setBusy(false); }
  }

  return (
    <div className="container-tight py-6 max-w-2xl">
      <h1 className="text-2xl font-extrabold mb-4">Quick Add Job</h1>
      {existingCustomer ? (
        <div className="mb-3 text-sm rounded-md bg-success/10 border border-success/30 p-3 flex items-center justify-between gap-2">
          <div>Adding job for: <b>{existingCustomer.name}</b> {existingCustomer.phone && <span className="text-muted-foreground">· {existingCustomer.phone}</span>}</div>
          <Button type="button" size="sm" variant="outline" onClick={() => { setExistingCustomer(null); setV((cur) => ({ ...cur, name: "", phone: "", address: "" })); }}>Change</Button>
        </div>
      ) : (
        <Card className="p-3 mb-3 space-y-2">
          <Label className="text-xs font-bold uppercase text-muted-foreground">Pick existing contact (or fill new below)</Label>
          <div className="relative">
            <Input
              placeholder="Search name, phone, address..."
              value={contactSearch}
              onChange={(e) => { setContactSearch(e.target.value); setShowSuggest(true); }}
              onFocus={() => setShowSuggest(true)}
            />
            {showSuggest && suggestions.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-popover border border-border rounded-md shadow-md max-h-64 overflow-auto">
                {suggestions.map((c) => (
                  <button type="button" key={c.id} onClick={() => attachContact(c)} className="w-full text-left p-2 hover:bg-muted text-sm border-b border-border last:border-0">
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.phone}{c.address ? ` · ${c.address}` : ""}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}
      {phoneMatch && !existingCustomer && (
        <div className="mb-3 text-sm rounded-md bg-secondary/10 border border-secondary/30 p-3 flex items-center justify-between gap-2">
          <div>This phone matches existing contact <b>{phoneMatch.name}</b>. Attach to them?</div>
          <Button type="button" size="sm" onClick={() => attachContact(phoneMatch)}>Attach</Button>
        </div>
      )}
      <form onSubmit={save}>
        <Card className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>Customer / Job Name *</Label><Input required value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Address</Label><Input value={v.address} onChange={(e) => setV({ ...v, address: e.target.value })} /></div>
            <div><Label>City</Label><Input value={v.city} onChange={(e) => setV({ ...v, city: e.target.value })} /></div>
            <div>
              <Label>Job Type</Label>
              <Select value={v.job_type} onValueChange={(val) => setV({ ...v, job_type: val })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(JOB_TYPE_LABELS).map(([val, l]) => <SelectItem key={val} value={val}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={v.status} onValueChange={(val) => setV({ ...v, status: val })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(JOB_STATUS_LABELS).map(([val, l]) => <SelectItem key={val} value={val}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Date & Time</Label><Input type="datetime-local" value={v.scheduled} onChange={(e) => setV({ ...v, scheduled: e.target.value })} /></div>
          </div>

          <div><Label>Job Description</Label><Textarea value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} /></div>

          <div className="border-t pt-3">
            <h3 className="font-bold mb-2">Money</h3>
            <div className="grid sm:grid-cols-3 gap-3">
              <div><Label>Job Total Charged</Label><Input type="number" step="0.01" value={v.job_total} onChange={(e) => setV({ ...v, job_total: e.target.value })} /></div>
              <div><Label>Amount Paid</Label><Input type="number" step="0.01" value={v.amount_paid} onChange={(e) => setV({ ...v, amount_paid: e.target.value })} /></div>
              <div><Label>Open Balance</Label><Input value={`$${balance.toFixed(2)}`} readOnly className="bg-muted" /></div>
              <div className="sm:col-span-3">
                <Label>Payment Method</Label>
                <Select value={v.payment_method} onValueChange={(val) => setV({ ...v, payment_method: val })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["cash", "zelle", "cashapp", "check", "card", "venmo", "other"].map((m) =>
                      <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="border-t pt-3">
            <h3 className="font-bold mb-2">Materials</h3>
            <div className="flex items-center gap-2 mb-2">
              <Switch checked={v.materials_paid_by_me} onCheckedChange={(c) => setV({ ...v, materials_paid_by_me: c })} />
              <Label>Materials paid by me? {v.materials_paid_by_me ? "Yes (subtracted from profit)" : "No (customer paid)"}</Label>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>Materials Cost</Label><Input type="number" step="0.01" value={v.materials_cost} onChange={(e) => setV({ ...v, materials_cost: e.target.value })} /></div>
              <div><Label>Vendor / Notes</Label><Input value={v.materials_notes} onChange={(e) => setV({ ...v, materials_notes: e.target.value })} /></div>
            </div>
          </div>

          <div className="border-t pt-3">
            <h3 className="font-bold mb-2">Hours</h3>
            <div className="grid sm:grid-cols-3 gap-3">
              <div><Label>Estimated Hours</Label><Input type="number" step="0.25" value={v.estimated_hours} onChange={(e) => setV({ ...v, estimated_hours: e.target.value })} /></div>
              <div><Label>Actual Hours</Label><Input type="number" step="0.25" value={v.actual_hours} onChange={(e) => setV({ ...v, actual_hours: e.target.value })} /></div>
              <div><Label>Hourly Rate</Label><Input type="number" step="1" value={v.hourly_rate} onChange={(e) => setV({ ...v, hourly_rate: e.target.value })} /></div>
            </div>
          </div>

          <div className="border-t pt-3 flex items-center gap-2">
            <Switch checked={v.review_requested} onCheckedChange={(c) => setV({ ...v, review_requested: c })} />
            <Label>Review requested?</Label>
          </div>

          <Card className="p-3 bg-muted/40 text-sm">
            <div><b>Open Balance:</b> ${balance.toFixed(2)}</div>
            <div><b>Estimated Profit:</b> ${profitEst.toFixed(2)}{v.materials_paid_by_me && matCost > 0 ? ` (after $${matCost.toFixed(2)} materials)` : ""}</div>
          </Card>

          <Button type="submit" disabled={busy} className="w-full bg-success text-success-foreground hover:bg-success/90">
            {busy ? "Saving..." : "Save Job"}
          </Button>
        </Card>
      </form>
    </div>
  );
}

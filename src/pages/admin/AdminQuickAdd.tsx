import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { JOB_TYPE_LABELS } from "@/lib/jobTypes";
import { toast } from "sonner";

export default function AdminQuickAdd() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [v, setV] = useState({
    name: "", phone: "", address: "", city: "Columbus",
    job_type: "electrical_repair", scheduled: "", price: "", notes: "",
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data: c, error: ce } = await supabase.from("customers").insert({
        name: v.name, phone: v.phone || null, address: v.address || null, city: v.city || null,
      }).select().single();
      if (ce) throw ce;
      const { data: j, error: je } = await supabase.from("jobs").insert({
        customer_id: c.id,
        job_type: v.job_type as any,
        status: "scheduled",
        address: v.address || null,
        city: v.city || null,
        scheduled_start: v.scheduled ? new Date(v.scheduled).toISOString() : null,
        estimate_amount: v.price ? Number(v.price) : 0,
        balance_due: v.price ? Number(v.price) : 0,
        internal_notes: v.notes || null,
      }).select().single();
      if (je) throw je;
      toast.success("Job created");
      navigate(`/admin/jobs/${j.id}`);
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally { setBusy(false); }
  }

  return (
    <div className="container-tight py-6 max-w-xl">
      <h1 className="text-2xl font-extrabold mb-4">Quick Add Job</h1>
      <form onSubmit={save}>
        <Card className="p-5 space-y-3">
          <div><Label>Name *</Label><Input required value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></div>
          <div><Label>Phone</Label><Input value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} /></div>
          <div><Label>Address</Label><Input value={v.address} onChange={(e) => setV({ ...v, address: e.target.value })} /></div>
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
          <div><Label>Date & Time</Label><Input type="datetime-local" value={v.scheduled} onChange={(e) => setV({ ...v, scheduled: e.target.value })} /></div>
          <div><Label>Price</Label><Input type="number" step="0.01" value={v.price} onChange={(e) => setV({ ...v, price: e.target.value })} /></div>
          <div><Label>Notes</Label><Textarea value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} /></div>
          <Button type="submit" disabled={busy} className="w-full bg-success text-success-foreground hover:bg-success/90">
            {busy ? "Saving..." : "Save Job"}
          </Button>
        </Card>
      </form>
    </div>
  );
}

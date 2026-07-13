import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

const STAGES = [
  "new_lead", "contacted", "site_visit_needed", "estimate_needed",
  "estimate_sent", "follow_up", "approved", "scheduled",
  "in_progress", "waiting_on_customer", "waiting_on_material",
  "completed", "invoice_sent", "paid", "lost"
];

const STAGE_LABELS: Record<string, string> = {
  new_lead: "New Lead", contacted: "Contacted", site_visit_needed: "Site Visit Needed",
  estimate_needed: "Estimate Needed", estimate_sent: "Estimate Sent",
  follow_up: "Follow-Up", approved: "Approved", scheduled: "Scheduled",
  in_progress: "In Progress", waiting_on_customer: "Waiting on Customer",
  waiting_on_material: "Waiting on Material", completed: "Completed",
  invoice_sent: "Invoice Sent", paid: "Paid", lost: "Lost",
};

const SOURCES = [
  "Website", "Google", "Referral", "Facebook", "Nextdoor", "Phone Call",
  "Walk-in", "Property Manager", "Builder", "Investor", "Homeowner",
  "Previous Customer", "Angi", "Thumbtack", "Other"
];

export default function AdminQuickLead() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", phone: "", email: "", property_address: "", city: "", state: "OH", zip: "",
    lead_source: "Other", service_requested: "", job_description: "",
    estimated_value: "", status: "new_lead", notes: "", next_follow_up: "",
  });

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("leads")
        .insert({
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          property_address: form.property_address.trim() || null,
          city: form.city.trim() || null,
          state: form.state || "OH",
          zip: form.zip.trim() || null,
          lead_source: form.lead_source,
          service_requested: form.service_requested.trim() || null,
          job_description: form.job_description.trim() || null,
          estimated_value: form.estimated_value ? parseFloat(form.estimated_value) : 0,
          status: form.status,
          notes: form.notes.trim() || null,
          next_follow_up: form.next_follow_up || null,
        })
        .select("id")
        .single();

      if (error) throw error;
      toast.success("Lead created");
      navigate(`/admin/leads/${data.id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create lead");
      setSaving(false);
    }
  };

  return (
    <div className="container-tight py-6 space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/leads")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-extrabold">New Lead</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Contact Information */}
        <Card className="p-4 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Contact Information</h2>

          <div>
            <label className="block text-sm mb-1">Full Name *</label>
            <Input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Customer name"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Phone</label>
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="(614) 555-0123"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Email</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="customer@email.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1">Property Address</label>
            <Input
              value={form.property_address}
              onChange={(e) => update("property_address", e.target.value)}
              placeholder="123 Main St"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm mb-1">City</label>
              <Input
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                placeholder="Columbus"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">State</label>
              <Input value={form.state} onChange={(e) => update("state", e.target.value)} placeholder="OH" />
            </div>
            <div>
              <label className="block text-sm mb-1">ZIP</label>
              <Input
                value={form.zip}
                onChange={(e) => update("zip", e.target.value)}
                placeholder="43215"
              />
            </div>
          </div>
        </Card>

        {/* Lead Details */}
        <Card className="p-4 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Lead Details</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Lead Source</label>
              <Select value={form.lead_source} onValueChange={(v) => update("lead_source", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm mb-1">Status</label>
              <Select value={form.status} onValueChange={(v) => update("status", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1">Service Requested</label>
            <Input
              value={form.service_requested}
              onChange={(e) => update("service_requested", e.target.value)}
              placeholder="e.g. Panel upgrade, recessed lighting, EV charger"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Job Description</label>
            <Textarea
              value={form.job_description}
              onChange={(e) => update("job_description", e.target.value)}
              placeholder="Describe the electrical work needed"
              className="min-h-[80px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Estimated Value ($)</label>
              <Input
                type="number"
                value={form.estimated_value}
                onChange={(e) => update("estimated_value", e.target.value)}
                placeholder="1500"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Next Follow-Up</label>
              <Input
                type="date"
                value={form.next_follow_up}
                onChange={(e) => update("next_follow_up", e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1">Notes</label>
            <Textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Any additional notes about this lead"
              className="min-h-[60px]"
            />
          </div>
        </Card>

        <Button type="submit" disabled={saving} className="w-full">
          {saving ? "Saving..." : "Save Lead"}
        </Button>
      </form>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-50">
        <div className="flex justify-around py-2">
          <a href="/admin" className="flex flex-col items-center gap-0.5 px-4 py-1 text-muted-foreground">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            <span className="text-[10px]">Dashboard</span>
          </a>
          <a href="/admin/leads" className="flex flex-col items-center gap-0.5 px-4 py-1 text-primary font-medium">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <span className="text-[10px] font-medium">Leads</span>
          </a>
          <a href="/admin/leads/new" className="flex flex-col items-center gap-0.5 px-4 py-1 text-muted-foreground">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            <span className="text-[10px]">Add</span>
          </a>
          <a href="/admin/jobs" className="flex flex-col items-center gap-0.5 px-4 py-1 text-muted-foreground">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            <span className="text-[10px]">Jobs</span>
          </a>
        </div>
      </nav>
    </div>
  );
}
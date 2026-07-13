import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Phone, MessageSquare, MapPin, Mail, DollarSign, ArrowLeft, Trash2, RefreshCw } from "lucide-react";

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

function getStageColor(s: string) {
  if (["new_lead", "contacted"].includes(s)) return "bg-blue-100 text-blue-800";
  if (["site_visit_needed", "estimate_needed", "estimate_sent", "follow_up"].includes(s)) return "bg-amber-100 text-amber-800";
  if (["approved", "scheduled"].includes(s)) return "bg-green-100 text-green-800";
  if (["in_progress", "waiting_on_customer", "waiting_on_material"].includes(s)) return "bg-purple-100 text-purple-800";
  if (["completed", "invoice_sent", "paid"].includes(s)) return "bg-emerald-100 text-emerald-800";
  return "bg-gray-100 text-gray-600";
}

function suggestFollowUp(status: string, name: string): string {
  const msgs: string[] = [];
  if (status === "new_lead") msgs.push(`"Hi ${name}, this is [Owner] from Shabba & Sons Electric. I saw you requested electrical service — would you like to schedule a time to discuss your project?"`);
  if (status === "estimate_sent") msgs.push(`"Hi ${name}, just following up on the estimate I sent for your electrical work. Happy to answer any questions. Would you like to move forward?"`);
  if (status === "follow_up") msgs.push(`"Hi ${name}, checking back in. Do you have any questions about the electrical work? I can come by for a site visit this week."`);
  if (status === "waiting_on_customer") msgs.push(`"Hi ${name}, just a friendly reminder — I need a few details to finalize your estimate. Please let me know when you have a moment."`);
  if (["completed", "paid"].includes(status)) msgs.push(`"Hi ${name}, thanks for choosing Shabba & Sons Electric! If you're happy with the work, we'd really appreciate a Google review. Would you be open to that?"`);
  if (msgs.length === 0) msgs.push(`"Hi ${name}, this is [Owner] from Shabba & Sons Electric. Just following up on your electrical project. Let me know if you need anything."`);
  return msgs[0];
}

export default function AdminLeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase.from("leads").select("*").eq("id", id).single();
      if (data) {
        setLead(data);
        setStatus(data.status);
        setFollowUp(data.next_follow_up || "");
        setNotes(data.notes || "");
      }
      setLoading(false);
    })();
  }, [id]);

  const handleUpdate = async () => {
    if (!id) return;
    setSaving(true);
    const { error } = await supabase
      .from("leads")
      .update({ status, next_follow_up: followUp || null, notes })
      .eq("id", id);
    if (error) {
      toast.error("Failed to update: " + error.message);
    } else {
      setLead({ ...lead, status, next_follow_up: followUp, notes });
      toast.success("Lead updated");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!id || !confirm("Delete this lead? This cannot be undone.")) return;
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete: " + error.message);
    } else {
      toast.success("Lead deleted");
      navigate("/admin/leads");
    }
  };

  if (loading) return <div className="container-tight py-6 text-center text-muted-foreground">Loading...</div>;
  if (!lead) return <div className="container-tight py-6 text-center"><h1 className="text-xl font-bold mb-2">Lead not found</h1><Button onClick={() => navigate("/admin/leads")}>Back to leads</Button></div>;

  const idx = STAGES.indexOf(status);
  const pct = Math.round((idx / (STAGES.length - 1)) * 100);
  const suggestedMsg = suggestFollowUp(status, lead.name);

  return (
    <div className="container-tight py-6 space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/leads")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-extrabold truncate">{lead.name}</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={handleDelete} className="text-destructive">
          <Trash2 className="h-5 w-5" />
        </Button>
      </div>

      {/* Progress bar */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <Badge className={getStageColor(status)}>{STAGE_LABELS[status] || status}</Badge>
          <span className="text-xs text-muted-foreground">Stage {idx + 1} of {STAGES.length}</span>
        </div>
        <div className="w-full h-2.5 bg-gray-100 rounded-full">
          <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </Card>

      {/* Contact Info */}
      <Card className="p-4 space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Contact Info</h2>
        {lead.phone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <a href={`tel:${lead.phone}`} className="text-primary hover:underline">{lead.phone}</a>
          </div>
        )}
        {lead.email && (
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <a href={`mailto:${lead.email}`} className="text-primary hover:underline">{lead.email}</a>
          </div>
        )}
        {lead.property_address && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{[lead.property_address, lead.city, lead.state].filter(Boolean).join(", ")}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-primary">${Number(lead.estimated_value).toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Source:</span>
          <span>{lead.lead_source || "Other"}</span>
        </div>
      </Card>

      {/* Service Details */}
      <Card className="p-4 space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Service Details</h2>
        {lead.service_requested && (
          <p className="font-medium">{lead.service_requested}</p>
        )}
        {lead.job_description && (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{lead.job_description}</p>
        )}
        <p className="text-xs text-muted-foreground pt-1">Created: {lead.created_at?.slice(0, 10)}</p>
      </Card>

      {/* Update Status */}
      <Card className="p-4 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Update Lead</h2>

        <div>
          <label className="block text-sm mb-1">Status</label>
          <Select value={status} onValueChange={setStatus}>
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

        <div>
          <label className="block text-sm mb-1">Next Follow-Up Date</label>
          <Input type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
        </div>

        <div>
          <label className="block text-sm mb-1">Notes</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes about this lead..."
            className="min-h-[80px]"
          />
        </div>

        <Button onClick={handleUpdate} disabled={saving} className="w-full">
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </Card>

      {/* Suggested Follow-Up */}
      <Card className="p-4 border-amber-200 bg-amber-50">
        <h2 className="text-sm font-semibold text-amber-800 mb-2">💬 Suggested Follow-Up Text</h2>
        <p className="text-sm text-amber-700 bg-white rounded-lg p-3 border border-amber-100">
          {suggestedMsg}
        </p>
        {lead.phone && (
          <a
            href={`sms:${lead.phone}?&body=${encodeURIComponent(suggestedMsg.replace(/"/g, ""))}`}
            className="mt-2 inline-flex items-center gap-2 text-sm text-amber-700 hover:text-amber-900 font-medium"
          >
            <MessageSquare className="h-4 w-4" /> Send via SMS
          </a>
        )}
        <p className="text-xs text-amber-500 mt-2">Replace {"{name}"} with the customer's name and [Owner] with your name before sending.</p>
      </Card>

      {/* Convert to Job */}
      {["approved", "scheduled", "in_progress"].includes(status) && (
        <Card className="p-4 border-green-200 bg-green-50">
          <h2 className="text-sm font-semibold text-green-800 mb-2">✓ Ready for Job</h2>
          <p className="text-sm text-green-700 mb-3">This lead is ready to be converted into a job.</p>
          <Button
            className="bg-green-600 hover:bg-green-700"
            onClick={async () => {
              // Simple conversion: navigate to new job page with lead info
              navigate(`/admin/jobs/new?name=${encodeURIComponent(lead.name)}&phone=${encodeURIComponent(lead.phone || "")}&email=${encodeURIComponent(lead.email || "")}`);
            }}
          >
            <RefreshCw className="h-4 w-4 mr-1" /> Convert to Job
          </Button>
        </Card>
      )}

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
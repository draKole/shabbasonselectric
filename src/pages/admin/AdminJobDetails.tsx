import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { JOB_STATUS_LABELS, JOB_TYPE_LABELS, STATUS_COLOR, PAYMENT_STATUS_LABELS, STATUS_HELP } from "@/lib/jobTypes";
import { Phone, MessageSquare, CalendarPlus, Download, Star, ArrowLeft } from "lucide-react";
import JobMaterials from "@/components/admin/JobMaterials";
import JobPayments from "@/components/admin/JobPayments";
import JobHourly from "@/components/admin/JobHourly";
import JobWorkerHours from "@/components/admin/JobWorkerHours";
import { toast } from "sonner";
import { BUSINESS, telHref, smsHref } from "@/lib/business";

function buildICSForJob(j: any, customer: any) {
  const dt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const start = j.scheduled_start ? new Date(j.scheduled_start) : new Date();
  const end = j.scheduled_end ? new Date(j.scheduled_end) : new Date(start.getTime() + 60 * 60_000);
  const desc = [
    `Customer: ${customer?.name || ""}`,
    `Phone: ${customer?.phone || ""}`,
    `Job Type: ${JOB_TYPE_LABELS[j.job_type] || j.job_type}`,
    `Status: ${JOB_STATUS_LABELS[j.status]}`,
    `Notes: ${(j.description || "").slice(0, 500)}`,
    `Permit Needed: ${j.permit_needed}`,
    `Inspection Needed: ${j.inspection_needed}`,
    `Balance Due: $${j.balance_due || 0}`,
  ].join("\\n");
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Shabba & Sons//Job//EN",
    "BEGIN:VEVENT", `UID:${j.id}@shabba`, `DTSTAMP:${dt(new Date())}`,
    `DTSTART:${dt(start)}`, `DTEND:${dt(end)}`,
    `SUMMARY:Shabba Job: ${customer?.name || "Job"} - ${JOB_TYPE_LABELS[j.job_type] || ""}`,
    `LOCATION:${[j.address, j.city, j.state].filter(Boolean).join(", ")}`,
    `DESCRIPTION:${desc}`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
}

function googleCalUrl(j: any, customer: any) {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const start = j.scheduled_start ? new Date(j.scheduled_start) : new Date();
  const end = j.scheduled_end ? new Date(j.scheduled_end) : new Date(start.getTime() + 60 * 60_000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Shabba Job: ${customer?.name || "Job"} - ${JOB_TYPE_LABELS[j.job_type] || ""}`,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: `Customer: ${customer?.name}\nPhone: ${customer?.phone}\nNotes: ${j.description || ""}\nBalance: $${j.balance_due || 0}`,
    location: [j.address, j.city, j.state].filter(Boolean).join(", "),
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

export default function AdminJobDetails() {
  const { id } = useParams();
  const [job, setJob] = useState<any>(null);
  const [customer, setCustomer] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);

  async function load() {
    const { data: j } = await supabase.from("jobs").select("*, customers(*)").eq("id", id).single();
    setJob(j);
    setCustomer(j?.customers);
    const { data: ph } = await supabase.from("job_photos").select("*").eq("job_id", id).order("created_at");
    setPhotos(ph || []);
    const { data: tl } = await supabase.from("job_timeline_events").select("*").eq("job_id", id).order("created_at", { ascending: false });
    setTimeline(tl || []);
  }
  useEffect(() => { if (id) load(); }, [id]);

  async function update(patch: any) {
    const { error } = await supabase.from("jobs").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    load();
  }

  function downloadICS() {
    const ics = buildICSForJob(job, customer);
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `job-${job.id.slice(0, 8)}.ics`; a.click();
    URL.revokeObjectURL(url);
  }

  if (!job) return <div className="container-tight py-6">Loading...</div>;

  const reviewMsg = `Hey, thank you again for choosing ${BUSINESS.name}. If you were happy with the work, could you leave us a quick Google review? It really helps our business. ${BUSINESS.googleReviewUrl} Thank you again.`;

  return (
    <div className="container-tight py-6 space-y-4">
      <Link to="/admin/jobs" className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to jobs
      </Link>

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold">{customer?.name}</h1>
            <p className="text-muted-foreground">{JOB_TYPE_LABELS[job.job_type]} · {[job.address, job.city].filter(Boolean).join(", ")}</p>
            <Badge className={`mt-2 ${STATUS_COLOR[job.status] || ""}`}>{JOB_STATUS_LABELS[job.status]}</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {customer?.phone && (
              <>
                <a href={`tel:${customer.phone}`}><Button size="sm" className="gap-1 bg-success text-success-foreground hover:bg-success/90"><Phone className="h-4 w-4" />Call</Button></a>
                <a href={`sms:${customer.phone}?&body=${encodeURIComponent(`Hi ${customer.name}, this is Shabba — `)}`}><Button size="sm" variant="outline" className="gap-1"><MessageSquare className="h-4 w-4" />Text</Button></a>
              </>
            )}
            <a href={googleCalUrl(job, customer)} target="_blank" rel="noreferrer"><Button size="sm" variant="outline" className="gap-1"><CalendarPlus className="h-4 w-4" />Google Cal</Button></a>
            <Button size="sm" variant="outline" onClick={downloadICS} className="gap-1"><Download className="h-4 w-4" />.ics</Button>
            <a href={`sms:${customer?.phone || BUSINESS.phoneDigits}?&body=${encodeURIComponent(reviewMsg)}`}>
              <Button size="sm" variant="outline" className="gap-1"><Star className="h-4 w-4" />Review</Button>
            </a>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5 space-y-3">
          <h2 className="font-bold">Status & Schedule</h2>
          <div>
            <Label>Status</Label>
            <Select value={job.status} onValueChange={(v) => update({ status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(JOB_STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            {STATUS_HELP[job.status] && <p className="text-xs text-muted-foreground mt-1">{STATUS_HELP[job.status]}</p>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Scheduled Start</Label>
              <Input type="datetime-local" defaultValue={job.scheduled_start ? new Date(job.scheduled_start).toISOString().slice(0, 16) : ""}
                onBlur={(e) => update({ scheduled_start: e.target.value ? new Date(e.target.value).toISOString() : null })} />
            </div>
            <div>
              <Label>End</Label>
              <Input type="datetime-local" defaultValue={job.scheduled_end ? new Date(job.scheduled_end).toISOString().slice(0, 16) : ""}
                onBlur={(e) => update({ scheduled_end: e.target.value ? new Date(e.target.value).toISOString() : null })} />
            </div>
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <h2 className="font-bold">Pricing & Payment Status</h2>
          <p className="text-xs text-muted-foreground">Set Job Total here. Materials and Payments below auto-update Balance Due and Payment Status.</p>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Job Total</Label><Input type="number" step="0.01" defaultValue={job.job_total || job.estimate_amount || 0} onBlur={(e) => update({ job_total: Number(e.target.value) })} /></div>
            <div><Label>Deposit Required</Label><Input type="number" step="0.01" defaultValue={job.deposit_required} onBlur={(e) => update({ deposit_required: Number(e.target.value) })} /></div>
            <div><Label>Amount Paid (auto)</Label><Input type="number" value={Number(job.amount_paid || 0).toFixed(2)} disabled /></div>
            <div><Label>Open Balance (auto)</Label><Input type="number" value={Number(job.balance_due || 0).toFixed(2)} disabled /></div>
            <div className="col-span-2">
              <Label>Payment Status</Label>
              <div className="mt-1"><Badge>{PAYMENT_STATUS_LABELS[job.payment_status] || job.payment_status}</Badge></div>
            </div>
          </div>
        </Card>


        <Card className="p-5 space-y-3">
          <h2 className="font-bold">Permit & Inspection</h2>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Permit Needed</Label>
              <Select value={job.permit_needed || "not_sure"} onValueChange={(v) => update({ permit_needed: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem><SelectItem value="not_sure">Not Sure</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Permit #</Label><Input defaultValue={job.permit_number || ""} onBlur={(e) => update({ permit_number: e.target.value })} /></div>
            <div><Label>Inspection Date</Label><Input type="date" defaultValue={job.inspection_date || ""} onBlur={(e) => update({ inspection_date: e.target.value || null })} /></div>
            <div><Label>Inspection Status</Label>
              <Select value={job.inspection_status || "not_applicable"} onValueChange={(v) => update({ inspection_status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_applicable">N/A</SelectItem><SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="passed">Passed</SelectItem><SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Corrections</Label><Textarea defaultValue={job.corrections_needed || ""} onBlur={(e) => update({ corrections_needed: e.target.value })} /></div>
        </Card>

        <Card className="p-5 space-y-3">
          <h2 className="font-bold">Notes</h2>
          <div><Label>Customer Description</Label><Textarea defaultValue={job.description || ""} onBlur={(e) => update({ description: e.target.value })} /></div>
          <div><Label>Internal Notes</Label><Textarea defaultValue={job.internal_notes || ""} onBlur={(e) => update({ internal_notes: e.target.value })} /></div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <JobPayments jobId={job.id} jobTotal={Number(job.job_total || job.estimate_amount || 0)} amountPaid={Number(job.amount_paid || 0)} balance={Number(job.balance_due || 0)} />
        <JobMaterials jobId={job.id} />
        <JobHourly job={job} update={update} />
      </div>

      {photos.length > 0 && (
        <Card className="p-5">
          <h2 className="font-bold mb-3">Photos</h2>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {photos.map((p) => (
              <a key={p.id} href={p.photo_url} target="_blank" rel="noreferrer" className="block aspect-square rounded overflow-hidden border border-border">
                <img src={p.photo_url} alt="" className="w-full h-full object-cover" />
              </a>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-5">
        <h2 className="font-bold mb-3">Timeline</h2>
        <div className="space-y-2 text-sm">
          {timeline.map((t) => (
            <div key={t.id} className="flex items-start gap-3 pb-2 border-b border-border last:border-0">
              <div className="text-xs text-muted-foreground w-32 shrink-0">{new Date(t.created_at).toLocaleString()}</div>
              <div>{t.event_type === "status_change" ? `${JOB_STATUS_LABELS[t.from_status] || t.from_status} → ${JOB_STATUS_LABELS[t.to_status] || t.to_status}` : t.note || t.event_type}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

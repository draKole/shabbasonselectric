import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSeo } from "@/lib/seo";
import { BUSINESS, telHref } from "@/lib/business";
import { JOB_TYPE_LABELS } from "@/lib/jobTypes";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Upload, X, Phone } from "lucide-react";

const schema = z.object({
  name: z.string().trim().min(1, "Required").max(120),
  phone: z.string().trim().min(7, "Phone required").max(40),
  email: z.string().trim().email("Invalid email").max(200).optional().or(z.literal("")),
  preferred_contact: z.enum(["call", "text", "email"]),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  state: z.string().trim().max(40).optional().or(z.literal("")),
  zip: z.string().trim().max(15).optional().or(z.literal("")),
  customer_type: z.enum(["homeowner", "landlord", "contractor", "investor", "business", "new_construction", "job_site"]),
  job_type: z.string().min(1),
  urgency: z.enum(["emergency", "this_week", "flexible", "planning_ahead"]),
  preferred_date: z.string().optional().or(z.literal("")),
  preferred_time_window: z.string().max(80).optional().or(z.literal("")),
  alternate_date: z.string().optional().or(z.literal("")),
  alternate_time_window: z.string().max(80).optional().or(z.literal("")),
  description: z.string().trim().max(3000).optional().or(z.literal("")),
  has_materials: z.enum(["yes", "no", "some"]),
  permit_needed: z.enum(["yes", "no", "not_sure"]),
  power_status: z.enum(["yes", "no", "partially"]),
  wants_free_estimate: z.boolean(),
  wants_ballpark: z.boolean(),
  has_existing_estimate: z.boolean(),
});

type FormVals = z.infer<typeof schema>;

const MAX_PHOTOS = 10;
const MAX_BYTES = 10 * 1024 * 1024;

export default function Schedule() {
  useSeo({
    title: `Schedule Electrical Service | ${BUSINESS.city} Ohio Electrician`,
    description: `Schedule electrical service or a free estimate with ${BUSINESS.name} in ${BUSINESS.serviceArea}.`,
  });

  const [photos, setPhotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const form = useForm<FormVals>({
    resolver: zodResolver(schema),
    defaultValues: {
      preferred_contact: "call",
      customer_type: "homeowner",
      job_type: "electrical_repair",
      urgency: "flexible",
      has_materials: "no",
      permit_needed: "not_sure",
      power_status: "yes",
      wants_free_estimate: true,
      wants_ballpark: false,
      has_existing_estimate: false,
      state: "OH",
    },
  });

  function addFiles(files: FileList | null) {
    if (!files) return;
    const next = [...photos];
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("image/")) {
        toast.error(`${f.name} is not an image`);
        continue;
      }
      if (f.size > MAX_BYTES) {
        toast.error(`${f.name} is over 10MB`);
        continue;
      }
      if (next.length >= MAX_PHOTOS) {
        toast.error(`Max ${MAX_PHOTOS} photos`);
        break;
      }
      next.push(f);
    }
    setPhotos(next);
  }

  async function onSubmit(values: FormVals) {
    setSubmitting(true);
    try {
      // 1. Create customer
      const { data: customer, error: cErr } = await supabase
        .from("customers")
        .insert({
          name: values.name,
          phone: values.phone,
          email: values.email || null,
          preferred_contact: values.preferred_contact,
          address: values.address || null,
          city: values.city || null,
          state: values.state || "OH",
          zip: values.zip || null,
          customer_type: values.customer_type,
        })
        .select()
        .single();
      if (cErr) throw cErr;

      // 2. Create job
      const { data: job, error: jErr } = await supabase
        .from("jobs")
        .insert({
          customer_id: customer.id,
          job_type: values.job_type as any,
          status: "new_lead",
          urgency: values.urgency,
          address: values.address || null,
          city: values.city || null,
          state: values.state || "OH",
          zip: values.zip || null,
          description: values.description || null,
          preferred_date: values.preferred_date || null,
          preferred_time_window: values.preferred_time_window || null,
          alternate_date: values.alternate_date || null,
          alternate_time_window: values.alternate_time_window || null,
          permit_needed: values.permit_needed,
          power_status: values.power_status,
          has_materials: values.has_materials,
          wants_free_estimate: values.wants_free_estimate,
          wants_ballpark: values.wants_ballpark,
          has_existing_estimate: values.has_existing_estimate,
        })
        .select()
        .single();
      if (jErr) throw jErr;

      // 3. Upload photos
      for (const f of photos) {
        const ext = f.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${job.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("customer-uploads")
          .upload(path, f, { contentType: f.type, upsert: false });
        if (upErr) {
          console.error(upErr);
          continue;
        }
        const { data: urlData } = supabase.storage.from("customer-uploads").getPublicUrl(path);
        await supabase.from("job_photos").insert({
          job_id: job.id,
          photo_url: urlData.publicUrl,
          photo_type: "customer_upload",
          uploaded_by_admin: false,
        });
      }

      // Fire-and-forget SMS lead alert
      try {
        const { sendLeadAlert } = await import("@/lib/useLeadAlertSettings");
        sendLeadAlert({
          lead_type: "service_request",
          name: values.name,
          phone: values.phone,
          service: values.job_type,
          address_city: [values.address, values.city].filter(Boolean).join(", "),
        });
      } catch {}

      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Could not submit. Please call us.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <section className="container-tight py-16">
        <Card className="p-8 max-w-2xl mx-auto text-center">
          <CheckCircle2 className="h-12 w-12 text-success mx-auto" />
          <h1 className="text-2xl md:text-3xl font-extrabold mt-4">Request received</h1>
          <p className="mt-3 text-muted-foreground">
            Thank you. {BUSINESS.name} received your request. We'll call or text you shortly to confirm
            your appointment. For urgent work, call or text{" "}
            <a className="text-secondary font-semibold" href={telHref}>{BUSINESS.phone}</a>.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            <a href={telHref}>
              <Button className="bg-success text-success-foreground hover:bg-success/90 gap-2">
                <Phone className="h-4 w-4" /> Call Now
              </Button>
            </a>
          </div>
        </Card>
      </section>
    );
  }

  return (
    <section className="container-tight py-10 md:py-14">
      <div className="max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-extrabold">Schedule Electrical Service</h1>
        <p className="mt-3 text-muted-foreground">
          Tell us what you need, upload photos, and choose your preferred time. We'll follow up to confirm.
        </p>
      </div>

      <Card className="mt-6 p-4 max-w-3xl bg-secondary/5 border-secondary/30">
        <div className="flex items-start gap-3 text-sm">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-secondary/15 text-secondary">🎟️</div>
          <div className="flex-1">
            <div className="font-semibold">Planning a bigger job? Ask about service vouchers.</div>
            <p className="text-muted-foreground mt-0.5">
              Pay now, get more labor credit later — great for panels, EV chargers, lighting upgrades, and remodels.
            </p>
          </div>
          <a href="/vouchers" className="text-secondary font-semibold whitespace-nowrap hover:underline">View vouchers →</a>
        </div>
      </Card>


      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 grid gap-8 max-w-3xl">
        {/* Customer info */}
        <Card className="p-5">
          <h2 className="font-bold mb-4">Customer Information</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input id="name" {...form.register("name")} />
              {form.formState.errors.name && <p className="text-sm text-destructive mt-1">{form.formState.errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="phone">Phone *</Label>
              <Input id="phone" type="tel" {...form.register("phone")} />
              {form.formState.errors.phone && <p className="text-sm text-destructive mt-1">{form.formState.errors.phone.message}</p>}
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...form.register("email")} />
            </div>
            <div>
              <Label>Preferred Contact</Label>
              <Select defaultValue="call" onValueChange={(v) => form.setValue("preferred_contact", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Job location */}
        <Card className="p-5">
          <h2 className="font-bold mb-4">Job Location</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="address">Street Address</Label>
              <Input id="address" {...form.register("address")} />
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" {...form.register("city")} defaultValue="Columbus" />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input id="state" {...form.register("state")} />
            </div>
            <div>
              <Label htmlFor="zip">Zip</Label>
              <Input id="zip" {...form.register("zip")} />
            </div>
            <div>
              <Label>Property Type</Label>
              <Select defaultValue="homeowner" onValueChange={(v) => form.setValue("customer_type", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="homeowner">Home</SelectItem>
                  <SelectItem value="landlord">Rental</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="new_construction">New Construction</SelectItem>
                  <SelectItem value="job_site">Job Site</SelectItem>
                  <SelectItem value="contractor">Contractor</SelectItem>
                  <SelectItem value="investor">Investor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Job */}
        <Card className="p-5">
          <h2 className="font-bold mb-4">Job Details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Job Type</Label>
              <Select defaultValue="electrical_repair" onValueChange={(v) => form.setValue("job_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(JOB_TYPE_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Urgency</Label>
              <Select defaultValue="flexible" onValueChange={(v) => form.setValue("urgency", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="emergency">Emergency / ASAP</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="flexible">Flexible</SelectItem>
                  <SelectItem value="planning_ahead">Planning Ahead</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="preferred_date">Preferred Date</Label>
              <Input id="preferred_date" type="date" {...form.register("preferred_date")} />
            </div>
            <div>
              <Label htmlFor="preferred_time_window">Preferred Time Window</Label>
              <Input id="preferred_time_window" placeholder="e.g. Morning, 2-4pm" {...form.register("preferred_time_window")} />
            </div>
            <div>
              <Label htmlFor="alternate_date">Alternate Date</Label>
              <Input id="alternate_date" type="date" {...form.register("alternate_date")} />
            </div>
            <div>
              <Label htmlFor="alternate_time_window">Alternate Time Window</Label>
              <Input id="alternate_time_window" {...form.register("alternate_time_window")} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="description">Describe the issue or work needed</Label>
              <Textarea id="description" rows={4} {...form.register("description")} placeholder="Tell us what's going on. The more detail, the faster we can quote." />
            </div>

            <div>
              <Label>Do you already have materials?</Label>
              <Select defaultValue="no" onValueChange={(v) => form.setValue("has_materials", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="some">Some</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Permit / Inspection Needed?</Label>
              <Select defaultValue="not_sure" onValueChange={(v) => form.setValue("permit_needed", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="not_sure">Not Sure</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Is power working?</Label>
              <Select defaultValue="yes" onValueChange={(v) => form.setValue("power_status", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="partially">Partially</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Photos */}
          <div className="mt-5">
            <Label>Photos (optional, up to 10, 10MB each)</Label>
            <label className="mt-2 flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-md py-6 cursor-pointer hover:border-secondary text-sm text-muted-foreground">
              <Upload className="h-4 w-4" />
              Tap to upload photos
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
              />
            </label>
            {photos.length > 0 && (
              <div className="mt-3 grid grid-cols-3 sm:grid-cols-5 gap-2">
                {photos.map((p, i) => (
                  <div key={i} className="relative aspect-square rounded-md overflow-hidden border border-border">
                    <img src={URL.createObjectURL(p)} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
                      className="absolute top-1 right-1 bg-background/90 rounded-full p-1"
                      aria-label="Remove photo"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Button
          type="submit"
          size="lg"
          disabled={submitting}
          className="bg-success text-success-foreground hover:bg-success/90 w-full sm:w-auto"
        >
          {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Submit Request
        </Button>
      </form>
    </section>
  );
}

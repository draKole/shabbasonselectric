import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useSeo } from "@/lib/seo";
import { BUSINESS } from "@/lib/business";
import { toast } from "sonner";
import { z } from "zod";

const SKILLS = [
  "rough-in", "trim-out", "service work", "panels", "troubleshooting",
  "commercial", "residential", "low voltage", "helper/labor",
];

const schema = z.object({
  full_name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(7).max(20),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
});

export default function Careers() {
  useSeo({
    title: `Careers | Work With ${BUSINESS.name}`,
    description: `Electricians, helpers, and contractors — apply to work with ${BUSINESS.name} in Columbus, Ohio.`,
  });

  const [v, setV] = useState<any>({
    full_name: "", phone: "", email: "", city: "",
    has_experience: false, years_experience: "",
    skills: [] as string[],
    has_tools: false, has_transport: false, is_licensed: false, follows_code: false,
    availability: "", desired_pay: "", notes: "",
  });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  function toggleSkill(s: string) {
    setV((p: any) => ({ ...p, skills: p.skills.includes(s) ? p.skills.filter((x: string) => x !== s) : [...p.skills, s] }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(v);
    if (!parsed.success) return toast.error(parsed.error.errors[0].message);
    setBusy(true);
    const { error } = await supabase.from("job_applications").insert({
      ...v,
      years_experience: Number(v.years_experience || 0),
      email: v.email || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setDone(true);
  }

  if (done) {
    return (
      <section className="container-tight py-14 max-w-xl">
        <Card className="p-8 text-center">
          <h1 className="text-2xl font-extrabold">Application received</h1>
          <p className="mt-2 text-muted-foreground">Thanks! We'll reach out if it's a fit.</p>
        </Card>
      </section>
    );
  }

  return (
    <section className="container-tight py-10 max-w-2xl">
      <h1 className="text-3xl md:text-5xl font-extrabold">Work With Us</h1>
      <p className="mt-3 text-muted-foreground">
        Looking for electricians, helpers, and contractors in Columbus, Ohio.
      </p>

      <form onSubmit={submit} className="mt-6">
        <Card className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>Full name *</Label><Input required value={v.full_name} onChange={(e) => setV({ ...v, full_name: e.target.value })} maxLength={100} /></div>
            <div><Label>Phone *</Label><Input required value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} maxLength={20} /></div>
            <div><Label>Email</Label><Input type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} maxLength={255} /></div>
            <div><Label>City</Label><Input value={v.city} onChange={(e) => setV({ ...v, city: e.target.value })} maxLength={100} /></div>
          </div>

          <div className="flex items-center gap-2"><Switch checked={v.has_experience} onCheckedChange={(c) => setV({ ...v, has_experience: c })} /><Label>Electrical experience?</Label></div>
          <div><Label>Years of experience</Label><Input type="number" min={0} value={v.years_experience} onChange={(e) => setV({ ...v, years_experience: e.target.value })} /></div>

          <div>
            <Label>Skills</Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {SKILLS.map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={v.skills.includes(s)} onCheckedChange={() => toggleSkill(s)} /> {s}
                </label>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-2"><Switch checked={v.has_tools} onCheckedChange={(c) => setV({ ...v, has_tools: c })} /><Label>Own tools?</Label></div>
            <div className="flex items-center gap-2"><Switch checked={v.has_transport} onCheckedChange={(c) => setV({ ...v, has_transport: c })} /><Label>Reliable transportation?</Label></div>
            <div className="flex items-center gap-2"><Switch checked={v.is_licensed} onCheckedChange={(c) => setV({ ...v, is_licensed: c })} /><Label>Licensed?</Label></div>
            <div className="flex items-center gap-2"><Switch checked={v.follows_code} onCheckedChange={(c) => setV({ ...v, follows_code: c })} /><Label>Work under supervision & follow code?</Label></div>
          </div>

          <div><Label>Availability</Label><Input value={v.availability} onChange={(e) => setV({ ...v, availability: e.target.value })} placeholder="Mon–Fri, weekends, etc." /></div>
          <div><Label>Desired pay</Label><Input value={v.desired_pay} onChange={(e) => setV({ ...v, desired_pay: e.target.value })} placeholder="$/hr or expectation" /></div>
          <div><Label>Notes</Label><Textarea value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} maxLength={2000} /></div>

          <Button type="submit" disabled={busy} className="w-full bg-success text-success-foreground hover:bg-success/90">
            {busy ? "Submitting..." : "Submit Application"}
          </Button>
        </Card>
      </form>
    </section>
  );
}

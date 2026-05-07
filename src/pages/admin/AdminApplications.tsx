import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, UserPlus, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const STATUSES = ["new", "contacted", "interview", "approved", "converted", "not_a_fit"];
const STATUS_LABEL: Record<string, string> = {
  new: "New", contacted: "Contacted", interview: "Interview", approved: "Approved", converted: "Converted to Worker", not_a_fit: "Not a Fit",
};

export default function AdminApplications() {
  const [apps, setApps] = useState<any[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const navigate = useNavigate();

  async function load() {
    const { data } = await supabase.from("job_applications").select("*").order("created_at", { ascending: false });
    setApps(data || []);
  }
  useEffect(() => { load(); }, []);

  async function setStatus(id: string, status: string) {
    await supabase.from("job_applications").update({ status }).eq("id", id);
    load();
  }
  async function setNotes(id: string, admin_notes: string) {
    await supabase.from("job_applications").update({ admin_notes }).eq("id", id);
  }
  async function remove(a: any) {
    if (!confirm(`Delete ${a.full_name}'s application?`)) return;
    await supabase.from("job_applications").delete().eq("id", a.id);
    toast.success("Deleted"); load();
  }

  async function convertToWorker(a: any) {
    if (a.converted_worker_id) {
      navigate("/admin/workers");
      return;
    }
    // Dedupe by phone or email
    const orParts: string[] = [];
    if (a.phone) orParts.push(`phone.eq.${a.phone}`);
    if (a.email) orParts.push(`email.eq.${a.email}`);
    let existing: any = null;
    if (orParts.length) {
      const { data } = await supabase.from("workers").select("id, full_name").or(orParts.join(",")).limit(1);
      existing = data?.[0];
    }
    if (existing) {
      if (!confirm(`A worker with the same phone/email exists (${existing.full_name}). Link this application to them?`)) return;
      await supabase.from("job_applications").update({ status: "converted", converted_worker_id: existing.id }).eq("id", a.id);
      toast.success("Linked to existing worker"); load();
      return;
    }
    const desiredRate = parseFloat(String(a.desired_pay || "").replace(/[^0-9.]/g, "")) || 25;
    const { data: created, error } = await supabase.from("workers").insert({
      full_name: a.full_name, phone: a.phone, email: a.email,
      role: a.is_licensed ? "journeyman" : (a.has_experience ? "apprentice" : "helper"),
      pay_type: "hourly", hourly_rate: desiredRate, active: true,
      notes: [a.notes, a.skills?.length ? `Skills: ${a.skills.join(", ")}` : "", a.years_experience ? `${a.years_experience} yrs exp` : ""].filter(Boolean).join(" · "),
    } as any).select("id").single();
    if (error) return toast.error(error.message);
    await supabase.from("job_applications").update({ status: "converted", converted_worker_id: created!.id }).eq("id", a.id);
    toast.success("Worker created from application");
    load();
  }

  return (
    <div className="container-tight py-6 space-y-3">
      <h1 className="text-2xl font-extrabold">Applications</h1>
      {apps.map((a) => {
        const open = openId === a.id;
        return (
          <Card key={a.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <button onClick={() => setOpenId(open ? null : a.id)} className="text-left flex-1 min-w-0">
                <div className="font-semibold">{a.full_name}</div>
                <div className="text-xs text-muted-foreground">
                  {a.phone} · {a.city || ""} · {new Date(a.created_at).toLocaleDateString()}
                </div>
              </button>
              <div className="flex items-center gap-2">
                <Select value={a.status} onValueChange={(s) => setStatus(a.id, s)}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="ghost" onClick={() => remove(a)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
            {open && (
              <div className="mt-3 pt-3 border-t border-border space-y-2 text-sm">
                <div><b>Email:</b> {a.email || "—"}</div>
                <div><b>Experience:</b> {a.has_experience ? `Yes · ${a.years_experience} yrs` : "No"}</div>
                <div><b>Skills:</b> {(a.skills || []).join(", ") || "—"}</div>
                <div className="grid sm:grid-cols-2 gap-1">
                  <div><b>Tools:</b> {a.has_tools ? "Yes" : "No"}</div>
                  <div><b>Transport:</b> {a.has_transport ? "Yes" : "No"}</div>
                  <div><b>Licensed:</b> {a.is_licensed ? "Yes" : "No"}</div>
                  <div><b>Follows code:</b> {a.follows_code ? "Yes" : "No"}</div>
                </div>
                <div><b>Availability:</b> {a.availability || "—"}</div>
                <div><b>Desired pay:</b> {a.desired_pay || "—"}</div>
                {a.notes && <div><b>Notes:</b> {a.notes}</div>}
                <div className="flex gap-2 pt-2 flex-wrap">
                  <Button asChild size="sm" variant="outline"><a href={`tel:${a.phone}`}>Call</a></Button>
                  <Button asChild size="sm" variant="outline"><a href={`sms:${a.phone}`}>Text</a></Button>
                  {a.email && <Button asChild size="sm" variant="outline"><a href={`mailto:${a.email}`}>Email</a></Button>}
                  {a.converted_worker_id ? (
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => navigate("/admin/workers")}>
                      <CheckCircle2 className="h-3.5 w-3.5 text-success" /> Converted — open Workers
                    </Button>
                  ) : (
                    <Button size="sm" className="gap-1 bg-success text-success-foreground hover:bg-success/90" onClick={() => convertToWorker(a)}>
                      <UserPlus className="h-3.5 w-3.5" /> Convert to Worker
                    </Button>
                  )}
                </div>
                <div>
                  <div className="text-xs font-semibold mb-1">Admin notes</div>
                  <Textarea defaultValue={a.admin_notes || ""} onBlur={(e) => setNotes(a.id, e.target.value)} />
                </div>
              </div>
            )}
          </Card>
        );
      })}
      {apps.length === 0 && <Card className="p-6 text-center text-muted-foreground">No applications yet.</Card>}
    </div>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Trash2, Pencil, X } from "lucide-react";
import { toast } from "sonner";

const EMPTY = { customer_name: "", review_text: "", rating: 5, service_type: "", neighborhood: "", platform: "google" as const, public_visible: true, featured: false };

export default function AdminReviews() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [draft, setDraft] = useState<any>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from("reviews").select("*").order("created_at", { ascending: false });
    setReviews(data || []);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!draft.customer_name || !draft.review_text) return toast.error("Name and text required");
    if (editingId) {
      const { error } = await supabase.from("reviews").update(draft).eq("id", editingId);
      if (error) return toast.error(error.message);
      toast.success("Review updated");
    } else {
      const { error } = await supabase.from("reviews").insert({ ...draft, review_received: true, received_at: new Date().toISOString() } as any);
      if (error) return toast.error(error.message);
      toast.success("Review added");
    }
    setDraft(EMPTY); setEditingId(null); load();
  }

  function edit(r: any) {
    setEditingId(r.id);
    setDraft({
      customer_name: r.customer_name || "", review_text: r.review_text || "", rating: r.rating || 5,
      service_type: r.service_type || "", neighborhood: r.neighborhood || "", platform: r.platform || "google",
      public_visible: !!r.public_visible, featured: !!r.featured,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function remove(r: any) {
    if (!confirm(`Delete review from ${r.customer_name}?`)) return;
    const { error } = await supabase.from("reviews").delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); load();
  }

  async function toggle(r: any, field: "public_visible" | "featured") {
    await supabase.from("reviews").update({ [field]: !r[field] } as any).eq("id", r.id);
    load();
  }

  return (
    <div className="container-tight py-6 grid gap-4 lg:grid-cols-2">
      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">{editingId ? "Edit Review" : "Add Review"}</h2>
          {editingId && (
            <Button size="sm" variant="ghost" onClick={() => { setEditingId(null); setDraft(EMPTY); }}>
              <X className="h-4 w-4" /> Cancel
            </Button>
          )}
        </div>
        <div><Label>Customer Name</Label><Input value={draft.customer_name} onChange={(e) => setDraft({ ...draft, customer_name: e.target.value })} /></div>
        <div><Label>Service Type</Label><Input value={draft.service_type} onChange={(e) => setDraft({ ...draft, service_type: e.target.value })} /></div>
        <div><Label>Neighborhood</Label><Input value={draft.neighborhood} onChange={(e) => setDraft({ ...draft, neighborhood: e.target.value })} /></div>
        <div><Label>Rating (1–5)</Label><Input type="number" min={1} max={5} value={draft.rating} onChange={(e) => setDraft({ ...draft, rating: Number(e.target.value) })} /></div>
        <div><Label>Review Text</Label><Textarea rows={4} value={draft.review_text} onChange={(e) => setDraft({ ...draft, review_text: e.target.value })} /></div>
        <div className="flex items-center gap-2"><Switch checked={draft.public_visible} onCheckedChange={(c) => setDraft({ ...draft, public_visible: c })} /><Label>Show publicly on Reviews page</Label></div>
        <div className="flex items-center gap-2"><Switch checked={draft.featured} onCheckedChange={(c) => setDraft({ ...draft, featured: c })} /><Label>Feature on homepage</Label></div>
        <Button onClick={save}>{editingId ? "Save Changes" : "Add Review"}</Button>
      </Card>

      <Card className="p-5">
        <h2 className="font-bold mb-3">All Reviews</h2>
        <div className="space-y-2">
          {reviews.map((r) => (
            <div key={r.id} className="border border-border rounded p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold">{r.customer_name} <span className="text-xs text-muted-foreground">{r.rating}★</span></div>
                  <div className="text-xs text-muted-foreground">{r.service_type} · {r.platform}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => edit(r)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(r)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
              <p className="text-sm mt-2">{r.review_text}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                <label className="flex items-center gap-1"><Switch checked={r.public_visible} onCheckedChange={() => toggle(r, "public_visible")} /> Public</label>
                <label className="flex items-center gap-1"><Switch checked={r.featured} onCheckedChange={() => toggle(r, "featured")} /> Featured</label>
              </div>
            </div>
          ))}
          {reviews.length === 0 && <div className="text-sm text-muted-foreground">No reviews yet.</div>}
        </div>
      </Card>
    </div>
  );
}

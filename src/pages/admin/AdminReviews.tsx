import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function AdminReviews() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [draft, setDraft] = useState({ customer_name: "", review_text: "", rating: 5, service_type: "", neighborhood: "", platform: "google", public_visible: true });

  async function load() {
    const { data } = await supabase.from("reviews").select("*").order("created_at", { ascending: false });
    setReviews(data || []);
  }
  useEffect(() => { load(); }, []);

  async function add() {
    if (!draft.customer_name || !draft.review_text) return toast.error("Name and text required");
    const { error } = await supabase.from("reviews").insert({ ...draft, review_received: true, received_at: new Date().toISOString() } as any);
    if (error) return toast.error(error.message);
    toast.success("Review added");
    setDraft({ customer_name: "", review_text: "", rating: 5, service_type: "", neighborhood: "", platform: "google", public_visible: true });
    load();
  }

  async function togglePublic(r: any) {
    await supabase.from("reviews").update({ public_visible: !r.public_visible }).eq("id", r.id);
    load();
  }

  return (
    <div className="container-tight py-6 grid gap-4 lg:grid-cols-2">
      <Card className="p-5 space-y-3">
        <h2 className="font-bold">Add Review</h2>
        <div><Label>Customer Name</Label><Input value={draft.customer_name} onChange={(e) => setDraft({ ...draft, customer_name: e.target.value })} /></div>
        <div><Label>Service Type</Label><Input value={draft.service_type} onChange={(e) => setDraft({ ...draft, service_type: e.target.value })} /></div>
        <div><Label>Neighborhood</Label><Input value={draft.neighborhood} onChange={(e) => setDraft({ ...draft, neighborhood: e.target.value })} /></div>
        <div><Label>Rating (1–5)</Label><Input type="number" min={1} max={5} value={draft.rating} onChange={(e) => setDraft({ ...draft, rating: Number(e.target.value) })} /></div>
        <div><Label>Review Text</Label><Textarea rows={4} value={draft.review_text} onChange={(e) => setDraft({ ...draft, review_text: e.target.value })} /></div>
        <div className="flex items-center gap-2"><Switch checked={draft.public_visible} onCheckedChange={(c) => setDraft({ ...draft, public_visible: c })} /><Label>Show publicly</Label></div>
        <Button onClick={add}>Add Review</Button>
      </Card>

      <Card className="p-5">
        <h2 className="font-bold mb-3">All Reviews</h2>
        <div className="space-y-2">
          {reviews.map((r) => (
            <div key={r.id} className="border border-border rounded p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-semibold">{r.customer_name} <span className="text-xs text-muted-foreground">{r.rating}★</span></div>
                  <div className="text-xs text-muted-foreground">{r.service_type} · {r.platform}</div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span>Public</span>
                  <Switch checked={r.public_visible} onCheckedChange={() => togglePublic(r)} />
                </div>
              </div>
              <p className="text-sm mt-2">{r.review_text}</p>
            </div>
          ))}
          {reviews.length === 0 && <div className="text-sm text-muted-foreground">No reviews yet.</div>}
        </div>
      </Card>
    </div>
  );
}

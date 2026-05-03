import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Receipt } from "lucide-react";
import { toast } from "sonner";

export default function JobMaterials({ jobId }: { jobId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({ description: "", vendor: "", cost: "", paid_by: "me", purchased_on: new Date().toISOString().slice(0,10) });
  const [file, setFile] = useState<File | null>(null);

  async function load() {
    const { data } = await supabase.from("job_materials").select("*").eq("job_id", jobId).order("purchased_on", { ascending: false });
    setItems(data || []);
  }
  useEffect(() => { load(); }, [jobId]);

  async function add() {
    if (!form.description || !form.cost) return toast.error("Description and cost required");
    let receipt_url: string | null = null;
    if (file) {
      const path = `${jobId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("receipts").upload(path, file);
      if (upErr) return toast.error(upErr.message);
      receipt_url = path;
    }
    const { error } = await supabase.from("job_materials").insert({
      job_id: jobId,
      description: form.description,
      vendor: form.vendor || null,
      cost: Number(form.cost),
      paid_by: form.paid_by,
      purchased_on: form.purchased_on,
      receipt_url,
    });
    if (error) return toast.error(error.message);
    setForm({ description: "", vendor: "", cost: "", paid_by: "me", purchased_on: new Date().toISOString().slice(0,10) });
    setFile(null);
    toast.success("Material added");
    load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("job_materials").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  async function viewReceipt(path: string) {
    const { data } = await supabase.storage.from("receipts").createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  const totalMe = items.filter(i => i.paid_by === "me").reduce((s, i) => s + Number(i.cost), 0);
  const totalCust = items.filter(i => i.paid_by === "customer").reduce((s, i) => s + Number(i.cost), 0);

  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">Materials</h2>
        <div className="text-xs text-muted-foreground">
          Paid by me: <b className="text-foreground">${totalMe.toFixed(2)}</b> · By customer: <b className="text-foreground">${totalCust.toFixed(2)}</b>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Materials paid by me reduce profit. Materials paid by customer do not.</p>

      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="20A breaker, 12/2 wire 50ft..." /></div>
        <div><Label>Vendor</Label><Input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} placeholder="Home Depot" /></div>
        <div><Label>Cost</Label><Input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} /></div>
        <div><Label>Paid by</Label>
          <Select value={form.paid_by} onValueChange={(v) => setForm({ ...form, paid_by: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="me">Me</SelectItem><SelectItem value="customer">Customer</SelectItem></SelectContent>
          </Select>
        </div>
        <div><Label>Date</Label><Input type="date" value={form.purchased_on} onChange={(e) => setForm({ ...form, purchased_on: e.target.value })} /></div>
        <div className="col-span-2"><Label>Receipt photo (optional)</Label><Input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} /></div>
      </div>
      <Button onClick={add} className="gap-1"><Plus className="h-4 w-4" />Add material</Button>

      <div className="divide-y divide-border">
        {items.map((i) => (
          <div key={i.id} className="py-2 flex items-center justify-between gap-2">
            <div className="text-sm">
              <div className="font-semibold">{i.description} <span className="text-muted-foreground font-normal">· ${Number(i.cost).toFixed(2)}</span></div>
              <div className="text-xs text-muted-foreground">{i.vendor || "—"} · {i.purchased_on} · paid by {i.paid_by}</div>
            </div>
            <div className="flex gap-1">
              {i.receipt_url && <Button size="sm" variant="ghost" onClick={() => viewReceipt(i.receipt_url)}><Receipt className="h-4 w-4" /></Button>}
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(i.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="text-sm text-muted-foreground py-2">No materials yet.</div>}
      </div>
    </Card>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

export default function AdminTemplates() {
  const [items, setItems] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await supabase.from("estimate_templates").select("*").order("display_order");
    setItems(data || []);
  }
  useEffect(() => { load(); }, []);

  async function add() {
    const { error } = await supabase.from("estimate_templates").insert({
      label: "New Service", scope: "Describe scope, one item per line", total: 0, deposit: 0, materials: "Included",
      display_order: items.length + 1,
    } as any);
    if (error) return toast.error(error.message);
    load();
  }
  async function update(id: string, patch: any) {
    setBusy(true);
    const { error } = await supabase.from("estimate_templates").update(patch).eq("id", id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    load();
  }
  async function remove(id: string) {
    if (!confirm("Delete template?")) return;
    const { error } = await supabase.from("estimate_templates").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  return (
    <div className="container-tight py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Estimate Templates</h1>
        <Button onClick={add} size="sm" className="gap-1"><Plus className="h-4 w-4" />New Template</Button>
      </div>
      <p className="text-sm text-muted-foreground">Templates appear in the Estimate Builder dropdown. Edit prices, scope, and order anytime.</p>

      <div className="grid gap-3">
        {items.map((t) => (
          <Card key={t.id} className="p-4 space-y-2">
            <div className="grid sm:grid-cols-2 gap-2">
              <div><Label>Label</Label><Input defaultValue={t.label} onBlur={(e) => e.target.value !== t.label && update(t.id, { label: e.target.value })} /></div>
              <div><Label>Display Order</Label><Input type="number" defaultValue={t.display_order} onBlur={(e) => update(t.id, { display_order: Number(e.target.value) })} /></div>
              <div><Label>Total ($)</Label><Input type="number" defaultValue={t.total} onBlur={(e) => update(t.id, { total: Number(e.target.value) })} /></div>
              <div><Label>Deposit ($)</Label><Input type="number" defaultValue={t.deposit} onBlur={(e) => update(t.id, { deposit: Number(e.target.value) })} /></div>
              <div className="sm:col-span-2"><Label>Materials</Label><Input defaultValue={t.materials} onBlur={(e) => update(t.id, { materials: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Scope (one per line, use \n for newlines)</Label>
                <Textarea rows={4} defaultValue={t.scope} onBlur={(e) => e.target.value !== t.scope && update(t.id, { scope: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <div className="flex items-center gap-2">
                <Switch checked={t.active} onCheckedChange={(c) => update(t.id, { active: c })} />
                <Label>Active</Label>
              </div>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </Card>
        ))}
        {items.length === 0 && <Card className="p-6 text-center text-muted-foreground">No templates yet.</Card>}
      </div>
    </div>
  );
}

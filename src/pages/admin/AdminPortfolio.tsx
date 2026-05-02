import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PORTFOLIO_CATEGORY_LABELS } from "@/lib/jobTypes";
import { toast } from "sonner";
import { Upload } from "lucide-react";

export default function AdminPortfolio() {
  const [items, setItems] = useState<any[]>([]);
  const [d, setD] = useState({ title: "", category: "lighting", description: "", city: "Columbus", neighborhood: "", cover_image: "", public_visible: true });
  const [uploading, setUploading] = useState(false);

  async function load() {
    const { data } = await supabase.from("portfolio_projects").select("*").order("created_at", { ascending: false });
    setItems(data || []);
  }
  useEffect(() => { load(); }, []);

  async function upload(f: File) {
    setUploading(true);
    try {
      const path = `portfolio/${crypto.randomUUID()}.${f.name.split(".").pop()}`;
      const { error } = await supabase.storage.from("job-photos").upload(path, f);
      if (error) throw error;
      const { data: u } = supabase.storage.from("job-photos").getPublicUrl(path);
      setD({ ...d, cover_image: u.publicUrl });
      toast.success("Image uploaded");
    } catch (e: any) { toast.error(e.message); }
    finally { setUploading(false); }
  }

  async function add() {
    if (!d.title) return toast.error("Title required");
    const { error } = await supabase.from("portfolio_projects").insert(d as any);
    if (error) return toast.error(error.message);
    toast.success("Added");
    setD({ title: "", category: "lighting", description: "", city: "Columbus", neighborhood: "", cover_image: "", public_visible: true });
    load();
  }

  async function togglePublic(p: any) {
    await supabase.from("portfolio_projects").update({ public_visible: !p.public_visible }).eq("id", p.id);
    load();
  }
  async function remove(id: string) {
    if (!confirm("Delete this project?")) return;
    await supabase.from("portfolio_projects").delete().eq("id", id);
    load();
  }

  return (
    <div className="container-tight py-6 grid gap-4 lg:grid-cols-2">
      <Card className="p-5 space-y-3">
        <h2 className="font-bold">Add Portfolio Project</h2>
        <div><Label>Title</Label><Input value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} /></div>
        <div><Label>Category</Label>
          <Select value={d.category} onValueChange={(v) => setD({ ...d, category: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(PORTFOLIO_CATEGORY_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>City</Label><Input value={d.city} onChange={(e) => setD({ ...d, city: e.target.value })} /></div>
          <div><Label>Neighborhood</Label><Input value={d.neighborhood} onChange={(e) => setD({ ...d, neighborhood: e.target.value })} /></div>
        </div>
        <div><Label>Description</Label><Textarea rows={3} value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} /></div>
        <div>
          <Label>Cover Image</Label>
          <label className="flex items-center justify-center gap-2 border-2 border-dashed rounded p-4 cursor-pointer text-sm">
            <Upload className="h-4 w-4" /> {uploading ? "Uploading..." : d.cover_image ? "Replace image" : "Upload image"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          </label>
          {d.cover_image && <img src={d.cover_image} alt="" className="mt-2 rounded max-h-40" />}
        </div>
        <div className="flex items-center gap-2"><Switch checked={d.public_visible} onCheckedChange={(c) => setD({ ...d, public_visible: c })} /><Label>Show publicly</Label></div>
        <Button onClick={add}>Add Project</Button>
      </Card>

      <Card className="p-5">
        <h2 className="font-bold mb-3">All Projects</h2>
        <div className="space-y-2">
          {items.map((p) => (
            <div key={p.id} className="flex items-center gap-3 border border-border rounded p-2">
              {p.cover_image && <img src={p.cover_image} alt="" className="h-14 w-14 object-cover rounded" />}
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{p.title}</div>
                <div className="text-xs text-muted-foreground">{PORTFOLIO_CATEGORY_LABELS[p.category]}</div>
              </div>
              <Switch checked={p.public_visible} onCheckedChange={() => togglePublic(p)} />
              <Button size="sm" variant="ghost" onClick={() => remove(p.id)}>×</Button>
            </div>
          ))}
          {items.length === 0 && <div className="text-sm text-muted-foreground">No projects yet.</div>}
        </div>
      </Card>
    </div>
  );
}

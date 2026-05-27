import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PORTFOLIO_CATEGORY_LABELS } from "@/lib/jobTypes";
import { toast } from "sonner";
import { Upload, Star, Trash2, ArrowUp, ArrowDown, Pencil, ImageIcon } from "lucide-react";

// Resize / orient-fix image before upload
async function compressImage(file: File, maxDim = 1600, quality = 0.82): Promise<Blob> {
  // createImageBitmap respects EXIF orientation in modern browsers
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as any).catch(() =>
    createImageBitmap(file)
  );
  const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bmp, 0, 0, w, h);
  return await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), "image/jpeg", quality));
}

async function uploadOne(file: File): Promise<string> {
  const blob = await compressImage(file).catch(() => file);
  const path = `portfolio/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from("job-photos").upload(path, blob, { contentType: "image/jpeg" });
  if (error) throw error;
  const { data } = supabase.storage.from("job-photos").getPublicUrl(path);
  return data.publicUrl;
}

function getPhotos(p: any): string[] {
  const arr = Array.isArray(p?.after_photos) ? p.after_photos.filter((x: any) => typeof x === "string") : [];
  if (p?.cover_image && !arr.includes(p.cover_image)) return [p.cover_image, ...arr];
  return arr;
}

export default function AdminPortfolio() {
  const [items, setItems] = useState<any[]>([]);
  const [d, setD] = useState({ title: "", category: "lighting", description: "", city: "Columbus", neighborhood: "", cover_image: "", public_visible: true });
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  async function load() {
    const { data } = await supabase.from("portfolio_projects").select("*").order("display_order", { ascending: true }).order("created_at", { ascending: false });
    setItems(data || []);
  }
  useEffect(() => { load(); }, []);

  async function uploadCover(f: File) {
    setUploading(true);
    try {
      const url = await uploadOne(f);
      setD({ ...d, cover_image: url });
      toast.success("Image uploaded");
    } catch (e: any) { toast.error(e.message); }
    finally { setUploading(false); }
  }

  async function add() {
    if (!d.title) return toast.error("Title required");
    const payload: any = { ...d, after_photos: d.cover_image ? [d.cover_image] : [] };
    const { error } = await supabase.from("portfolio_projects").insert(payload);
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
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0])} />
          </label>
          {d.cover_image && <img src={d.cover_image} alt="" className="mt-2 rounded max-h-40 object-contain mx-auto" />}
          <p className="mt-1 text-xs text-muted-foreground">After creating, open the project to add more photos.</p>
        </div>
        <div className="flex items-center gap-2"><Switch checked={d.public_visible} onCheckedChange={(c) => setD({ ...d, public_visible: c })} /><Label>Show publicly</Label></div>
        <Button onClick={add}>Add Project</Button>
      </Card>

      <Card className="p-5">
        <h2 className="font-bold mb-3">All Projects</h2>
        <div className="space-y-2">
          {items.map((p) => {
            const photos = getPhotos(p);
            return (
              <div key={p.id} className="flex items-center gap-3 border border-border rounded p-2">
                {p.cover_image ? (
                  <img src={p.cover_image} alt="" className="h-14 w-14 object-cover rounded" />
                ) : (
                  <div className="h-14 w-14 grid place-items-center rounded bg-muted text-muted-foreground">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{p.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {PORTFOLIO_CATEGORY_LABELS[p.category]} · {photos.length} photo{photos.length === 1 ? "" : "s"}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => setEditing(p)} className="gap-1"><Pencil className="h-3.5 w-3.5" /> Edit</Button>
                <Switch checked={p.public_visible} onCheckedChange={() => togglePublic(p)} />
                <Button size="sm" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            );
          })}
          {items.length === 0 && <div className="text-sm text-muted-foreground">No projects yet.</div>}
        </div>
      </Card>

      {editing && (
        <EditProjectDialog project={editing} onClose={() => { setEditing(null); load(); }} />
      )}
    </div>
  );
}

function EditProjectDialog({ project, onClose }: { project: any; onClose: () => void }) {
  const [photos, setPhotos] = useState<string[]>(getPhotos(project));
  const [cover, setCover] = useState<string>(project.cover_image || getPhotos(project)[0] || "");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  async function addPhotos(files: FileList) {
    setBusy(true);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) {
        const url = await uploadOne(f);
        urls.push(url);
      }
      setPhotos((cur) => {
        const next = [...cur, ...urls];
        if (!cover && next.length) setCover(next[0]);
        return next;
      });
      toast.success(`${urls.length} photo${urls.length === 1 ? "" : "s"} added`);
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }
  function removePhoto(url: string) {
    if (!confirm("Remove this photo from the project?")) return;
    setPhotos((cur) => {
      const next = cur.filter((p) => p !== url);
      if (cover === url) setCover(next[0] || "");
      return next;
    });
  }
  function move(idx: number, dir: -1 | 1) {
    setPhotos((cur) => {
      const next = [...cur];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return cur;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("portfolio_projects")
      .update({ cover_image: cover || photos[0] || null, after_photos: photos })
      .eq("id", project.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    onClose();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{project.title} — Photos</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <label className="flex items-center justify-center gap-2 border-2 border-dashed rounded p-4 cursor-pointer text-sm">
            <Upload className="h-4 w-4" /> {busy ? "Uploading..." : "Upload more photos"}
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files?.length && addPhotos(e.target.files)} />
          </label>
          {photos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No photos yet. Upload to get started.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photos.map((url, idx) => (
                <div key={url} className="relative group border border-border rounded overflow-hidden bg-muted">
                  <img src={url} alt="" className="aspect-square w-full object-cover" />
                  {cover === url && (
                    <div className="absolute top-1 left-1 bg-secondary text-secondary-foreground text-xs font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                      <Star className="h-3 w-3 fill-current" /> Cover
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-background/90 p-1 flex justify-between gap-1 opacity-0 group-hover:opacity-100 transition">
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setCover(url)} title="Set as cover">
                      <Star className="h-3.5 w-3.5" />
                    </Button>
                    <div className="flex">
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => move(idx, -1)} disabled={idx === 0}><ArrowUp className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => move(idx, 1)} disabled={idx === photos.length - 1}><ArrowDown className="h-3.5 w-3.5" /></Button>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive" onClick={() => removePhoto(url)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

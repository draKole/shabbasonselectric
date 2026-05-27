import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useSeo } from "@/lib/seo";
import { BUSINESS } from "@/lib/business";
import { PORTFOLIO_CATEGORY_LABELS } from "@/lib/jobTypes";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

function getPhotos(p: any): string[] {
  const arr = Array.isArray(p?.after_photos) ? p.after_photos.filter((x: any) => typeof x === "string") : [];
  if (p?.cover_image && !arr.includes(p.cover_image)) return [p.cover_image, ...arr];
  return arr.length ? arr : (p?.cover_image ? [p.cover_image] : []);
}

export default function Portfolio() {
  useSeo({
    title: `Electrical Work Portfolio | ${BUSINESS.name}`,
    description: `Recent electrical projects across ${BUSINESS.serviceArea}: panels, lighting, new construction, and more.`,
  });

  const [projects, setProjects] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [openProject, setOpenProject] = useState<any | null>(null);
  const [photoIdx, setPhotoIdx] = useState(0);

  useEffect(() => {
    supabase
      .from("portfolio_projects")
      .select("*")
      .eq("public_visible", true)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false })
      .then(({ data }) => setProjects(data || []));
  }, []);

  const visible = filter === "all" ? projects : projects.filter((p) => p.category === filter);

  function open(p: any) { setOpenProject(p); setPhotoIdx(0); }
  const photos = openProject ? getPhotos(openProject) : [];

  return (
    <section className="container-tight py-10 md:py-14">
      <h1 className="text-3xl md:text-5xl font-extrabold">Recent Work</h1>
      <p className="mt-3 text-muted-foreground max-w-2xl">
        A look at projects we've completed across {BUSINESS.serviceArea}.
      </p>

      {projects.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>All</Button>
          {Object.entries(PORTFOLIO_CATEGORY_LABELS).map(([v, l]) => (
            <Button key={v} size="sm" variant={filter === v ? "default" : "outline"} onClick={() => setFilter(v)}>{l}</Button>
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((p) => {
          const pics = getPhotos(p);
          return (
            <Card key={p.id} className="overflow-hidden cursor-pointer hover:shadow-lg transition" onClick={() => open(p)}>
              <div className="relative bg-muted aspect-[4/3]">
                {pics[0] && <img src={pics[0]} alt={p.title} className="w-full h-full object-cover" loading="lazy" />}
                {pics.length > 1 && (
                  <div className="absolute bottom-2 right-2 bg-background/90 text-xs font-semibold px-2 py-0.5 rounded">
                    {pics.length} photos
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="text-xs font-semibold text-secondary uppercase">{PORTFOLIO_CATEGORY_LABELS[p.category]}</div>
                <h3 className="font-bold mt-1">{p.title}</h3>
                {p.city && <p className="text-sm text-muted-foreground">{p.city}{p.neighborhood ? ` · ${p.neighborhood}` : ""}</p>}
                {p.description && <p className="text-sm mt-2 line-clamp-2">{p.description}</p>}
              </div>
            </Card>
          );
        })}
      </div>

      {projects.length === 0 && (
        <Card className="p-8 mt-10 text-center text-muted-foreground">
          New project photos coming soon. Want to see examples? Call {BUSINESS.phone}.
        </Card>
      )}

      <Dialog open={!!openProject} onOpenChange={(o) => !o && setOpenProject(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          {openProject && (
            <div>
              <DialogTitle className="sr-only">{openProject.title}</DialogTitle>
              <div className="relative bg-black flex items-center justify-center" style={{ minHeight: 320 }}>
                {photos[photoIdx] && (
                  <img src={photos[photoIdx]} alt={openProject.title} className="max-h-[70vh] max-w-full object-contain" />
                )}
                {photos.length > 1 && (
                  <>
                    <button onClick={() => setPhotoIdx((i) => (i - 1 + photos.length) % photos.length)} className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 rounded-full p-2 hover:bg-background">
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button onClick={() => setPhotoIdx((i) => (i + 1) % photos.length)} className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 rounded-full p-2 hover:bg-background">
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-background/80 text-xs px-2 py-0.5 rounded">
                      {photoIdx + 1} / {photos.length}
                    </div>
                  </>
                )}
              </div>
              <div className="p-4">
                <div className="text-xs font-semibold text-secondary uppercase">{PORTFOLIO_CATEGORY_LABELS[openProject.category]}</div>
                <h3 className="font-bold text-lg mt-1">{openProject.title}</h3>
                {openProject.city && <p className="text-sm text-muted-foreground">{openProject.city}{openProject.neighborhood ? ` · ${openProject.neighborhood}` : ""}</p>}
                {openProject.description && <p className="text-sm mt-2">{openProject.description}</p>}
                {photos.length > 1 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {photos.map((url, i) => (
                      <button key={url} onClick={() => setPhotoIdx(i)} className={`shrink-0 h-16 w-16 rounded overflow-hidden border-2 ${i === photoIdx ? "border-secondary" : "border-transparent"}`}>
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

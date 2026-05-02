import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSeo } from "@/lib/seo";
import { BUSINESS } from "@/lib/business";
import { PORTFOLIO_CATEGORY_LABELS } from "@/lib/jobTypes";

export default function Portfolio() {
  useSeo({
    title: `Electrical Work Portfolio | ${BUSINESS.name}`,
    description: `Recent electrical projects across ${BUSINESS.serviceArea}: panels, lighting, new construction, and more.`,
  });

  const [projects, setProjects] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("all");

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
        {visible.map((p) => (
          <Card key={p.id} className="overflow-hidden">
            {p.cover_image && <img src={p.cover_image} alt={p.title} className="aspect-[4/3] object-cover w-full" loading="lazy" />}
            <div className="p-4">
              <div className="text-xs font-semibold text-secondary uppercase">{PORTFOLIO_CATEGORY_LABELS[p.category]}</div>
              <h3 className="font-bold mt-1">{p.title}</h3>
              {p.city && <p className="text-sm text-muted-foreground">{p.city}{p.neighborhood ? ` · ${p.neighborhood}` : ""}</p>}
              {p.description && <p className="text-sm mt-2">{p.description}</p>}
            </div>
          </Card>
        ))}
      </div>

      {projects.length === 0 && (
        <Card className="p-8 mt-10 text-center text-muted-foreground">
          New project photos coming soon. Want to see examples? Call {BUSINESS.phone}.
        </Card>
      )}
    </section>
  );
}

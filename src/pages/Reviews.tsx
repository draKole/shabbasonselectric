import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useSeo } from "@/lib/seo";
import { BUSINESS } from "@/lib/business";
import { Star } from "lucide-react";
import { GoogleReviewButton } from "@/components/GoogleReviewButton";

export default function Reviews() {
  useSeo({
    title: `Customer Reviews | ${BUSINESS.name}`,
    description: `Read reviews from customers of ${BUSINESS.name} in ${BUSINESS.serviceArea}.`,
  });

  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("reviews")
      .select("*")
      .eq("public_visible", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => setReviews(data || []));
  }, []);

  return (
    <section className="container-tight py-10 md:py-14">
      <h1 className="text-3xl md:text-5xl font-extrabold">Customer Reviews</h1>
      <p className="mt-3 text-muted-foreground max-w-2xl">What our customers say about working with us.</p>

      <div className="mt-6">
        <GoogleReviewButton className="bg-success text-success-foreground hover:bg-success/90" />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reviews.map((r) => (
          <Card key={r.id} className="p-5">
            <div className="flex gap-0.5 text-accent">
              {Array.from({ length: r.rating || 5 }).map((_, j) => <Star key={j} className="h-4 w-4 fill-current" />)}
            </div>
            <p className="mt-3 text-sm">"{r.review_text}"</p>
            <div className="mt-4 text-sm font-semibold">{r.customer_name}</div>
            <div className="text-xs text-muted-foreground">
              {[r.service_type, r.neighborhood].filter(Boolean).join(" · ")}
            </div>
          </Card>
        ))}
        {reviews.length === 0 && (
          <Card className="p-8 col-span-full text-center text-muted-foreground">
            Reviews will appear here as customers leave them.
          </Card>
        )}
      </div>
    </section>
  );
}

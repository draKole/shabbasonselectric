import { Link } from "react-router-dom";
import { Phone, MessageSquare, Calendar, ShieldCheck, Award, Wrench, Star, ArrowRight, Bolt, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import heroImg from "@/assets/hero-electrician.jpg";
import { BUSINESS, telHref, smsHref } from "@/lib/business";
import { useSeo } from "@/lib/seo";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { JOB_TYPE_LABELS } from "@/lib/jobTypes";

const SERVICES = [
  { title: "Electrical Repairs", desc: "Fast diagnosis and repairs for breakers, outlets, and wiring." },
  { title: "Troubleshooting", desc: "Power out? Flickering lights? We find the problem and fix it." },
  { title: "Panel Upgrades", desc: "100A and 200A panel upgrades and main service work." },
  { title: "Service Changes", desc: "Service changes, meter work, and inspection-ready installs." },
  { title: "Lighting Installation", desc: "Recessed cans, fixtures, exterior lights, and ceiling fans." },
  { title: "Outlets & Switches", desc: "Outlets, switches, GFCIs, dimmers, and dedicated circuits." },
  { title: "Remodel Wiring", desc: "Clean rough-in and trim-out for remodels and additions." },
  { title: "New Construction", desc: "Full-house wiring from rough to final, inspection-ready." },
  { title: "Camera Systems", desc: "Security camera and low-voltage installs done right." },
  { title: "TV Outlet Installs", desc: "Hidden TV outlets and clean cable management." },
  { title: "Permit Support", desc: "Inspection prep and electrical permit guidance." },
  { title: "Contractor Support", desc: "Electrical help for contractors, landlords, and investors." },
];

const REVIEWS_FALLBACK = [
  {
    name: "B. Anderson",
    text: "Excellent! Drake came to my home as agreed in a timely fashion and very quickly and efficiently changed out an old outlet to a new GFCI outlet required by the bank.",
    service: "GFCI Install",
  },
  {
    name: "M. Johnson",
    text: "I called them with an electrical problem at my house. They came out and handled the repair quickly and professionally.",
    service: "Electrical Repair",
  },
  {
    name: "T. Williams",
    text: "It has been great to work with Drake. He is about doing business and completing the project in a timely manner.",
    service: "Remodel Wiring",
  },
];

export default function Home() {
  useSeo({
    title: `${BUSINESS.name} | Columbus Ohio Electrician`,
    description: `Fast, reliable electrical service in ${BUSINESS.serviceArea}. Repairs, panels, lighting, new construction. Call ${BUSINESS.phone}.`,
  });

  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("portfolio_projects")
      .select("*")
      .eq("public_visible", true)
      .order("display_order", { ascending: true })
      .limit(3)
      .then(({ data }) => setPortfolio(data || []));
    supabase
      .from("reviews")
      .select("*")
      .eq("public_visible", true)
      .eq("featured", true)
      .order("created_at", { ascending: false })
      .limit(3)
      .then(({ data }) => setReviews(data || []));
  }, []);

  const reviewsToShow = reviews.length ? reviews : REVIEWS_FALLBACK;

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div className="absolute inset-0">
          <img
            src={heroImg}
            alt="Electrician working on residential panel in Columbus Ohio"
            className="w-full h-full object-cover opacity-35"
            width={1600}
            height={1024}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/85 to-primary/40" />
        </div>
        <div className="relative container-tight py-16 md:py-24">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary/20 border border-secondary/40 px-3 py-1 text-xs font-semibold text-secondary-foreground/90">
            <Bolt className="h-3.5 w-3.5 text-accent" />
            Columbus, Ohio Electrician
          </div>
          <h1 className="mt-4 text-4xl md:text-6xl font-extrabold leading-[1.05] max-w-3xl">
            Columbus Electrical Repairs, Panels, Lighting & New Construction Wiring
          </h1>
          <p className="mt-5 text-lg md:text-xl opacity-90 max-w-2xl">
            Fast, reliable, and affordable electrical service for homeowners,
            landlords, contractors, and businesses across {BUSINESS.serviceArea}.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/schedule">
              <Button size="lg" className="bg-success text-success-foreground hover:bg-success/90 gap-2">
                <Calendar className="h-5 w-5" /> Schedule Free Estimate
              </Button>
            </Link>
            <Button asChild size="lg" variant="outline" className="gap-2 bg-background/10 border-background/30 text-primary-foreground hover:bg-background/20">
              <a href={telHref}><Phone className="h-5 w-5" /> Call {BUSINESS.phone}</a>
            </Button>
            <Button asChild size="lg" variant="outline" className="gap-2 bg-background/10 border-background/30 text-primary-foreground hover:bg-background/20">
              <a href={smsHref()}><MessageSquare className="h-5 w-5" /> Text Us Now</a>
            </Button>
          </div>

          {/* Trust badges */}
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs sm:text-sm">
            {[
              { icon: Award, label: "Father & Son Company" },
              { icon: ShieldCheck, label: "40+ Yrs Combined" },
              { icon: Wrench, label: "Residential & Commercial" },
              { icon: ShieldCheck, label: "Permit-Ready Work" },
              { icon: Bolt, label: "Fast Service Calls" },
              { icon: Star, label: "Free Estimates" },
            ].map((b, i) => (
              <div key={i} className="flex items-center gap-2 rounded-md bg-background/10 px-3 py-2 backdrop-blur">
                <b.icon className="h-4 w-4 text-accent shrink-0" />
                <span className="font-medium">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Intro */}
      <section className="container-tight py-14">
        <div className="max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-extrabold">Electrical Work Done Right</h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Shabba & Sons Electric handles electrical repairs, troubleshooting, panel upgrades,
            service changes, lighting installs, outlets, switches, GFCI upgrades, dedicated circuits,
            camera systems, TV outlet installs, remodel wiring, new construction wiring, and
            inspection-ready electrical work.
          </p>
        </div>

        {/* Service cards */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <Card key={s.title} className="p-5 hover:border-secondary transition-colors">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-md bg-secondary/10 text-secondary shrink-0">
                  <Bolt className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold">{s.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{s.desc}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-6">
          <Link to="/services" className="text-secondary font-semibold inline-flex items-center gap-1 hover:underline">
            See all services <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Portfolio preview */}
      {portfolio.length > 0 && (
        <section className="bg-muted/40 py-14">
          <div className="container-tight">
            <div className="flex items-end justify-between gap-4 mb-6">
              <h2 className="text-3xl md:text-4xl font-extrabold">Recent Work</h2>
              <Link to="/portfolio" className="text-secondary font-semibold hover:underline">View all</Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {portfolio.map((p) => (
                <Card key={p.id} className="overflow-hidden">
                  {p.cover_image && (
                    <img src={p.cover_image} alt={p.title} className="aspect-[4/3] object-cover w-full" loading="lazy" />
                  )}
                  <div className="p-4">
                    <div className="text-xs font-semibold text-secondary uppercase tracking-wide">{p.category?.replace(/_/g, " ")}</div>
                    <h3 className="font-bold mt-1">{p.title}</h3>
                    {p.city && <p className="text-sm text-muted-foreground">{p.city}{p.neighborhood ? ` · ${p.neighborhood}` : ""}</p>}
                    {p.description && <p className="text-sm mt-2 line-clamp-2">{p.description}</p>}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Reviews */}
      <section className="container-tight py-14">
        <h2 className="text-3xl md:text-4xl font-extrabold">What Customers Are Saying</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {reviewsToShow.map((r: any, i: number) => (
            <Card key={i} className="p-5">
              <div className="flex gap-0.5 text-accent">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="mt-3 text-sm leading-relaxed">"{r.review_text || r.text}"</p>
              <div className="mt-4 text-sm font-semibold">{r.customer_name || r.name}</div>
              {(r.service_type || r.service) && (
                <div className="text-xs text-muted-foreground">{r.service_type || r.service}</div>
              )}
            </Card>
          ))}
        </div>
        <div className="mt-6">
          <Link to="/reviews" className="text-secondary font-semibold inline-flex items-center gap-1 hover:underline">
            See more reviews <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Voucher promo */}
      <VoucherPromo />

      </section>

      {/* Final CTA */}
      <section className="bg-primary text-primary-foreground">
        <div className="container-tight py-14 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold">Need electrical work done?</h2>
          <p className="mt-3 opacity-90">
            Call or text {BUSINESS.phone} or schedule a free estimate online.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <Button asChild size="lg" className="bg-success text-success-foreground hover:bg-success/90 gap-2">
              <a href={telHref}><Phone className="h-5 w-5" /> Call Now</a>
            </Button>
            <Link to="/schedule">
              <Button size="lg" variant="outline" className="gap-2 bg-background/10 border-background/30 text-primary-foreground hover:bg-background/20">
                <Calendar className="h-5 w-5" /> Schedule Service
              </Button>
            </Link>
          </div>
          <div className="mt-6 text-sm opacity-90">
            Looking for work? <Link to="/careers" className="underline font-semibold">Apply here</Link>
          </div>
        </div>
      </section>
    </>
  );
}

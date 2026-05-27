import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSeo } from "@/lib/seo";
import { BUSINESS, telHref } from "@/lib/business";
import { ArrowRight, ShieldAlert, Ticket } from "lucide-react";
import { usePublicVoucherOffers } from "@/lib/usePublicVoucherOffers";

function VoucherServicesCta() {
  const { best } = usePublicVoucherOffers();
  const headline = best
    ? `Turn $${Number(best.amount_paid).toLocaleString()} into $${Number(best.credit_value).toLocaleString()} in labor credit`
    : "Ask about service vouchers for future electrical work";
  const sub = best
    ? `${best.name} — labor credit only, schedule at least 1 week ahead, voucher must be approved and active before use.`
    : "Voucher offers change — reach out and we'll share what's currently available.";
  return (
    <Card className="mt-10 p-6 bg-gradient-to-br from-secondary/10 to-accent/10 border-secondary/30">
      <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-secondary uppercase tracking-wide">
            <Ticket className="h-3.5 w-3.5" /> Save on bigger jobs
          </div>
          <h3 className="mt-1 text-xl font-extrabold">{headline}</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-xl">{sub}</p>
        </div>
        <Link to="/vouchers">
          <Button className="bg-success text-success-foreground hover:bg-success/90 gap-2"><Ticket className="h-4 w-4" /> View Service Vouchers</Button>
        </Link>
      </div>
    </Card>
  );
}

const SECTIONS = [
  {
    title: "Electrical Repairs & Troubleshooting",
    desc: "Power out? Breaker tripping? Outlet not working? Lights flickering? We diagnose and repair electrical problems quickly and safely.",
    items: ["No power issues", "Tripping breakers", "Bad outlets", "Bad switches", "Loose wiring", "GFCI issues", "Lighting problems", "Electrical safety checks"],
    cta: "Schedule Repair",
  },
  {
    title: "Panel Upgrades & Service Changes",
    desc: "We handle panel upgrades, service changes, subpanels, meter-related work, disconnects, and breaker issues.",
    items: ["100 amp panels", "200 amp panel upgrades", "Service changes", "Main disconnects", "Subpanels", "Breaker replacement", "Dedicated circuits", "Panel clean-up and corrections"],
    cta: "Request Panel Estimate",
  },
  {
    title: "Lighting Installation",
    desc: "Indoor and outdoor lighting installed cleanly and professionally.",
    items: ["Recessed can lights", "Ceiling lights", "Vanity lights", "Porch lights", "Exterior lights", "Security lights", "Pendant lights", "Fixture replacement", "Ceiling fan wiring"],
    cta: "Schedule Lighting Estimate",
  },
  {
    title: "Outlets, Switches & GFCIs",
    desc: "We install, replace, and troubleshoot outlets, switches, GFCIs, and dedicated outlets.",
    items: ["Outlet replacement", "New outlet installation", "GFCI installation", "Switch replacement", "Dimmer switches", "Dedicated appliance outlets", "Garage / Basement outlets", "Outdoor outlets"],
    cta: "Schedule Outlet Work",
  },
  {
    title: "New Construction & Remodel Wiring",
    desc: "From rough-in to final trim-out, we handle wiring for new builds, remodels, additions, and investment properties.",
    items: ["Full-house wiring", "Rough electrical", "Service setup", "Lighting layout", "Device boxes", "Circuit wiring", "Trim-out", "Final corrections", "Inspection-ready work"],
    cta: "Discuss Project",
  },
];

export default function Services() {
  useSeo({
    title: `Electrical Services in ${BUSINESS.city} Ohio | ${BUSINESS.name}`,
    description: `Repairs, panels, lighting, outlets, remodel wiring, new construction, and inspection support in ${BUSINESS.serviceArea}.`,
  });

  return (
    <section className="container-tight py-10 md:py-14">
      <h1 className="text-3xl md:text-5xl font-extrabold">Electrical Services</h1>
      <p className="mt-3 text-muted-foreground max-w-2xl">
        Residential and commercial electrical work across {BUSINESS.serviceArea}.
      </p>

      <div className="mt-10 grid gap-6">
        {SECTIONS.map((s) => (
          <Card key={s.title} className="p-6">
            <h2 className="text-2xl font-extrabold">{s.title}</h2>
            <p className="mt-2 text-muted-foreground">{s.desc}</p>
            <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
              {s.items.map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-secondary" />
                  {i}
                </div>
              ))}
            </div>
            <div className="mt-5">
              <Link to="/schedule">
                <Button className="bg-success text-success-foreground hover:bg-success/90">
                  {s.cta}
                </Button>
              </Link>
            </div>
          </Card>
        ))}

        {/* Contractor / permit support */}
        <Card className="p-6 border-secondary/30 bg-secondary/5">
          <h2 className="text-2xl font-extrabold">Contractor & Permit Support</h2>
          <p className="mt-2 text-muted-foreground">
            Support for contractors, landlords, investors, remodelers, and qualified electricians who need
            electrical work reviewed, organized, and prepared for inspection.
          </p>
          <div className="mt-4 rounded-md border border-accent/40 bg-accent/10 p-3 flex gap-3 text-sm">
            <ShieldAlert className="h-5 w-5 text-accent-foreground shrink-0" />
            <p>
              All work must be done correctly, safely, and up to code. Before any inspection is requested,
              work must be reviewed and confirmed ready.
            </p>
          </div>
          <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
            {["Permit-ready project planning", "Inspection preparation", "Rough inspection support", "Service inspection support", "Final inspection support", "Contractor electrical support", "Investor / remodel planning"].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-secondary" />{i}
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link to="/contractor-support">
              <Button variant="outline" className="gap-2">Learn more <ArrowRight className="h-4 w-4" /></Button>
            </Link>
            <Link to="/schedule">
              <Button className="bg-success text-success-foreground hover:bg-success/90">Request Contractor Support</Button>
            </Link>
          </div>
        </Card>
      </div>

      <VoucherServicesCta />


      <div className="mt-12 text-center">
        <p className="text-muted-foreground">Have a job in mind?</p>
        <a href={telHref}><Button size="lg" variant="outline">Call {BUSINESS.phone}</Button></a>
      </div>
    </section>
  );
}

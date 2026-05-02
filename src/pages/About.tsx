import { useSeo } from "@/lib/seo";
import { BUSINESS, telHref } from "@/lib/business";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function About() {
  useSeo({
    title: `About | ${BUSINESS.name}`,
    description: `Father-and-son electrical company serving ${BUSINESS.serviceArea}.`,
  });

  return (
    <section className="container-tight py-10 md:py-14">
      <h1 className="text-3xl md:text-5xl font-extrabold">About {BUSINESS.name}</h1>
      <Card className="p-6 mt-6 max-w-3xl space-y-4 text-base leading-relaxed">
        <p>
          {BUSINESS.name} is a father-and-son electrical company serving {BUSINESS.serviceArea}.
          We provide residential and light commercial electrical services, from small repairs and
          troubleshooting to panel upgrades, lighting installations, remodel wiring, new construction,
          and inspection-ready electrical work.
        </p>
        <p>
          We built this company on fast response times, clean work, fair pricing, and doing what we say
          we're going to do. Whether it's a homeowner needing a quick repair, a landlord turning over a
          rental, a contractor needing electrical support, or a developer working on new construction,
          our goal is to make the process simple and get the job done right.
        </p>
        <p>
          Call or text <a className="text-secondary font-semibold" href={telHref}>{BUSINESS.phone}</a> to
          schedule a free estimate.
        </p>
        <div className="pt-2 flex flex-wrap gap-2">
          <Link to="/schedule"><Button className="bg-success text-success-foreground hover:bg-success/90">Schedule Service</Button></Link>
          <a href={telHref}><Button variant="outline">Call Now</Button></a>
        </div>
      </Card>
    </section>
  );
}

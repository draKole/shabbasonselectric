import { useSeo } from "@/lib/seo";
import { BUSINESS, telHref } from "@/lib/business";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

const SERVICES = [
  "Permit-ready electrical planning",
  "Rough inspection preparation",
  "Service inspection preparation",
  "Final inspection preparation",
  "Electrical work review",
  "Contractor support",
  "Investor / remodel support",
  "New construction electrical support",
  "Correction lists",
  "Inspection scheduling support",
];

export default function ContractorSupport() {
  useSeo({
    title: `Electrical Permit & Inspection Support | ${BUSINESS.city} Ohio`,
    description: `Permit-ready electrical work and inspection support for contractors, landlords, and investors in ${BUSINESS.serviceArea}.`,
  });

  return (
    <section className="container-tight py-10 md:py-14">
      <h1 className="text-3xl md:text-5xl font-extrabold">Electrical Permit & Inspection Support</h1>
      <p className="mt-3 text-lg text-muted-foreground max-w-3xl">
        For contractors, landlords, investors, remodelers, and qualified electricians who need electrical
        work reviewed, organized, and ready for inspection.
      </p>

      <Card className="p-6 mt-8">
        <p>
          {BUSINESS.name} can assist with electrical project planning, permit-ready work, inspection
          preparation, and contractor support. All work must be completed safely, correctly, and up to
          code before inspection is requested.
        </p>

        <div className="mt-6 grid sm:grid-cols-2 gap-2 text-sm">
          {SERVICES.map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-secondary" />{s}
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6 mt-6 border-accent/50 bg-accent/10">
        <div className="flex gap-3">
          <ShieldAlert className="h-6 w-6 text-accent-foreground shrink-0" />
          <div>
            <h3 className="font-bold">Important</h3>
            <p className="mt-1">
              All electrical work must meet applicable code requirements. We do not approve unsafe work.
              Before any inspection is scheduled, the work must be reviewed and confirmed ready.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6 mt-8 text-center">
        <h2 className="text-2xl font-extrabold">Need help getting a project inspection-ready?</h2>
        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          <a href={telHref}><Button className="bg-success text-success-foreground hover:bg-success/90">Call {BUSINESS.phone}</Button></a>
          <Link to="/schedule"><Button variant="outline">Request Contractor Support</Button></Link>
        </div>
      </Card>
    </section>
  );
}

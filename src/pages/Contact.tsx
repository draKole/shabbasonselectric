import { useSeo } from "@/lib/seo";
import { BUSINESS, telHref, smsHref } from "@/lib/business";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Phone, Mail, MessageSquare, Calendar, MapPin } from "lucide-react";

export default function Contact() {
  useSeo({
    title: `Contact | ${BUSINESS.name}`,
    description: `Contact ${BUSINESS.name} in ${BUSINESS.serviceArea}. Phone: ${BUSINESS.phone}.`,
  });

  return (
    <section className="container-tight py-10 md:py-14">
      <h1 className="text-3xl md:text-5xl font-extrabold">Contact</h1>
      <p className="mt-3 text-muted-foreground">Call, text, email, or schedule online.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="p-6 space-y-4">
          <h2 className="font-bold text-xl">{BUSINESS.name}</h2>
          <div className="space-y-2 text-base">
            <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-secondary" />{BUSINESS.city}, {BUSINESS.state}</div>
            <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-secondary" /><a href={telHref} className="hover:text-secondary">{BUSINESS.phone}</a></div>
            <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-secondary" /><a href={`mailto:${BUSINESS.email}`} className="hover:text-secondary break-all">{BUSINESS.email}</a></div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
            <Button asChild className="w-full bg-success text-success-foreground hover:bg-success/90 gap-1"><a href={telHref}><Phone className="h-4 w-4" />Call</a></Button>
            <Button asChild variant="outline" className="w-full gap-1"><a href={smsHref()}><MessageSquare className="h-4 w-4" />Text</a></Button>
            <Link to="/schedule"><Button variant="outline" className="w-full gap-1"><Calendar className="h-4 w-4" />Schedule</Button></Link>
            <a href={`mailto:${BUSINESS.email}`}><Button variant="outline" className="w-full gap-1"><Mail className="h-4 w-4" />Email</Button></a>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-bold text-xl">Service Area</h2>
          <p className="mt-2 text-muted-foreground">Serving {BUSINESS.serviceArea}.</p>
          <div className="mt-4 aspect-video rounded-md overflow-hidden border border-border">
            <iframe
              title="Columbus Ohio service area"
              src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d101087.4!2d-83.07!3d39.96!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2sus!4v1700000000000"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full h-full border-0"
            />
          </div>
        </Card>
      </div>
    </section>
  );
}

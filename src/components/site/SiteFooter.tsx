import { Link } from "react-router-dom";
import { Mail, MapPin, Phone, Zap } from "lucide-react";
import { BUSINESS, telHref } from "@/lib/business";

export const SiteFooter = () => {
  return (
    <footer className="bg-primary text-primary-foreground mt-16">
      <div className="container-tight py-12 grid gap-8 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 font-extrabold text-lg">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-secondary text-secondary-foreground">
              <Zap className="h-5 w-5" />
            </span>
            {BUSINESS.name}
          </div>
          <p className="mt-3 text-sm opacity-80 max-w-md">
            Father-and-son electrical company serving {BUSINESS.serviceArea}.
            Repairs, panels, lighting, remodel wiring, new construction, and inspection-ready work.
          </p>
        </div>

        <div>
          <h4 className="font-bold mb-3">Contact</h4>
          <ul className="space-y-2 text-sm opacity-90">
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <a href={telHref} className="hover:text-secondary">{BUSINESS.phone}</a>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <a href={`mailto:${BUSINESS.email}`} className="hover:text-secondary break-all">{BUSINESS.email}</a>
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {BUSINESS.city}, {BUSINESS.state}
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold mb-3">Pages</h4>
          <ul className="space-y-2 text-sm opacity-90">
            <li><Link to="/services" className="hover:text-secondary">Services</Link></li>
            <li><Link to="/schedule" className="hover:text-secondary">Schedule Service</Link></li>
            <li><Link to="/portfolio" className="hover:text-secondary">Portfolio</Link></li>
            <li><Link to="/reviews" className="hover:text-secondary">Reviews</Link></li>
            <li><Link to="/contractor-support" className="hover:text-secondary">Permit Support</Link></li>
            <li><Link to="/about" className="hover:text-secondary">About</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-primary-foreground/15">
        <div className="container-tight py-4 text-xs opacity-70 flex flex-col sm:flex-row justify-between gap-2">
          <span>© {new Date().getFullYear()} {BUSINESS.name}. All rights reserved.</span>
          <span>Serving {BUSINESS.serviceArea}.</span>
        </div>
      </div>
    </footer>
  );
};

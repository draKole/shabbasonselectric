import { Link, NavLink } from "react-router-dom";
import { Menu, Phone, X, Zap } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BUSINESS, telHref } from "@/lib/business";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/services", label: "Services" },
  { to: "/portfolio", label: "Portfolio" },
  { to: "/reviews", label: "Reviews" },
  { to: "/contractor-support", label: "Permit Support" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
  { to: "/careers", label: "Careers" },
];

export const SiteHeader = () => {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur">
      <div className="container-tight flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-extrabold tracking-tight">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-secondary text-secondary-foreground">
            <Zap className="h-5 w-5" />
          </span>
          <span className="text-base sm:text-lg leading-tight">
            Shabba & Sons<br className="sm:hidden" />
            <span className="hidden sm:inline"> </span>
            <span className="text-secondary">Electric</span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive ? "text-secondary" : "text-foreground hover:text-secondary"
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="gap-2">
            <a href={telHref}><Phone className="h-4 w-4" /> {BUSINESS.phone}</a>
          </Button>
          <Link to="/schedule">
            <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90">
              Schedule
            </Button>
          </Link>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="lg:hidden p-2 rounded-md hover:bg-muted"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden border-t border-border bg-background">
          <nav className="container-tight py-3 flex flex-col">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === "/"}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `px-3 py-3 rounded-md text-base font-medium ${
                    isActive ? "text-secondary bg-muted" : "text-foreground hover:bg-muted"
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
};

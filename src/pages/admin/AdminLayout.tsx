import { Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, KanbanSquare, LayoutDashboard, ListChecks, LogOut, Plus, Star, Briefcase, Image, Zap, DollarSign, Users, Settings, Receipt, CreditCard, BookUser, HardHat, ClipboardList, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { BUSINESS } from "@/lib/business";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/jobs", label: "Jobs", icon: Briefcase },
  { to: "/admin/pipeline", label: "Pipeline", icon: KanbanSquare },
  { to: "/admin/calendar", label: "Calendar", icon: Calendar },
  { to: "/admin/contacts", label: "Contacts", icon: BookUser },
  { to: "/admin/estimates", label: "Estimates", icon: FileText },
  { to: "/admin/templates", label: "Templates", icon: ClipboardList },
  { to: "/admin/money", label: "Money", icon: DollarSign },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
  { to: "/admin/bills", label: "Bills", icon: Receipt },
  { to: "/admin/debt", label: "Debt", icon: CreditCard },
  { to: "/admin/workers", label: "Workers", icon: HardHat },
  // Messages tab removed per request
  { to: "/admin/reviews", label: "Reviews", icon: Star },
  { to: "/admin/portfolio", label: "Portfolio", icon: Image },
  { to: "/admin/applications", label: "Applications", icon: Users },
  { to: "/admin/settings", label: "Settings", icon: Settings },
  { to: "/admin/setup", label: "Setup", icon: ListChecks },
];

export default function AdminLayout() {
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (loading) return null;
  if (!user) return <Navigate to="/admin/auth" replace />;

  const onSetup = location.pathname === "/admin/setup";
  if (!isAdmin && !onSetup) {
    return (
      <div className="container-tight py-16">
        <div className="max-w-md mx-auto rounded-lg border border-border p-6 bg-card">
          <h1 className="text-xl font-bold">Admin access required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account ({user.email}) doesn't have admin access yet.
            Visit the Setup page on first run to claim admin, or have an existing admin add you.
          </p>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => navigate("/admin/setup")}>Go to Setup</Button>
            <Button variant="outline" onClick={() => signOut()}>Sign Out</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <header className="sticky top-0 z-30 bg-primary text-primary-foreground border-b border-primary/20">
        <div className="container-tight h-14 flex items-center justify-between gap-3">
          <Link to="/admin" className="flex items-center gap-2 font-extrabold">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-secondary text-secondary-foreground">
              <Zap className="h-4 w-4" />
            </span>
            <span className="hidden sm:inline">{BUSINESS.shortName} Admin</span>
            <span className="sm:hidden">Admin</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/admin/jobs/new">
              <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90 gap-1">
                <Plus className="h-4 w-4" /> Quick Add
              </Button>
            </Link>
            <Button size="sm" variant="ghost" onClick={() => signOut()} className="text-primary-foreground hover:bg-primary/40">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {/* Tab nav (mobile-friendly) */}
        <nav className="container-tight overflow-x-auto">
          <div className="flex gap-1 pb-2">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                    isActive ? "bg-secondary text-secondary-foreground" : "bg-primary/40 hover:bg-primary/60"
                  }`
                }
              >
                <n.icon className="h-3.5 w-3.5" />
                {n.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}

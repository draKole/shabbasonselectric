import { Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Calendar, FileText, KanbanSquare, LayoutDashboard, ListChecks, LogOut, Plus, Star,
  Briefcase, Image, Zap, DollarSign, Users, Settings, Receipt, CreditCard, BookUser,
  HardHat, ClipboardList, BarChart3, Building2, User, FileSpreadsheet, Archive, Ticket, PiggyBank,
} from "lucide-react";
import { Link } from "react-router-dom";
import { BUSINESS } from "@/lib/business";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";

const GROUPS: { label: string; items: { to: string; label: string; icon: any; end?: boolean }[] }[] = [
  {
    label: "Main",
    items: [
      { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
      { to: "/admin/jobs", label: "Jobs", icon: Briefcase },
      { to: "/admin/calendar", label: "Calendar", icon: Calendar },
      { to: "/admin/contacts", label: "Contacts", icon: BookUser },
    ],
  },
  {
    label: "Money",
    items: [
      { to: "/admin/money", label: "Money", icon: DollarSign },
      { to: "/admin/business", label: "Business", icon: Building2 },
      { to: "/admin/personal", label: "Personal", icon: User },
      { to: "/admin/reports", label: "Reports", icon: BarChart3 },
      { to: "/admin/bills", label: "Bills", icon: Receipt },
      { to: "/admin/debt", label: "Debt", icon: CreditCard },
      { to: "/admin/historical-income", label: "Import Income", icon: Archive },
    ],
  },
  {
    label: "Team",
    items: [
      { to: "/admin/workers", label: "Workers", icon: HardHat },
      { to: "/admin/paystubs", label: "Paystubs", icon: FileSpreadsheet },
      { to: "/admin/worker-savings", label: "Savings", icon: PiggyBank },
      { to: "/admin/applications", label: "Applications", icon: Users },
    ],
  },
  {
    label: "Growth",
    items: [
      { to: "/admin/estimates", label: "Estimates", icon: FileText },
      { to: "/admin/templates", label: "Templates", icon: ClipboardList },
      { to: "/admin/pipeline", label: "Pipeline", icon: KanbanSquare },
      { to: "/admin/reviews", label: "Reviews", icon: Star },
      { to: "/admin/portfolio", label: "Portfolio", icon: Image },
      { to: "/admin/vouchers", label: "Vouchers", icon: Ticket },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/admin/settings", label: "Settings", icon: Settings },
      { to: "/admin/setup", label: "Setup", icon: ListChecks },
    ],
  },
];

function AdminSidebar() {
  const { pathname } = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const isActive = (to: string, end?: boolean) =>
    end ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/admin" className="flex items-center gap-2 px-2 py-2 font-extrabold">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-secondary text-secondary-foreground">
            <Zap className="h-4 w-4" />
          </span>
          {!collapsed && <span className="truncate text-sm">{BUSINESS.shortName} Admin</span>}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {GROUPS.map((g) => (
          <SidebarGroup key={g.label}>
            {!collapsed && <SidebarGroupLabel>{g.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((it) => (
                  <SidebarMenuItem key={it.to}>
                    <SidebarMenuButton asChild isActive={isActive(it.to, it.end)} tooltip={it.label}>
                      <NavLink to={it.to} end={it.end} className="flex items-center gap-2">
                        <it.icon className="h-4 w-4 shrink-0" />
                        <span>{it.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <Link to="/admin/jobs/new">
          <Button size="sm" className="w-full bg-success text-success-foreground hover:bg-success/90 gap-1">
            <Plus className="h-4 w-4" /> {!collapsed && "Quick Add"}
          </Button>
        </Link>
      </SidebarFooter>
    </Sidebar>
  );
}

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
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-muted/20">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-30 bg-primary text-primary-foreground border-b border-primary/20">
            <div className="h-14 flex items-center justify-between gap-3 px-3 sm:px-4">
              <div className="flex items-center gap-2 min-w-0">
                <SidebarTrigger className="text-primary-foreground hover:bg-primary/40" />
                <Link to="/admin" className="flex items-center gap-2 font-extrabold truncate">
                  <span className="hidden sm:inline">{BUSINESS.shortName} Admin</span>
                  <span className="sm:hidden">Admin</span>
                </Link>
              </div>
              <div className="flex items-center gap-2">
                <Link to="/admin/jobs/new" className="hidden sm:block">
                  <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90 gap-1">
                    <Plus className="h-4 w-4" /> Quick Add
                  </Button>
                </Link>
                <Button size="sm" variant="ghost" onClick={() => signOut()} className="text-primary-foreground hover:bg-primary/40">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </header>
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

import { Outlet } from "react-router-dom";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { StickyMobileBar } from "./StickyMobileBar";

export const SiteLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <div className="mobile-sticky-spacer" />
      <SiteFooter />
      <StickyMobileBar />
    </div>
  );
};

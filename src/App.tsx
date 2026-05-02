import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { SiteLayout } from "@/components/site/SiteLayout";
import Home from "./pages/Home";
import Services from "./pages/Services";
import Schedule from "./pages/Schedule";
import Portfolio from "./pages/Portfolio";
import Reviews from "./pages/Reviews";
import ContractorSupport from "./pages/ContractorSupport";
import About from "./pages/About";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import AdminAuth from "./pages/admin/AdminAuth";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminJobs from "./pages/admin/AdminJobs";
import AdminJobDetails from "./pages/admin/AdminJobDetails";
import AdminQuickAdd from "./pages/admin/AdminQuickAdd";
import AdminCalendar from "./pages/admin/AdminCalendar";
import AdminPipeline from "./pages/admin/AdminPipeline";
import AdminEstimates from "./pages/admin/AdminEstimates";
import AdminReviews from "./pages/admin/AdminReviews";
import AdminPortfolio from "./pages/admin/AdminPortfolio";
import AdminSetup from "./pages/admin/AdminSetup";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route element={<SiteLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/services" element={<Services />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/reviews" element={<Reviews />} />
              <Route path="/contractor-support" element={<ContractorSupport />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
            </Route>
            <Route path="/admin/auth" element={<AdminAuth />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="jobs" element={<AdminJobs />} />
              <Route path="jobs/new" element={<AdminQuickAdd />} />
              <Route path="jobs/:id" element={<AdminJobDetails />} />
              <Route path="pipeline" element={<AdminPipeline />} />
              <Route path="calendar" element={<AdminCalendar />} />
              <Route path="estimates" element={<AdminEstimates />} />
              <Route path="reviews" element={<AdminReviews />} />
              <Route path="portfolio" element={<AdminPortfolio />} />
              <Route path="setup" element={<AdminSetup />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

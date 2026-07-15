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
// AdminMessages removed
import AdminMoney from "./pages/admin/AdminMoney";
import AdminSetup from "./pages/admin/AdminSetup";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminApplications from "./pages/admin/AdminApplications";
import AdminBills from "./pages/admin/AdminBills";
import AdminDebt from "./pages/admin/AdminDebt";
import AdminContacts from "./pages/admin/AdminContacts";
import AdminContactDetail from "./pages/admin/AdminContactDetail";
import AdminWorkers from "./pages/admin/AdminWorkers";
import AdminTemplates from "./pages/admin/AdminTemplates";
import Careers from "./pages/Careers";
import AdminReports from "./pages/admin/AdminReports";
import EstimateShare from "./pages/EstimateShare";
import WorkerLogin from "./pages/worker/WorkerLogin";
import WorkerDashboard from "./pages/worker/WorkerDashboard";
import AdminBusiness from "./pages/admin/AdminBusiness";
import AdminPersonal from "./pages/admin/AdminPersonal";
import AdminPaystubs from "./pages/admin/AdminPaystubs";
import AdminHistoricalIncome from "./pages/admin/AdminHistoricalIncome";
import AdminVouchers from "./pages/admin/AdminVouchers";
import AdminWorkerSavings from "./pages/admin/AdminWorkerSavings";
import AdminCfoDashboard from "./pages/admin/AdminCfoDashboard";
import ServiceVouchers from "./pages/ServiceVouchers";
import AdminLeadAlerts from "./pages/admin/AdminLeadAlerts";
import AdminLeads from "./pages/admin/AdminLeads";
import AdminLeadDetail from "./pages/admin/AdminLeadDetail";
import AdminQuickLead from "./pages/admin/AdminQuickLead";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import ServicePolicy from "./pages/ServicePolicy";
import VoucherTerms from "./pages/VoucherTerms";

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
              <Route path="/careers" element={<Careers />} />
              <Route path="/privacy-policy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/service-policy" element={<ServicePolicy />} />
              <Route path="/voucher-terms" element={<VoucherTerms />} />
            </Route>
            <Route path="/estimate/:token" element={<EstimateShare />} />
            <Route path="/service-vouchers" element={<ServiceVouchers />} />
            <Route path="/vouchers" element={<ServiceVouchers />} />
            <Route path="/worker/login" element={<WorkerLogin />} />
            <Route path="/worker/dashboard" element={<WorkerDashboard />} />
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
              {/* messages route removed */}
              <Route path="money" element={<AdminMoney />} />
              <Route path="business" element={<AdminBusiness />} />
              <Route path="personal" element={<AdminPersonal />} />
              <Route path="applications" element={<AdminApplications />} />
              <Route path="bills" element={<AdminBills />} />
              <Route path="debt" element={<AdminDebt />} />
              <Route path="contacts" element={<AdminContacts />} />
              <Route path="contacts/:id" element={<AdminContactDetail />} />
              <Route path="leads" element={<AdminLeads />} />
              <Route path="leads/new" element={<AdminQuickLead />} />
              <Route path="leads/:id" element={<AdminLeadDetail />} />
              <Route path="workers" element={<AdminWorkers />} />
              <Route path="templates" element={<AdminTemplates />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="cfo" element={<AdminCfoDashboard />} />
              <Route path="paystubs" element={<AdminPaystubs />} />
              <Route path="historical-income" element={<AdminHistoricalIncome />} />
              <Route path="vouchers" element={<AdminVouchers />} />
              <Route path="worker-savings" element={<AdminWorkerSavings />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="lead-alerts" element={<AdminLeadAlerts />} />
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

import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Auth0ProviderWithNavigate from "@/auth/Auth0ProviderWithNavigate";
import MarketingLayout from "@/layouts/MarketingLayout";
import DashboardLayout from "@/layouts/DashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";

import Landing from "./pages/Landing";
import Features from "./pages/Features";
import Pricing from "./pages/Pricing";
import Blog from "./pages/Blog";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Security from "./pages/Security";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Resumes from "./pages/Resumes";
import ResumeDetail from "./pages/ResumeDetail";
import Verify from "./pages/Verify";
import Recruiters from "./pages/Recruiters";
import Certificates from "./pages/Certificates";
import Admin from "./pages/Admin";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Auth0ProviderWithNavigate>
            <AuthProvider>
              <Routes>
              <Route element={<MarketingLayout />}>
                <Route path="/" element={<Landing />} />
                <Route path="/features" element={<Features />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/security" element={<Security />} />
                <Route path="/verify" element={<Verify />} />
                <Route path="/verify/:id" element={<Verify />} />
              </Route>
              <Route path="/auth" element={<Auth />} />
              <Route
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/dashboard/resumes" element={<Resumes />} />
                <Route path="/dashboard/resumes/:id" element={<ResumeDetail />} />
                <Route path="/dashboard/certificates" element={<Certificates />} />
                <Route path="/dashboard/recruiters" element={<Recruiters />} />
                <Route path="/dashboard/admin" element={<Admin />} />
                <Route path="/dashboard/settings" element={<Settings />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

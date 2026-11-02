import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import DietitianDashboard from "./pages/DietitianDashboard";
import ClientDetail from "./pages/ClientDetail";
import { useRole } from "./hooks/useRole";
import { Loader2 } from "lucide-react";
import Auth from "./pages/Auth";
import History from "./pages/History";
import Settings from "./pages/Settings";
import Install from "./pages/Install";
import MetabolicTwin from "./pages/MetabolicTwin";
import UserManual from "./pages/UserManual";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import { BottomNavBar } from "./components/BottomNavBar";
import { TestModeBanner } from "./components/TestModeBanner";
import { PAYMENTS_ENABLED } from "./config/features";
import { IOSInstallBanner } from "./components/IOSInstallBanner";
import { RemindersScheduler } from "./components/RemindersScheduler";
import { useMobileCapacitor } from "./hooks/useMobileCapacitor";
import { useAuth } from "./hooks/useAuth";
import { SubscriptionProvider } from "./contexts/SubscriptionContext";

const queryClient = new QueryClient();

// Diyetisyen hesapları ana sayfa yerine danışan paneline gider
function RoleHome() {
  const { user, loading } = useAuth();
  const { role, loading: roleLoading } = useRole(user?.id);
  if (user && (loading || roleLoading || role === null)) {
    return (
      <div className="min-h-screen bg-background gradient-hero flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (user && role === 'dietitian') return <Navigate to="/dietitian" replace />;
  return <Index />;
}

function AppContent() {
  useMobileCapacitor();
  const { user } = useAuth();
  const { isDietitian } = useRole(user?.id);
  const location = useLocation();

  // Auth sayfasında ve 404'te bottom nav gösterme
  const hideBottomNav = location.pathname === '/auth' || location.pathname === '/install' || location.pathname === '/reset-password';

  return (
    <>
      {PAYMENTS_ENABLED && <TestModeBanner />}
      <IOSInstallBanner />
      {user && !isDietitian && <RemindersScheduler userId={user.id} />}
      <Routes>
        <Route path="/" element={<RoleHome />} />
        <Route path="/dietitian" element={<DietitianDashboard />} />
        <Route path="/dietitian/client/:clientId" element={<ClientDetail />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/history" element={<History />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/install" element={<Install />} />
        <Route path="/metabolic-twin" element={<MetabolicTwin />} />
        <Route path="/guide" element={<UserManual />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      {user && !hideBottomNav && <BottomNavBar isDietitian={isDietitian} />}
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SubscriptionProvider>
          <AppContent />
        </SubscriptionProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

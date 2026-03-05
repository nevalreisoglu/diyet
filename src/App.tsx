import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import History from "./pages/History";
import Settings from "./pages/Settings";
import Install from "./pages/Install";
import MetabolicTwin from "./pages/MetabolicTwin";
import NotFound from "./pages/NotFound";
import { BottomNavBar } from "./components/BottomNavBar";
import { TestModeBanner } from "./components/TestModeBanner";
import { useMobileCapacitor } from "./hooks/useMobileCapacitor";
import { useAuth } from "./hooks/useAuth";

const queryClient = new QueryClient();

function AppContent() {
  useMobileCapacitor();
  const { user } = useAuth();
  const location = useLocation();

  // Auth sayfasında ve 404'te bottom nav gösterme
  const hideBottomNav = location.pathname === '/auth' || location.pathname === '/install';

  return (
    <>
      <TestModeBanner />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/history" element={<History />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/install" element={<Install />} />
        <Route path="/metabolic-twin" element={<MetabolicTwin />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      {user && !hideBottomNav && <BottomNavBar />}
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

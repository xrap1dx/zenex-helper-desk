import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { StaffProvider } from "@/contexts/StaffContext";
import StaffLogin from "./pages/StaffLogin";
import Dashboard from "./pages/Dashboard";
import Embed from "./pages/Embed";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <StaffProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/staff" replace />} />
            <Route path="/staff" element={<StaffLogin />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/embed" element={<Embed />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </StaffProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

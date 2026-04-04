import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import Diagnostic from "@/pages/Diagnostic";
import PersonMap from "@/pages/PersonMap";
import Protocol from "@/pages/Protocol";
import ProgressPage from "@/pages/ProgressPage";
import Report from "@/pages/Report";
import SettingsPage from "@/pages/SettingsPage";
import AdminPanel from "@/pages/AdminPanel";
import Achievements from "@/pages/Achievements";
import Phases from "@/pages/Phases";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
            <Route path="/diagnostic" element={<ProtectedRoute><AppLayout><Diagnostic /></AppLayout></ProtectedRoute>} />
            <Route path="/map" element={<ProtectedRoute><AppLayout><PersonMap /></AppLayout></ProtectedRoute>} />
            <Route path="/protocol" element={<ProtectedRoute><AppLayout><Protocol /></AppLayout></ProtectedRoute>} />
            <Route path="/phases" element={<ProtectedRoute><AppLayout><Phases /></AppLayout></ProtectedRoute>} />
            <Route path="/achievements" element={<ProtectedRoute><AppLayout><Achievements /></AppLayout></ProtectedRoute>} />
            <Route path="/progress" element={<ProtectedRoute><AppLayout><ProgressPage /></AppLayout></ProtectedRoute>} />
            <Route path="/report" element={<ProtectedRoute><AppLayout><Report /></AppLayout></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><AppLayout><SettingsPage /></AppLayout></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute adminOnly><AppLayout><AdminPanel /></AppLayout></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

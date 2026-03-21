import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MainLayout } from "@/components/layout/MainLayout";
import { AuthBootstrap } from "@/components/auth/AuthBootstrap";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PublicRoute } from "@/components/auth/PublicRoute";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import OwnerLoginPage from "@/pages/OwnerLoginPage";
import SignupPage from "@/pages/SignupPage";
import AccessDeniedPage from "@/pages/AccessDeniedPage";
import DashboardPage from "@/pages/DashboardPage";
import PatientDetailPage from "@/pages/PatientDetailPage";
import NotFound from "@/pages/NotFound";
import { protectedAppRoutes } from "@/config/sidebarConfig";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthBootstrap />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/owner/login" element={<OwnerLoginPage />} />
            <Route path="/create-hospital" element={<SignupPage />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="/access-denied" element={<AccessDeniedPage />} />
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route
                element={<ProtectedRoute allowedRoles={protectedAppRoutes.find((route) => route.path === "/patients")?.roles} />}
              >
                <Route path="/patients/:id" element={<PatientDetailPage />} />
              </Route>
              {protectedAppRoutes
                .filter((route) => route.path !== "/dashboard")
                .map((route) => (
                  <Route key={route.path} element={<ProtectedRoute allowedRoles={route.roles} />}>
                    <Route path={route.path} element={<route.component />} />
                  </Route>
                ))}
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

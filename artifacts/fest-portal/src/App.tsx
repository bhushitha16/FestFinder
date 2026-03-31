import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";

// Pages
import LandingPage from "./pages/landing";
import StudentLogin from "./pages/student/login";
import StudentSignup from "./pages/student/signup";
import StudentDashboard from "./pages/student/dashboard";
import AdminLogin from "./pages/admin/login";
import AdminSignup from "./pages/admin/signup";
import AdminPending from "./pages/admin/pending";
import AdminDashboard from "./pages/admin/dashboard";
import SuperAdminLogin from "./pages/superadmin/login";
import SuperAdminDashboard from "./pages/superadmin/dashboard";
import VerifyEmail from "./pages/verify-email";
import VerifyOtp from "./pages/verify-otp";
import EventDetail from "./pages/events/detail";
import CollegeDetail from "./pages/colleges/detail";
import NotFound from "./pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />

      {/* Student Routes */}
      <Route path="/student/login" component={StudentLogin} />
      <Route path="/student/signup" component={StudentSignup} />
      <Route path="/student/dashboard" component={StudentDashboard} />

      {/* College Admin Routes */}
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/signup" component={AdminSignup} />
      <Route path="/admin/pending" component={AdminPending} />
      <Route path="/admin/dashboard" component={AdminDashboard} />

      {/* Super Admin Routes */}
      <Route path="/superadmin/login" component={SuperAdminLogin} />
      <Route path="/superadmin/dashboard" component={SuperAdminDashboard} />

      {/* Event & College Detail */}
      <Route path="/events/:id" component={EventDetail} />
      <Route path="/colleges/:id" component={CollegeDetail} />

      {/* Shared */}
      <Route path="/verify-otp" component={VerifyOtp} />
      <Route path="/verify-email" component={VerifyEmail} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

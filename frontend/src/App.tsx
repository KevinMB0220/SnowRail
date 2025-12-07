/**
 * Main App component with routing
 */

import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { useAuth } from "./hooks/use-auth.js";
import { ProtectedRoute } from "./components/auth/protected-route.js";
import { LoginPage } from "./pages/login.js";
import { SignupPage } from "./pages/signup.js";
import Dashboard from "./pages/dashboard.js";
import LegacyDashboard from "./components/Dashboard.js";
import PaymentForm from "./components/PaymentForm";
import ContractTest from "./components/ContractTest";
import { AgentIdentity } from "./components/AgentIdentity";
import { ParticleBackground } from "./components/ParticleBackground";
import { UserMenu } from "./components/auth/user-menu.js";
import "./App.css";
import type { MeteringInfo } from "./lib/api.js";

// Re-export MeteringInfo for backward compatibility
export type { MeteringInfo };

/**
 * Root route component that handles authentication check and routing
 */
function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Routes>
      {/* Root - landing page with demo content */}
      <Route
        path="/"
        element={
          isLoading ? (
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-teal-700">Loading...</p>
              </div>
            </div>
          ) : isAuthenticated ? (
            <ProtectedRoute isAuthenticated={isAuthenticated} isLoading={isLoading}>
              <AppLayout>
                <LegacyDashboard onPaymentRequired={() => {}} />
              </AppLayout>
            </ProtectedRoute>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Protected routes */}
      <Route
        path="/treasury-dashboard"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated} isLoading={isLoading}>
            <AppLayout>
              <Dashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Legacy hash routes - keeping for backward compatibility */}
      <Route
        path="/payment-form"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated} isLoading={isLoading}>
            <AppLayout>
              <PaymentForm onBack={() => window.history.back()} />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/contract-test"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated} isLoading={isLoading}>
            <AppLayout>
              <ContractTest onBack={() => window.history.back()} />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/agent-identity"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated} isLoading={isLoading}>
            <AppLayout>
              <AgentIdentity />
            </AppLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

/**
 * App layout wrapper with header and footer
 */
function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ParticleBackground />
      <div className="app min-h-screen text-slate-900 font-sans">
        {/* Header */}
        <header className="header sticky top-0 z-50 backdrop-blur-lg bg-white/80 border-b border-slate-200 shadow-sm">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Link
              to="/"
              className="logo flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity no-underline hover:no-underline"
              aria-label="SnowRail home"
            >
              <span className="logo-icon text-2xl">❄️</span>
              <span className="logo-text font-bold text-xl tracking-tight text-slate-900">SnowRail</span>
            </Link>
            <div className="header-meta flex items-center gap-4">
              <span className="chain-badge inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-sm font-medium text-slate-600">
                <span className="chain-dot w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                Avalanche C-Chain
              </span>
              <UserMenu />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="main py-8">
          <div className="container mx-auto px-4 max-w-5xl">{children}</div>
        </main>

        {/* Footer */}
        <footer className="footer py-8 bg-white border-t border-slate-200 mt-auto">
          <div className="container mx-auto px-4 text-center text-slate-500 text-sm">
            <p>Powered by x402 Protocol • Built on Avalanche</p>
          </div>
        </footer>
      </div>
    </>
  );
}

/**
 * Main App component
 */
function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;

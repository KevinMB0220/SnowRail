import { useState, useEffect } from "react";
import Dashboard from "./components/Dashboard";
import PaymentFlow from "./components/PaymentFlow";
import PayrollDetail from "./components/PayrollDetail";
import PaymentForm from "./components/PaymentForm";
import ContractTest from "./components/ContractTest";
import { AgentIdentity } from "./components/AgentIdentity";
import { ParticleBackground } from "./components/ParticleBackground";
import "./App.css";
import type { MeteringInfo as ApiMeteringInfo } from "./lib/api";

// App view states
type ViewState = 
  | { view: "dashboard" }
  | { view: "payment-flow"; metering: MeteringInfo }
  | { view: "payroll-detail"; payrollId: string }
  | { view: "payment-form" }
  | { view: "contract-test" }
  | { view: "agent-identity" };

// Metering info from 402 response (extends API shape with optional meterId)
export type MeteringInfo = ApiMeteringInfo & {
  meterId?: string;
  version: string;
};

// Payroll data type
export type PayrollData = {
  payrollId: string;
  status: string;
  total: number;
  currency: string;
  payments: PaymentData[];
};

export type PaymentData = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  recipient: string | null;
};

function App() {
  // Check URL hash for payment-form view
  const getInitialState = (): ViewState => {
    if (window.location.hash === "#payment-form") {
      return { view: "payment-form" };
    } else if (window.location.hash === "#contract-test") {
      return { view: "contract-test" };
    } else if (window.location.hash === "#agent-identity") {
      return { view: "agent-identity" };
    }
    return { view: "dashboard" };
  };

  const [state, setState] = useState<ViewState>(getInitialState());

  // Listen for hash changes
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === "#payment-form") {
        setState({ view: "payment-form" });
      } else if (window.location.hash === "#contract-test") {
        setState({ view: "contract-test" });
      } else if (window.location.hash === "#agent-identity") {
        setState({ view: "agent-identity" });
      } else if (window.location.hash === "" || window.location.hash === "#dashboard") {
        setState({ view: "dashboard" });
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Handle 402 response - show payment flow
  const handlePaymentRequired = (metering: MeteringInfo) => {
    setState({ view: "payment-flow", metering });
  };

  // Handle successful payroll execution
  const handlePayrollSuccess = (payrollId: string) => {
    setState({ view: "payroll-detail", payrollId });
  };

  // Go back to dashboard
  const handleBack = () => {
    setState({ view: "dashboard" });
  };

  return (
    <>
      {/* Particle Background - Outside main app container */}
      <ParticleBackground />
      
      <div className="app min-h-screen text-slate-900 font-sans">
      {/* Header */}
      <header className="header sticky top-0 z-50 backdrop-blur-lg bg-white/80 border-b border-slate-200 shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="logo flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" 
            onClick={handleBack}
          >
            <span className="logo-icon text-2xl">❄️</span>
            <span className="logo-text font-bold text-xl tracking-tight text-slate-900">SnowRail</span>
          </div>
          <div className="header-meta">
            <span className="chain-badge inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-sm font-medium text-slate-600">
              <span className="chain-dot w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Avalanche C-Chain
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main py-8">
        <div className="container mx-auto px-4 max-w-5xl">
          {state.view === "dashboard" && (
            <Dashboard onPaymentRequired={handlePaymentRequired} />
          )}
          {state.view === "payment-flow" && (
            <PaymentFlow
              metering={state.metering}
              meterId={state.metering.meterId}
              onSuccess={handlePayrollSuccess}
              onCancel={handleBack}
            />
          )}
          {state.view === "payroll-detail" && (
            <PayrollDetail
              payrollId={state.payrollId}
              onBack={handleBack}
            />
          )}
          {state.view === "payment-form" && (
            <PaymentForm onBack={handleBack} onSuccess={handlePayrollSuccess} />
          )}
          {state.view === "contract-test" && (
            <ContractTest onBack={handleBack} />
          )}
          {state.view === "agent-identity" && (
            <div>
              <button
                onClick={handleBack}
                className="mb-6 flex items-center gap-2 text-teal-600 hover:text-teal-700 transition-colors"
              >
                ← Back to Dashboard
              </button>
              <AgentIdentity />
            </div>
          )}
        </div>
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

export default App;

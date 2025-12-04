import { useState } from "react";
import { executePayroll } from "../lib/api";
import type { MeteringInfo } from "../App";
import { CreditCard, Wallet, Box, ArrowRight, Zap, Shield, BarChart3, Activity, Globe, DollarSign, Sparkles } from "lucide-react";

type DashboardProps = {
  onPaymentRequired: (metering: MeteringInfo) => void;
};

function Dashboard({ onPaymentRequired }: DashboardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExecutePayroll = async () => {
    setLoading(true);
    setError(null);

    try {
      // First call without payment token - expect 402
      const result = await executePayroll();

      if (!result.success && result.status === 402) {
        // Payment required - show payment flow
        if (result.error.metering) {
          const meteringInfo: MeteringInfo = {
            ...(result.error.metering as MeteringInfo),
            meterId: result.error.meterId || "payroll_execute",
          };
          onPaymentRequired(meteringInfo);
        }
      } else if (!result.success) {
        setError(result.error.message || "Failed to execute payroll");
      }
    } catch (err) {
      setError("Network error. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard">
      {/* Hero Section */}
      <section className="text-center py-16 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-sm font-medium mb-6">
          <Sparkles size={14} />
          <span>Sovereign Agent Stack • x402 + ERC-8004 + Arweave</span>
        </div>
        <h1 className="text-5xl font-bold tracking-tight text-teal-900 mb-6 leading-tight">
          AI-Native Treasury on
          <span className="text-teal-600"> Avalanche</span>
        </h1>
        <p className="text-xl text-teal-700 mb-10 leading-relaxed">
          Autonomous treasury orchestration for AI agents. Execute cross-border payroll with permanent audit trail.
        </p>
      </section>

      <div className="grid md:grid-cols-2 gap-8 mb-16">
      {/* Main Action Card */}
        <div className="card p-8 flex flex-col">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-teal-100 rounded-xl shrink-0" style={{color: '#0d9488'}}>
              <Wallet size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-teal-900">Demo Payroll</h2>
              <p className="text-teal-700">Execute a batch payment to 10 freelancers</p>
            </div>
          </div>

          <div className="space-y-3 mb-6 bg-teal-50 p-4 rounded-xl border border-teal-200 flex-grow">
            <div className="flex justify-between text-sm">
              <span className="text-teal-600">Recipients</span>
              <span className="font-medium text-teal-900">10 freelancers</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-teal-600">Total Amount</span>
              <span className="font-medium text-teal-900">$6,000.00 USD</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-teal-600">Network</span>
              <span className="font-medium text-teal-900">Avalanche C-Chain</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-teal-600">Protocol</span>
              <span className="font-mono text-xs bg-teal-200 px-2 py-0.5 rounded text-teal-800">x402 + 8004</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200 flex items-center gap-2">
              <Activity size={16} />
              {error}
            </div>
          )}

          <button
            className="btn btn-primary btn-large w-full mt-auto"
            onClick={handleExecutePayroll}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Processing...
              </>
            ) : (
              <>
                <Zap size={18} />
                Execute Payroll
              </>
            )}
          </button>
        </div>

      {/* Payment Form Section */}
        <div className="card p-8 flex flex-col">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-teal-100 rounded-xl shrink-0" style={{color: '#0d9488'}}>
              <CreditCard size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-teal-900">Process Payment</h2>
              <p className="text-teal-700">Complete payment flow: Rail + Blockchain</p>
            </div>
          </div>

          <div className="space-y-3 mb-6 bg-teal-50 p-4 rounded-xl border border-teal-200 flex-grow">
            <div className="flex justify-between text-sm">
              <span className="text-teal-600">Integration</span>
              <span className="font-medium text-teal-900">Rail API + Smart Contracts</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-teal-600">Payment Method</span>
              <span className="font-medium text-teal-900">x402 Protocol</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-teal-600">Network</span>
              <span className="font-medium text-teal-900">Avalanche Fuji Testnet</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-teal-600">Features</span>
              <span className="font-medium text-teal-900">Gasless Transactions</span>
            </div>
          </div>

          <button
            className="btn btn-secondary w-full mt-auto"
            onClick={() => {
              window.location.hash = "#payment-form";
            }}
          >
            <span>🚀</span>
            Open Payment Form
          </button>
        </div>
      </div>

      {/* Sovereign Agent Stack Cards */}
      <section className="grid md:grid-cols-3 gap-6 mb-16">
        <div className="card p-6">
          <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center mb-4" style={{color: '#0f766e'}}>
            <Shield size={20} />
          </div>
          <h3 className="font-bold text-teal-900 mb-2">Payments & Metering</h3>
          <p className="text-sm text-teal-700">x402 + ERC-8004 protocol for autonomous AI agent payments.</p>
        </div>
        <div className="card p-6">
          <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center mb-4" style={{color: '#0f766e'}}>
            <Sparkles size={20} />
          </div>
          <h3 className="font-bold text-teal-900 mb-2">Agent Identity</h3>
          <p className="text-sm text-teal-700">ERC-8004 identity card for agent-to-agent discovery.</p>
        </div>
        <div className="card p-6">
          <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center mb-4" style={{color: '#0f766e'}}>
            <Box size={20} />
          </div>
          <h3 className="font-bold text-teal-900 mb-2">Permanent Storage</h3>
          <p className="text-sm text-teal-700">Arweave receipts - immutable audit trail forever.</p>
        </div>
      </section>

      {/* Agent Identity Section - Highlighted */}
      <section className="card p-8 relative overflow-hidden mb-8" style={{background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)'}}>
        <div className="absolute top-0 right-0 p-16 bg-teal-400 rounded-full blur-3xl opacity-10 -mr-10 -mt-10"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/10 rounded-xl text-white shrink-0">
              <Sparkles size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-1">🤖 Agent Activity & Identity</h2>
              <p className="text-teal-100">View real payroll transactions with Arweave receipts, agent identity (ERC-8004), and live statistics.</p>
            </div>
          </div>
          
          <button
            className="py-3 px-6 bg-white text-teal-900 hover:bg-teal-50 rounded-xl font-medium transition-colors flex items-center gap-2 whitespace-nowrap shadow-lg"
            onClick={() => {
              window.location.hash = "#agent-identity";
            }}
          >
            View Activity
            <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* Contract Test Section */}
      <section className="card p-8 relative overflow-hidden mb-16" style={{background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)'}}>
        <div className="absolute top-0 right-0 p-16 bg-teal-400 rounded-full blur-3xl opacity-10 -mr-10 -mt-10"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/10 rounded-xl text-white shrink-0">
              <Activity size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Contract Test</h2>
              <p className="text-teal-100">Test Treasury contract operations through the agent with facilitator validation.</p>
            </div>
          </div>
          
          <button
            className="py-3 px-6 bg-white text-teal-900 hover:bg-teal-50 rounded-xl font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
            onClick={() => {
              window.location.hash = "#contract-test";
            }}
          >
            Run Contract Test
            <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* About Section - Clean and Simple */}
      <section className="mb-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-teal-900 mb-4">
            Built for Autonomous AI Agents
          </h2>
          <p className="text-lg text-teal-700 max-w-3xl mx-auto leading-relaxed">
            SnowRail implements the Sovereign Agent Stack - the first treasury system designed for AI agents 
            to discover, pay, and execute cross-border payroll autonomously.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Benefit 1 */}
          <div className="card p-8 text-center">
            <div className="w-14 h-14 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{color: '#0d9488'}}>
              <Globe size={28} />
            </div>
            <h3 className="text-xl font-bold text-teal-900 mb-3">Global Reach</h3>
            <p className="text-teal-700 leading-relaxed">
              Pay anyone, anywhere in the world. Send stablecoins to freelancers and contractors 
              without borders or bank delays.
            </p>
          </div>

          {/* Benefit 2 */}
          <div className="card p-8 text-center">
            <div className="w-14 h-14 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{color: '#0d9488'}}>
              <Zap size={28} />
            </div>
            <h3 className="text-xl font-bold text-teal-900 mb-3">Instant Payments</h3>
            <p className="text-teal-700 leading-relaxed">
              Settle payments in seconds on Avalanche blockchain. 
              No waiting days for bank transfers or dealing with intermediaries.
            </p>
          </div>

          {/* Benefit 3 */}
          <div className="card p-8 text-center">
            <div className="w-14 h-14 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{color: '#0d9488'}}>
              <DollarSign size={28} />
            </div>
            <h3 className="text-xl font-bold text-teal-900 mb-3">Transparent Costs</h3>
            <p className="text-teal-700 leading-relaxed">
              Pay only for what you use with clear, upfront pricing. 
              No hidden fees, no surprises, powered by x402 protocol.
            </p>
          </div>
        </div>

        {/* Simple CTA */}
        <div className="card p-10 mt-8 text-center" style={{background: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)'}}>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full text-teal-700 font-medium mb-4">
            <Sparkles size={16} />
            <span>Built on Avalanche</span>
          </div>
          <h3 className="text-2xl font-bold text-teal-900 mb-3">
            Ready to streamline your global payroll?
          </h3>
          <p className="text-teal-700 text-lg">
            Try our demo and experience the future of international payments
          </p>
        </div>
      </section>

    </div>
  );
}

export default Dashboard;

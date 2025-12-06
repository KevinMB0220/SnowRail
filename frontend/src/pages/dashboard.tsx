/**
 * Dashboard Page
 * Main dashboard for authenticated users showing balances, payments, and company status
 */

import { useDashboard } from "../hooks/use-dashboard.js";
import { BalanceCard } from "../components/dashboard/balance-card.js";
import { RecentPayments } from "../components/dashboard/recent-payments.js";
import { PaymentSimulator } from "../components/dashboard/mock-payment-simulator.js";
import { RefreshCw, AlertCircle, CheckCircle2, Info, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/use-auth.js";

export default function Dashboard() {
  const { data, isLoading, error, refetch } = useDashboard();
  const { company } = useAuth();
  const navigate = useNavigate();

  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="card p-6 animate-pulse">
          <div className="h-6 bg-teal-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-teal-100 rounded w-1/2"></div>
        </div>

        {/* Balance skeleton */}
        <div className="card p-8 animate-pulse">
          <div className="h-8 bg-teal-200 rounded w-1/4 mb-4"></div>
          <div className="h-12 bg-teal-100 rounded w-1/3 mb-6"></div>
          <div className="space-y-3">
            <div className="h-16 bg-teal-50 rounded"></div>
            <div className="h-16 bg-teal-50 rounded"></div>
          </div>
        </div>

        {/* Payments skeleton */}
        <div className="card p-8 animate-pulse">
          <div className="h-6 bg-teal-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-teal-50 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="card p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-teal-900 mb-2">Error loading dashboard</h2>
        <p className="text-teal-600 mb-6">{error}</p>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
        >
          <RefreshCw size={16} />
          Try again
        </button>
      </div>
    );
  }

  // Show empty state if no data
  if (!data) {
    return (
      <div className="card p-8 text-center">
        <Info className="w-12 h-12 text-teal-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-teal-900 mb-2">Welcome to SnowRail</h2>
        <p className="text-teal-600 mb-6">
          Start receiving x402 payments to see your balances and transaction history here.
        </p>
      </div>
    );
  }

  const { company: companyData, balances, recentPayments, stats } = data;
  
  // Use company from dashboard data, fallback to auth company
  const activeCompanyId = companyData?.id || company?.id;

  // Determine KYB/Rail status banner
  const showKybBanner = companyData.kybLevel === 0;
  const showRailBanner = companyData.kybLevel === 1 && companyData.railStatus === "none";
  const showAllComplete = companyData.kybLevel === 1 && companyData.railStatus === "active";

  return (
    <div className="space-y-6">
      {/* Header with Company Info */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-teal-900 mb-1">
              {companyData.legalName}
              {companyData.tradeName && (
                <span className="text-lg font-normal text-teal-600 ml-2">
                  ({companyData.tradeName})
                </span>
              )}
            </h1>
            <p className="text-sm text-teal-600">
              Dashboard • {companyData.country || "US"}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg transition-colors border border-teal-200"
            title="Refresh dashboard"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* Status Banners */}
      {showKybBanner && (
        <div className="card p-6">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-yellow-100 rounded-xl flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-yellow-700" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-teal-900 mb-2">
                Verification Required
              </h3>
              <p className="text-sm text-teal-700 mb-4 leading-relaxed">
                Complete KYB verification to enable withdrawals. This is required before you can
                create a Rail account and withdraw funds.
              </p>
              <button
                onClick={() => navigate("/settings")}
                className="btn btn-primary"
              >
                Start Verification
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {showRailBanner && (
        <div className="card p-6">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-teal-100 rounded-xl flex-shrink-0" style={{ color: "#0d9488" }}>
              <Info className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-teal-900 mb-2">
                Create Rail Account
              </h3>
              <p className="text-sm text-teal-700 mb-4 leading-relaxed">
                Your company is verified. Create your USD account in Rail to enable withdrawals.
              </p>
              <button
                onClick={() => navigate("/settings")}
                className="btn btn-primary"
              >
                Create Rail Account
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {showAllComplete && (
        <div className="card p-6">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-teal-100 rounded-xl flex-shrink-0" style={{ color: "#0d9488" }}>
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-teal-900 mb-2">
                All Set Up!
              </h3>
              <p className="text-sm text-teal-700 leading-relaxed">
                Your company is verified and your Rail account is active. You can now withdraw funds.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Balance Card */}
      <BalanceCard data={data} />

      {/* Payment Simulator */}
      {activeCompanyId && (
        <PaymentSimulator
          companyId={activeCompanyId}
          onPaymentCreated={() => {
            // Refresh dashboard data after payment
            setTimeout(() => {
              refetch();
            }, 500);
          }}
        />
      )}

      {/* Stats Summary */}
      {stats.totalPayments > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card p-6">
            <div className="text-sm text-teal-600 mb-1">Total Payments</div>
            <div className="text-2xl font-bold text-teal-900">{stats.totalPayments}</div>
            <div className="text-xs text-teal-500 mt-1">Confirmed transactions</div>
          </div>
          <div className="card p-6">
            <div className="text-sm text-teal-600 mb-1">Total Received</div>
            <div className="text-2xl font-bold text-teal-900">
              ${stats.totalReceived.toFixed(2)}
            </div>
            <div className="text-xs text-teal-500 mt-1">USD equivalent</div>
          </div>
        </div>
      )}

      {/* Recent Payments */}
      <RecentPayments payments={recentPayments} />

      {/* Empty State Message for First Time Users */}
      {recentPayments.length === 0 && balances.totalUsd === 0 && (
        <div className="card p-8 text-center bg-teal-50 border-teal-200">
          <Info className="w-12 h-12 text-teal-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-teal-900 mb-2">
            Start Receiving Payments
          </h3>
          <p className="text-teal-600 mb-4 max-w-md mx-auto">
            Use the Merchant API to create payment intents and start receiving x402 micropayments.
            All payments will appear here once confirmed on-chain.
          </p>
          <div className="text-xs text-teal-500 font-mono bg-white px-3 py-2 rounded border border-teal-200 inline-block">
            POST /merchant/payments
          </div>
        </div>
      )}
    </div>
  );
}

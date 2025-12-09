/**
 * Dashboard Page
 * Main dashboard for authenticated users showing balances, payments, and company status
 */

import { useDashboard } from "../hooks/use-dashboard.js";
import { BalanceCard } from "../components/dashboard/balance-card.js";
import { RecentPayments } from "../components/dashboard/recent-payments.js";
import { PaymentSimulator } from "../components/dashboard/mock-payment-simulator.js";
import { BackButton } from "../components/ui/back-button.js";
import { RefreshCw, AlertCircle, CheckCircle2, Info, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { useAuth } from "../hooks/use-auth.js";
import { motion } from "framer-motion";
import { SpotlightCard } from "../components/ui/spotlight-card";

export default function Dashboard() {
  const { data, isLoading, error, refetch } = useDashboard();
  const { company } = useAuth();

  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="glass-panel p-6 animate-pulse bg-white/5">
          <div className="h-6 bg-white/10 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-white/5 rounded w-1/2"></div>
        </div>

        {/* Balance skeleton */}
        <div className="glass-panel p-8 animate-pulse bg-white/5">
          <div className="h-8 bg-white/10 rounded w-1/4 mb-4"></div>
          <div className="h-12 bg-white/5 rounded w-1/3 mb-6"></div>
          <div className="space-y-3">
            <div className="h-16 bg-white/5 rounded"></div>
            <div className="h-16 bg-white/5 rounded"></div>
          </div>
        </div>

        {/* Payments skeleton */}
        <div className="glass-panel p-8 animate-pulse bg-white/5">
          <div className="h-6 bg-white/10 rounded w-1/4 mb-6"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-white/5 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-6">
        <BackButton />
        <SpotlightCard className="p-8 text-center bg-navy-800/50 border-red-500/20">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Error loading dashboard</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-electric-blue to-purple-600 text-white rounded-lg hover:shadow-lg hover:shadow-electric-blue/20 transition-all"
          >
            <RefreshCw size={16} />
            Try again
          </button>
        </SpotlightCard>
      </div>
    );
  }

  // Show empty state if no data
  if (!data) {
    return (
      <div className="space-y-6">
        <BackButton />
        <SpotlightCard className="p-8 text-center bg-navy-800/50">
          <Info className="w-12 h-12 text-electric-blue mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Welcome to SnowRail</h2>
          <p className="text-gray-400 mb-6">
            Start receiving x402 payments to see your balances and transaction history here.
          </p>
        </SpotlightCard>
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

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Back Button */}
      <motion.div variants={item}>
        <BackButton />
      </motion.div>

      {/* Header with Company Info */}
      <motion.div variants={item}>
        <SpotlightCard className="p-6 bg-navy-800/30">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">
                {companyData.legalName}
                {companyData.tradeName && (
                  <span className="text-lg font-normal text-gray-400 ml-2">
                    ({companyData.tradeName})
                  </span>
                )}
              </h1>
              <p className="text-sm text-gray-400">
                Dashboard • {companyData.country || "US"}
              </p>
            </div>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-white/5 hover:bg-white/10 text-electric-blue rounded-lg transition-colors border border-white/10"
              title="Refresh dashboard"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </SpotlightCard>
      </motion.div>

      {/* KYB Status Card - MVP Notice */}
      {showKybBanner && (
        <motion.div variants={item}>
          <SpotlightCard className="p-6 border-yellow-500/20 bg-yellow-500/5">
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-yellow-500/10 rounded-xl flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-yellow-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-2">
                  Verification Status
                </h3>
                <p className="text-sm text-gray-300 leading-relaxed">
                  KYB/KYC verification is not included in the current MVP scope. This feature will be implemented in future releases as part of our roadmap.
                </p>
              </div>
            </div>
          </SpotlightCard>
        </motion.div>
      )}

      {showRailBanner && (
        <motion.div variants={item}>
          <SpotlightCard className="p-6 border-electric-blue/20 bg-electric-blue/5">
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-electric-blue/10 rounded-xl flex-shrink-0">
                <Info className="w-6 h-6 text-electric-blue" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-2">
                  Create Rail Account
                </h3>
                <p className="text-sm text-gray-300 mb-4 leading-relaxed">
                  Your company is verified. Create your USD account in Rail to enable withdrawals.
                </p>
              </div>
            </div>
          </SpotlightCard>
        </motion.div>
      )}

      {showAllComplete && (
        <motion.div variants={item}>
          <SpotlightCard className="p-6 border-green-500/20 bg-green-500/5">
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-green-500/10 rounded-xl flex-shrink-0">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-2">
                  All Set Up!
                </h3>
                <p className="text-sm text-gray-300 leading-relaxed">
                  Your company is verified and your Rail account is active. You can now withdraw funds.
                </p>
              </div>
            </div>
          </SpotlightCard>
        </motion.div>
      )}

      {/* Balance Card */}
      <motion.div variants={item}>
        <BalanceCard data={data} />
      </motion.div>

      {/* Payment Simulator */}
      {activeCompanyId && (
        <motion.div variants={item}>
          <PaymentSimulator
            companyId={activeCompanyId}
            onPaymentCreated={() => {
              // Refresh dashboard data after payment
              setTimeout(() => {
                refetch();
              }, 500);
            }}
          />
        </motion.div>
      )}

      {/* Stats Summary */}
      {stats.totalPayments > 0 && (
        <motion.div variants={item} className="grid md:grid-cols-2 gap-4">
          <SpotlightCard className="p-6 bg-navy-800/30">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-400">Total Payments</div>
              <div className="p-2 bg-electric-blue/10 rounded-lg">
                <ArrowUpRight className="w-4 h-4 text-electric-blue" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white">{stats.totalPayments}</div>
            <div className="text-xs text-electric-blue mt-1">Confirmed transactions</div>
          </SpotlightCard>
          
          <SpotlightCard className="p-6 bg-navy-800/30">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-400">Total Received</div>
              <div className="p-2 bg-green-500/10 rounded-lg">
                <ArrowDownLeft className="w-4 h-4 text-green-500" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white">
              ${stats.totalReceived.toFixed(2)}
            </div>
            <div className="text-xs text-green-500 mt-1">USD equivalent</div>
          </SpotlightCard>
        </motion.div>
      )}

      {/* Recent Payments */}
      <motion.div variants={item}>
        <RecentPayments payments={recentPayments} />
      </motion.div>

      {/* Empty State Message for First Time Users */}
      {recentPayments.length === 0 && balances.totalUsd === 0 && (
        <motion.div variants={item}>
          <SpotlightCard className="p-8 text-center bg-navy-800/30 border-white/5">
            <Info className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              Start Receiving Payments
            </h3>
            <p className="text-gray-400 mb-4 max-w-md mx-auto">
              Use the Merchant API to create payment intents and start receiving x402 micropayments.
              All payments will appear here once confirmed on-chain.
            </p>
            <div className="text-xs text-electric-blue font-mono bg-navy-900 px-3 py-2 rounded border border-white/10 inline-block">
              POST /merchant/payments
            </div>
          </SpotlightCard>
        </motion.div>
      )}
    </motion.div>
  );
}

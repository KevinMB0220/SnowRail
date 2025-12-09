import { useState, useEffect } from "react";
import { Sparkles, Copy, Check, ExternalLink, Shield, Database, Activity, Clock, Users, DollarSign, Archive, RefreshCw } from "lucide-react";
import { getApiBase } from "../utils/api-config.js";
import { AgentIdentityTabs } from "./AgentIdentityTabs";
import { SpotlightCard } from "./ui/spotlight-card";
import { motion } from "framer-motion";

interface AgentCapabilities {
  erc8004Version: string;
  agent: {
    id: string;
    name: string;
    description: string;
    capabilities: string[];
    protocols: string[];
    networks: string[];
  };
  metering: {
    protocol: string;
    resources: Array<{
      id: string;
      price: string;
      asset: string;
      chain: string;
      description: string;
    }>;
  };
  audit: {
    permanentStorage: boolean;
    storageProtocol?: string;
    auditTrail: boolean;
  };
}

interface PayrollActivity {
  id: string;
  type: string;
  status: string;
  totalAmount: number;
  currency: string;
  recipientCount: number;
  createdAt: string;
  updatedAt: string;
  arweave: {
    txId: string;
    url: string;
    receipt: any;
  };
  payments: Array<{
    id: string;
    amount: number;
    recipient: string | null;
    status: string;
  }>;
}

interface AgentActivity {
  stats: {
    totalPayrolls: number;
    totalPaid: number;
    totalRecipients: number;
    lastActivity: string | null;
  };
  activity: PayrollActivity[];
  timestamp: string;
}

interface AgentStats {
  payrolls: {
    byStatus: Record<string, number>;
    total: number;
    last24h: number;
  };
  amounts: {
    totalPaid: number;
    totalProcessing: number;
    currency: string;
  };
  recipients: {
    total: number;
  };
  uptime: number;
  timestamp: string;
}

export function AgentIdentity() {
  const [identity, setIdentity] = useState<AgentCapabilities | null>(null);
  const [activity, setActivity] = useState<AgentActivity | null>(null);
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"activity" | "identity" | "stats">("activity");

  useEffect(() => {
    fetchAll();
  }, []);

  // Refresh data when component becomes visible (e.g., after navigation)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchAll();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError(null);
      await Promise.all([
        fetchIdentity(),
        fetchActivity(),
        fetchStats()
      ]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      console.error("Error fetching agent data:", err);
    } finally {
      setLoading(false);
    }
  };

  const API_BASE = getApiBase();

  const fetchIdentity = async () => {
    const response = await fetch(`${API_BASE}/api/agent/identity`);
    if (!response.ok) throw new Error("Failed to fetch identity");
    const data = await response.json();
    setIdentity(data);
  };

  const fetchActivity = async () => {
    const response = await fetch(`${API_BASE}/api/agent/activity`);
    if (!response.ok) throw new Error("Failed to fetch activity");
    const data = await response.json();
    setActivity(data);
  };

  const fetchStats = async () => {
    const response = await fetch(`${API_BASE}/api/agent/stats`);
    if (!response.ok) throw new Error("Failed to fetch stats");
    const data = await response.json();
    setStats(data);
  };

  const copyEndpoint = () => {
    const endpoint = `${API_BASE || window.location.origin}/api/agent/identity`;
    navigator.clipboard.writeText(endpoint);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <SpotlightCard className="p-8 text-center bg-navy-800/30">
        <div className="w-8 h-8 border-2 border-electric-blue/30 border-t-electric-blue rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-electric-blue">Loading agent data...</p>
      </SpotlightCard>
    );
  }

  if (error) {
    return (
      <SpotlightCard className="p-8 border-red-500/20 bg-red-500/5">
        <h3 className="font-bold text-red-400 mb-2">Failed to Load Data</h3>
        <p className="text-red-300 text-sm">{error}</p>
         <button
           onClick={fetchAll}
           className="mt-4 px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white font-medium rounded-lg hover:from-red-700 hover:to-red-600 transition-all duration-200 shadow-lg shadow-red-600/30 hover:shadow-xl hover:shadow-red-600/40 hover:scale-105"
         >
           Retry
         </button>
      </SpotlightCard>
    );
  }

  if (!identity) {
    return (
      <SpotlightCard className="p-8 text-center bg-navy-800/30">
        <div className="w-8 h-8 border-2 border-electric-blue/30 border-t-electric-blue rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-electric-blue">Loading agent identity...</p>
      </SpotlightCard>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <SpotlightCard className="p-6 bg-navy-800/30">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-electric-blue/10 rounded-lg text-electric-blue">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-1">
                {identity.agent.name}
              </h2>
              <p className="text-gray-400 text-sm">
                View payroll transactions, agent identity, and statistics
              </p>
            </div>
          </div>
          <div className="px-2 py-1 bg-electric-blue/20 border border-electric-blue/30 text-electric-blue text-xs font-mono rounded">
            ERC-8004
          </div>
        </div>
      </SpotlightCard>

       {/* Tabs - Rediseñados */}
       <AgentIdentityTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Stats Summary */}
      {stats && activity && activeTab === "activity" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <SpotlightCard className="p-4 bg-navy-800/30">
            <div className="flex items-center gap-2 text-electric-blue mb-1">
              <Activity size={14} />
              <span className="text-xs font-medium">Payrolls</span>
            </div>
            <div className="text-2xl font-bold text-white">{activity.stats.totalPayrolls}</div>
          </SpotlightCard>
          <SpotlightCard className="p-4 bg-navy-800/30">
            <div className="flex items-center gap-2 text-green-400 mb-1">
              <DollarSign size={14} />
              <span className="text-xs font-medium">Total Paid</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatAmount(activity.stats.totalPaid)}</div>
          </SpotlightCard>
          <SpotlightCard className="p-4 bg-navy-800/30">
            <div className="flex items-center gap-2 text-blue-400 mb-1">
              <Users size={14} />
              <span className="text-xs font-medium">Recipients</span>
            </div>
            <div className="text-2xl font-bold text-white">{activity.stats.totalRecipients}</div>
          </SpotlightCard>
          <SpotlightCard className="p-4 bg-navy-800/30">
            <div className="flex items-center gap-2 text-purple-400 mb-1">
              <Clock size={14} />
              <span className="text-xs font-medium">Last 24h</span>
            </div>
            <div className="text-2xl font-bold text-white">{stats.payrolls.last24h}</div>
          </SpotlightCard>
        </div>
      )}

      {/* Content Container */}
      <SpotlightCard className="p-6 bg-navy-800/30">

        {/* Activity Tab */}
        {activeTab === "activity" && activity && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Recent Executions</h3>
              <button
                onClick={fetchAll}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 bg-white/5 text-electric-blue hover:bg-white/10 border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh data"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>
            
            {activity.activity.length === 0 ? (
              <div className="text-center py-12">
                <Archive size={48} className="mx-auto mb-3 text-gray-600" />
                <p className="text-gray-300 font-medium mb-2">No payrolls executed yet</p>
                <p className="text-sm text-gray-500 mb-4">Execute a payroll to see it here</p>
                 <button
                   onClick={() => window.location.hash = "#dashboard"}
                   className="px-6 py-2.5 bg-gradient-to-r from-electric-blue to-purple-600 text-white text-sm font-medium rounded-lg hover:shadow-lg hover:shadow-electric-blue/20 hover:scale-105 transition-all"
                 >
                   Go to Dashboard
                 </button>
              </div>
            ) : (
              <div className="space-y-4">
                {activity.activity.map((item) => (
                    <div key={item.id} className="p-4 rounded-xl bg-navy-900/50 border border-white/5 hover:border-white/10 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm text-gray-300">{item.id}</span>
                          {(() => {
                            const status = item.status;
                            if (status === "PAID") {
                              return <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-400 text-xs font-medium border border-green-500/20">✓ Paid</span>;
                            } else if (status === "ONCHAIN_PAID") {
                              return <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-xs font-medium border border-blue-500/20">✓ On-Chain Paid</span>;
                            } else if (status === "RAIL_PROCESSING") {
                              return <span className="px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400 text-xs font-medium border border-yellow-500/20">⏳ Processing</span>;
                            } else if (status === "FAILED") {
                              return <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 text-xs font-medium border border-red-500/20">✗ Failed</span>;
                            } else {
                              return <span className="px-2 py-0.5 rounded bg-white/5 text-gray-400 text-xs font-medium border border-white/10">{status}</span>;
                            }
                          })()}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Users size={14} />
                            {item.recipientCount} recipients
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={14} />
                            {formatDate(item.createdAt)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-electric-blue">
                          {formatAmount(item.totalAmount)}
                        </div>
                        <div className="text-xs text-gray-500">{item.currency}</div>
                      </div>
                    </div>

                    {/* Arweave Receipt */}
                    <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-3 mt-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Database size={16} className="text-purple-400" />
                          <span className="text-sm font-medium text-purple-300">Arweave Receipt</span>
                        </div>
                         <a
                           href={item.arweave.url}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-purple-500 text-white text-xs font-medium rounded-lg hover:from-purple-500 hover:to-purple-400 transition-all duration-200 shadow-md shadow-purple-600/30 hover:scale-105"
                         >
                           View
                           <ExternalLink size={12} />
                         </a>
                      </div>
                      <div className="font-mono text-xs text-purple-300 bg-navy-900/50 px-2 py-1 rounded border border-purple-500/20 break-all">
                        {item.arweave.txId}
                      </div>
                    </div>

                    {/* Payments Preview */}
                    <details className="mt-3 group">
                      <summary className="text-sm text-gray-500 cursor-pointer hover:text-electric-blue transition-colors list-none">
                        <span className="inline-flex items-center gap-1">
                          <span className="group-open:rotate-90 transition-transform">▶</span>
                          View {item.payments.length} payment{item.payments.length !== 1 ? 's' : ''}
                        </span>
                      </summary>
                      <div className="mt-2 space-y-1">
                        {item.payments.map((payment) => (
                          <div key={payment.id} className="flex items-center justify-between text-xs py-1.5 px-2 bg-white/5 rounded border border-white/5">
                            <span className="font-mono text-gray-400 text-xs">{payment.recipient || 'N/A'}</span>
                            <span className="font-medium text-white">{formatAmount(payment.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Identity Tab */}
        {activeTab === "identity" && (
          <div className="space-y-6">
            {/* Agent ID */}
            <div className="bg-navy-900/50 p-4 rounded-lg border border-white/10">
              <div className="text-xs text-electric-blue mb-1">Agent ID</div>
              <div className="font-mono text-sm text-white">{identity.agent.id}</div>
            </div>

            {/* Endpoint */}
            <div className="bg-navy-900/50 p-4 rounded-lg border border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-electric-blue mb-1">Discovery Endpoint</div>
                  <div className="font-mono text-sm text-white truncate">
                    {`${getApiBase() || window.location.origin}/api/agent/identity`}
                  </div>
                </div>
                 <button
                   onClick={copyEndpoint}
                   className={`ml-4 p-2.5 rounded-lg transition-all duration-200 ${
                     copied 
                       ? "bg-green-500/20 text-green-400 scale-110 border border-green-500/30" 
                       : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white hover:scale-110 border border-white/5"
                   }`}
                   title={copied ? "Copied!" : "Copy endpoint"}
                 >
                   {copied ? <Check size={18} className="animate-bounce" /> : <Copy size={18} />}
                 </button>
              </div>
            </div>

            {/* Sovereign Agent Stack Layers */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-6 border border-green-500/20 bg-green-500/5 rounded-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-500/20 rounded-lg text-green-400">
                    <Shield size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-green-400">Payments</h3>
                    <div className="text-xs text-green-500/70 font-bold">✓ COMPLETE</div>
                  </div>
                </div>
                <div className="space-y-2 text-xs text-green-300">
                  <div><strong>Protocol:</strong> {identity.metering.protocol}</div>
                  <div><strong>Resources:</strong> {identity.metering.resources.length} meters</div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {identity.agent.protocols.map((protocol, i) => (
                      <span key={i} className="px-2 py-0.5 bg-green-500/10 text-green-300 font-mono rounded text-xs border border-green-500/20">
                        {protocol}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 border border-blue-500/20 bg-blue-500/5 rounded-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-blue-400">Identity</h3>
                    <div className="text-xs text-blue-500/70 font-bold">✓ BASIC</div>
                  </div>
                </div>
                <div className="space-y-2 text-xs text-blue-300">
                  <div><strong>Standard:</strong> ERC-8004 v{identity.erc8004Version}</div>
                  <div><strong>Capabilities:</strong> {identity.agent.capabilities.length}</div>
                  <div><strong>Networks:</strong> {identity.agent.networks.join(", ")}</div>
                </div>
              </div>

              <div className="p-6 border border-purple-500/20 bg-purple-500/5 rounded-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                    <Database size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-purple-400">Memory</h3>
                    <div className="text-xs text-purple-500/70 font-bold">✓ COMPLETE</div>
                  </div>
                </div>
                <div className="space-y-2 text-xs text-purple-300">
                  <div><strong>Storage:</strong> {identity.audit.storageProtocol || "N/A"}</div>
                  <div><strong>Audit Trail:</strong> {identity.audit.auditTrail ? "✓ Enabled" : "Disabled"}</div>
                  <div><strong>Permanent:</strong> {identity.audit.permanentStorage ? "✓ Yes" : "No"}</div>
                </div>
              </div>
            </div>

            {/* Capabilities */}
            <div className="bg-navy-900/30 p-6 rounded-xl border border-white/5">
              <h3 className="font-bold text-white mb-4">Agent Capabilities</h3>
              <div className="flex flex-wrap gap-2">
                {identity.agent.capabilities.map((capability, i) => (
                  <div
                    key={i}
                    className="px-3 py-1.5 bg-white/5 border border-white/10 text-gray-300 text-sm rounded-lg font-medium"
                  >
                    {capability.replace(/_/g, " ")}
                  </div>
                ))}
              </div>
            </div>

            {/* Metering Resources */}
            <div className="bg-navy-900/30 p-6 rounded-xl border border-white/5">
              <h3 className="font-bold text-white mb-4">Available Resources</h3>
              <div className="space-y-3">
                {identity.metering.resources.map((resource, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 bg-navy-900/50 rounded-lg border border-white/5 hover:border-white/10 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-white mb-1">{resource.id}</div>
                      <div className="text-xs text-gray-400">{resource.description}</div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="font-bold text-electric-blue text-lg">
                        {resource.price} {resource.asset}
                      </div>
                      <div className="text-xs text-gray-500">{resource.chain}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === "stats" && stats && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Payroll Stats */}
              <div className="p-6 border border-teal-500/20 bg-gradient-to-br from-navy-900 to-teal-900/20 rounded-xl">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 bg-teal-500/20 rounded-lg">
                    <Activity size={20} className="text-teal-400" />
                  </div>
                  <h3 className="font-bold text-white text-lg">Payroll Statistics</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-3 px-4 rounded-lg bg-white/5 border border-white/5">
                    <span className="text-gray-400 font-medium">Total Payrolls</span>
                    <span className="font-bold text-white text-lg">{stats.payrolls.total}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 px-4 rounded-lg bg-white/5 border border-white/5">
                    <span className="text-gray-400 font-medium">Last 24 Hours</span>
                    <span className="font-bold text-white text-lg">{stats.payrolls.last24h}</span>
                  </div>
                  {Object.entries(stats.payrolls.byStatus).map(([status, count]) => (
                    <div key={status} className="flex justify-between items-center py-3 px-4 rounded-lg bg-white/5 border border-white/5">
                      <span className="text-gray-400 font-medium">{status}</span>
                      <span className={`font-bold text-lg ${status === 'PAID' || status === 'ONCHAIN_PAID' ? 'text-green-400' : status === 'RAIL_PROCESSING' ? 'text-yellow-400' : 'text-white'}`}>
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Stats */}
              <div className="p-6 border border-electric-blue/20 bg-gradient-to-br from-navy-900 to-blue-900/20 rounded-xl">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 bg-electric-blue/20 rounded-lg">
                    <DollarSign size={20} className="text-electric-blue" />
                  </div>
                  <h3 className="font-bold text-white text-lg">Financial Statistics</h3>
                </div>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-white/5 border border-white/5">
                    <div className="text-sm text-gray-400 font-medium mb-2">Total Paid Out</div>
                    <div className="text-2xl font-bold text-white">
                      {formatAmount(stats.amounts.totalPaid)}
                    </div>
                    <div className="text-xs text-electric-blue mt-1">{stats.amounts.currency}</div>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5 border border-white/5">
                    <div className="text-sm text-gray-400 font-medium mb-2">Currently Processing</div>
                    <div className="text-2xl font-bold text-yellow-400">
                      {formatAmount(stats.amounts.totalProcessing)}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5 border border-white/5">
                    <div className="text-sm text-gray-400 font-medium mb-2">Total Recipients</div>
                    <div className="text-2xl font-bold text-white">
                      {stats.recipients.total}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* System Stats */}
            <div className="p-6 border border-purple-500/20 bg-gradient-to-br from-navy-900 to-purple-900/20 rounded-xl">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Clock size={20} className="text-purple-400" />
                </div>
                <h3 className="font-bold text-white text-lg">System Information</h3>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-white/5 border border-white/5">
                  <div className="text-sm text-gray-400 font-medium mb-2">Uptime</div>
                  <div className="text-xl font-bold text-white">{formatUptime(stats.uptime)}</div>
                </div>
                <div className="p-4 rounded-lg bg-white/5 border border-white/5">
                  <div className="text-sm text-gray-400 font-medium mb-2">Last Updated</div>
                  <div className="text-sm font-medium text-white">{formatDate(stats.timestamp)}</div>
                </div>
                <div className="p-4 rounded-lg bg-white/5 border border-white/5">
                  <div className="text-sm text-gray-400 font-medium mb-2">Status</div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-green-400">Online</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </SpotlightCard>
    </motion.div>
  );
}

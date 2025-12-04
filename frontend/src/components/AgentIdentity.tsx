import { useState, useEffect } from "react";
import { Sparkles, Copy, Check, ExternalLink, Shield, Database, Activity, Clock, Users, DollarSign, Archive, TrendingUp } from "lucide-react";

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

  const fetchAll = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchIdentity(),
        fetchActivity(),
        fetchStats()
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const fetchIdentity = async () => {
    const response = await fetch("http://localhost:4000/api/agent/identity");
    if (!response.ok) throw new Error("Failed to fetch identity");
    const data = await response.json();
    setIdentity(data);
  };

  const fetchActivity = async () => {
    const response = await fetch("http://localhost:4000/api/agent/activity");
    if (!response.ok) throw new Error("Failed to fetch activity");
    const data = await response.json();
    setActivity(data);
  };

  const fetchStats = async () => {
    const response = await fetch("http://localhost:4000/api/agent/stats");
    if (!response.ok) throw new Error("Failed to fetch stats");
    const data = await response.json();
    setStats(data);
  };

  const copyEndpoint = () => {
    navigator.clipboard.writeText("http://localhost:4000/api/agent/identity");
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
      <div className="card p-8 text-center">
        <div className="w-8 h-8 border-2 border-teal-600/30 border-t-teal-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-teal-700">Loading agent data...</p>
      </div>
    );
  }

  if (error || !identity) {
    return (
      <div className="card p-8 border-red-200 bg-red-50">
        <h3 className="font-bold text-red-900 mb-2">Failed to Load Data</h3>
        <p className="text-red-700 text-sm">{error || "Unknown error"}</p>
         <button
           onClick={fetchAll}
           className="mt-4 px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white font-medium rounded-lg hover:from-red-700 hover:to-red-600 transition-all duration-200 shadow-lg shadow-red-600/30 hover:shadow-xl hover:shadow-red-600/40 hover:scale-105"
         >
           Retry
         </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-teal-100 rounded-lg text-teal-600">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                {identity.agent.name}
              </h2>
              <p className="text-gray-600 text-sm">
                View payroll transactions, agent identity, and statistics
              </p>
            </div>
          </div>
          <div className="px-2 py-1 bg-teal-600 text-white text-xs font-mono rounded">
            ERC-8004
          </div>
        </div>
      </div>

       {/* Tabs - Rediseñados */}
       <div className="flex items-center gap-2 mb-6 bg-gray-100 p-2 rounded-2xl">
         <button
           onClick={() => setActiveTab("activity")}
           className={`flex-1 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2.5 ${
             activeTab === "activity"
               ? "bg-teal-500 text-white shadow-lg shadow-teal-500/30"
               : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/50"
           }`}
         >
           <Archive size={18} />
           Payroll History
         </button>
         <button
           onClick={() => setActiveTab("identity")}
           className={`flex-1 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2.5 ${
             activeTab === "identity"
               ? "bg-teal-500 text-white shadow-lg shadow-teal-500/30"
               : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/50"
           }`}
         >
           <Sparkles size={18} />
           Agent Identity
         </button>
         <button
           onClick={() => setActiveTab("stats")}
           className={`flex-1 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2.5 ${
             activeTab === "stats"
               ? "bg-teal-500 text-white shadow-lg shadow-teal-500/30"
               : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/50"
           }`}
         >
           <TrendingUp size={18} />
           Statistics
         </button>
       </div>

      {/* Stats Summary */}
      {stats && activity && activeTab === "activity" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="card p-4">
            <div className="flex items-center gap-2 text-teal-600 mb-1">
              <Activity size={14} />
              <span className="text-xs font-medium">Payrolls</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{activity.stats.totalPayrolls}</div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <DollarSign size={14} />
              <span className="text-xs font-medium">Total Paid</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatAmount(activity.stats.totalPaid)}</div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Users size={14} />
              <span className="text-xs font-medium">Recipients</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{activity.stats.totalRecipients}</div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 text-purple-600 mb-1">
              <Clock size={14} />
              <span className="text-xs font-medium">Last 24h</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.payrolls.last24h}</div>
          </div>
        </div>
      )}

      {/* Content Container */}
      <div className="card p-6">

        {/* Activity Tab */}
        {activeTab === "activity" && activity && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Executions</h3>
            
            {activity.activity.length === 0 ? (
              <div className="text-center py-12">
                <Archive size={48} className="mx-auto mb-3 text-gray-400" />
                <p className="text-gray-700 font-medium mb-2">No payrolls executed yet</p>
                <p className="text-sm text-gray-500 mb-4">Execute a payroll to see it here</p>
                 <button
                   onClick={() => window.location.hash = "#dashboard"}
                   className="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-teal-500 text-white text-sm font-medium rounded-lg hover:from-teal-700 hover:to-teal-600 transition-all duration-200 shadow-lg shadow-teal-600/30 hover:shadow-xl hover:shadow-teal-600/40 hover:scale-105"
                 >
                   Go to Dashboard
                 </button>
              </div>
            ) : (
              <div className="space-y-4">
                {activity.activity.map((item) => (
                  <div key={item.id} className="card p-4 hover:border-teal-300 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm text-gray-700">{item.id}</span>
                          <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs font-medium">
                            ✓ {item.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-600">
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
                        <div className="text-xl font-bold text-teal-600">
                          {formatAmount(item.totalAmount)}
                        </div>
                        <div className="text-xs text-gray-500">{item.currency}</div>
                      </div>
                    </div>

                    {/* Arweave Receipt */}
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mt-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Database size={16} className="text-purple-600" />
                          <span className="text-sm font-medium text-purple-900">Arweave Receipt</span>
                        </div>
                         <a
                           href={item.arweave.url}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-purple-500 text-white text-xs font-medium rounded-lg hover:from-purple-700 hover:to-purple-600 transition-all duration-200 shadow-md shadow-purple-600/30 hover:shadow-lg hover:shadow-purple-600/40 hover:scale-105"
                         >
                           View
                           <ExternalLink size={12} />
                         </a>
                      </div>
                      <div className="font-mono text-xs text-purple-800 bg-white px-2 py-1 rounded border border-purple-200 break-all">
                        {item.arweave.txId}
                      </div>
                    </div>

                    {/* Payments Preview */}
                    <details className="mt-3 group">
                      <summary className="text-sm text-gray-600 cursor-pointer hover:text-teal-600 transition-colors list-none">
                        <span className="inline-flex items-center gap-1">
                          <span className="group-open:rotate-90 transition-transform">▶</span>
                          View {item.payments.length} payment{item.payments.length !== 1 ? 's' : ''}
                        </span>
                      </summary>
                      <div className="mt-2 space-y-1">
                        {item.payments.map((payment) => (
                          <div key={payment.id} className="flex items-center justify-between text-xs py-1.5 px-2 bg-gray-50 rounded">
                            <span className="font-mono text-gray-600 text-xs">{payment.recipient || 'N/A'}</span>
                            <span className="font-medium text-gray-900">{formatAmount(payment.amount)}</span>
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
            <div className="bg-white p-4 rounded-lg border border-teal-200">
              <div className="text-xs text-teal-600 mb-1">Agent ID</div>
              <div className="font-mono text-sm text-teal-900">{identity.agent.id}</div>
            </div>

            {/* Endpoint */}
            <div className="bg-white p-4 rounded-lg border border-teal-200">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-teal-600 mb-1">Discovery Endpoint</div>
                  <div className="font-mono text-sm text-teal-900 truncate">
                    http://localhost:4000/api/agent/identity
                  </div>
                </div>
                 <button
                   onClick={copyEndpoint}
                   className={`ml-4 p-2.5 rounded-lg transition-all duration-200 ${
                     copied 
                       ? "bg-green-100 text-green-600 scale-110" 
                       : "bg-teal-50 text-teal-600 hover:bg-teal-100 hover:scale-110 hover:shadow-md"
                   }`}
                   title={copied ? "Copied!" : "Copy endpoint"}
                 >
                   {copied ? <Check size={18} className="animate-bounce" /> : <Copy size={18} />}
                 </button>
              </div>
            </div>

            {/* Sovereign Agent Stack Layers */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="card p-6 border-green-200 bg-green-50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-500 rounded-lg text-white">
                    <Shield size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-green-900">Payments</h3>
                    <div className="text-xs text-green-700 font-bold">✓ COMPLETE</div>
                  </div>
                </div>
                <div className="space-y-2 text-xs text-green-800">
                  <div><strong>Protocol:</strong> {identity.metering.protocol}</div>
                  <div><strong>Resources:</strong> {identity.metering.resources.length} meters</div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {identity.agent.protocols.map((protocol, i) => (
                      <span key={i} className="px-2 py-0.5 bg-green-200 text-green-800 font-mono rounded text-xs">
                        {protocol}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="card p-6 border-blue-200 bg-blue-50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-500 rounded-lg text-white">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-blue-900">Identity</h3>
                    <div className="text-xs text-blue-700 font-bold">✓ BASIC</div>
                  </div>
                </div>
                <div className="space-y-2 text-xs text-blue-800">
                  <div><strong>Standard:</strong> ERC-8004 v{identity.erc8004Version}</div>
                  <div><strong>Capabilities:</strong> {identity.agent.capabilities.length}</div>
                  <div><strong>Networks:</strong> {identity.agent.networks.join(", ")}</div>
                </div>
              </div>

              <div className="card p-6 border-purple-200 bg-purple-50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-500 rounded-lg text-white">
                    <Database size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-purple-900">Memory</h3>
                    <div className="text-xs text-purple-700 font-bold">✓ COMPLETE</div>
                  </div>
                </div>
                <div className="space-y-2 text-xs text-purple-800">
                  <div><strong>Storage:</strong> {identity.audit.storageProtocol || "N/A"}</div>
                  <div><strong>Audit Trail:</strong> {identity.audit.auditTrail ? "✓ Enabled" : "Disabled"}</div>
                  <div><strong>Permanent:</strong> {identity.audit.permanentStorage ? "✓ Yes" : "No"}</div>
                </div>
              </div>
            </div>

            {/* Capabilities */}
            <div className="card p-6">
              <h3 className="font-bold text-teal-900 mb-4">Agent Capabilities</h3>
              <div className="flex flex-wrap gap-2">
                {identity.agent.capabilities.map((capability, i) => (
                  <div
                    key={i}
                    className="px-3 py-1.5 bg-teal-50 border border-teal-200 text-teal-700 text-sm rounded-lg font-medium"
                  >
                    {capability.replace(/_/g, " ")}
                  </div>
                ))}
              </div>
            </div>

            {/* Metering Resources */}
            <div className="card p-6">
              <h3 className="font-bold text-teal-900 mb-4">Available Resources</h3>
              <div className="space-y-3">
                {identity.metering.resources.map((resource, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 bg-teal-50 rounded-lg border border-teal-200 hover:border-teal-300 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-teal-900 mb-1">{resource.id}</div>
                      <div className="text-xs text-teal-700">{resource.description}</div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="font-bold text-teal-900 text-lg">
                        {resource.price} {resource.asset}
                      </div>
                      <div className="text-xs text-teal-600">{resource.chain}</div>
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
              <div className="card p-6 border-teal-200">
                <h3 className="font-bold text-teal-900 mb-4">Payroll Statistics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600">Total Payrolls</span>
                    <span className="font-bold text-gray-900">{stats.payrolls.total}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600">Last 24 Hours</span>
                    <span className="font-bold text-gray-900">{stats.payrolls.last24h}</span>
                  </div>
                  {Object.entries(stats.payrolls.byStatus).map(([status, count]) => (
                    <div key={status} className="flex justify-between items-center py-2">
                      <span className="text-gray-600">{status}</span>
                      <span className={`font-bold ${status === 'PAID' ? 'text-green-600' : 'text-gray-600'}`}>
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Stats */}
              <div className="card p-6 border-green-200">
                <h3 className="font-bold text-green-900 mb-4">Financial Statistics</h3>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Total Paid Out</div>
                    <div className="text-3xl font-bold text-green-600">
                      {formatAmount(stats.amounts.totalPaid)}
                    </div>
                    <div className="text-xs text-gray-500">{stats.amounts.currency}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Currently Processing</div>
                    <div className="text-2xl font-bold text-orange-600">
                      {formatAmount(stats.amounts.totalProcessing)}
                    </div>
                  </div>
                  <div className="pt-3 border-t border-gray-200">
                    <div className="text-sm text-gray-600 mb-1">Total Recipients</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {stats.recipients.total}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* System Stats */}
            <div className="card p-6 border-gray-200">
              <h3 className="font-bold text-gray-900 mb-4">System Information</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Uptime</div>
                  <div className="text-xl font-bold text-gray-900">{formatUptime(stats.uptime)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">Last Updated</div>
                  <div className="text-sm font-medium text-gray-900">{formatDate(stats.timestamp)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">Status</div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-green-600">Online</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

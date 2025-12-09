import { Archive, Sparkles, TrendingUp } from "lucide-react";

interface AgentIdentityTabsProps {
  activeTab: "activity" | "identity" | "stats";
  onTabChange: (tab: "activity" | "identity" | "stats") => void;
}

export function AgentIdentityTabs({ activeTab, onTabChange }: AgentIdentityTabsProps) {
  const baseButtonClass = "flex-1 min-w-0 px-12 py-5 rounded-xl text-base font-semibold transition-all duration-300 flex items-center justify-center gap-3";
  
  return (
    <div className="agent-identity-tabs-container flex items-stretch gap-2 mb-6 bg-gradient-to-r from-teal-50 via-teal-50/80 to-teal-50 p-2 rounded-2xl border border-teal-200/50 shadow-sm w-full">
      <button
        onClick={() => onTabChange("activity")}
        type="button"
        className={`agent-identity-tab-button ${baseButtonClass} ${
          activeTab === "activity"
            ? "bg-teal-600 text-white shadow-lg shadow-teal-500/40 hover:bg-teal-700"
            : "bg-white text-teal-700 hover:text-teal-900 hover:bg-teal-50 border border-teal-200"
        }`}
      >
        <Archive size={22} className="flex-shrink-0" />
        <span className="whitespace-nowrap">Payroll History</span>
      </button>
      <button
        onClick={() => onTabChange("identity")}
        type="button"
        className={`agent-identity-tab-button ${baseButtonClass} ${
          activeTab === "identity"
            ? "bg-teal-600 text-white shadow-lg shadow-teal-500/40 hover:bg-teal-700"
            : "bg-white text-teal-700 hover:text-teal-900 hover:bg-teal-50 border border-teal-200"
        }`}
      >
        <Sparkles size={22} className="flex-shrink-0" />
        <span className="whitespace-nowrap">Agent Identity</span>
      </button>
      <button
        onClick={() => onTabChange("stats")}
        type="button"
        className={`agent-identity-tab-button ${baseButtonClass} ${
          activeTab === "stats"
            ? "bg-teal-600 text-white shadow-lg shadow-teal-500/40 hover:bg-teal-700"
            : "bg-white text-teal-700 hover:text-teal-900 hover:bg-teal-50 border border-teal-200"
        }`}
      >
        <TrendingUp size={22} className="flex-shrink-0" />
        <span className="whitespace-nowrap">Statistics</span>
      </button>
    </div>
  );
}
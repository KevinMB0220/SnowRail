import { useState } from "react";
import { executePayroll } from "../lib/api";
import type { MeteringInfo } from "../App";
import "./Dashboard.css";

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
      <section className="hero">
        <h1 className="hero-title">
          Global Payroll on
          <span className="highlight"> Avalanche</span>
        </h1>
        <p className="hero-description">
          Execute international payments to freelancers using stablecoins.
          Powered by x402 protocol for seamless pay-per-use access.
        </p>
      </section>

      {/* Main Action Card */}
      <section className="action-section">
        <div className="card action-card">
          <div className="action-header">
            <div className="action-icon">💼</div>
            <div>
              <h2>Demo Payroll</h2>
              <p>Execute a batch payment to 10 freelancers</p>
            </div>
          </div>

          <div className="action-details">
            <div className="detail-row">
              <span className="detail-label">Recipients</span>
              <span className="detail-value">10 freelancers</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Total Amount</span>
              <span className="detail-value">$6,000.00 USD</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Network</span>
              <span className="detail-value">Avalanche C-Chain</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Protocol</span>
              <span className="detail-value mono">x402 + 8004</span>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button
            className="btn btn-primary btn-large"
            onClick={handleExecutePayroll}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Processing...
              </>
            ) : (
              <>
                <span>⚡</span>
                Execute Payroll
              </>
            )}
          </button>
        </div>
      </section>

      {/* Info Cards */}
      <section className="info-section">
        <div className="info-cards">
          <div className="card info-card">
            <div className="info-icon">🔐</div>
            <h3>x402 Protocol</h3>
            <p>HTTP 402 Payment Required for API monetization</p>
          </div>
          <div className="card info-card">
            <div className="info-icon">📊</div>
            <h3>8004 Metering</h3>
            <p>Resource-based pricing with transparent costs</p>
          </div>
          <div className="card info-card">
            <div className="info-icon">⛓️</div>
            <h3>Smart Contracts</h3>
            <p>SnowRailTreasury on Avalanche C-Chain</p>
          </div>
        </div>
      </section>

      {/* Contract Test Section */}
      <section className="action-section" style={{ marginTop: "2rem" }}>
        <div className="card action-card">
          <div className="action-header">
            <div className="action-icon">🧪</div>
            <div>
              <h2>Contract Test</h2>
              <p>Test Treasury contract operations through the agent with facilitator validation</p>
            </div>
          </div>
          <button
            className="btn btn-secondary btn-large"
            onClick={() => {
              window.location.hash = "#contract-test";
            }}
          >
            <span>🧪</span>
            Run Contract Test
          </button>
        </div>
      </section>
    </div>
  );
}

export default Dashboard;


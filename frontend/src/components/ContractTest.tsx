import { useState } from "react";
import { testContract } from "../lib/api";
import type { MeteringInfo } from "../App";
import "./ContractTest.css";

type TestResult = {
  step: string;
  success: boolean;
  transactionHash?: string;
  blockNumber?: number;
  gasUsed?: string;
  error?: string;
  data?: any;
  balance?: string;
  formatted?: string;
  allowance?: string;
};

type TestSummary = {
  total: number;
  successful: number;
  failed: number;
};

function ContractTest({ onBack }: { onBack?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  const [transactionHashes, setTransactionHashes] = useState<string[]>([]);
  const [summary, setSummary] = useState<TestSummary | null>(null);
  const [paymentRequired, setPaymentRequired] = useState<MeteringInfo | null>(null);
  const [step, setStep] = useState<string>("");

  const executeTest = async () => {
    setLoading(true);
    setError(null);
    setResults([]);
    setTransactionHashes([]);
    setSummary(null);
    setPaymentRequired(null);
    setStep("");

    try {
      // Step 1: Try without payment (expect 402)
      setStep("1. Requesting test (checking payment requirement)...");
      const result = await testContract();

      if (!result.success && result.status === 402) {
        // Payment required - show metering info
        if (result.error.metering) {
          const meteringInfo: MeteringInfo = {
            ...(result.error.metering as MeteringInfo),
            meterId: result.error.meterId || "contract_test",
          };
          setPaymentRequired(meteringInfo);
          setStep("2. Payment required - submitting with demo-token...");
          
          // Step 2: Retry with demo-token
          const paidResult = await testContract("demo-token");
          
          if (!paidResult.success) {
            throw new Error(paidResult.error.message || "Test failed");
          }

          // Step 3: Extract results
          setStep("3. Extracting results...");
          setResults(paidResult.data.results);
          setTransactionHashes(paidResult.data.transactionHashes);
          setSummary(paidResult.data.summary);
          setStep("✅ Test completed!");
        } else {
          throw new Error("Payment required but no metering info provided");
        }
      } else if (result.success) {
        // Already paid or no payment required
        setResults(result.data.results);
        setTransactionHashes(result.data.transactionHashes);
        setSummary(result.data.summary);
        setStep("✅ Test completed!");
      } else {
        throw new Error(result.error.message || "Test failed");
      }
    } catch (err: any) {
      const errorMessage = err.message || "Failed to execute contract test";
      console.error("Contract test error:", err);
      setError(errorMessage);
      setStep("❌ Test failed");
      
      // If it's a network error, suggest checking backend
      if (errorMessage.includes("Failed to fetch") || errorMessage.includes("404")) {
        setError(`${errorMessage}. Make sure the backend server is running on port 4000.`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="contract-test">
      {onBack && (
        <button className="back-button" onClick={onBack}>
          ← Back to Dashboard
        </button>
      )}
      <div className="card">
        <div className="test-header">
          <div className="test-icon">🧪</div>
          <div>
            <h2>Contract Test</h2>
            <p>Test Treasury contract operations through the agent</p>
          </div>
        </div>

        {step && (
          <div className="step-indicator">
            <span>{step}</span>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        {paymentRequired && (
          <div className="payment-info">
            <p>
              <strong>Payment Required:</strong> {paymentRequired.price} {paymentRequired.asset} on {paymentRequired.chain}
            </p>
            <p className="payment-note">Using demo-token for testnet</p>
          </div>
        )}

        <button
          className="btn btn-primary btn-large"
          onClick={executeTest}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner"></span>
              Running Test...
            </>
          ) : (
            <>
              <span>⚡</span>
              Run Contract Test
            </>
          )}
        </button>

        {summary && (
          <div className="test-summary">
            <h3>Test Summary</h3>
            <div className="summary-stats">
              <div className="stat">
                <span className="stat-label">Total Operations</span>
                <span className="stat-value">{summary.total}</span>
              </div>
              <div className="stat stat-success">
                <span className="stat-label">Successful</span>
                <span className="stat-value">{summary.successful}</span>
              </div>
              <div className="stat stat-failed">
                <span className="stat-label">Failed</span>
                <span className="stat-value">{summary.failed}</span>
              </div>
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="test-results">
            <h3>Test Results</h3>
            {results.map((result, index) => (
              <div key={index} className={`result-item ${result.success ? "success" : "failed"}`}>
                <div className="result-header">
                  <span className="result-icon">{result.success ? "✅" : "❌"}</span>
                  <span className="result-step">{result.step}</span>
                </div>
                {result.transactionHash && (
                  <div className="result-detail">
                    <strong>TX Hash:</strong>{" "}
                    <a
                      href={`https://testnet.snowtrace.io/tx/${result.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="tx-link"
                    >
                      {result.transactionHash}
                    </a>
                  </div>
                )}
                {result.blockNumber && (
                  <div className="result-detail">
                    <strong>Block:</strong> {result.blockNumber}
                  </div>
                )}
                {result.formatted && (
                  <div className="result-detail">
                    <strong>Balance:</strong> {result.formatted}
                  </div>
                )}
                {result.allowance && (
                  <div className="result-detail">
                    <strong>Allowance:</strong> {result.allowance}
                  </div>
                )}
                {result.error && (
                  <div className="result-detail error">
                    <strong>Error:</strong> {result.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {transactionHashes.length > 0 && (
          <div className="transaction-hashes">
            <h3>Contract Transaction Hashes</h3>
            <ul>
              {transactionHashes.map((hash, index) => (
                <li key={index}>
                  <a
                    href={`https://testnet.snowtrace.io/tx/${hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tx-link"
                  >
                    {index + 1}. {hash}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default ContractTest;

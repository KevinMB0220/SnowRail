/**
 * Payment Simulator Component
 * Simulates an external merchant paying to this company using the Merchant API
 */

import { useState } from "react";
import { Zap, DollarSign, Info } from "lucide-react";
import { getToken } from "../../hooks/use-session.js";
import { getApiBase } from "../../utils/api-config.js";

const API_BASE = getApiBase();

type PaymentSimulatorProps = {
  companyId: string;
  onPaymentCreated: () => void;
};

export function PaymentSimulator({
  companyId,
  onPaymentCreated,
}: PaymentSimulatorProps) {
  const [amount, setAmount] = useState("10.5");
  const [token, setToken] = useState("xUSDC");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSimulatePayment = async () => {
    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const tokenValue = getToken();
      if (!tokenValue) {
        throw new Error("Not authenticated");
      }

      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error("Invalid amount");
      }

      // Step 1: Create payment intent via Merchant API
      // This is what an external merchant would call
      const intentResponse = await fetch(`${API_BASE}/merchant/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amountNum,
          token: token,
          companyId: companyId,
          reference: `example_payment_${Date.now()}`,
        }),
      });

      if (!intentResponse.ok) {
        // Check if response is JSON before parsing
        const contentType = intentResponse.headers.get("content-type");
        let errorMessage = `Failed to create payment intent (${intentResponse.status})`;
        
        if (contentType && contentType.includes("application/json")) {
          try {
            const errorData = await intentResponse.json();
            errorMessage = errorData.message || errorMessage;
          } catch {
            // If JSON parsing fails, use default message
          }
        } else {
          // If not JSON (e.g., HTML error page), provide helpful message
          const text = await intentResponse.text();
          if (intentResponse.status === 404) {
            errorMessage = "Merchant API endpoint not found. Please ensure the backend server is running and Merchant API is enabled.";
          } else {
            errorMessage = `Server error: ${intentResponse.status} ${intentResponse.statusText}`;
          }
        }
        
        throw new Error(errorMessage);
      }

      const intentData = await intentResponse.json();
      const paymentIntentId = intentData.paymentIntentId;

      // Step 2: Simulate x402 payment confirmation callback
      // In real flow, this would be called by the x402 facilitator after on-chain settlement
      await new Promise((resolve) => setTimeout(resolve, 800));

      const callbackResponse = await fetch(`${API_BASE}/internal/x402/callback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentIntentId: paymentIntentId,
          token: token,
          amount: amountNum,
          txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!callbackResponse.ok) {
        const errorData = await callbackResponse.json();
        throw new Error(errorData.message || "Failed to confirm payment");
      }

      setSuccess(`Payment of ${amountNum} ${token} received successfully!`);
      onPaymentCreated();

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to simulate payment");
    } finally {
      setIsProcessing(false);
    }
  };

  const quickAmounts = [5, 10, 25, 50, 100];

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-teal-100 rounded-lg" style={{ color: "#0d9488" }}>
          <Zap size={20} />
        </div>
        <h3 className="text-lg font-semibold text-teal-900">Simulate External Payment</h3>
      </div>

      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-2">
          <Info size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">Example: External Merchant Payment</p>
            <p className="text-xs">
              This simulates how another company would pay you using the Merchant API. It uses the real flow:{" "}
              <code className="mx-1 px-1.5 py-0.5 bg-blue-100 rounded text-blue-800 font-mono text-xs">
                POST /merchant/payments
              </code>
              → x402 payment → callback confirmation.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Amount Input */}
        <div>
          <label className="block text-sm font-medium text-teal-900 mb-2">
            Amount
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 px-4 py-2 border border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-teal-900"
              placeholder="10.5"
              disabled={isProcessing}
            />
            <select
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="px-4 py-2 border border-teal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-teal-900 bg-white"
              disabled={isProcessing}
            >
              <option value="xUSDC">xUSDC</option>
              <option value="USDC">USDC</option>
              <option value="xUSDT">xUSDT</option>
              <option value="USDT">USDT</option>
            </select>
          </div>

          {/* Quick Amount Buttons */}
          <div className="flex flex-wrap gap-2 mt-2">
            {quickAmounts.map((quickAmount) => (
              <button
                key={quickAmount}
                type="button"
                onClick={() => setAmount(quickAmount.toString())}
                disabled={isProcessing}
                className="px-3 py-1 text-xs bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg border border-teal-200 transition-colors disabled:opacity-50"
              >
                ${quickAmount}
              </button>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg border border-green-200">
            {success}
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSimulatePayment}
          disabled={isProcessing}
          className="btn btn-primary w-full"
        >
          {isProcessing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Processing Payment...
            </>
          ) : (
            <>
              <DollarSign size={18} />
              Simulate External Payment
            </>
          )}
        </button>
      </div>
    </div>
  );
}

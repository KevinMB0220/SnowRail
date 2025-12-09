import { useState, useEffect } from "react";
import { executePayroll, getPaymentProofFromFacilitator, checkFacilitatorHealth } from "../lib/api";
import { getApiBase } from "../utils/api-config.js";
import type { MeteringInfo } from "../App";
import { CreditCard, CheckCircle2, AlertCircle, Loader2, X, ArrowRight, ShieldCheck, Wifi, WifiOff } from "lucide-react";

type PaymentFlowProps = {
  metering: MeteringInfo;
  meterId?: string;
  onSuccess: (payrollId: string) => void;
  onCancel: () => void;
};

type FlowStep = "review" | "getting-proof" | "validating" | "executing" | "success";

function PaymentFlow({ metering, meterId = "payroll_execute", onSuccess, onCancel }: PaymentFlowProps) {
  const [step, setStep] = useState<FlowStep>("review");
  const [error, setError] = useState<string | null>(null);
  const [facilitatorStatus, setFacilitatorStatus] = useState<"checking" | "online" | "offline">("checking");

  // Use full API URL for facilitator (not relative path)
  const FACILITATOR_URL = import.meta.env.VITE_FACILITATOR_URL?.trim() || `${getApiBase()}/facilitator`;

  // Check facilitator status on mount
  useEffect(() => {
    const checkFacilitator = async () => {
      const isHealthy = await checkFacilitatorHealth(FACILITATOR_URL);
      setFacilitatorStatus(isHealthy ? "online" : "offline");
    };
    checkFacilitator();
  }, [FACILITATOR_URL]);

  const handleGetPaymentProof = async () => {
    setStep("getting-proof");
    setError(null);

    try {
      console.log("Getting payment proof from facilitator...");
      // Get payment proof from facilitator
      const proof = await getPaymentProofFromFacilitator(
        FACILITATOR_URL,
        metering,
        meterId
      );
      console.log("Payment proof obtained:", proof ? "✓" : "✗");
      
      setStep("validating");
      
      // Small delay to show validation step
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      // Execute payroll with payment proof
      setStep("executing");
      console.log("Executing payroll with proof...");
      const result = await executePayroll(proof);
      console.log("Payroll execution result:", result);

      if (result.success) {
        console.log("Payroll executed successfully:", result.data);
        setStep("success");
        // Small delay before redirecting
        setTimeout(() => {
          console.log("Navigating to agent identity...");
          onSuccess(result.data.payrollId);
        }, 1000);
      } else {
        console.error("Payroll execution failed:", result);
        // If we get 402 again, it means the payment proof was invalid
        if (result.status === 402) {
          setError(result.error.message || "Payment validation failed. Please try again.");
        } else {
          setError(result.error.message || "Payment validation failed");
        }
        setStep("review");
      }
    } catch (err) {
      console.error("Error in payment flow:", err);
      setError(err instanceof Error ? err.message : "Failed to process payment");
      setStep("review");
    }
  };

  return (
    <div className="max-w-xl mx-auto py-12">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <CreditCard className="text-red-400" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Payment Required</h2>
              <p className="text-slate-400 text-sm">x402 Protocol Protected</p>
            </div>
              </div>
          
          {/* Facilitator Status Badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
            facilitatorStatus === 'online' 
              ? 'bg-green-500/10 border-green-500/20 text-green-400' 
              : facilitatorStatus === 'offline'
              ? 'bg-red-500/10 border-red-500/20 text-red-400'
              : 'bg-slate-700 border-slate-600 text-slate-400'
          }`}>
            {facilitatorStatus === 'checking' ? (
              <Loader2 size={10} className="animate-spin" />
            ) : facilitatorStatus === 'online' ? (
              <Wifi size={10} />
            ) : (
              <WifiOff size={10} />
            )}
            <span className="capitalize">{facilitatorStatus}</span>
          </div>
        </div>

        <div className="p-8">
          {/* Metering Info */}
          <div className="mb-8 bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="bg-slate-200 text-slate-600 text-xs font-mono px-2 py-0.5 rounded">8004</span>
                <span className="text-sm font-medium text-slate-700">{metering.resource}</span>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-sm">Price</span>
                <span className="text-lg font-bold text-slate-900">
                  {metering.price} <span className="text-sm font-normal text-slate-500">{metering.asset}</span>
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-sm">Network</span>
                <span className="text-sm font-medium text-slate-900 bg-slate-200/50 px-2 py-0.5 rounded">
                  {metering.chain}
                </span>
              </div>
              {metering.description && (
                <div className="pt-3 mt-3 border-t border-slate-100">
                  <p className="text-sm text-slate-600 italic">{metering.description}</p>
          </div>
        )}
            </div>
          </div>

        {/* Status Messages */}
          <div className="min-h-[60px] flex items-center justify-center mb-8">
        {step === "getting-proof" && (
              <div className="flex flex-col items-center gap-2 text-slate-600">
                <Loader2 className="animate-spin text-blue-500" size={28} />
                <span className="text-sm font-medium">Getting proof from facilitator...</span>
          </div>
        )}

        {step === "validating" && (
              <div className="flex flex-col items-center gap-2 text-slate-600">
                <ShieldCheck className="animate-pulse text-purple-500" size={28} />
                <span className="text-sm font-medium">Validating payment signature...</span>
          </div>
        )}

        {step === "executing" && (
              <div className="flex flex-col items-center gap-2 text-slate-600">
                <Loader2 className="animate-spin text-green-500" size={28} />
                <span className="text-sm font-medium">Executing payroll...</span>
          </div>
        )}

        {step === "success" && (
              <div className="flex flex-col items-center gap-2 text-green-600">
                <CheckCircle2 size={32} />
                <span className="text-sm font-bold">Success! Redirecting...</span>
          </div>
        )}

            {step === "review" && !error && (
              <div className="text-center text-slate-500 text-sm">
                Ready to process payment via facilitator
              </div>
            )}

            {error && (
              <div className="flex items-center gap-3 px-4 py-3 bg-red-50 text-red-600 rounded-lg border border-red-100 w-full">
                <AlertCircle size={20} className="shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}
          </div>

        {/* Actions */}
          {step === "review" && (
            <div className="grid grid-cols-2 gap-4">
              <button
                className="py-3 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                onClick={onCancel}
                disabled={facilitatorStatus === "checking"}
              >
                <X size={18} />
                Cancel
              </button>
              <button
                className="py-3 px-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-red-500/20"
                onClick={handleGetPaymentProof}
                disabled={facilitatorStatus === "checking"}
              >
                <CreditCard size={18} />
                Pay & Execute
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
          <p className="text-xs text-slate-500">
            <strong>Agent Flow:</strong> Automated validation via x402 facilitator.
          </p>
        </div>
      </div>
    </div>
  );
}

export default PaymentFlow;

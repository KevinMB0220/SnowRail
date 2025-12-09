/**
 * Login page
 * Orchestrates login form and handles authentication flow
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/use-auth.js";
import { LoginForm } from "../components/auth/login-form.js";
import { ParticleBackground } from "../components/ParticleBackground.js";
import { SuccessMessage } from "../components/auth/success-message.js";
import { BackButton } from "../components/ui/back-button.js";
import { motion } from "framer-motion";

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, error } = useAuth();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (data: { email: string; password: string }) => {
    const success = await login(data);
    if (success) {
      setSuccessMessage("Sign in successful! Redirecting...");
      // Wait a moment to show success message before redirect
      // The auth state will be updated automatically via storage event
      setTimeout(() => {
        navigate("/", { replace: true });
      }, 1000);
    }
    return success;
  };

  const handleNavigateToSignup = () => {
    navigate("/signup");
  };

  return (
    <div className="relative min-h-screen bg-navy-900 text-white overflow-hidden selection:bg-snow-red selection:text-white">
      {/* Background Layers */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <ParticleBackground />
        {/* Aurora Gradients */}
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-snow-red/20 rounded-full blur-[120px] animate-blob mix-blend-screen opacity-50" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-electric-blue/15 rounded-full blur-[120px] animate-blob animation-delay-2000 mix-blend-screen opacity-50" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-50 backdrop-blur-md bg-navy-900/50 border-b border-white/5">
          <div className="container mx-auto px-4 h-20 flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
              <img src="/snowrail_logo.png" alt="SnowRail Logo" className="w-10 h-10 object-contain hover:drop-shadow-[0_0_10px_rgba(0,212,255,0.5)] transition-all duration-300" />
              <span className="font-bold text-xl tracking-tight text-white">SnowRail</span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center py-12 px-4">
          <div className="w-full max-w-md mx-auto">
            <div className="mb-6">
              <BackButton />
            </div>
            {successMessage && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
              >
                <SuccessMessage message={successMessage} />
              </motion.div>
            )}
            <LoginForm
              onSubmit={handleSubmit}
              isLoading={isLoading}
              error={error}
              onNavigateToSignup={handleNavigateToSignup}
            />
          </div>
        </main>

        {/* Footer */}
        <footer className="py-8 bg-navy-900/50 backdrop-blur-md border-t border-white/5">
          <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
            <p>Powered by x402 Protocol • Built on Avalanche</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

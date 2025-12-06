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

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, error } = useAuth();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (data: { email: string; password: string }) => {
    const success = await login(data);
    if (success) {
      setSuccessMessage("Sign in successful! Redirecting...");
      // Wait a moment to show success message before redirect
      setTimeout(() => {
        navigate("/dashboard");
      }, 1000);
    }
    return success;
  };

  const handleNavigateToSignup = () => {
    navigate("/signup");
  };

  return (
    <>
      <ParticleBackground />
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-50 backdrop-blur-lg bg-white/80 border-b border-slate-200 shadow-sm">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">❄️</span>
              <span className="font-bold text-xl tracking-tight text-slate-900">SnowRail</span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center py-12 px-4">
          <div style={{ width: "100%", maxWidth: "28rem", margin: "0 auto" }}>
            {successMessage && (
              <div style={{ marginBottom: "1rem" }}>
                <SuccessMessage message={successMessage} />
              </div>
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
        <footer className="py-8 bg-white border-t border-slate-200">
          <div className="container mx-auto px-4 text-center text-slate-500 text-sm">
            <p>Powered by x402 Protocol • Built on Avalanche</p>
          </div>
        </footer>
      </div>
    </>
  );
}

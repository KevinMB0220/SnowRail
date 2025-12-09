/**
 * Signup form component
 * Handles user and company registration
 */

import { useState } from "react";
import { Mail, Lock, Building, Globe, AlertCircle, Eye, EyeOff, CheckCircle2, UserPlus } from "lucide-react";
import type { SignupRequest } from "../../types/auth-types.js";
import { motion } from "framer-motion";
import { SpotlightCard } from "../ui/spotlight-card";

type SignupFormProps = {
  onSubmit: (data: SignupRequest) => Promise<boolean>;
  isLoading?: boolean;
  error?: string | null;
  onNavigateToLogin?: () => void;
};

export function SignupForm({
  onSubmit,
  isLoading = false,
  error: externalError = null,
  onNavigateToLogin,
}: SignupFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [companyLegalName, setCompanyLegalName] = useState("");
  const [country, setCountry] = useState("US");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!email || !password || !confirmPassword || !companyLegalName) {
      setError("Please complete all required fields");
      return;
    }

    if (!acceptTerms) {
      setError("You must accept the Terms & Privacy Policy");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    // Password validation (minimum 8 characters)
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    // Confirm password validation
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsSubmitting(true);
    const success = await onSubmit({
      email,
      password,
      companyLegalName,
      country: country || "US",
    });
    setIsSubmitting(false);

    if (!success) {
      // Error is handled by parent component
      return;
    }
  };

  const displayError = externalError || error;
  const submitting = isLoading || isSubmitting;

  const passwordsMatch = confirmPassword && password === confirmPassword && password.length >= 8;
  const passwordsDontMatch = confirmPassword && password !== confirmPassword;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md mx-auto"
    >
      <SpotlightCard className="p-8 border-white/10 bg-navy-800/50">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 mb-4 rounded-xl bg-gradient-to-tr from-blue-600 to-electric-blue shadow-lg shadow-electric-blue/20">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
            Create account
          </h1>
          <p className="text-gray-400">Get started with SnowRail treasury</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Email field */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Business Email
            </label>
            <div className="relative">
              <div className="absolute top-0 bottom-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                <Mail className="w-5 h-5 text-gray-500" />
              </div>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-navy-900/50 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:border-electric-blue focus:ring-1 focus:ring-electric-blue transition-all"
                placeholder="you@company.com"
                disabled={submitting}
                required
              />
            </div>
          </div>

          {/* Password field */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute top-0 bottom-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                <Lock className="w-5 h-5 text-gray-500" />
              </div>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-11 py-3 bg-navy-900/50 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:border-electric-blue focus:ring-1 focus:ring-electric-blue transition-all"
                placeholder="••••••••"
                disabled={submitting}
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute top-0 bottom-0 right-0 pr-3 flex items-center text-gray-500 hover:text-white transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-electric-blue">At least 8 characters</p>
          </div>

          {/* Confirm Password field */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <div className="absolute top-0 bottom-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                <Lock className="w-5 h-5 text-gray-500" />
              </div>
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`
                  w-full pl-10 pr-11 py-3 bg-navy-900/50 border rounded-xl text-white placeholder-gray-600 focus:ring-1 transition-all
                  ${passwordsMatch ? 'border-green-500/50 focus:border-green-500 focus:ring-green-500' : 
                    passwordsDontMatch ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500' : 
                    'border-white/10 focus:border-electric-blue focus:ring-electric-blue'}
                `}
                placeholder="••••••••"
                disabled={submitting}
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute top-0 bottom-0 right-0 pr-3 flex items-center text-gray-500 hover:text-white transition-colors"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {passwordsDontMatch && (
              <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Passwords do not match
              </p>
            )}
            {passwordsMatch && (
              <p className="mt-1 text-xs text-green-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Passwords match
              </p>
            )}
          </div>

          {/* Company Legal Name field */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Company Legal Name
            </label>
            <div className="relative">
              <div className="absolute top-0 bottom-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                <Building className="w-5 h-5 text-gray-500" />
              </div>
              <input
                id="companyLegalName"
                type="text"
                value={companyLegalName}
                onChange={(e) => setCompanyLegalName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-navy-900/50 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:border-electric-blue focus:ring-1 focus:ring-electric-blue transition-all"
                placeholder="Acme Inc."
                disabled={submitting}
                required
              />
            </div>
          </div>

          {/* Country field */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Country
            </label>
            <div className="relative">
              <div className="absolute top-0 bottom-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                <Globe className="w-5 h-5 text-gray-500" />
              </div>
              <select
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-navy-900/50 border border-white/10 rounded-xl text-white focus:border-electric-blue focus:ring-1 focus:ring-electric-blue transition-all appearance-none cursor-pointer"
                disabled={submitting}
                required
              >
                <option value="US" className="bg-navy-900 text-white">United States</option>
              </select>
            </div>
          </div>

          {/* Terms checkbox */}
          <div className="flex items-start gap-3 mt-2">
            <input
              id="acceptTerms"
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-white/20 bg-navy-900 text-electric-blue focus:ring-electric-blue cursor-pointer accent-electric-blue"
              disabled={submitting}
              required
            />
            <label htmlFor="acceptTerms" className="text-sm text-gray-400 cursor-pointer">
              I accept the{" "}
              <a href="#" className="text-electric-blue hover:text-white underline transition-colors">
                Terms & Privacy Policy
              </a>
            </label>
          </div>

          {/* Error message */}
          {displayError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{displayError}</p>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={submitting || !acceptTerms}
            className={`
              w-full py-3 px-4 rounded-xl font-medium text-white shadow-lg transition-all duration-300 mt-2
              ${submitting || !acceptTerms 
                ? 'bg-gray-600 cursor-not-allowed opacity-70' 
                : 'bg-gradient-to-r from-electric-blue to-purple-600 hover:shadow-electric-blue/25 hover:scale-[1.02]'
              }
              flex items-center justify-center gap-2
            `}
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Creating account...
              </>
            ) : (
              "Create account"
            )}
          </button>
        </form>

        {/* Login link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            Already have an account?{" "}
            <button
              type="button"
              onClick={onNavigateToLogin}
              className="font-medium text-electric-blue hover:text-white transition-colors"
            >
              Log in
            </button>
          </p>
        </div>
      </SpotlightCard>
    </motion.div>
  );
}

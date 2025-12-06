/**
 * Login form component
 * Handles user login with email and password
 */

import { useState } from "react";
import { Mail, Lock, AlertCircle, Eye, EyeOff } from "lucide-react";
import type { LoginRequest } from "../../types/auth-types.js";

type LoginFormProps = {
  onSubmit: (data: LoginRequest) => Promise<boolean>;
  isLoading?: boolean;
  error?: string | null;
  onNavigateToSignup?: () => void;
};

export function LoginForm({
  onSubmit,
  isLoading = false,
  error: externalError = null,
  onNavigateToSignup,
}: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!email || !password) {
      setError("Please complete all required fields");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);
    const success = await onSubmit({ email, password });
    setIsSubmitting(false);

    if (!success) {
      // Error is handled by parent component
      return;
    }
  };

  const displayError = externalError || error;
  const submitting = isLoading || isSubmitting;

  return (
    <div style={{ width: "100%", maxWidth: "28rem", margin: "0 auto" }}>
      <div
        style={{
          background: "#ffffff",
          borderRadius: "0.75rem",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          border: "1px solid #e5e5e5",
          padding: "2rem",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1
            style={{
              fontSize: "1.875rem",
              fontWeight: 600,
              color: "#134e4a",
              marginBottom: "0.5rem",
            }}
          >
            Welcome back
          </h1>
          <p style={{ color: "#0f766e" }}>Sign in to your SnowRail account</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Email field */}
          <div>
            <label
              htmlFor="email"
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "#0f766e",
                marginBottom: "0.5rem",
              }}
            >
              Email
            </label>
            <div style={{ position: "relative" }}>
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: 0,
                  paddingLeft: "0.75rem",
                  display: "flex",
                  alignItems: "center",
                  pointerEvents: "none",
                  zIndex: 1,
                }}
              >
                <Mail style={{ width: "1.25rem", height: "1.25rem", color: "#5eead4" }} />
              </div>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: "100%",
                  paddingLeft: "2.5rem",
                  paddingRight: "1rem",
                  paddingTop: "0.75rem",
                  paddingBottom: "0.75rem",
                  border: "1px solid #99f6e4",
                  backgroundColor: "#ffffff",
                  borderRadius: "0.5rem",
                  color: "#134e4a",
                  fontSize: "0.9375rem",
                  fontFamily: "inherit",
                  transition: "all 0.2s ease",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#14b8a6";
                  e.target.style.boxShadow = "0 0 0 3px rgba(20, 184, 166, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#99f6e4";
                  e.target.style.boxShadow = "none";
                }}
                placeholder="you@company.com"
                disabled={submitting}
                required
              />
            </div>
          </div>

          {/* Password field */}
          <div>
            <label
              htmlFor="password"
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "#0f766e",
                marginBottom: "0.5rem",
              }}
            >
              Password
            </label>
            <div style={{ position: "relative" }}>
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: 0,
                  paddingLeft: "0.75rem",
                  display: "flex",
                  alignItems: "center",
                  pointerEvents: "none",
                  zIndex: 1,
                }}
              >
                <Lock style={{ width: "1.25rem", height: "1.25rem", color: "#5eead4" }} />
              </div>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  paddingLeft: "2.5rem",
                  paddingRight: "2.75rem",
                  paddingTop: "0.75rem",
                  paddingBottom: "0.75rem",
                  border: "1px solid #99f6e4",
                  backgroundColor: "#ffffff",
                  borderRadius: "0.5rem",
                  color: "#134e4a",
                  fontSize: "0.9375rem",
                  fontFamily: "inherit",
                  transition: "all 0.2s ease",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#14b8a6";
                  e.target.style.boxShadow = "0 0 0 3px rgba(20, 184, 166, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#99f6e4";
                  e.target.style.boxShadow = "none";
                }}
                placeholder="••••••••"
                disabled={submitting}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  right: 0,
                  paddingRight: "0.75rem",
                  display: "flex",
                  alignItems: "center",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#5eead4",
                  transition: "color 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#14b8a6";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#5eead4";
                }}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff style={{ width: "1.25rem", height: "1.25rem" }} />
                ) : (
                  <Eye style={{ width: "1.25rem", height: "1.25rem" }} />
                )}
              </button>
            </div>
          </div>

          {/* Error message */}
          {displayError && (
            <div
              style={{
                padding: "0.75rem",
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "0.5rem",
                display: "flex",
                alignItems: "flex-start",
                gap: "0.5rem",
              }}
            >
              <AlertCircle style={{ width: "1.25rem", height: "1.25rem", color: "#dc2626", flexShrink: 0, marginTop: "0.125rem" }} />
              <p style={{ fontSize: "0.875rem", color: "#991b1b" }}>{displayError}</p>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={submitting}
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              backgroundColor: submitting ? "#0d9488" : "#14b8a6",
              color: "#ffffff",
              fontWeight: 500,
              borderRadius: "0.5rem",
              border: "none",
              fontSize: "0.9375rem",
              cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting ? 0.7 : 1,
              transition: "background-color 0.2s ease",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
            }}
            onMouseEnter={(e) => {
              if (!submitting) {
                e.currentTarget.style.backgroundColor = "#0d9488";
              }
            }}
            onMouseLeave={(e) => {
              if (!submitting) {
                e.currentTarget.style.backgroundColor = "#14b8a6";
              }
            }}
          >
            {submitting ? (
              <>
                <div
                  style={{
                    width: "1rem",
                    height: "1rem",
                    border: "2px solid rgba(255, 255, 255, 0.3)",
                    borderTop: "2px solid #ffffff",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                ></div>
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        {/* Sign up link */}
        <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
          <p style={{ fontSize: "0.875rem", color: "#0d9488" }}>
            Don't have an account?{" "}
            <button
              type="button"
              onClick={onNavigateToSignup}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                color: "#0f766e",
                fontWeight: 500,
                textDecoration: "underline",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: "inherit",
              }}
            >
              Sign up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

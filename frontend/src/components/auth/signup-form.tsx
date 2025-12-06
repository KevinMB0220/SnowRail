/**
 * Signup form component
 * Handles user and company registration
 */

import { useState } from "react";
import { Mail, Lock, Building, Globe, AlertCircle, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import type { SignupRequest } from "../../types/auth-types.js";

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

  const inputStyle = {
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
  } as React.CSSProperties;

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.target.style.borderColor = "#14b8a6";
    e.target.style.boxShadow = "0 0 0 3px rgba(20, 184, 166, 0.1)";
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.target.style.borderColor = "#99f6e4";
    e.target.style.boxShadow = "none";
  };

  const passwordsMatch = confirmPassword && password === confirmPassword && password.length >= 8;
  const passwordsDontMatch = confirmPassword && password !== confirmPassword;

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
            Create your account
          </h1>
          <p style={{ color: "#0f766e" }}>Get started with SnowRail treasury</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
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
              Business Email
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
                style={inputStyle}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
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
                  ...inputStyle,
                  paddingRight: "2.75rem",
                }}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                placeholder="••••••••"
                disabled={submitting}
                required
                minLength={8}
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
            <p style={{ marginTop: "0.25rem", fontSize: "0.75rem", color: "#0d9488" }}>At least 8 characters</p>
          </div>

          {/* Confirm Password field */}
          <div>
            <label
              htmlFor="confirmPassword"
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "#0f766e",
                marginBottom: "0.5rem",
              }}
            >
              Confirm Password
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
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setConfirmPassword(newValue);
                  
                  // Update border color based on match in real-time
                  if (newValue && password && newValue === password) {
                    e.target.style.borderColor = "#16a34a";
                    e.target.style.boxShadow = "0 0 0 3px rgba(22, 163, 74, 0.1)";
                  } else if (newValue && password && newValue !== password) {
                    e.target.style.borderColor = "#dc2626";
                    e.target.style.boxShadow = "0 0 0 3px rgba(220, 38, 38, 0.1)";
                  } else {
                    e.target.style.borderColor = "#99f6e4";
                    e.target.style.boxShadow = "none";
                  }
                }}
                style={{
                  ...inputStyle,
                  paddingRight: "2.75rem",
                  borderColor: passwordsMatch ? "#16a34a" : passwordsDontMatch ? "#dc2626" : "#99f6e4",
                }}
                onFocus={(e) => {
                  if (confirmPassword && password && password !== confirmPassword) {
                    e.target.style.borderColor = "#dc2626";
                    e.target.style.boxShadow = "0 0 0 3px rgba(220, 38, 38, 0.1)";
                  } else if (confirmPassword && password && password === confirmPassword) {
                    e.target.style.borderColor = "#16a34a";
                    e.target.style.boxShadow = "0 0 0 3px rgba(22, 163, 74, 0.1)";
                  } else {
                    handleInputFocus(e);
                  }
                }}
                onBlur={(e) => {
                  if (confirmPassword && password && password !== confirmPassword) {
                    e.target.style.borderColor = "#dc2626";
                    e.target.style.boxShadow = "none";
                  } else if (confirmPassword && password && password === confirmPassword) {
                    e.target.style.borderColor = "#16a34a";
                    e.target.style.boxShadow = "none";
                  } else {
                    handleInputBlur(e);
                  }
                }}
                placeholder="••••••••"
                disabled={submitting}
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                {showConfirmPassword ? (
                  <EyeOff style={{ width: "1.25rem", height: "1.25rem" }} />
                ) : (
                  <Eye style={{ width: "1.25rem", height: "1.25rem" }} />
                )}
              </button>
            </div>
            {passwordsDontMatch && (
              <p style={{ marginTop: "0.25rem", fontSize: "0.75rem", color: "#dc2626", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <AlertCircle style={{ width: "0.875rem", height: "0.875rem" }} />
                Passwords do not match
              </p>
            )}
            {passwordsMatch && (
              <p style={{ marginTop: "0.25rem", fontSize: "0.75rem", color: "#16a34a", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <CheckCircle2 style={{ width: "0.875rem", height: "0.875rem" }} />
                Passwords match
              </p>
            )}
          </div>

          {/* Company Legal Name field */}
          <div>
            <label
              htmlFor="companyLegalName"
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "#0f766e",
                marginBottom: "0.5rem",
              }}
            >
              Company Legal Name
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
                <Building style={{ width: "1.25rem", height: "1.25rem", color: "#5eead4" }} />
              </div>
              <input
                id="companyLegalName"
                type="text"
                value={companyLegalName}
                onChange={(e) => setCompanyLegalName(e.target.value)}
                style={inputStyle}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                placeholder="Acme Inc."
                disabled={submitting}
                required
              />
            </div>
          </div>

          {/* Country field */}
          <div>
            <label
              htmlFor="country"
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "#0f766e",
                marginBottom: "0.5rem",
              }}
            >
              Country
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
                <Globe style={{ width: "1.25rem", height: "1.25rem", color: "#5eead4" }} />
              </div>
              <select
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                style={{ ...inputStyle, cursor: "pointer", appearance: "none" as const }}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                disabled={submitting}
                required
              >
                <option value="US">United States</option>
              </select>
            </div>
          </div>

          {/* Terms checkbox */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
            <input
              id="acceptTerms"
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              style={{
                marginTop: "0.25rem",
                width: "1rem",
                height: "1rem",
                borderColor: "#5eead4",
                accentColor: "#14b8a6",
                cursor: "pointer",
              }}
              disabled={submitting}
              required
            />
            <label
              htmlFor="acceptTerms"
              style={{
                fontSize: "0.875rem",
                color: "#0f766e",
                cursor: "pointer",
              }}
            >
              I accept the{" "}
              <a
                href="#"
                style={{
                  color: "#0d9488",
                  textDecoration: "underline",
                }}
              >
                Terms & Privacy Policy
              </a>
            </label>
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
            disabled={submitting || !acceptTerms}
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              backgroundColor: submitting || !acceptTerms ? "#0d9488" : "#14b8a6",
              color: "#ffffff",
              fontWeight: 500,
              borderRadius: "0.5rem",
              border: "none",
              fontSize: "0.9375rem",
              cursor: submitting || !acceptTerms ? "not-allowed" : "pointer",
              opacity: submitting || !acceptTerms ? 0.7 : 1,
              transition: "background-color 0.2s ease",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
            }}
            onMouseEnter={(e) => {
              if (!submitting && acceptTerms) {
                e.currentTarget.style.backgroundColor = "#0d9488";
              }
            }}
            onMouseLeave={(e) => {
              if (!submitting && acceptTerms) {
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
                Creating account...
              </>
            ) : (
              "Create account"
            )}
          </button>
        </form>

        {/* Login link */}
        <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
          <p style={{ fontSize: "0.875rem", color: "#0d9488" }}>
            Already have an account?{" "}
            <button
              type="button"
              onClick={onNavigateToLogin}
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
              Log in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

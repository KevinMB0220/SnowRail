/**
 * Authentication hook
 * Main hook for managing authentication state and operations
 */

import { useState, useEffect, useCallback } from "react";
import { signup, login, getCurrentUser } from "../lib/api.js";
import { getToken, setToken, clearToken, isTokenValid } from "./use-session.js";
import { translateErrorMessage } from "../utils/error-messages.js";
import type { AuthUser, Company, SignupRequest, LoginRequest } from "../types/auth-types.js";

interface UseAuthReturn {
  user: AuthUser | null;
  company: Company | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (data: LoginRequest) => Promise<boolean>;
  signup: (data: SignupRequest) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

/**
 * Main authentication hook
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check authentication status
  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const token = getToken();
    if (!token || !isTokenValid()) {
      setIsLoading(false);
      setUser(null);
      setCompany(null);
      return;
    }

    try {
      const result = await getCurrentUser();
      if (result.success) {
        setUser(result.data.user);
        setCompany(result.data.company);
        setToken(result.data.token); // Refresh token if needed
      } else {
        // Token is invalid, clear it
        clearToken();
        setUser(null);
        setCompany(null);
      }
    } catch (err) {
      console.error("Auth check failed:", err);
      clearToken();
      setUser(null);
      setCompany(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Login function
  const handleLogin = useCallback(async (data: LoginRequest): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await login(data);
      if (result.success) {
        setToken(result.data.token);
        setUser(result.data.user);
        setCompany(result.data.company);
        setIsLoading(false);
        return true;
      } else {
        const errorMsg = translateErrorMessage(
          result.error.error,
          result.error.message || "Failed to sign in"
        );
        setError(errorMsg);
        setIsLoading(false);
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? translateErrorMessage("NETWORK_ERROR", err.message)
        : "Failed to sign in. Please check your connection.";
      setError(errorMessage);
      setIsLoading(false);
      return false;
    }
  }, []);

  // Signup function
  const handleSignup = useCallback(async (data: SignupRequest): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signup(data);
      if (result.success) {
        setToken(result.data.token);
        setUser(result.data.user);
        setCompany(result.data.company);
        setIsLoading(false);
        return true;
      } else {
        const errorMsg = translateErrorMessage(
          result.error.error,
          result.error.message || "Failed to create account"
        );
        setError(errorMsg);
        setIsLoading(false);
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? translateErrorMessage("NETWORK_ERROR", err.message)
        : "Failed to create account. Please check your connection.";
      setError(errorMessage);
      setIsLoading(false);
      return false;
    }
  }, []);

  // Logout function
  const handleLogout = useCallback(() => {
    clearToken();
    setUser(null);
    setCompany(null);
    setError(null);
  }, []);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    user,
    company,
    isAuthenticated: !!user && !!company,
    isLoading,
    error,
    login: handleLogin,
    signup: handleSignup,
    logout: handleLogout,
    checkAuth,
  };
}

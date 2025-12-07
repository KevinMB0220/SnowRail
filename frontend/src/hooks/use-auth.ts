/**
 * Authentication context + hook
 * Provides a shared auth state across the entire app
 */

import {
  createContext,
  useState,
  useEffect,
  useCallback,
  useContext,
  createElement,
  useRef,
  type ReactNode,
} from "react";
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

const AuthContext = createContext<UseAuthReturn | undefined>(undefined);

function useProvideAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isCheckingRef = useRef(false);

  // Check authentication status
  const checkAuth = useCallback(async (skipLoading: boolean = false) => {
    // Prevent concurrent checks
    if (isCheckingRef.current) {
      return;
    }
    isCheckingRef.current = true;

    // Don't set loading state if we're just syncing and already have auth state
    if (!skipLoading) {
      setIsLoading(true);
    }
    setError(null);

    const token = getToken();
    if (!token || !isTokenValid()) {
      if (!skipLoading) {
        setIsLoading(false);
      }
      setUser(null);
      setCompany(null);
      isCheckingRef.current = false;
      return;
    }

    try {
      const result = await getCurrentUser();
      if (result.success) {
        setUser(result.data.user);
        setCompany(result.data.company);
        // Only update token if it changed, and notify to sync other instances
        const currentToken = getToken();
        if (currentToken !== result.data.token) {
          setToken(result.data.token, true); // Notify other components
        }
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
      if (!skipLoading) {
        setIsLoading(false);
      }
      isCheckingRef.current = false;
    }
  }, []);

  // Login function
  const handleLogin = useCallback(async (data: LoginRequest): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await login(data);
      if (result.success) {
        // Set token and notify other components (like AppRoutes) to sync state
        setToken(result.data.token, true);
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
        // Set token and notify other components (like AppRoutes) to sync state
        setToken(result.data.token, true);
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

  // Check auth on mount and listen for storage changes
  useEffect(() => {
    checkAuth();

    // Listen for storage changes (e.g., when token is set in another tab/component)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "snowrail_token") {
        checkAuth();
      }
    };

    // Listen for custom storage event (for same-tab updates)
    // Skip loading state to avoid UI flickering when syncing after login
    const handleCustomStorageChange = () => {
      // Only check auth if we don't already have authenticated state
      // Check token directly from localStorage instead of React state
      const token = getToken();
      if (token && isTokenValid() && (!user || !company)) {
        // Only sync if we have a valid token but no user/company state
        checkAuth(true); // Skip loading state to avoid UI flicker
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("auth-storage-change", handleCustomStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("auth-storage-change", handleCustomStorageChange);
    };
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

/**
 * AuthProvider wraps the app and exposes auth state to all children
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useProvideAuth();
  return createElement(AuthContext.Provider, { value }, children);
}

/**
 * Main authentication hook (consumes context)
 */
export function useAuth(): UseAuthReturn {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

/**
 * Session management hook
 * Handles token storage and validation in localStorage
 */

const TOKEN_KEY = "snowrail_token";

/**
 * Get token from localStorage
 */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Save token to localStorage
 */
export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Remove token from localStorage
 */
export function clearToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Check if token exists and is not expired (basic check)
 * Note: Full validation is done server-side via GET /auth/me
 */
export function isTokenValid(): boolean {
  const token = getToken();
  if (!token) return false;

  try {
    // Basic JWT structure check (header.payload.signature)
    const parts = token.split(".");
    if (parts.length !== 3) return false;

    // Try to decode payload to check expiration
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return false; // Token expired
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Hook for session management
 */
export function useSession() {
  return {
    getToken,
    setToken,
    clearToken,
    isTokenValid,
  };
}

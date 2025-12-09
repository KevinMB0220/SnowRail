/**
 * Centralized API base URL configuration
 * Use this in all components to ensure consistent API endpoint resolution
 */

/**
 * Determine API base URL based on environment
 * 
 * Priority:
 * 1. VITE_API_BASE_URL environment variable (if set, always use it)
 * 2. If on localhost → use http://localhost:4000 (local backend)
 * 3. If in production → use Render backend (https://snowrail.onrender.com)
 */
export function getApiBase(): string {
  // Priority 1: Check if explicit API URL is provided via environment variable
  const envApiUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (envApiUrl && envApiUrl !== '') {
    return envApiUrl;
  }

  // Priority 2: Detect if we're running on localhost (browser only)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || 
                        hostname === '127.0.0.1' ||
                        hostname.startsWith('192.168.') ||
                        hostname.startsWith('10.') ||
                        hostname.startsWith('172.');
    
    // If on localhost → use local backend
    if (isLocalhost) {
      return "http://localhost:4000";
    }
    
    // If NOT localhost (production) → use Render backend
    return "https://snowrail.onrender.com";
  }

  // Priority 3: Fallback for SSR or build time
  // During build, if PROD mode, use Render backend
  if (import.meta.env.PROD) {
    return "https://snowrail.onrender.com";
  }

  // Default: development mode → use localhost
  return "http://localhost:4000";
}

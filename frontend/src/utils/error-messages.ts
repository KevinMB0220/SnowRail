/**
 * Error message translations
 * Translates backend error codes to user-friendly English messages
 */

export function translateErrorMessage(error: string | undefined, defaultMessage: string): string {
  if (!error) return defaultMessage;

  const errorMessages: Record<string, string> = {
    // Signup errors
    EMAIL_EXISTS: "This email is already registered. Please use another email or sign in",
    INVALID_REQUEST: "Please verify that all fields are complete and valid",
    INVALID_EMAIL_FORMAT: "Invalid email format. Please check your email",
    PASSWORD_TOO_SHORT: "Password must be at least 8 characters",
    PASSWORDS_DONT_MATCH: "Passwords do not match. Please verify that both passwords are the same",
    SIGNUP_FAILED: "Failed to create account. Please try again",
    
    // Login errors
    INVALID_CREDENTIALS: "Invalid email or password. Please check your credentials",
    LOGIN_FAILED: "Failed to sign in. Please try again",
    UNAUTHORIZED: "Your session has expired. Please sign in again",
    
    // General errors
    INTERNAL_ERROR: "An unexpected error occurred. Please try again later",
    NOT_FOUND: "The requested resource was not found",
    NETWORK_ERROR: "Connection error. Please check your internet connection",
  };

  return errorMessages[error] || defaultMessage;
}

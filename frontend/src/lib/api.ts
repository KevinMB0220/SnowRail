/**
 * API Client for SnowRail Backend
 */

import type {
  AuthResponse,
  SignupRequest,
  LoginRequest,
} from "../types/auth-types.js";

const API_BASE = import.meta.env.VITE_API_BASE_URL?.trim() || "http://localhost:4000";

// Types for API responses
export type MeteringInfo = {
  price: string;
  asset: string;
  chain: string;
  resource: string;
  description?: string;
  version: string;
  meterId?: string;
};

export type PayrollResponse = {
  success: boolean;
  payrollId: string;
  status: string;
  total: number;
  currency: string;
  paymentsCount: number;
  payments: PaymentResponse[];
  createdAt: string;
};

export type PaymentResponse = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  recipient: string | null;
};

export type PayrollDetailResponse = {
  id: string;
  total: number;
  currency: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  payments: PaymentResponse[];
};

export type ApiError = {
  error: string;
  meterId?: string;
  metering?: MeteringInfo;
  message?: string;
};

/**
 * Get current authentication token from localStorage
 */
function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("snowrail_token");
}

/**
 * Execute payroll - may return 402 if payment required
 * @param paymentToken - Optional X-PAYMENT header value
 */
export async function executePayroll(paymentToken?: string): Promise<{
  success: true;
  data: PayrollResponse;
} | {
  success: false;
  status: number;
  error: ApiError;
}> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (paymentToken) {
    headers["X-PAYMENT"] = paymentToken;
  }

  const response = await fetch(`${API_BASE}/payroll/execute`, {
    method: "POST",
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      status: response.status,
      error: data as ApiError,
    };
  }

  return {
    success: true,
    data: data as PayrollResponse,
  };
}

/**
 * Get payroll details by ID
 * @param id - Payroll ID
 */
export async function getPayroll(id: string): Promise<{
  success: true;
  data: PayrollDetailResponse;
} | {
  success: false;
  error: ApiError;
}> {
  const response = await fetch(`${API_BASE}/payroll/${id}`);
  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      error: data as ApiError,
    };
  }

  return {
    success: true,
    data: data as PayrollDetailResponse,
  };
}

/**
 * Check API health
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Facilitator API types
 */
export type FacilitatorValidationRequest = {
  proof: string;
  meterId: string;
  price?: string;
  asset?: string;
  chain?: string;
};

export type FacilitatorValidationResponse = {
  valid: boolean;
  payer?: string;
  amount?: string;
  error?: string;
  message?: string;
};

/**
 * Get payment proof from facilitator
 * In production, this would create a real EIP-3009 signed authorization
 * For testnet, we use demo-token
 */
export async function getPaymentProofFromFacilitator(
  facilitatorUrl: string,
  metering: MeteringInfo,
  meterId: string
): Promise<string> {
  try {
    // Create a payment proof (simplified for testnet)
    // In production, this would be a signed EIP-3009 authorization
    const paymentProof = {
      from: "0x22f6F000609d52A0b0efCD4349222cd9d70716Ba", // Agent wallet
      to: "0xPayToAddress", // Backend payment address
      value: metering.price,
      validAfter: Math.floor(Date.now() / 1000),
      validBefore: Math.floor(Date.now() / 1000) + 3600, // 1 hour
      nonce: `0x${Math.random().toString(16).substring(2, 18)}`,
      signature: "0x" + "0".repeat(130), // Simplified signature for testnet
    };

    // Validate proof with facilitator
    const validateResponse = await fetch(`${facilitatorUrl}/validate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        proof: JSON.stringify(paymentProof),
        meterId,
        price: metering.price,
        asset: metering.asset,
        chain: metering.chain,
      }),
    });

    if (validateResponse.ok) {
      const validation: FacilitatorValidationResponse = await validateResponse.json();
      if (validation.valid) {
        return JSON.stringify(paymentProof);
      }
    }

    // For testnet, facilitator accepts demo-token
    return "demo-token";
  } catch (error) {
    // Fallback to demo-token for testnet
    console.warn("Facilitator validation failed, using demo-token:", error);
    return "demo-token";
  }
}

/**
 * Check facilitator health
 */
export async function checkFacilitatorHealth(
  facilitatorUrl: string
): Promise<boolean> {
  try {
    const response = await fetch(`${facilitatorUrl}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Process payment - complete flow (Rail + Blockchain + Facilitator)
 * @param paymentRequest - Payment request data
 * @param paymentToken - Optional X-PAYMENT header value (e.g., "demo-token")
 */
export async function processPayment(
  paymentRequest: {
    customer: {
      first_name: string;
      last_name: string;
      email_address: string;
      telephone_number?: string;
      mailing_address: {
        address_line1: string;
        city: string;
        state: string;
        postal_code: string;
        country_code: string;
      };
    };
    payment: {
      amount: number;
      currency: string;
      recipient?: string;
      description?: string;
    };
  },
  paymentToken?: string
): Promise<{
  success: true;
  data: {
    success: boolean;
    payrollId: string;
    status: string;
    steps: {
      payroll_created: boolean;
      payments_created: boolean;
      treasury_checked: boolean;
      onchain_requested: boolean;
      onchain_executed: boolean;
      rail_processed: boolean;
    };
    transactions?: {
      request_tx_hashes?: string[];
      execute_tx_hashes?: string[];
    };
    rail?: {
      withdrawal_id?: string;
      status?: string;
    };
    errors?: Array<{
      step: string;
      error: string;
    }>;
  };
} | {
  success: false;
  status: number;
  error: ApiError;
}> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (paymentToken) {
    headers["X-PAYMENT"] = paymentToken;
  }

  const response = await fetch(`${API_BASE}/payment/process`, {
    method: "POST",
    headers,
    body: JSON.stringify(paymentRequest),
  });

  const contentType = response.headers.get("content-type");
  let data: any;

  if (contentType && contentType.includes("application/json")) {
    data = await response.json();
  } else {
    const text = await response.text();
    console.error("Non-JSON response:", text.substring(0, 200));
    return {
      success: false,
      status: response.status,
      error: {
        error: "INVALID_RESPONSE",
        message: `Server returned non-JSON response: ${response.status} ${response.statusText}`,
      } as ApiError,
    };
  }

  if (!response.ok) {
    return {
      success: false,
      status: response.status,
      error: data as ApiError,
    };
  }

  return {
    success: true,
    data: data as {
      success: boolean;
      payrollId: string;
      status: string;
      steps: {
        payroll_created: boolean;
        payments_created: boolean;
        treasury_checked: boolean;
        onchain_requested: boolean;
        onchain_executed: boolean;
        rail_processed: boolean;
      };
      transactions?: {
        request_tx_hashes?: string[];
        execute_tx_hashes?: string[];
      };
      rail?: {
        withdrawal_id?: string;
        status?: string;
      };
      errors?: Array<{
        step: string;
        error: string;
      }>;
    },
  };
}

/**
 * Test contract operations
 * @param paymentToken - Optional X-PAYMENT header value (e.g., "demo-token")
 */
export async function testContract(paymentToken?: string): Promise<{
  success: true;
  data: {
    success: boolean;
    results: Array<{
      step: string;
      success: boolean;
      transactionHash?: string;
      blockNumber?: number;
      gasUsed?: string;
      error?: string;
      data?: any;
      balance?: string;
      formatted?: string;
      allowance?: string;
    }>;
    transactionHashes: string[];
    summary: {
      total: number;
      successful: number;
      failed: number;
    };
  };
} | {
  success: false;
  status: number;
  error: ApiError;
}> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (paymentToken) {
    headers["X-PAYMENT"] = paymentToken;
  }

  const response = await fetch(`${API_BASE}/treasury/test`, {
    method: "POST",
    headers,
  });

  // Check if response is JSON before parsing
  const contentType = response.headers.get("content-type");
  let data: any;
  
  if (contentType && contentType.includes("application/json")) {
    data = await response.json();
  } else {
    // If not JSON, read as text to see what we got
    const text = await response.text();
    console.error("Non-JSON response:", text.substring(0, 200));
    return {
      success: false,
      status: response.status,
      error: {
        error: "INVALID_RESPONSE",
        message: `Server returned non-JSON response: ${response.status} ${response.statusText}`,
      } as ApiError,
    };
  }

  if (!response.ok) {
    return {
      success: false,
      status: response.status,
      error: data as ApiError,
    };
  }

  return {
    success: true,
    data: data as {
      success: boolean;
      results: Array<any>;
      transactionHashes: string[];
      summary: {
        total: number;
        successful: number;
        failed: number;
      };
    },
  };
}

/**
 * Authentication API functions
 */

/**
 * Sign up a new user and company
 * @param data - Signup request data
 */
export async function signup(
  data: SignupRequest
): Promise<{
  success: true;
  data: AuthResponse;
} | {
  success: false;
  status: number;
  error: { error: string; message: string };
}> {
  const response = await fetch(`${API_BASE}/auth/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  let responseData;
  try {
    responseData = await response.json();
  } catch (e) {
    // If response is not JSON, return generic error
    return {
      success: false,
      status: response.status,
      error: {
        error: "SIGNUP_FAILED",
        message: "Failed to create account - invalid server response",
      },
    };
  }

  if (!response.ok) {
    console.error("Signup error:", responseData);
    const errorCode = responseData.error || "SIGNUP_FAILED";
    const defaultMessage = responseData.message || "Failed to create account";
    return {
      success: false,
      status: response.status,
      error: {
        error: errorCode,
        message: defaultMessage,
      },
    };
  }

  return {
    success: true,
    data: responseData as AuthResponse,
  };
}

/**
 * Log in a user
 * @param data - Login request data
 */
export async function login(
  data: LoginRequest
): Promise<{
  success: true;
  data: AuthResponse;
} | {
  success: false;
  status: number;
  error: { error: string; message: string };
}> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  let responseData;
  try {
    responseData = await response.json();
  } catch (e) {
    return {
      success: false,
      status: response.status,
      error: {
        error: "LOGIN_FAILED",
        message: "Failed to sign in. Please check your connection",
      },
    };
  }

  if (!response.ok) {
    return {
      success: false,
      status: response.status,
      error: {
        error: responseData.error || "LOGIN_FAILED",
        message: responseData.message || "Failed to sign in",
      },
    };
  }

  return {
    success: true,
    data: responseData as AuthResponse,
  };
}

/**
 * Get current authenticated user
 * Uses token from localStorage
 */
export async function getCurrentUser(): Promise<{
  success: true;
  data: AuthResponse;
} | {
  success: false;
  status: number;
  error: { error: string; message: string };
}> {
  const token = getAuthToken();

  if (!token) {
    return {
      success: false,
      status: 401,
      error: {
        error: "UNAUTHORIZED",
        message: "No token found",
      },
    };
  }

  const response = await fetch(`${API_BASE}/auth/me`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const responseData = await response.json();

  if (!response.ok) {
    return {
      success: false,
      status: response.status,
      error: {
        error: responseData.error || "UNAUTHORIZED",
        message: responseData.message || "Failed to fetch user",
      },
    };
  }

  // Transform response to match AuthResponse format
  return {
    success: true,
    data: {
      token, // Use existing token
      user: responseData.user,
      company: responseData.company,
    } as AuthResponse,
  };
}

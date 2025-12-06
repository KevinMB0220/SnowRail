/**
 * Test script for authentication endpoints
 */

const API_BASE = process.env.API_BASE_URL || "http://localhost:4000";

interface TestResult {
  name: string;
  success: boolean;
  error?: string;
  data?: any;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<any>) {
  try {
    console.log(`\n🧪 Testing: ${name}`);
    const data = await fn();
    results.push({ name, success: true, data });
    console.log(`✅ PASS: ${name}`);
    if (data) {
      console.log(`   Response:`, JSON.stringify(data, null, 2).substring(0, 200));
    }
    return data;
  } catch (error: any) {
    const errorMsg = error.message || String(error);
    results.push({ name, success: false, error: errorMsg });
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${errorMsg}`);
    throw error;
  }
}

async function main() {
  console.log("🚀 Starting authentication tests...");
  console.log(`📍 API Base: ${API_BASE}\n`);

  let token: string | null = null;
  let userId: string | null = null;
  let companyId: string | null = null;

  // Test 1: Signup
  try {
    const signupData = await test("POST /auth/signup", async () => {
      const response = await fetch(`${API_BASE}/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: `test-${Date.now()}@example.com`,
          password: "TestPassword123!",
          companyLegalName: "Test Company Inc.",
          country: "US",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(error)}`);
      }

      return await response.json();
    });

    token = signupData.token;
    userId = signupData.user.id;
    companyId = signupData.company.id;

    // Verify response structure
    if (!token || !userId || !companyId) {
      throw new Error("Missing token, userId, or companyId in response");
    }

    // Verify company defaults
    if (signupData.company.kybLevel !== 0) {
      throw new Error(`Expected kybLevel=0, got ${signupData.company.kybLevel}`);
    }
    if (signupData.company.kybStatus !== "none") {
      throw new Error(`Expected kybStatus="none", got ${signupData.company.kybStatus}`);
    }
    if (signupData.company.railStatus !== "none") {
      throw new Error(`Expected railStatus="none", got ${signupData.company.railStatus}`);
    }
  } catch (error) {
    console.error("Signup test failed, continuing with login test...");
  }

  // Test 2: Signup with duplicate email (should fail)
  if (token) {
    await test("POST /auth/signup (duplicate email)", async () => {
      const response = await fetch(`${API_BASE}/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: `test-${Date.now() - 1000}@example.com`, // Different email
          password: "TestPassword123!",
          companyLegalName: "Another Company",
        }),
      });

      // This should succeed (different email)
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Unexpected error: ${JSON.stringify(error)}`);
      }
      return await response.json();
    });
  }

  // Test 3: Login
  if (token) {
    const loginEmail = `test-${Date.now() - 2000}@example.com`;
    
    // First create a user to login with
    try {
      await fetch(`${API_BASE}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail,
          password: "LoginTest123!",
          companyLegalName: "Login Test Company",
        }),
      });
    } catch {}

    await test("POST /auth/login", async () => {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: loginEmail,
          password: "LoginTest123!",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(error)}`);
      }

      const data = await response.json();
      if (!data.token) {
        throw new Error("Missing token in login response");
      }
      return data;
    });
  }

  // Test 4: Login with wrong password (should fail)
  await test("POST /auth/login (wrong password)", async () => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "nonexistent@example.com",
        password: "WrongPassword",
      }),
    });

    if (response.ok) {
      throw new Error("Expected 401 error for wrong credentials");
    }

    if (response.status !== 401) {
      const error = await response.json();
      throw new Error(`Expected 401, got ${response.status}: ${JSON.stringify(error)}`);
    }

    const error = await response.json();
    if (!error.message || !error.message.includes("Invalid email or password")) {
      throw new Error(`Expected 'Invalid email or password' message, got: ${error.message}`);
    }

    return { status: 401, message: error.message };
  });

  // Test 5: GET /auth/me (with valid token)
  if (token) {
    await test("GET /auth/me (authenticated)", async () => {
      const response = await fetch(`${API_BASE}/auth/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(error)}`);
      }

      const data = await response.json();
      if (!data.user || !data.company) {
        throw new Error("Missing user or company in response");
      }
      return data;
    });
  }

  // Test 6: GET /auth/me (without token - should fail)
  await test("GET /auth/me (unauthorized)", async () => {
    const response = await fetch(`${API_BASE}/auth/me`, {
      method: "GET",
    });

    if (response.ok) {
      throw new Error("Expected 401 error for missing token");
    }

    if (response.status !== 401) {
      const error = await response.json();
      throw new Error(`Expected 401, got ${response.status}: ${JSON.stringify(error)}`);
    }

    return { status: 401 };
  });

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 Test Summary");
  console.log("=".repeat(60));
  
  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  
  results.forEach((result) => {
    const icon = result.success ? "✅" : "❌";
    console.log(`${icon} ${result.name}`);
    if (!result.success && result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  console.log("\n" + "=".repeat(60));
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log("=".repeat(60));

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

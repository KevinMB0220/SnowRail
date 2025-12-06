#!/usr/bin/env ts-node

/**
 * Test script to verify Rail API connection
 * Usage: npx ts-node test-rail-connection.ts
 */

import dotenv from "dotenv";
import { config } from "../../src/config/env.js";
import { getRailAccessToken } from "../../src/services/railClient.js";

// Load environment variables
dotenv.config();

async function testRailConnection() {
  console.log("🔍 Testing Rail API Connection...\n");

  // Check configuration
  console.log("📋 Configuration Check:");
  console.log("  Base URL:", config.railApiBaseUrl || "❌ Not set");
  console.log("  Auth URL:", config.railAuthUrl || "❌ Not set");
  console.log("  Client ID:", config.railClientId ? `${config.railClientId.substring(0, 10)}...` : "❌ Not set");
  console.log("  Client Secret:", config.railClientSecret ? "✅ Set" : "❌ Not set");
  console.log("");

  // Check if credentials are present
  const hasCredentials =
    config.railClientId &&
    config.railClientId.trim() !== "" &&
    config.railClientSecret &&
    config.railClientSecret.trim() !== "" &&
    config.railAuthUrl &&
    config.railAuthUrl.trim() !== "";

  if (!hasCredentials) {
    console.error("❌ Rail credentials not configured!");
    console.error("   Please set the following in your .env file:");
    console.error("   - RAIL_CLIENT_ID");
    console.error("   - RAIL_CLIENT_SECRET");
    console.error("   - RAIL_AUTH_URL");
    console.error("   - RAIL_API_BASE_URL");
    process.exit(1);
  }

  // Test OAuth2 token retrieval
  console.log("🔐 Testing OAuth2 Authentication...");
  try {
    const token = await getRailAccessToken();
    console.log("✅ Successfully obtained access token!");
    console.log("   Token:", token.substring(0, 20) + "...");
    console.log("");
  } catch (error) {
    console.error("❌ Failed to get access token:");
    if (error instanceof Error) {
      console.error("   Error:", error.message);
    } else {
      console.error("   Error:", error);
    }
    process.exit(1);
  }

  // Test API endpoint (get applications or accounts)
  console.log("🌐 Testing API Endpoint...");
  try {
    const baseUrl = config.railApiBaseUrl || process.env.RAIL_API_BASE_URL;
    const token = await getRailAccessToken();

    // Try to get applications (simple read-only endpoint)
    const testUrl = `${baseUrl}/v1/applications?page=0&page_size=1`;
    console.log("   Testing:", testUrl);

    const response = await fetch(testUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-L2f-Request-Id": `test-${Date.now()}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API request failed: ${response.status} ${response.statusText}`);
      console.error("   Response:", errorText.substring(0, 200));
      process.exit(1);
    }

    const data = await response.json();
    console.log("✅ API endpoint is accessible!");
    console.log("   Response status:", response.status);
    console.log("   Response keys:", Object.keys(data).join(", "));
    console.log("");
  } catch (error) {
    console.error("❌ Failed to test API endpoint:");
    if (error instanceof Error) {
      console.error("   Error:", error.message);
    } else {
      console.error("   Error:", error);
    }
    process.exit(1);
  }

  console.log("✅ All tests passed! Rail API connection is working.");
}

// Run the test
testRailConnection().catch((error) => {
  console.error("❌ Unexpected error:", error);
  process.exit(1);
});


#!/usr/bin/env ts-node

/**
 * Test script to create a test user/customer in Rail sandbox
 * Usage: npx tsx test-rail-create-user.ts
 */

import dotenv from "dotenv";
import { config } from "../../src/config/env.js";
import { getRailAccessToken } from "../../src/services/railClient.js";

// Load environment variables
dotenv.config();

async function testCreateUser() {
  console.log("🧪 Testing Rail API - Create Test User Application\n");

  // Check configuration
  const baseUrl = config.railApiBaseUrl || process.env.RAIL_API_BASE_URL;
  const hasCredentials =
    config.railClientId &&
    config.railClientSecret &&
    config.railAuthUrl;

  if (!hasCredentials) {
    console.error("❌ Rail credentials not configured!");
    process.exit(1);
  }

  // Get access token
  console.log("🔐 Getting access token...");
  let token: string;
  try {
    token = await getRailAccessToken();
    console.log("✅ Token obtained\n");
  } catch (error) {
    console.error("❌ Failed to get access token:", error);
    process.exit(1);
  }

  // Generate unique IDs for testing
  const timestamp = Date.now();
  const customerId = `TEST_USER_${timestamp}`;
  const accountId = `TEST_ACCOUNT_${timestamp}`;

  // Create application request with minimal required fields
  const applicationRequest = {
    application_type: "INDIVIDUAL",
    customer_id: customerId,
    customer_details: {
      first_name: "Test",
      last_name: "User",
      email_address: `test${timestamp}@example.com`,
      mailing_address: {
        address_line1: "123 Test Street",
        city: "Boston",
        state: "MA",
        postal_code: "02135",
        country_code: "US",
      },
      telephone_number: "+15551234567",
    },
    account_to_open: {
      account_id: accountId,
      product_id: "DEPOSIT_BASIC", // Pre-configured product
      asset_type_id: "FIAT_TESTNET_USD", // Testnet USD for sandbox
    },
    terms_and_conditions_accepted: true,
    information_attested: false, // Will be false initially, can be updated later
  };

  console.log("📝 Creating application with data:");
  console.log("   Customer ID:", customerId);
  console.log("   Account ID:", accountId);
  console.log("   Name: Test User");
  console.log("   Email:", applicationRequest.customer_details.email_address);
  console.log("");

  // Make the API call
  try {
    const response = await fetch(`${baseUrl}/v1/applications`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-L2f-Request-Id": `test-create-user-${timestamp}`,
        "X-L2f-Idempotency-Id": `test-user-${customerId}`,
      },
      body: JSON.stringify(applicationRequest),
    });

    const responseText = await response.text();
    let responseData: any;

    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    if (!response.ok) {
      console.error(`❌ Failed to create application: ${response.status} ${response.statusText}`);
      console.error("   Response:", JSON.stringify(responseData, null, 2));
      process.exit(1);
    }

    console.log("✅ Application created successfully!");
    
    if (responseData.data && responseData.data.id) {
      const applicationId = responseData.data.id;
      
      // Fetch full application details
      console.log("\n🔍 Fetching application details...");
      try {
        const detailsResponse = await fetch(`${baseUrl}/v1/applications/${applicationId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "X-L2f-Request-Id": `test-get-details-${timestamp}`,
          },
        });

        if (detailsResponse.ok) {
          const detailsData = await detailsResponse.json();
          console.log("\n📋 Full Application Details:");
          console.log(JSON.stringify(detailsData, null, 2));

          if (detailsData.data) {
            const app = detailsData.data;
            console.log("\n📊 Summary:");
            console.log("   Application ID:", app.id);
            console.log("   Status:", app.status || "N/A");
            console.log("   Application Type:", app.application_type || "N/A");
            console.log("   Customer ID:", app.customer_id || customerId);
            if (app.account_to_open) {
              console.log("   Account ID:", app.account_to_open.account_id || accountId);
              console.log("   Product ID:", app.account_to_open.product_id || "N/A");
              console.log("   Asset Type:", app.account_to_open.asset_type_id || "N/A");
            }
            if (app.customer_details) {
              console.log("   Customer Name:", 
                `${app.customer_details.first_name || ""} ${app.customer_details.last_name || ""}`.trim());
              console.log("   Email:", app.customer_details.email_address || "N/A");
            }
            console.log("   Terms Accepted:", app.terms_and_conditions_accepted ? "Yes" : "No");
            console.log("   Information Attested:", app.information_attested ? "Yes" : "No");
          }
        } else {
          console.log("\n⚠️  Could not fetch full details, but application was created:");
          console.log("   Application ID:", applicationId);
        }
      } catch (detailsError) {
        console.log("\n⚠️  Could not fetch full details, but application was created:");
        console.log("   Application ID:", applicationId);
        console.log("   Error:", detailsError instanceof Error ? detailsError.message : detailsError);
      }
    } else {
      console.log("\n📋 Response:", JSON.stringify(responseData, null, 2));
    }

    console.log("\n✅ Test completed successfully!");
    console.log("   The sandbox accepted the test user data.");
  } catch (error) {
    console.error("❌ Error creating application:");
    if (error instanceof Error) {
      console.error("   Error:", error.message);
      console.error("   Stack:", error.stack);
    } else {
      console.error("   Error:", error);
    }
    process.exit(1);
  }
}

// Run the test
testCreateUser().catch((error) => {
  console.error("❌ Unexpected error:", error);
  process.exit(1);
});


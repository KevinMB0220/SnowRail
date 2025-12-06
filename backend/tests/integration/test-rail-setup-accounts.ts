#!/usr/bin/env ts-node

/**
 * Script to set up Rail accounts and counterparties for SnowRail
 * This will:
 * 1. List existing customers
 * 2. Get or create a source account
 * 3. Create a counterparty for withdrawals
 * 
 * Usage: npx tsx test-rail-setup-accounts.ts
 */

import dotenv from "dotenv";
import { config } from "../../src/config/env.js";
import { getRailAccessToken } from "../../src/services/railClient.js";

// Load environment variables
dotenv.config();

async function setupRailAccounts() {
  console.log("🔧 Setting up Rail Accounts and Counterparties\n");

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

  const timestamp = Date.now();
  const requestId = `setup-${timestamp}`;

  // Step 1: List customers to find one we can use
  console.log("📋 Step 1: Listing customers...");
  try {
    const customersResponse = await fetch(`${baseUrl}/v1/customers?page=0&page_size=10`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-L2f-Request-Id": requestId,
      },
    });

    if (!customersResponse.ok) {
      const errorText = await customersResponse.text();
      console.error(`❌ Failed to list customers: ${customersResponse.status}`);
      console.error("   Response:", errorText.substring(0, 200));
      throw new Error("Could not list customers");
    }

    const customersData = await customersResponse.json();
    console.log(`✅ Found ${customersData.data?.length || 0} customers\n`);

    let customerId: string | null = null;
    if (customersData.data && customersData.data.length > 0) {
      customerId = customersData.data[0].id;
      console.log(`   Using customer: ${customerId}`);
    } else {
      console.log("   ⚠️  No customers found. You may need to create one first.");
      console.log("   Run: npx tsx test-rail-create-user.ts\n");
    }

    // Step 2: List accounts for the customer
    if (customerId) {
      console.log("\n📋 Step 2: Listing accounts for customer...");
      try {
        const accountsResponse = await fetch(
          `${baseUrl}/v1/accounts/deposits?customer_id=${customerId}&page=0&page_size=10`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
              "X-L2f-Request-Id": requestId,
            },
          }
        );

        if (accountsResponse.ok) {
          const accountsData = await accountsResponse.json();
          console.log(`✅ Found ${accountsData.data?.length || 0} accounts\n`);

          if (accountsData.data && accountsData.data.length > 0) {
            const account = accountsData.data[0];
            console.log("   📝 Source Account Found:");
            console.log(`      Account ID: ${account.id}`);
            console.log(`      Status: ${account.status}`);
            console.log(`      Asset Type: ${account.asset_type_id}`);
            console.log(`      Balance: ${account.balance || "N/A"}\n`);
            console.log("   ✅ Add this to your .env file:");
            console.log(`      RAIL_SOURCE_ACCOUNT_ID=${account.id}\n`);
          } else {
            console.log("   ⚠️  No accounts found for this customer.");
            console.log("   You may need to complete the application process first.\n");
          }
        } else {
          console.log("   ⚠️  Could not list accounts (this is OK if customer is not fully onboarded)");
        }
      } catch (error) {
        console.log("   ⚠️  Could not list accounts:", error instanceof Error ? error.message : error);
      }
    }

    // Step 3: Create a counterparty for withdrawals
    console.log("\n📋 Step 3: Creating counterparty for withdrawals...");
    const counterpartyId = `SNOWRAIL_CP_${timestamp}`;
    
    // First, we need a customer ID. If none exists, we'll need to create one first
    if (!customerId) {
      console.log("   ⚠️  No customer found. Creating a customer application first...");
      // Create a simple customer application
      const customerIdTemp = `SNOWRAIL_CUST_${timestamp}`;
      const applicationRequest = {
        application_type: "INDIVIDUAL",
        customer_id: customerIdTemp,
        customer_details: {
          first_name: "SnowRail",
          last_name: "Test",
          email_address: `snowrail${timestamp}@example.com`,
          mailing_address: {
            address_line1: "123 Test St",
            city: "Boston",
            state: "MA",
            postal_code: "02135",
            country_code: "US",
          },
          telephone_number: "+15551234567",
        },
        account_to_open: {
          account_id: `SNOWRAIL_ACC_${timestamp}`,
          product_id: "DEPOSIT_BASIC",
          asset_type_id: "FIAT_TESTNET_USD",
        },
        terms_and_conditions_accepted: true,
        information_attested: false,
      };

      try {
        const appResponse = await fetch(`${baseUrl}/v1/applications`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "X-L2f-Request-Id": requestId,
            "X-L2f-Idempotency-Id": customerIdTemp,
          },
          body: JSON.stringify(applicationRequest),
        });

        if (appResponse.ok) {
          const appData = await appResponse.json();
          console.log(`   ✅ Application created: ${appData.data?.id}`);
          console.log(`   ⚠️  Note: In sandbox, applications may be auto-approved.`);
          console.log(`   ⚠️  However, you may need to wait or use the dashboard to approve it.\n`);
          
          // Try to use the customer_id from the application
          // Note: The customer won't exist until the application is approved
          console.log(`   💡 For now, we'll try to list existing counterparties that might work.\n`);
        } else {
          const errorText = await appResponse.text();
          console.log(`   ⚠️  Could not create application: ${appResponse.status}`);
          console.log(`   Response: ${errorText.substring(0, 200)}\n`);
        }
      } catch (appError) {
        console.log("   ⚠️  Could not create application:", appError instanceof Error ? appError.message : appError);
      }
      
      // Since we don't have a valid customer yet, skip counterparty creation
      console.log("   ⚠️  Skipping counterparty creation - customer needs to be created first.");
      console.log("   📝 Next steps:");
      console.log("      1. Go to Rail Dashboard and approve the application");
      console.log("      2. Or create a customer manually in the dashboard");
      console.log("      3. Then run this script again\n");
      return;
    }

    // Create counterparty with correct type
    // For FIAT_US, we need: customer_id, counterparty_type, supported_rails, profile, account_information
    const counterpartyRequest = {
      customer_id: customerId || `SNOWRAIL_CUST_${timestamp}`, // Use customer ID or create a test one
      counterparty_type: "FIAT_US", // Valid values: FIAT_US, FIAT_US_LINKED, FIAT_CA, FIAT_CA_LINKED, CRYPTO
      description: "SnowRail test counterparty for withdrawals",
      supported_rails: ["ACH"], // Valid: ACH, FEDWIRE, SWIFT
      profile: {
        individual: {
          first_name: "Test",
          last_name: "Recipient",
          email_address: `recipient${timestamp}@example.com`,
          mailing_address: {
            address_line1: "456 Recipient St",
            city: "Boston",
            state: "MA",
            postal_code: "02135",
            country_code: "US",
          },
          telephone_number: "+15559876543",
        },
      },
      account_information: {
        asset_type_id: "FIAT_TESTNET_USD",
        type: "CHECKING",
        account_number: "1234567890",
        routing_number: "021000021", // Test routing number
        institution_name: "Test Bank",
      },
    };

    try {
      const counterpartyResponse = await fetch(`${baseUrl}/v1/counterparties`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-L2f-Request-Id": requestId,
          "X-L2f-Idempotency-Id": counterpartyId,
        },
        body: JSON.stringify(counterpartyRequest),
      });

      const responseText = await counterpartyResponse.text();
      let responseData: any;

      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { raw: responseText };
      }

      if (!counterpartyResponse.ok) {
        console.error(`❌ Failed to create counterparty: ${counterpartyResponse.status}`);
        console.error("   Response:", JSON.stringify(responseData, null, 2).substring(0, 500));
        
        // Try to get existing counterparties
        console.log("\n   🔍 Trying to list existing counterparties...");
        try {
          const listResponse = await fetch(
            `${baseUrl}/v1/counterparties?page=0&page_size=10`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
                "X-L2f-Request-Id": requestId,
              },
            }
          );

          if (listResponse.ok) {
            const listData = await listResponse.json();
            if (listData.data && listData.data.length > 0) {
              console.log(`   ✅ Found ${listData.data.length} existing counterparties:`);
              listData.data.forEach((cp: any, idx: number) => {
                console.log(`      ${idx + 1}. ${cp.id} (${cp.counterparty_type})`);
              });
              console.log("\n   ✅ Use one of these IDs in your .env file:");
              console.log(`      RAIL_COUNTERPARTY_ID=${listData.data[0].id}\n`);
            }
          }
        } catch (listError) {
          console.log("   ⚠️  Could not list counterparties");
        }
      } else {
        console.log("✅ Counterparty created successfully!");
        if (responseData.data && responseData.data.id) {
          console.log(`   Counterparty ID: ${responseData.data.id}`);
          console.log("\n   ✅ Add this to your .env file:");
          console.log(`      RAIL_COUNTERPARTY_ID=${responseData.data.id}\n`);
        }
      }
    } catch (error) {
      console.error("❌ Error creating counterparty:");
      console.error("   Error:", error instanceof Error ? error.message : error);
    }

    console.log("\n✅ Setup script completed!");
    console.log("\n📝 Next steps:");
    console.log("   1. Add the account and counterparty IDs to your .env file");
    console.log("   2. Restart your backend server");
    console.log("   3. Test the payment flow again\n");
  } catch (error) {
    console.error("❌ Setup failed:");
    if (error instanceof Error) {
      console.error("   Error:", error.message);
      console.error("   Stack:", error.stack);
    } else {
      console.error("   Error:", error);
    }
    process.exit(1);
  }
}

// Run the setup
setupRailAccounts().catch((error) => {
  console.error("❌ Unexpected error:", error);
  process.exit(1);
});


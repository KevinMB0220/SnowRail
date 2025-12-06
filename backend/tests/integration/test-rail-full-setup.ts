#!/usr/bin/env ts-node

/**
 * Complete Rail Setup Script - Full Automation
 * 
 * This script will:
 * 1. Create a customer application
 * 2. Wait and check for customer approval
 * 3. Open an account for the customer
 * 4. Create a counterparty
 * 5. Output the IDs needed for .env
 * 
 * Usage: npx tsx test-rail-full-setup.ts
 */

import dotenv from "dotenv";
import { config } from "../../src/config/env.js";
import { getRailAccessToken } from "../../src/services/railClient.js";

// Load environment variables
dotenv.config();

async function fullRailSetup() {
  console.log("🚀 Complete Rail Setup - Full Automation\n");
  console.log("This script will create everything needed for Rail integration.\n");

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
  console.log("🔐 Step 0: Getting access token...");
  let token: string;
  try {
    token = await getRailAccessToken();
    console.log("✅ Token obtained\n");
  } catch (error) {
    console.error("❌ Failed to get access token:", error);
    process.exit(1);
  }

  const timestamp = Date.now();
  const requestId = `full-setup-${timestamp}`;
  const customerId = `SNOWRAIL_${timestamp}`;
  const accountId = `SNOWRAIL_ACC_${timestamp}`;

  let applicationId: string | null = null;
  let finalCustomerId: string | null = null;
  let finalAccountId: string | null = null;
  let finalCounterpartyId: string | null = null;

  // Step 1: Create application
  console.log("📋 Step 1: Creating customer application...");
  try {
    const applicationRequest = {
      application_type: "INDIVIDUAL",
      customer_id: customerId,
      customer_details: {
        first_name: "SnowRail",
        last_name: "Test Customer",
        email_address: `snowrail${timestamp}@example.com`,
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
        product_id: "DEPOSIT_BASIC",
        asset_type_id: "FIAT_TESTNET_USD",
      },
      terms_and_conditions_accepted: true,
      information_attested: true,
    };

    const appResponse = await fetch(`${baseUrl}/v1/applications`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-L2f-Request-Id": requestId,
        "X-L2f-Idempotency-Id": customerId,
      },
      body: JSON.stringify(applicationRequest),
    });

    if (!appResponse.ok) {
      const errorText = await appResponse.text();
      console.error(`❌ Failed to create application: ${appResponse.status}`);
      console.error("   Response:", errorText.substring(0, 300));
      process.exit(1);
    }

    const appData = await appResponse.json();
    applicationId = appData.data?.id;
    console.log(`✅ Application created: ${applicationId}`);
    console.log(`   Customer ID: ${customerId}`);
    console.log(`   Account ID (will be created on approval): ${accountId}\n`);
  } catch (error) {
    console.error("❌ Error creating application:", error);
    process.exit(1);
  }

  // Step 2: Wait and check for customer (with retries)
  console.log("📋 Step 2: Waiting for application approval...");
  console.log("   (In sandbox, this may be instant or require dashboard approval)\n");
  
  const maxRetries = 10;
  let retryCount = 0;
  let customerFound = false;

  while (retryCount < maxRetries && !customerFound) {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    
    try {
      const customerResponse = await fetch(`${baseUrl}/v1/customers/${customerId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-L2f-Request-Id": `${requestId}-check-${retryCount}`,
        },
      });

      if (customerResponse.ok) {
        const customerData = await customerResponse.json();
        finalCustomerId = customerData.data?.id || customerId;
        console.log(`✅ Customer found: ${finalCustomerId}\n`);
        customerFound = true;
      } else {
        retryCount++;
        if (retryCount < maxRetries) {
          process.stdout.write(`   Attempt ${retryCount}/${maxRetries}...\r`);
        }
      }
    } catch (error) {
      retryCount++;
    }
  }

  if (!customerFound) {
    console.log(`\n⚠️  Customer not found after ${maxRetries} attempts.`);
    console.log("   This means the application needs to be approved manually.");
    console.log(`   Application ID: ${applicationId}`);
    console.log("   Please:");
    console.log("   1. Go to https://management.layer2financial.com");
    console.log("   2. Navigate to Applications");
    console.log(`   3. Find and approve application: ${applicationId}`);
    console.log("   4. Then run this script again or use test-rail-get-existing.ts\n");
    process.exit(0);
  }

  // Step 3: Check for existing account or create one
  console.log("📋 Step 3: Checking/creating account...");
  try {
    // First, check if account from application exists
    const accountsResponse = await fetch(
      `${baseUrl}/v1/accounts/deposits?customer_id=${finalCustomerId}&page=0&page_size=10`,
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
      const accounts = accountsData.data || [];
      
      if (accounts.length > 0) {
        finalAccountId = accounts[0].id;
        console.log(`✅ Account found: ${finalAccountId}`);
        console.log(`   Status: ${accounts[0].status}`);
        console.log(`   Asset Type: ${accounts[0].asset_type_id}\n`);
      } else {
        // Try to create account directly
        console.log("   No account found. Creating account...");
        const accountRequest = {
          customer_id: finalCustomerId,
          account_id: accountId,
          product_id: "DEPOSIT_BASIC",
          asset_type_id: "FIAT_TESTNET_USD",
        };

        const createAccountResponse = await fetch(`${baseUrl}/v1/accounts/deposits`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "X-L2f-Request-Id": requestId,
            "X-L2f-Idempotency-Id": accountId,
          },
          body: JSON.stringify(accountRequest),
        });

        if (createAccountResponse.ok) {
          const accountData = await createAccountResponse.json();
          finalAccountId = accountData.data?.id || accountId;
          console.log(`✅ Account created: ${finalAccountId}\n`);
        } else {
          const errorText = await createAccountResponse.text();
          console.log(`   ⚠️  Could not create account: ${createAccountResponse.status}`);
          console.log(`   Response: ${errorText.substring(0, 200)}`);
          console.log("   The account from the application should be created automatically when approved.\n");
        }
      }
    }
  } catch (error) {
    console.log("   ⚠️  Error checking/creating account:", error instanceof Error ? error.message : error);
  }

  // Step 4: Create counterparty
  console.log("📋 Step 4: Creating counterparty...");
  try {
    const counterpartyRequest = {
      customer_id: finalCustomerId!,
      counterparty_type: "FIAT_US",
      description: "SnowRail test counterparty for withdrawals",
      supported_rails: ["ACH"],
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
        routing_number: "021000021",
        institution_name: "Test Bank",
      },
    };

    const cpResponse = await fetch(`${baseUrl}/v1/counterparties`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-L2f-Request-Id": requestId,
        "X-L2f-Idempotency-Id": `SNOWRAIL_CP_${timestamp}`,
      },
      body: JSON.stringify(counterpartyRequest),
    });

    const cpResponseText = await cpResponse.text();
    let cpResponseData: any;

    try {
      cpResponseData = JSON.parse(cpResponseText);
    } catch {
      cpResponseData = { raw: cpResponseText };
    }

    if (!cpResponse.ok) {
      console.error(`❌ Failed to create counterparty: ${cpResponse.status}`);
      console.error("   Response:", JSON.stringify(cpResponseData, null, 2).substring(0, 500));
      
      // Try to list existing counterparties
      console.log("\n   🔍 Trying to find existing counterparties...");
      try {
        const listResponse = await fetch(
          `${baseUrl}/v1/counterparties?customer_id=${finalCustomerId}&page=0&page_size=10`,
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
            finalCounterpartyId = listData.data[0].id;
            console.log(`   ✅ Found existing counterparty: ${finalCounterpartyId}\n`);
          }
        }
      } catch (listError) {
        console.log("   ⚠️  Could not list counterparties");
      }
    } else {
      finalCounterpartyId = cpResponseData.data?.id;
      console.log(`✅ Counterparty created: ${finalCounterpartyId}\n`);
    }
  } catch (error) {
    console.error("❌ Error creating counterparty:", error instanceof Error ? error.message : error);
  }

  // Final summary
  console.log("\n" + "=".repeat(60));
  console.log("📋 SETUP SUMMARY");
  console.log("=".repeat(60));
  
  if (finalAccountId) {
    console.log("\n✅ SOURCE ACCOUNT ID:");
    console.log(`   ${finalAccountId}`);
    console.log("\n   Add to .env:");
    console.log(`   RAIL_SOURCE_ACCOUNT_ID=${finalAccountId}`);
  } else {
    console.log("\n⚠️  SOURCE ACCOUNT ID:");
    console.log("   Not available yet. Account will be created when application is approved.");
    console.log(`   Application ID: ${applicationId}`);
    console.log("   Check the Rail Dashboard or run: npx tsx test-rail-get-existing.ts");
  }

  if (finalCounterpartyId) {
    console.log("\n✅ COUNTERPARTY ID:");
    console.log(`   ${finalCounterpartyId}`);
    console.log("\n   Add to .env:");
    console.log(`   RAIL_COUNTERPARTY_ID=${finalCounterpartyId}`);
  } else {
    console.log("\n⚠️  COUNTERPARTY ID:");
    console.log("   Not created. You may need to create it manually in the dashboard.");
    console.log("   Or wait and run this script again.");
  }

  console.log("\n" + "=".repeat(60));
  console.log("\n📝 Next Steps:");
  if (finalAccountId && finalCounterpartyId) {
    console.log("   1. Add the IDs above to your .env file");
    console.log("   2. Restart your backend server");
    console.log("   3. Test the payment flow!\n");
  } else {
    console.log("   1. Wait for application approval (check dashboard)");
    console.log("   2. Run: npx tsx test-rail-get-existing.ts to get IDs");
    console.log("   3. Add IDs to .env and restart server\n");
  }
}

// Run
fullRailSetup().catch((error) => {
  console.error("❌ Unexpected error:", error);
  process.exit(1);
});


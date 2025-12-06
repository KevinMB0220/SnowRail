#!/usr/bin/env ts-node

/**
 * Script to get existing Rail accounts and counterparties
 * Useful when you've already created them via dashboard or previous scripts
 * 
 * Usage: npx tsx test-rail-get-existing.ts
 */

import dotenv from "dotenv";
import { config } from "../../src/config/env.js";
import { getRailAccessToken } from "../../src/services/railClient.js";

// Load environment variables
dotenv.config();

async function getExistingResources() {
  console.log("🔍 Getting Existing Rail Resources\n");

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

  const requestId = `get-existing-${Date.now()}`;

  // Get customers
  console.log("📋 Listing customers...");
  try {
    const customersResponse = await fetch(`${baseUrl}/v1/customers?page=0&page_size=20`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-L2f-Request-Id": requestId,
      },
    });

    if (customersResponse.ok) {
      const customersData = await customersResponse.json();
      // Handle both array and object response formats
      let customers: any[] = [];
      if (Array.isArray(customersData.data)) {
        customers = customersData.data;
      } else if (customersData.data && Array.isArray(customersData.data.items)) {
        customers = customersData.data.items;
      } else if (customersData.items) {
        customers = customersData.items;
      }
      console.log(`✅ Found ${customers.length} customer(s)\n`);

      if (customers.length > 0) {
        const customer = customers[0];
        console.log(`   Using customer: ${customer.id}\n`);

        // Get accounts for this customer
        console.log("📋 Listing accounts for customer...");
        try {
          const accountsResponse = await fetch(
            `${baseUrl}/v1/accounts/deposits?customer_id=${customer.id}&page=0&page_size=20`,
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
            // Handle both array and object response formats
            let accounts: any[] = [];
            if (Array.isArray(accountsData.data)) {
              accounts = accountsData.data;
            } else if (accountsData.data && Array.isArray(accountsData.data.items)) {
              accounts = accountsData.data.items;
            } else if (accountsData.items) {
              accounts = accountsData.items;
            }
            console.log(`✅ Found ${accounts.length} accounts\n`);

            if (accounts.length > 0) {
              accounts.forEach((account: any, idx: number) => {
                console.log(`   Account ${idx + 1}:`);
                console.log(`      ID: ${account.id}`);
                console.log(`      Status: ${account.status}`);
                console.log(`      Asset Type: ${account.asset_type_id}`);
                console.log(`      Balance: ${account.balance || "0"}`);
                console.log("");
              });

              const firstAccount = accounts[0];
              console.log("   ✅ Add this to your .env file:");
              console.log(`      RAIL_SOURCE_ACCOUNT_ID=${firstAccount.id}\n`);
            } else {
              console.log("   ⚠️  No accounts found for this customer.\n");
            }
          }
        } catch (error) {
          console.log("   ⚠️  Could not list accounts:", error instanceof Error ? error.message : error);
        }

        // Get counterparties for this customer
        console.log("📋 Listing counterparties...");
        try {
          const counterpartiesResponse = await fetch(
            `${baseUrl}/v1/counterparties?customer_id=${customer.id}&page=0&page_size=20`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
                "X-L2f-Request-Id": requestId,
              },
            }
          );

          if (counterpartiesResponse.ok) {
            const counterpartiesData = await counterpartiesResponse.json();
            // Handle both array and object response formats
            let counterparties: any[] = [];
            if (Array.isArray(counterpartiesData.data)) {
              counterparties = counterpartiesData.data;
            } else if (counterpartiesData.data && Array.isArray(counterpartiesData.data.items)) {
              counterparties = counterpartiesData.data.items;
            } else if (counterpartiesData.items) {
              counterparties = counterpartiesData.items;
            }
            console.log(`✅ Found ${counterparties.length} counterparties\n`);

            if (counterparties.length > 0) {
              counterparties.forEach((cp: any, idx: number) => {
                console.log(`   Counterparty ${idx + 1}:`);
                console.log(`      ID: ${cp.id}`);
                console.log(`      Type: ${cp.counterparty_type}`);
                console.log(`      Status: ${cp.status}`);
                console.log(`      Description: ${cp.description || "N/A"}`);
                console.log("");
              });

              const firstCounterparty = counterparties[0];
              console.log("   ✅ Add this to your .env file:");
              console.log(`      RAIL_COUNTERPARTY_ID=${firstCounterparty.id}\n`);
            } else {
              console.log("   ⚠️  No counterparties found.\n");
            }
          }
        } catch (error) {
          console.log("   ⚠️  Could not list counterparties:", error instanceof Error ? error.message : error);
        }

        // Also try listing all counterparties (not filtered by customer)
        console.log("📋 Listing all counterparties (any customer)...");
        try {
          const allCpResponse = await fetch(
            `${baseUrl}/v1/counterparties?page=0&page_size=20`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
                "X-L2f-Request-Id": requestId,
              },
            }
          );

          if (allCpResponse.ok) {
            const allCpData = await allCpResponse.json();
            // Handle both array and object response formats
            let allCounterparties: any[] = [];
            if (Array.isArray(allCpData.data)) {
              allCounterparties = allCpData.data;
            } else if (allCpData.data && Array.isArray(allCpData.data.items)) {
              allCounterparties = allCpData.data.items;
            } else if (allCpData.items) {
              allCounterparties = allCpData.items;
            }
            if (allCounterparties.length > 0) {
              console.log(`✅ Found ${allCounterparties.length} total counterparties\n`);
              const firstCp = allCounterparties[0];
              console.log("   ✅ You can also use this counterparty ID:");
              console.log(`      RAIL_COUNTERPARTY_ID=${firstCp.id}\n`);
            }
          }
        } catch (error) {
          // Ignore errors for this
        }

      } else {
        console.log("   ⚠️  No customers found. Create one first using:");
        console.log("      npx tsx test-rail-create-user.ts\n");
      }
    } else {
      const errorText = await customersResponse.text();
      console.error(`❌ Failed to list customers: ${customersResponse.status}`);
      console.error("   Response:", errorText.substring(0, 200));
    }
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }

  console.log("✅ Done! Copy the IDs above to your .env file and restart the server.\n");
}

// Run
getExistingResources().catch((error) => {
  console.error("❌ Unexpected error:", error);
  process.exit(1);
});


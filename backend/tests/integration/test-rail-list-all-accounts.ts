#!/usr/bin/env ts-node

/**
 * List ALL Accounts from Rail API
 * 
 * This script will:
 * 1. Get access token
 * 2. List ALL accounts (without customer_id filter)
 * 3. Show account IDs that can be used for RAIL_SOURCE_ACCOUNT_ID
 * 
 * Usage: npx tsx test-rail-list-all-accounts.ts
 */

import dotenv from "dotenv";
import { config } from "../../src/config/env.js";
import { getRailAccessToken } from "../../src/services/railClient.js";

dotenv.config();

async function listAllAccounts() {
  console.log("🔍 Listing ALL Accounts from Rail API\n");

  const baseUrl = config.railApiBaseUrl || process.env.RAIL_API_BASE_URL;
  if (!baseUrl || baseUrl.includes("rail.mock")) {
    console.error("❌ Rail API Base URL not configured or is set to mock.");
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

  const requestId = `list-accounts-${Date.now()}`;

  // List ALL accounts (no customer_id filter)
  console.log("📋 Listing all accounts...");
  console.log("   Endpoint: GET /v1/accounts/deposits\n");

  try {
    // Try without any filters first to get all accounts
    const response = await fetch(
      `${baseUrl}/v1/accounts/deposits?page=0&page_size=50&product_type=DEPOSIT&status=OPEN`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-L2f-Request-Id": requestId,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Failed to list accounts: ${response.status} ${response.statusText}`);
      console.error("   Response:", errorText.substring(0, 500));
      
      // Try without filters
      console.log("\n   🔄 Trying without filters...");
      const response2 = await fetch(
        `${baseUrl}/v1/accounts/deposits?page=0&page_size=50`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "X-L2f-Request-Id": `${requestId}-2`,
          },
        }
      );

      if (!response2.ok) {
        const errorText2 = await response2.text();
        console.error(`❌ Failed again: ${response2.status}`);
        console.error("   Response:", errorText2.substring(0, 500));
        process.exit(1);
      }

      const data2 = await response2.json();
      displayAccounts(data2);
      return;
    }

    const data = await response.json();
    displayAccounts(data);
  } catch (error) {
    console.error("❌ Error listing accounts:", error);
    process.exit(1);
  }
}

function displayAccounts(data: any) {
  console.log("📊 Response Structure:");
  console.log("   Keys:", Object.keys(data).join(", "));
  console.log("   Full response (first 500 chars):", JSON.stringify(data).substring(0, 500));
  console.log("");

  // Handle different response formats
  let accounts: any[] = [];
  
  // Rail API returns: { data: { accounts: [...] }, links: {...} }
  if (data.data && Array.isArray(data.data.accounts)) {
    accounts = data.data.accounts;
  } else if (Array.isArray(data.data)) {
    accounts = data.data;
  } else if (data.data && Array.isArray(data.data.items)) {
    accounts = data.data.items;
  } else if (data.data && Array.isArray(data.data.data)) {
    accounts = data.data.data;
  } else if (Array.isArray(data.items)) {
    accounts = data.items;
  } else if (data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
    // Check if it's a single account
    if (data.data.id || data.data.account_id) {
      accounts = [data.data];
    }
  }

  console.log(`✅ Found ${accounts.length} account(s)\n`);

  if (accounts.length === 0) {
    console.log("⚠️  No accounts found.");
    console.log("   This could mean:");
    console.log("   1. No accounts have been created yet");
    console.log("   2. No applications have been approved");
    console.log("   3. Accounts exist but are not in OPEN status");
    console.log("\n   Next steps:");
    console.log("   1. Create an application: npx tsx test-rail-create-user.ts");
    console.log("   2. Approve it in the Rail Dashboard");
    console.log("   3. Run this script again\n");
    return;
  }

  console.log("=".repeat(70));
  console.log("📋 ACCOUNTS FOUND:");
  console.log("=".repeat(70));

  accounts.forEach((account, index) => {
    console.log(`\n${index + 1}. Account ID: ${account.id || account.account_id || 'N/A'}`);
    console.log(`   Status: ${account.status || 'N/A'}`);
    console.log(`   Product Type: ${account.product_type || account.product_id || 'N/A'}`);
    console.log(`   Asset Type: ${account.asset_type_id || 'N/A'}`);
    console.log(`   Customer ID: ${account.customer_id || 'N/A'}`);
    
    if (account.balance) {
      console.log(`   Balance: ${account.balance.available || account.balance || 'N/A'}`);
    }
    
    if (account.created_date) {
      console.log(`   Created: ${account.created_date}`);
    }
  });

  console.log("\n" + "=".repeat(70));
  console.log("💡 TO USE IN .env:");
  console.log("=".repeat(70));
  
  // Find FIAT_TESTNET_USD accounts first (preferred for our use case)
  const fiatAccounts = accounts.filter((acc: any) => 
    acc.asset_type_id === 'FIAT_TESTNET_USD' && 
    (acc.status === 'OPEN' || acc.status === 'open')
  );

  if (fiatAccounts.length > 0) {
    console.log(`\n✅ Found ${fiatAccounts.length} FIAT_TESTNET_USD account(s) - RECOMMENDED:\n`);
    fiatAccounts.slice(0, 3).forEach((acc: any, idx: number) => {
      const accountId = acc.id || acc.account_id;
      console.log(`   ${idx + 1}. RAIL_SOURCE_ACCOUNT_ID=${accountId}`);
      console.log(`      Customer: ${acc.customer_id || 'N/A'}`);
      if (acc.available_balance !== undefined || acc.current_balance !== undefined) {
        console.log(`      Balance: ${acc.available_balance || acc.current_balance || 0}`);
      }
    });
    console.log(`\n   💡 Use the first one: RAIL_SOURCE_ACCOUNT_ID=${fiatAccounts[0].id}\n`);
  } else {
    // Find any OPEN deposit account
    const openAccount = accounts.find((acc: any) => 
      (acc.status === 'OPEN' || acc.status === 'open') && 
      (acc.product_type === 'DEPOSIT' || acc.product_type === 'AGG_DEPOSIT' || acc.product_id === 'DEPOSIT_BASIC')
    );

    if (openAccount) {
      const accountId = openAccount.id || openAccount.account_id;
      console.log(`\n⚠️  No FIAT_TESTNET_USD accounts found, but found OPEN account:`);
      console.log(`   RAIL_SOURCE_ACCOUNT_ID=${accountId}`);
      console.log(`   Asset Type: ${openAccount.asset_type_id}`);
      console.log(`   Note: This is not FIAT_TESTNET_USD, but should work for testing\n`);
    } else {
      console.log(`\n⚠️  No OPEN deposit accounts found.`);
      console.log(`   You can use any account ID from above, or create a new one.\n`);
      
      if (accounts.length > 0) {
        const firstAccount = accounts[0];
        const accountId = firstAccount.id || firstAccount.account_id;
        console.log(`   Example (first account):`);
        console.log(`   RAIL_SOURCE_ACCOUNT_ID=${accountId}\n`);
      }
    }
  }

  console.log("📝 Next steps:");
  console.log("   1. Copy one of the Account IDs above");
  console.log("   2. Add it to your .env file:");
  console.log("      RAIL_SOURCE_ACCOUNT_ID=<account_id_from_above>");
  console.log("   3. Get counterparty ID: npx tsx test-rail-get-existing.ts");
  console.log("   4. Restart your backend server\n");
}

// Run
listAllAccounts().catch((error) => {
  console.error("❌ Unexpected error:", error);
  process.exit(1);
});


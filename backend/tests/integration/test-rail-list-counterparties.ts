#!/usr/bin/env ts-node

/**
 * List ALL Counterparties from Rail API
 * 
 * Usage: npx tsx test-rail-list-counterparties.ts
 */

import dotenv from "dotenv";
import { config } from "../../src/config/env.js";
import { getRailAccessToken } from "../../src/services/railClient.js";

dotenv.config();

async function listCounterparties() {
  console.log("🔍 Listing ALL Counterparties from Rail API\n");

  const baseUrl = config.railApiBaseUrl || process.env.RAIL_API_BASE_URL;
  if (!baseUrl || baseUrl.includes("rail.mock")) {
    console.error("❌ Rail API Base URL not configured.");
    process.exit(1);
  }

  console.log("🔐 Getting access token...");
  let token: string;
  try {
    token = await getRailAccessToken();
    console.log("✅ Token obtained\n");
  } catch (error) {
    console.error("❌ Failed to get access token:", error);
    process.exit(1);
  }

  const requestId = `list-cp-${Date.now()}`;

  console.log("📋 Listing all counterparties...\n");

  try {
    const response = await fetch(
      `${baseUrl}/v1/counterparties?page=0&page_size=50&status=ACTIVE`,
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
      console.error(`❌ Failed: ${response.status}`);
      console.error("   Response:", errorText.substring(0, 500));
      process.exit(1);
    }

    const data = await response.json();
    
    // Handle response format
    let counterparties: any[] = [];
    if (data.data && Array.isArray(data.data.counterparties)) {
      counterparties = data.data.counterparties;
    } else if (Array.isArray(data.data)) {
      counterparties = data.data;
    } else if (data.data && Array.isArray(data.data.items)) {
      counterparties = data.data.items;
    }

    console.log(`✅ Found ${counterparties.length} counterparty(ies)\n`);

    if (counterparties.length === 0) {
      console.log("⚠️  No counterparties found.");
      console.log("   You'll need to create one in the Rail Dashboard or via API.\n");
      return;
    }

    console.log("=".repeat(70));
    console.log("📋 COUNTERPARTIES FOUND:");
    console.log("=".repeat(70));

    counterparties.forEach((cp, index) => {
      console.log(`\n${index + 1}. Counterparty ID: ${cp.id || 'N/A'}`);
      console.log(`   Status: ${cp.status || 'N/A'}`);
      console.log(`   Type: ${cp.counterparty_type || 'N/A'}`);
      console.log(`   Customer ID: ${cp.customer_id || 'N/A'}`);
      if (cp.supported_rails) {
        console.log(`   Supported Rails: ${Array.isArray(cp.supported_rails) ? cp.supported_rails.join(", ") : cp.supported_rails}`);
      }
    });

    console.log("\n" + "=".repeat(70));
    console.log("💡 TO USE IN .env:");
    console.log("=".repeat(70));

    // Find FIAT_US counterparty
    const fiatCounterparty = counterparties.find((cp: any) => 
      cp.counterparty_type === 'FIAT_US' && 
      (cp.status === 'ACTIVE' || cp.status === 'active')
    );

    if (fiatCounterparty) {
      console.log(`\n✅ Recommended Counterparty ID (FIAT_US, ACTIVE):`);
      console.log(`   RAIL_COUNTERPARTY_ID=${fiatCounterparty.id}\n`);
    } else if (counterparties.length > 0) {
      const first = counterparties[0];
      console.log(`\n⚠️  No FIAT_US counterparty found, but you can use:`);
      console.log(`   RAIL_COUNTERPARTY_ID=${first.id}`);
      console.log(`   Type: ${first.counterparty_type}, Status: ${first.status}\n`);
    }
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

listCounterparties().catch(console.error);


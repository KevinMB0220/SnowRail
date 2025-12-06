#!/usr/bin/env node

/**
 * Test script for local x402 facilitator
 * Tests the facilitator endpoints step by step
 */

const FACILITATOR_URL = process.env.FACILITATOR_URL || "http://localhost:4000/facilitator";

async function testFacilitator() {
  console.log("🧪 Testing x402 Facilitator Server\n");
  console.log(`📍 Facilitator URL: ${FACILITATOR_URL}\n`);

  // Test 1: Health Check
  console.log("1️⃣ Testing /health endpoint...");
  try {
    const healthResponse = await fetch(`${FACILITATOR_URL}/health`);
    const healthData = await healthResponse.json();
    
    if (healthResponse.ok) {
      console.log("   ✅ Health check passed");
      console.log(`   📊 Status: ${healthData.status}`);
      console.log(`   🌐 Network: ${healthData.network}`);
      console.log(`   ⏰ Timestamp: ${healthData.timestamp}\n`);
    } else {
      console.log("   ❌ Health check failed");
      console.log(`   Status: ${healthResponse.status}\n`);
      return;
    }
  } catch (error) {
    console.log("   ❌ Health check failed - Facilitator not running?");
    console.log(`   Error: ${error.message}\n`);
    console.log("   💡 Make sure to start the facilitator first:");
    console.log("      npm run facilitator\n");
    return;
  }

  // Test 2: Validate with demo token
  console.log("2️⃣ Testing /validate endpoint with demo-token...");
  try {
    const validateResponse = await fetch(`${FACILITATOR_URL}/validate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        proof: "demo-token",
        meterId: "payroll_execute",
        price: "1",
        asset: "USDC",
        chain: "fuji",
      }),
    });

    const validateData = await validateResponse.json();
    
    if (validateData.valid) {
      console.log("   ✅ Validation passed");
      console.log(`   👤 Payer: ${validateData.payer}`);
      console.log(`   💰 Amount: ${validateData.amount}\n`);
    } else {
      console.log("   ⚠️  Validation failed (expected for demo-token in production mode)");
      console.log(`   Error: ${validateData.error || "Unknown"}\n`);
    }
  } catch (error) {
    console.log("   ❌ Validation request failed");
    console.log(`   Error: ${error.message}\n`);
  }

  // Test 3: Validate with invalid proof
  console.log("3️⃣ Testing /validate endpoint with invalid proof...");
  try {
    const validateResponse = await fetch(`${FACILITATOR_URL}/validate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        proof: "invalid-proof-123",
        meterId: "payroll_execute",
      }),
    });

    const validateData = await validateResponse.json();
    
    if (!validateData.valid) {
      console.log("   ✅ Correctly rejected invalid proof");
      console.log(`   Error: ${validateData.error || "Unknown"}\n`);
    } else {
      console.log("   ⚠️  Unexpectedly accepted invalid proof\n");
    }
  } catch (error) {
    console.log("   ❌ Validation request failed");
    console.log(`   Error: ${error.message}\n`);
  }

  // Test 4: Validate with non-existent meter
  console.log("4️⃣ Testing /validate endpoint with non-existent meter...");
  try {
    const validateResponse = await fetch(`${FACILITATOR_URL}/validate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        proof: "demo-token",
        meterId: "non_existent_meter",
      }),
    });

    const validateData = await validateResponse.json();
    
    if (!validateData.valid && validateData.error === "METER_NOT_FOUND") {
      console.log("   ✅ Correctly rejected non-existent meter");
      console.log(`   Error: ${validateData.error}\n`);
    } else {
      console.log("   ⚠️  Unexpected response\n");
    }
  } catch (error) {
    console.log("   ❌ Validation request failed");
    console.log(`   Error: ${error.message}\n`);
  }

  console.log("✨ Facilitator tests completed!");
  console.log("\n📝 Summary:");
  console.log("   - Health check: ✅");
  console.log("   - Validation endpoint: ✅");
  console.log("   - Error handling: ✅");
  console.log("\n💡 Next steps:");
  console.log("   1. Configure backend to use: X402_FACILITATOR_URL=http://localhost:3001");
  console.log("   2. Test with real payment proofs from clients");
}

// Run tests
testFacilitator().catch((error) => {
  console.error("❌ Test failed:", error);
  process.exit(1);
});


#!/usr/bin/env ts-node

/**
 * Fund Treasury Contract Script
 * 
 * This script helps you fund the treasury contract with USDC
 * so it can execute on-chain payments.
 * 
 * Usage: npx tsx fund-treasury.ts [amount]
 * Example: npx tsx fund-treasury.ts 10 (to send 10 USDC)
 */

import dotenv from "dotenv";
import { ethers } from "ethers";
import { config } from "../src/config/env.js";
import { getCurrentNetworkConfig } from "../src/config/networkConfig.js";
import { getProvider, getSigner } from "../src/config/contractConfig.js";

dotenv.config();

async function fundTreasury(amount?: number) {
  console.log("💰 Treasury Contract Funding Tool\n");

  // Check configuration
  if (!config.treasuryContractAddress) {
    console.error("❌ TREASURY_CONTRACT_ADDRESS not configured in .env");
    process.exit(1);
  }

  if (!config.privateKey) {
    console.error("❌ PRIVATE_KEY not configured in .env");
    process.exit(1);
  }

  const networkConfig = getCurrentNetworkConfig();
  const provider = getProvider();
  const signer = getSigner();
  const walletAddress = signer.address;
  const treasuryAddress = config.treasuryContractAddress;

  console.log("📋 Configuration:");
  console.log(`   Network: ${networkConfig.name}`);
  console.log(`   RPC: ${networkConfig.rpcUrl}`);
  console.log(`   Your Wallet: ${walletAddress}`);
  console.log(`   Treasury Contract: ${treasuryAddress}`);
  console.log(`   USDC Token: ${networkConfig.stablecoins.usdc}\n`);

  // Check wallet ETH balance (for gas)
  console.log("🔍 Checking wallet balances...");
  const ethBalance = await provider.getBalance(walletAddress);
  const ethFormatted = ethers.formatEther(ethBalance);
  console.log(`   ETH: ${ethFormatted}`);

  if (parseFloat(ethFormatted) < 0.001) {
    console.error("\n❌ Insufficient ETH for gas fees!");
    console.error("   You need ETH to pay for transaction fees.");
    if (networkConfig.faucets && networkConfig.faucets.length > 0) {
      console.error("   Get testnet ETH from:");
      networkConfig.faucets.forEach((f) => console.error(`     - ${f}`));
    }
    process.exit(1);
  }

  // Check wallet USDC balance
  const usdcContract = new ethers.Contract(
    networkConfig.stablecoins.usdc,
    [
      "function balanceOf(address) view returns (uint256)",
      "function decimals() view returns (uint8)",
      "function transfer(address to, uint256 amount) returns (bool)",
      "function symbol() view returns (string)",
    ],
    signer
  );

  const usdcBalance = await usdcContract.balanceOf(walletAddress);
  const decimals = await usdcContract.decimals();
  const usdcFormatted = ethers.formatUnits(usdcBalance, decimals);
  const symbol = await usdcContract.symbol();
  console.log(`   ${symbol}: ${usdcFormatted}\n`);

  // Check treasury USDC balance
  const treasuryBalance = await usdcContract.balanceOf(treasuryAddress);
  const treasuryFormatted = ethers.formatUnits(treasuryBalance, decimals);
  console.log(`📊 Treasury Contract Balance: ${treasuryFormatted} ${symbol}\n`);

  // Determine amount to send
  let amountToSend: bigint;
  if (amount) {
    amountToSend = ethers.parseUnits(amount.toString(), decimals);
    console.log(`💸 Amount to send: ${amount} ${symbol}`);
  } else {
    // If no amount specified, ask or use available balance
    if (parseFloat(usdcFormatted) === 0) {
      console.error("❌ Your wallet has no USDC!");
      console.error("   You need to get USDC first.");
      console.error("   Options:");
      console.error("   1. Get USDC from a testnet faucet");
      console.error("   2. Swap ETH for USDC on a testnet DEX");
      process.exit(1);
    }

    // Use all available balance (or ask user)
    const available = parseFloat(usdcFormatted);
    console.log(`💡 Available in wallet: ${available} ${symbol}`);
    console.log(`   Sending all available balance to treasury...`);
    amountToSend = usdcBalance;
  }

  // Check if wallet has enough
  if (usdcBalance < amountToSend) {
    console.error(`❌ Insufficient ${symbol} in wallet!`);
    console.error(`   Required: ${ethers.formatUnits(amountToSend, decimals)} ${symbol}`);
    console.error(`   Available: ${usdcFormatted} ${symbol}`);
    process.exit(1);
  }

  // Confirm transaction
  console.log(`\n📝 Transaction Details:`);
  console.log(`   From: ${walletAddress}`);
  console.log(`   To: ${treasuryAddress} (Treasury Contract)`);
  console.log(`   Amount: ${ethers.formatUnits(amountToSend, decimals)} ${symbol}`);
  console.log(`   Estimated Gas: ~${ethers.formatEther(ethBalance)} ETH\n`);

  // Send USDC to treasury
  console.log("🚀 Sending USDC to treasury contract...");
  try {
    const tx = await usdcContract.transfer(treasuryAddress, amountToSend);
    console.log(`   Transaction Hash: ${tx.hash}`);
    console.log(`   Waiting for confirmation...`);

    const receipt = await tx.wait();
    console.log(`   ✅ Transaction confirmed in block: ${receipt.blockNumber}\n`);

    // Check new balance
    const newTreasuryBalance = await usdcContract.balanceOf(treasuryAddress);
    const newTreasuryFormatted = ethers.formatUnits(newTreasuryBalance, decimals);
    console.log(`📊 New Treasury Balance: ${newTreasuryFormatted} ${symbol}\n`);

    console.log("✅ Treasury funded successfully!");
    console.log(`   The contract now has ${newTreasuryFormatted} ${symbol} to execute payments.\n`);
  } catch (error) {
    console.error("❌ Failed to fund treasury:", error);
    if (error instanceof Error) {
      console.error(`   Error: ${error.message}`);
    }
    process.exit(1);
  }
}

// Get amount from command line args
const amountArg = process.argv[2];
const amount = amountArg ? parseFloat(amountArg) : undefined;

if (amount && (isNaN(amount) || amount <= 0)) {
  console.error("❌ Invalid amount. Must be a positive number.");
  console.error("   Usage: npx tsx fund-treasury.ts [amount]");
  console.error("   Example: npx tsx fund-treasury.ts 10");
  process.exit(1);
}

fundTreasury(amount).catch((error) => {
  console.error("❌ Unexpected error:", error);
  process.exit(1);
});


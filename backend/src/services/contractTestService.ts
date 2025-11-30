import { ethers } from "ethers";
import { getTreasuryContract, getTreasuryContractReadOnly } from "../config/contractConfig.js";
import { getCurrentNetworkConfig } from "../config/networkConfig.js";
import { logger } from "../utils/logger.js";

export type TestResult = {
  step: string;
  success: boolean;
  transactionHash?: string;
  blockNumber?: number;
  gasUsed?: string;
  error?: string;
  data?: {
    owner?: string;
    router?: string;
    signer?: string;
    isOwner?: boolean;
  };
  balance?: string;
  formatted?: string;
  allowance?: string;
};

export type ContractTestResponse = {
  results: TestResult[];
  transactionHashes: string[];
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
};

/**
 * Execute contract test operations similar to testContract.js
 * Returns test results with transaction hashes
 */
export async function executeContractTest(): Promise<ContractTestResponse> {
  logger.info("🧪 Executing contract test operations...");
  const results: TestResult[] = [];
  const transactionHashes: string[] = [];

  try {
    // Log network configuration for debugging
    const networkConfig = getCurrentNetworkConfig();
    logger.info(`🌐 Network: ${networkConfig.name} (${networkConfig.chainId})`);
    logger.info(`💰 USDC address: ${networkConfig.stablecoins.usdc}`);
    logger.info(`💰 USDT address: ${networkConfig.stablecoins.usdt}`);

    const contract = getTreasuryContract();
    const contractReadOnly = getTreasuryContractReadOnly();
    const signer = contract.runner as ethers.Wallet;
    const signerAddress = await signer.getAddress();

    // 1. Read contract information
    logger.info("1️⃣ Reading contract information...");
    try {
      const owner = await contractReadOnly.owner();
      const router = await contractReadOnly.router();
      const isOwner = owner.toLowerCase() === signerAddress.toLowerCase();

      results.push({
        step: "1. Contract Info",
        success: true,
        data: {
          owner,
          router,
          signer: signerAddress,
          isOwner,
        },
      });
      logger.info(`   ✅ Owner: ${owner}`);
      logger.info(`   ✅ Router: ${router}`);
      logger.info(`   ${isOwner ? "✅ You are the owner" : "❌ You are NOT the owner"}`);
    } catch (error: any) {
      results.push({
        step: "1. Contract Info",
        success: false,
        error: error.message,
      });
      logger.error(`   ❌ Error: ${error.message}`);
    }

    // 2. Test requestPayment
    logger.info("2️⃣ Testing requestPayment...");
    try {
      const networkConfig = getCurrentNetworkConfig();
      const testPayee = "0x60aE616a2155Ee3d9A68541Ba4544862310933d4";
      const testAmount = ethers.parseUnits("1.0", 6); // 1 USDC (6 decimals)
      const testToken = networkConfig.stablecoins.usdc; // USDC address for current network

      const tx = await contract.requestPayment(testPayee, testAmount, testToken);
      logger.info(`   ⏳ Transaction sent: ${tx.hash}`);
      transactionHashes.push(tx.hash);

      const receipt = await tx.wait();
      logger.info(`   ✅ Transaction confirmed in block: ${receipt.blockNumber}`);

      results.push({
        step: "2. Request Payment",
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      });
    } catch (error: any) {
      results.push({
        step: "2. Request Payment",
        success: false,
        error: error.message,
      });
      logger.error(`   ❌ Error: ${error.message}`);
    }

    // 3. Test getTokenBalance
    logger.info("3️⃣ Testing getTokenBalance...");
    try {
      const networkConfig = getCurrentNetworkConfig();
      const usdcAddress = networkConfig.stablecoins.usdc; // USDC address for current network
      logger.info(`   Using USDC address: ${usdcAddress} for network: ${networkConfig.name}`);
      const balance = await contractReadOnly.getTokenBalance(usdcAddress);
      const formatted = ethers.formatUnits(balance, 6);

      results.push({
        step: "3. Get Token Balance",
        success: true,
        balance: balance.toString(),
        formatted: `${formatted} USDC`,
      });
      logger.info(`   ✅ USDC balance: ${formatted} USDC`);
    } catch (error: any) {
      results.push({
        step: "3. Get Token Balance",
        success: false,
        error: error.message,
      });
      logger.error(`   ❌ Error: ${error.message}`);
    }

    // 4. Test authorizeSwap (only if owner)
    logger.info("4️⃣ Testing authorizeSwap (owner only)...");
    try {
      const networkConfig = getCurrentNetworkConfig();
      const fromToken = networkConfig.stablecoins.usdc; // USDC
      const toToken = networkConfig.stablecoins.usdt; // USDT
      const maxAmount = ethers.parseUnits("1000", 6); // 1000 USDC

      const tx = await contract.authorizeSwap(fromToken, toToken, maxAmount);
      logger.info(`   ⏳ Transaction sent: ${tx.hash}`);
      transactionHashes.push(tx.hash);

      const receipt = await tx.wait();
      logger.info(`   ✅ Swap authorized in block: ${receipt.blockNumber}`);

      // Verify it was saved
      const allowance = await contractReadOnly.swapAllowances(fromToken, toToken);
      const formattedAllowance = ethers.formatUnits(allowance, 6);

      results.push({
        step: "4. Authorize Swap",
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        allowance: `${formattedAllowance} USDC`,
      });
      logger.info(`   ✅ Allowance saved: ${formattedAllowance} USDC`);
    } catch (error: any) {
      if (error.message.includes("Not owner")) {
        results.push({
          step: "4. Authorize Swap",
          success: false,
          error: "Not owner - this function requires owner permissions",
        });
        logger.warn(`   ⚠️  You are not the owner`);
      } else {
        results.push({
          step: "4. Authorize Swap",
          success: false,
          error: error.message,
        });
        logger.error(`   ❌ Error: ${error.message}`);
      }
    }

    // 5. Verify swapAllowances
    logger.info("5️⃣ Verifying swapAllowances...");
    try {
      const networkConfig = getCurrentNetworkConfig();
      const fromToken = networkConfig.stablecoins.usdc; // USDC
      const toToken = networkConfig.stablecoins.usdt; // USDT
      const allowance = await contractReadOnly.swapAllowances(fromToken, toToken);
      const formatted = ethers.formatUnits(allowance, 6);

      results.push({
        step: "5. Verify Swap Allowances",
        success: true,
        allowance: `${formatted} USDC`,
      });
      logger.info(`   ✅ Allowance USDC -> USDT: ${formatted} USDC`);
    } catch (error: any) {
      results.push({
        step: "5. Verify Swap Allowances",
        success: false,
        error: error.message,
      });
      logger.error(`   ❌ Error: ${error.message}`);
    }

    // Calculate summary
    const successCount = results.filter((r) => r.success).length;
    const totalCount = results.length;

    logger.info(`✨ Contract test completed: ${successCount}/${totalCount} operations successful`);

    return {
      results,
      transactionHashes,
      summary: {
        total: totalCount,
        successful: successCount,
        failed: totalCount - successCount,
      },
    };
  } catch (error) {
    logger.error("❌ Error executing contract test:", error);
    throw error;
  }
}


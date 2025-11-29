import { getTreasuryContract, getTreasuryContractReadOnly } from "../config/contractConfig";
import { logger } from "../utils/logger";

/**
 * Treasury Client Service
 * Wrapper for ethers.js interactions with SnowRailTreasury contract
 */

/**
 * Request an onchain payment
 * @param payee - Address to receive payment
 * @param amount - Amount in token units (bigint)
 * @param token - ERC20 token address
 * 
 * TODO: In production, handle transaction failures gracefully
 * TODO: Implement retry logic with exponential backoff
 */
export async function requestOnchainPayment(
  payee: string,
  amount: bigint,
  token: string
): Promise<string> {
  try {
    const contract = getTreasuryContract();
    logger.info(`Requesting payment: ${amount} to ${payee}`);
    
    const tx = await contract.requestPayment(payee, amount, token);
    const receipt = await tx.wait();
    
    logger.info(`Payment requested. TX: ${receipt.hash}`);
    return receipt.hash;
  } catch (error) {
    logger.error("Failed to request onchain payment", error);
    throw error;
  }
}

/**
 * Execute an onchain payment from treasury
 * @param payer - Original payer address
 * @param payee - Address to receive payment
 * @param amount - Amount in token units (bigint)
 * @param token - ERC20 token address
 * 
 * TODO: Read PaymentExecuted/PaymentFailed events to verify outcome
 * TODO: Implement gas estimation before sending
 */
export async function executeOnchainPayment(
  payer: string,
  payee: string,
  amount: bigint,
  token: string
): Promise<string> {
  try {
    const contract = getTreasuryContract();
    logger.info(`Executing payment: ${amount} from ${payer} to ${payee}`);
    
    const tx = await contract.executePayment(payer, payee, amount, token);
    const receipt = await tx.wait();
    
    logger.info(`Payment executed. TX: ${receipt.hash}`);
    return receipt.hash;
  } catch (error) {
    logger.error("Failed to execute onchain payment", error);
    throw error;
  }
}

/**
 * Authorize a token swap
 * @param fromToken - Source token address
 * @param toToken - Destination token address
 * @param maxAmount - Maximum amount allowed
 */
export async function authorizeSwap(
  fromToken: string,
  toToken: string,
  maxAmount: bigint
): Promise<string> {
  try {
    const contract = getTreasuryContract();
    logger.info(`Authorizing swap: ${fromToken} -> ${toToken}, max: ${maxAmount}`);
    
    const tx = await contract.authorizeSwap(fromToken, toToken, maxAmount);
    const receipt = await tx.wait();
    
    logger.info(`Swap authorized. TX: ${receipt.hash}`);
    return receipt.hash;
  } catch (error) {
    logger.error("Failed to authorize swap", error);
    throw error;
  }
}

/**
 * Get treasury token balance (read-only)
 * @param token - ERC20 token address
 * @returns Balance in token units
 */
export async function getTreasuryBalance(token: string): Promise<bigint> {
  try {
    const contract = getTreasuryContractReadOnly();
    const balance = await contract.getTokenBalance(token);
    return balance;
  } catch (error) {
    logger.error("Failed to get treasury balance", error);
    throw error;
  }
}

/**
 * Get swap allowance (read-only)
 * @param fromToken - Source token address
 * @param toToken - Destination token address
 * @returns Allowed swap amount
 */
export async function getSwapAllowance(
  fromToken: string,
  toToken: string
): Promise<bigint> {
  try {
    const contract = getTreasuryContractReadOnly();
    const allowance = await contract.swapAllowances(fromToken, toToken);
    return allowance;
  } catch (error) {
    logger.error("Failed to get swap allowance", error);
    throw error;
  }
}


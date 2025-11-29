import { ethers, Contract, Wallet, JsonRpcProvider } from "ethers";
import { config } from "./env.js";
import { getCurrentNetworkConfig } from "./networkConfig.js";

// Minimal ABI for SnowRailTreasury contract
export const TREASURY_ABI = [
  "function owner() view returns (address)",
  "function router() view returns (address)",
  "function swapAllowances(address, address) view returns (uint256)",
  "function requestPayment(address payee, uint256 amount, address token)",
  "function authorizeSwap(address fromToken, address toToken, uint256 maxAmount)",
  "function executePayment(address payer, address payee, uint256 amount, address token)",
  "function executeSwap(address fromToken, address toToken, uint256 amountIn, uint256 amountOutMin, address[] path)",
  "function getTokenBalance(address token) view returns (uint256)",
  "event PaymentRequested(address indexed payer, address indexed payee, uint256 amount, address token)",
  "event PaymentExecuted(address indexed payer, address indexed payee, uint256 amount, address token)",
  "event PaymentFailed(address indexed payer, address indexed payee, uint256 amount, address token, string reason)",
  "event SwapAuthorized(address indexed owner, address indexed fromToken, address indexed toToken, uint256 maxAmount)",
  "event SwapExecuted(address indexed swapper, address indexed fromToken, address indexed toToken, uint256 amount)",
] as const;

let provider: JsonRpcProvider | null = null;
let signer: Wallet | null = null;
let treasuryContract: Contract | null = null;

// Get or create provider instance
export function getProvider(): JsonRpcProvider {
  if (!provider) {
    const networkConfig = getCurrentNetworkConfig();
    provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
  }
  return provider;
}

// Get or create signer instance
export function getSigner(): Wallet {
  if (!signer) {
    if (!config.privateKey) {
      throw new Error("PRIVATE_KEY not configured");
    }
    signer = new Wallet(config.privateKey, getProvider());
  }
  return signer;
}

// Get or create treasury contract instance
export function getTreasuryContract(): Contract {
  if (!treasuryContract) {
    if (!config.treasuryContractAddress) {
      throw new Error("TREASURY_CONTRACT_ADDRESS not configured");
    }
    treasuryContract = new Contract(
      config.treasuryContractAddress,
      TREASURY_ABI,
      getSigner(),
    );
  }
  return treasuryContract;
}

// Get read-only contract (no signer needed)
export function getTreasuryContractReadOnly(): Contract {
  if (!config.treasuryContractAddress) {
    throw new Error("TREASURY_CONTRACT_ADDRESS not configured");
  }
  return new Contract(
    config.treasuryContractAddress,
    TREASURY_ABI,
    getProvider(),
  );
}



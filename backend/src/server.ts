import express, { type Express } from "express";
import dotenv from "dotenv";
import { ExampleService } from "./ExampleService.js";
import {
  MerchantExecutor,
  type MerchantExecutorOptions,
} from "./MerchantExecutor.js";
import type { Network, PaymentPayload } from "x402/types";
import {
  EventQueue,
  Message,
  RequestContext,
  Task,
  TaskState,
} from "./x402Types.js";
import { registerPayrollRoutes } from "./api/payrollRoutes.js";
import { registerPaymentRoutes } from "./api/paymentRoutes.js";
import { registerAuthRoutes } from "./api/authRoutes.js";
import {
  getTreasuryBalance,
  testContract,
  initializeTreasuryController,
} from "./api/treasury.controller.js";
import { createFacilitatorRouter } from "./x402/facilitatorServer.js";
import { x402Protect } from "./x402/middleware.js";
import { config } from "./config/env.js";
import { getAgentIdentity } from "./x402/agentIdentity.js";
import { registerAgentRoutes } from "./api/agentRoutes.js";

// Load environment variables
dotenv.config();

const app: Express = express();

// CORS Configuration - MUST be before express.json() and all routes
const defaultCorsOrigins = [
  "http://localhost:3001",
  "http://localhost:5173", // Vite default port
  "https://app.snowrail.xyz", // Production frontend (custom domain)
  "https://snow-rail.vercel.app", // Production frontend (Vercel)
];

const envCorsOrigins = (process.env.CORS_ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set([...defaultCorsOrigins, ...envCorsOrigins]);

// CORS middleware - must be FIRST, before express.json() and all routes
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Handle preflight requests FIRST - always respond to OPTIONS
  if (req.method === "OPTIONS") {
    // Check if origin is allowed
    if (origin && allowedOrigins.has(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Access-Control-Allow-Credentials", "true");
    }
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, X-PAYMENT, Authorization",
    );
    res.header(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    );
    res.header("Access-Control-Max-Age", "86400"); // 24 hours
    res.sendStatus(204);
    return;
  }
  
  // For actual requests, check if origin is allowed
  if (origin && allowedOrigins.has(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Vary", "Origin");
  }
  
  // Always set these headers
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, X-PAYMENT, Authorization",
  );
  res.header(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  );

  next();
});

// Parse JSON bodies - AFTER CORS middleware
app.use(express.json());

// Configuration
const PORT = process.env.PORT || 3000;
const PAY_TO_ADDRESS = process.env.PAY_TO_ADDRESS;
const NETWORK = config.network; // Use config.network which maps "fuji" to "avalanche-fuji"
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const FACILITATOR_URL = process.env.FACILITATOR_URL;
const FACILITATOR_API_KEY = process.env.FACILITATOR_API_KEY;
const SERVICE_URL =
  process.env.SERVICE_URL || `http://localhost:${PORT}/process`;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = process.env.RPC_URL;
const SETTLEMENT_MODE_ENV = process.env.SETTLEMENT_MODE?.toLowerCase();
const ASSET_ADDRESS = process.env.ASSET_ADDRESS;
const ASSET_NAME = process.env.ASSET_NAME;
const EXPLORER_URL = process.env.EXPLORER_URL;
const CHAIN_ID = process.env.CHAIN_ID
  ? Number.parseInt(process.env.CHAIN_ID, 10)
  : undefined;
const AI_PROVIDER = process.env.AI_PROVIDER?.toLowerCase() || undefined;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL;
const EIGENAI_BASE_URL =
  process.env.EIGENAI_BASE_URL || 'https://eigenai.eigencloud.xyz/v1';
const EIGENAI_API_KEY = process.env.EIGENAI_API_KEY;
const AI_MODEL = process.env.AI_MODEL;
const AI_TEMPERATURE = process.env.AI_TEMPERATURE
  ? Number.parseFloat(process.env.AI_TEMPERATURE)
  : undefined;
const AI_MAX_TOKENS = process.env.AI_MAX_TOKENS
  ? Number.parseInt(process.env.AI_MAX_TOKENS, 10)
  : undefined;
const AI_SEED = process.env.AI_SEED
  ? Number.parseInt(process.env.AI_SEED, 10)
  : undefined;
const SUPPORTED_NETWORKS: Network[] = [
  'base',
  'base-sepolia',
  'polygon',
  'polygon-amoy',
  'avalanche',
  'avalanche-fuji',
  'iotex',
  'sei',
  'sei-testnet',
  'peaq',
  'solana',
  'solana-devnet',
];

// Validate environment variables (AI is optional)
if (AI_PROVIDER) {
  if (AI_PROVIDER === 'openai') {
    if (!OPENAI_API_KEY) {
      console.warn('⚠️  OPENAI_API_KEY not set. AI features will be disabled.');
      console.warn('   Set OPENAI_API_KEY in environment to enable AI features.');
    }
  } else if (AI_PROVIDER === 'eigenai') {
    if (!EIGENAI_API_KEY && !OPENAI_API_KEY) {
      console.warn('⚠️  EIGENAI_API_KEY (or OPENAI_API_KEY fallback) not set. AI features will be disabled.');
      console.warn('   Set EIGENAI_API_KEY in environment to enable AI features.');
    }
  } else {
    console.error(
      `❌ AI_PROVIDER "${AI_PROVIDER}" is not supported. Supported providers: openai, eigenai`
    );
    process.exit(1);
  }
} else {
  console.log('ℹ️  AI_PROVIDER not configured. AI features will be disabled.');
}

if (!PAY_TO_ADDRESS) {
  console.error('❌ PAY_TO_ADDRESS is required');
  process.exit(1);
}

if (!SUPPORTED_NETWORKS.includes(NETWORK as Network)) {
  console.error(
    `❌ NETWORK "${NETWORK}" is not supported. Supported networks: ${SUPPORTED_NETWORKS.join(
      ', '
    )}`
  );
  process.exit(1);
}

const resolvedNetwork = NETWORK as Network;

let settlementMode: 'facilitator' | 'direct';
if (SETTLEMENT_MODE_ENV === 'local' || SETTLEMENT_MODE_ENV === 'direct') {
  settlementMode = 'direct';
} else if (SETTLEMENT_MODE_ENV === 'facilitator') {
  settlementMode = 'facilitator';
} else if (FACILITATOR_URL) {
  settlementMode = 'facilitator';
} else if (PRIVATE_KEY) {
  settlementMode = 'direct';
} else {
  settlementMode = 'facilitator';
}

if (settlementMode === 'direct' && !PRIVATE_KEY) {
  console.error('❌ SETTLEMENT_MODE=local requires PRIVATE_KEY to be configured');
  process.exit(1);
}

// Create ExampleService only if AI_PROVIDER is configured and has required credentials
let exampleService: ExampleService | null = null;
if (AI_PROVIDER) {
  const hasOpenAICreds = AI_PROVIDER === 'openai' && OPENAI_API_KEY;
  const hasEigenAICreds = AI_PROVIDER === 'eigenai' && (EIGENAI_API_KEY || OPENAI_API_KEY);
  
  if (hasOpenAICreds || hasEigenAICreds) {
    try {
      exampleService = new ExampleService({
        provider: AI_PROVIDER === 'eigenai' ? 'eigenai' : 'openai',
        apiKey: AI_PROVIDER === 'openai' ? OPENAI_API_KEY : undefined,
        baseUrl:
          AI_PROVIDER === 'eigenai'
            ? EIGENAI_BASE_URL
            : OPENAI_BASE_URL || undefined,
        defaultHeaders:
          AI_PROVIDER === 'eigenai'
            ? { 'x-api-key': (EIGENAI_API_KEY || OPENAI_API_KEY)! }
            : undefined,
        payToAddress: PAY_TO_ADDRESS,
        network: resolvedNetwork,
        model:
          AI_MODEL ??
          (AI_PROVIDER === 'eigenai' ? 'gpt-oss-120b-f16' : 'gpt-4o-mini'),
        temperature: AI_TEMPERATURE ?? 0.7,
        maxTokens: AI_MAX_TOKENS ?? 500,
        seed: AI_PROVIDER === 'eigenai' ? AI_SEED : undefined,
      });
      console.log(`✅ AI service initialized with provider: ${AI_PROVIDER}`);
    } catch (error) {
      console.warn('⚠️  Failed to initialize AI service:', error);
      console.warn('   AI features will be disabled.');
    }
  } else {
    console.warn(`⚠️  AI_PROVIDER=${AI_PROVIDER} but missing required API keys. AI features disabled.`);
  }
}

// Initialize the example service (replace with your own service)
const merchantOptions: MerchantExecutorOptions = {
  payToAddress: PAY_TO_ADDRESS,
  network: resolvedNetwork,
  price: 0.1,
  facilitatorUrl: FACILITATOR_URL,
  facilitatorApiKey: FACILITATOR_API_KEY,
  resourceUrl: SERVICE_URL,
  settlementMode,
  rpcUrl: RPC_URL,
  privateKey: PRIVATE_KEY,
  assetAddress: ASSET_ADDRESS,
  assetName: ASSET_NAME,
  explorerUrl: EXPLORER_URL,
  chainId: CHAIN_ID,
};

const merchantExecutor = new MerchantExecutor(merchantOptions);

// Initialize treasury controller with agent and executor (service can be null)
initializeTreasuryController(exampleService, merchantExecutor);

if (settlementMode === 'direct') {
  console.log('🧩 Using local settlement (direct EIP-3009 via RPC)');
  if (RPC_URL) {
    console.log(`🔌 RPC endpoint: ${RPC_URL}`);
  } else {
    console.log('🔌 RPC endpoint: using default for selected network');
  }
} else if (FACILITATOR_URL) {
  console.log(`🌐 Using custom facilitator: ${FACILITATOR_URL}`);
} else {
  console.log('🌐 Using default facilitator: https://x402.org/facilitator');
}

console.log("🚀 x402 Payment API initialized");
console.log(`💰 Payment address: ${PAY_TO_ADDRESS}`);
console.log(`🌐 Network: ${resolvedNetwork}`);
console.log("💵 Price per request: $0.10 USDC");

// Register authentication routes
registerAuthRoutes(app);

// Register merchant API routes (for inbound payments)
import { registerMerchantRoutes } from "./api/merchantRoutes.js";
if (config.merchantApiEnabled) {
  registerMerchantRoutes(app);
  console.log("✅ Merchant API enabled");
}

// Register internal routes (callbacks, webhooks)
import { registerInternalRoutes } from "./api/internalRoutes.js";
registerInternalRoutes(app);

// Register dashboard routes (protected)
import { registerDashboardRoutes } from "./api/dashboardRoutes.js";
registerDashboardRoutes(app);

// Register mock routes for testing (protected)
import { registerMockRoutes } from "./api/mockRoutes.js";
registerMockRoutes(app);

// Register SnowRail payroll API (x402-protected) under /api
registerPayrollRoutes(app);

// Register integrated payment routes (replaces old agent/facilitator test endpoints)
registerPaymentRoutes(app);

// Register agent routes (identity, activity, stats)
registerAgentRoutes(app);

// Register Treasury API routes
app.get("/api/treasury/balance", getTreasuryBalance);
app.post("/api/treasury/test", x402Protect("contract_test"), testContract);

// Register facilitator routes (integrated in same server)
// Mount facilitator endpoints under /facilitator prefix
app.use("/facilitator", createFacilitatorRouter());

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'x402-payment-api',
    version: '1.0.0',
    payment: {
      address: PAY_TO_ADDRESS,
      network: NETWORK,
      price: '$0.10',
    },
  });
});

/**
 * ERC-8004 Agent Identity Card
 * Allows other AI agents to discover SnowRail's capabilities
 * Part of Sovereign Agent Stack: Identity & Reputation Layer
 */
app.get('/agent/identity', (req, res) => {
  console.log('🤖 Agent identity card requested');
  const identity = getAgentIdentity();
  res.json(identity);
});

/**
 * Main endpoint to process paid requests
 * This endpoint accepts A2A-compatible task submissions with x402 payments
 */
app.post('/process', async (req, res) => {
  try {
    // Check if AI service is available
    if (!exampleService) {
      return res.status(503).json({
        error: 'AI service not available',
        message: 'AI_PROVIDER is not configured or missing required API keys. Please configure AI_PROVIDER and API keys to use this endpoint.',
      });
    }

    console.log('\n📥 Received request');
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    // Parse the incoming request
    const { message, taskId, contextId, metadata } = req.body;

    if (!message) {
      return res.status(400).json({
        error: 'Missing message in request body',
      });
    }

    // Create a task from the request
    const task: Task = {
      id: taskId || `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      contextId: contextId || `context-${Date.now()}`,
      status: {
        state: TaskState.INPUT_REQUIRED,
        message: message,
      },
      metadata: metadata || {},
    };

    // Create request context
    const context: RequestContext = {
      taskId: task.id,
      contextId: task.contextId,
      currentTask: task,
      message: message,
    };

    // Create event queue to collect responses
    const events: Task[] = [];
    const eventQueue: EventQueue = {
      enqueueEvent: async (event: Task) => {
        events.push(event);
      },
    };

    const paymentPayload = message.metadata?.['x402.payment.payload'] as
      | PaymentPayload
      | undefined;
    const paymentStatus = message.metadata?.['x402.payment.status'];

    // IMPORTANT - Check if payment is missing or not yet submitted
    // If not, we return a payment-required response with the payment requirements embedded in the task metadata.
    // This follows the A2A pattern where payment requirements are communicated through message metadata.
    if (!paymentPayload || paymentStatus !== 'payment-submitted') {
      const paymentRequired = merchantExecutor.createPaymentRequiredResponse();

      const responseMessage: Message = {
        messageId: `msg-${Date.now()}`,
        role: 'agent',
        parts: [
          {
            kind: 'text',
            text: 'Payment required. Please submit payment to continue.',
          },
        ],
        metadata: {
          'x402.payment.required': paymentRequired,
          'x402.payment.status': 'payment-required',
        },
      };

      task.status.state = TaskState.INPUT_REQUIRED;
      task.status.message = responseMessage;
      task.metadata = {
        ...(task.metadata || {}),
        'x402.payment.required': paymentRequired,
        'x402.payment.status': 'payment-required',
      };

      events.push(task);
      console.log('💰 Payment required for request processing');

      return res.json({
        success: false,
        error: 'Payment Required',
        task,
        events,
      });
    }

    // Extract agent ID from message metadata for tracking
    const agentId = message.metadata?.['agent.id'] || contextId || task.id;
    console.log(`\n🤖 Processing request for agent: ${agentId}`);

    // Verify the payment signature and authorization details (amount, recipient, timing) against the payment requirements.
    // This ensures the payment is cryptographically valid and matches what the merchant expects before processing the request.
    console.log(`🔍 Verifying payment for agent: ${agentId}`);
    const verifyResult = await merchantExecutor.verifyPayment(paymentPayload);

    if (!verifyResult.isValid) {
      const errorReason = verifyResult.invalidReason || 'Invalid payment';
      task.status.state = TaskState.FAILED;
      task.status.message = {
        messageId: `msg-${Date.now()}`,
        role: 'agent',
        parts: [
          {
            kind: 'text',
            text: `Payment verification failed: ${errorReason}`,
          },
        ],
        metadata: {
          'x402.payment.status': 'payment-rejected',
          'x402.payment.error': errorReason,
        },
      };
      task.metadata = {
        ...(task.metadata || {}),
        'x402.payment.status': 'payment-rejected',
        'x402.payment.error': errorReason,
      };

      events.push(task);

      return res.status(402).json({
        error: 'Payment verification failed',
        reason: errorReason,
        task,
        events,
      });
    }

    task.metadata = {
      ...(task.metadata || {}),
      'x402_payment_verified': true,
      'x402.payment.status': 'payment-verified',
      ...(verifyResult.payer ? { 'x402.payment.payer': verifyResult.payer } : {}),
    };

    // Execute the AI agent's core logic to process the user's request.
    // This calls the LLM (e.g., OpenAI) with the conversation context and streams
    // the response back through the event queue, updating the task with the AI's reply.
    await exampleService.execute(context, eventQueue);

    // Settle the payment on-chain by executing the transferWithAuthorization transaction.
    // This submits the signed authorization to the blockchain, transferring USDC from the payer
    // to the merchant's wallet. Returns settlement result with transaction hash and status.
    console.log(`💰 Settling payment for agent: ${agentId}`);
    const settlement = await merchantExecutor.settlePayment(paymentPayload);
    
    // Log transaction details for agent tracking
    if (settlement.success && settlement.transaction) {
      console.log(`✅ Transaction generated for agent ${agentId}:`);
      console.log(`   Transaction Hash: ${settlement.transaction}`);
      console.log(`   Network: ${settlement.network}`);
      console.log(`   Payer: ${settlement.payer || 'N/A'}`);
    } else {
      console.log(`❌ Settlement failed for agent ${agentId}: ${settlement.errorReason || 'Unknown error'}`);
    }

    // Update the task metadata with the payment status and settlement result.
    // This includes the transaction hash (if successful) and any error reason (if failed).
    task.metadata = {
      ...(task.metadata || {}),
      'agent.id': agentId, // Track agent ID in metadata
      'x402.payment.status': settlement.success ? 'payment-completed' : 'payment-failed',
      ...(settlement.transaction
        ? { 
            'x402.payment.receipts': [settlement],
            'x402.payment.transaction': settlement.transaction,
            'x402.payment.network': settlement.network,
          }
        : {}),
      ...(settlement.errorReason
        ? { 'x402.payment.error': settlement.errorReason }
        : {}),
    };

    if (events.length === 0) {
      events.push(task);
    }

    console.log('📤 Sending response\n');

    // Return the final response to the client, including the success/failure status,
    // the final task (with AI response and payment status), and the settlement result.
    // This completes the A2A flow by sending the AI's response back to the client.
    return res.json({
      success: settlement.success,
      task: events[events.length - 1],
      events,
      settlement,
    });
  } catch (error: any) {
    console.error('❌ Error processing request:', error);

    return res.status(500).json({
      error: error.message || 'Internal server error',
    });
  }
});

/**
 * Endpoint to validate agent transactions
 * GET /validate-agent/:agentId
 * Validates that an agent has:
 * 1. Called the contract (through facilitator)
 * 2. Generated a transaction
 * 3. Been validated by the facilitator
 */
app.get('/validate-agent/:agentId', async (req, res) => {
  try {
    const agentId = req.params.agentId;
    console.log(`\n🔍 Validating agent: ${agentId}`);

    // This is a placeholder - in production, you'd query a database
    // or check logs for transactions associated with this agent ID
    // For now, we'll return validation instructions

    const validationResult = {
      agentId,
      timestamp: new Date().toISOString(),
      validation: {
        facilitatorHealth: 'Check facilitator /health endpoint',
        contractCall: 'Check transaction logs for agent ID',
        transactionGenerated: 'Check settlement receipts in task metadata',
        facilitatorValidation: 'Check facilitator /verify endpoint logs',
      },
      instructions: [
        '1. Check facilitator health: GET /facilitator/health',
        '2. Look for transactions in task metadata with agent ID',
        '3. Verify transaction hash on blockchain explorer',
        '4. Check facilitator validation logs',
      ],
      note: 'Use the validate-agent-transaction.js script for automated validation',
    };

    res.json(validationResult);
  } catch (error: any) {
    console.error('❌ Error validating agent:', error);
    res.status(500).json({
      error: error.message || 'Internal server error',
    });
  }
});

/**
 * Simple test endpoint to try the agent
 */
app.post('/test', async (req, res) => {
  const message: Message = {
    messageId: `msg-${Date.now()}`,
    role: 'user',
    parts: [
      {
        kind: 'text',
        text: req.body.text || 'Hello, tell me a joke!',
      },
    ],
  };

  try {
    const fetchResponse = await fetch(`http://localhost:${PORT}/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });

    const data = await (fetchResponse as { json: () => Promise<any> }).json();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({
      error: error.message,
    });
  }
});

// Export app for Vercel serverless functions
export default app;

// Start the server only in development (not in Vercel)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n✅ Server running on http://localhost:${PORT}`);
    console.log(`📖 Health check: http://localhost:${PORT}/health`);
    console.log(`🧪 Test endpoint: POST http://localhost:${PORT}/test`);
    console.log(`🚀 Main endpoint: POST http://localhost:${PORT}/process`);
    console.log(`🔍 Validate agent: GET http://localhost:${PORT}/validate-agent/:agentId`);
    console.log(`🧪 Contract test: POST http://localhost:${PORT}/api/treasury/test`);
    console.log(`💳 Facilitator: http://localhost:${PORT}/facilitator`);
    console.log(`   - Health: http://localhost:${PORT}/facilitator/health`);
    console.log(`   - Validate: POST http://localhost:${PORT}/facilitator/validate`);
    console.log(`   - Verify: POST http://localhost:${PORT}/facilitator/verify`);
    console.log(`   - Settle: POST http://localhost:${PORT}/facilitator/settle\n`);
  });
}

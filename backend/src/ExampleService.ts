import OpenAI from 'openai';
import { EventQueue, RequestContext, TaskState } from './x402Types.js';
import { getTreasuryContract, getTreasuryContractReadOnly } from './config/contractConfig.js';
import { getCurrentNetworkConfig } from './config/networkConfig.js';
import { logger } from './utils/logger.js';
import { ethers } from 'ethers';

type AiProvider = 'openai' | 'eigenai';

interface ExampleServiceOptions {
  apiKey?: string;
  baseUrl?: string;
  defaultHeaders?: Record<string, string>;
  provider: AiProvider;
  payToAddress: string;
  network: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  seed?: number;
}

/**
 * ExampleService - A sample service implementation using an OpenAI-compatible API
 *
 * This is a demonstration of how to process paid requests.
 * Replace this with your own service logic (database queries, computations, API calls, etc.)
 *
 * Payment validation is handled by the server before this service is invoked.
 */
export class ExampleService {
  private openai: OpenAI;
  private payToAddress: string;
  private network: string;
  private readonly model: string;
  private readonly temperature: number;
  private readonly maxTokens?: number;
  private readonly seed?: number;
  private readonly provider: AiProvider;

  constructor({
    apiKey,
    baseUrl,
    defaultHeaders,
    provider,
    payToAddress,
    network,
    model,
    temperature = 0.7,
    maxTokens = 500,
    seed,
  }: ExampleServiceOptions) {
    const clientOptions: ConstructorParameters<typeof OpenAI>[0] = {};

    if (provider === 'openai') {
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY is required when using the OpenAI provider');
      }
      clientOptions.apiKey = apiKey;
    } else if (provider === 'eigenai') {
      if (!defaultHeaders?.['x-api-key']) {
        throw new Error('EIGENAI_API_KEY is required when using the EigenAI provider');
      }
    }

    if (baseUrl) {
      clientOptions.baseURL = baseUrl;
    }

    if (defaultHeaders && Object.keys(defaultHeaders).length > 0) {
      clientOptions.defaultHeaders = defaultHeaders;
    }

    this.openai = new OpenAI(clientOptions);
    this.payToAddress = payToAddress;
    this.network = network;
    this.model = model ?? (provider === 'eigenai' ? 'gpt-oss-120b-f16' : 'gpt-4o-mini');
    this.temperature = temperature;
    this.maxTokens = maxTokens;
    this.seed = seed;
    this.provider = provider;
  }

  async execute(context: RequestContext, eventQueue: EventQueue): Promise<void> {
    const task = context.currentTask;

    if (!task) {
      throw new Error('No task found in context');
    }
    console.log('✅ Payment verified, processing request...');

    // Extract user message from the context
    const userMessage = context.message?.parts
      ?.filter((part: any) => part.kind === 'text')
      .map((part: any) => part.text)
      .join(' ') || 'Hello';

    console.log(`📝 User request: ${userMessage}`);

    // Check if this is a contract test request
    if (userMessage.toLowerCase().includes('test contract') || userMessage.toLowerCase().includes('test treasury')) {
      return await this.executeContractTest(context, eventQueue);
    }

    try {
      // Call OpenAI API to process the request
      // REPLACE THIS with your own service logic
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI assistant. Provide concise and accurate responses.',
          },
          {
            role: 'user',
            content: userMessage,
          },
        ],
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        ...(this.provider === 'eigenai' && this.seed !== undefined
          ? { seed: this.seed }
          : {}),
      });

      const response = completion.choices[0]?.message?.content || 'No response generated';

      console.log(`🤖 Service response: ${response}`);

      // Update task with the response
      task.status.state = TaskState.COMPLETED;
      task.status.message = {
        messageId: `msg-${Date.now()}`,
        role: 'agent',
        parts: [
          {
            kind: 'text',
            text: response,
          },
        ],
      };

      // Enqueue the completed task
      await eventQueue.enqueueEvent(task);

      console.log('✨ Request processed successfully');
    } catch (error) {
      console.error('❌ Error processing request:', error);

      // Update task with error
      task.status.state = TaskState.FAILED;
      task.status.message = {
        messageId: `msg-${Date.now()}`,
        role: 'agent',
        parts: [
          {
            kind: 'text',
            text: `Error processing request: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };

      await eventQueue.enqueueEvent(task);
      throw error;
    }
  }

  /**
   * Execute contract test operations similar to testContract.js
   */
  private async executeContractTest(context: RequestContext, eventQueue: EventQueue): Promise<void> {
    const task = context.currentTask;
    if (!task) {
      throw new Error('No task found in context');
    }

    console.log('🧪 Executing contract test operations...');
    const results: any[] = [];
    const transactionHashes: string[] = [];

    try {
      const contract = getTreasuryContract();
      const contractReadOnly = getTreasuryContractReadOnly();
      const signer = contract.runner as ethers.Wallet;
      const signerAddress = await signer.getAddress();

      // 1. Read contract information
      console.log('1️⃣ Reading contract information...');
      try {
        const owner = await contractReadOnly.owner();
        const router = await contractReadOnly.router();
        const isOwner = owner.toLowerCase() === signerAddress.toLowerCase();
        
        results.push({
          step: '1. Contract Info',
          success: true,
          data: {
            owner,
            router,
            signer: signerAddress,
            isOwner,
          },
        });
        console.log(`   ✅ Owner: ${owner}`);
        console.log(`   ✅ Router: ${router}`);
        console.log(`   ${isOwner ? '✅ You are the owner' : '❌ You are NOT the owner'}`);
      } catch (error: any) {
        results.push({
          step: '1. Contract Info',
          success: false,
          error: error.message,
        });
        console.log(`   ❌ Error: ${error.message}`);
      }

      // 2. Test requestPayment
      console.log('2️⃣ Testing requestPayment...');
      try {
        const networkConfig = getCurrentNetworkConfig();
        const testPayee = '0x60aE616a2155Ee3d9A68541Ba4544862310933d4';
        const testAmount = ethers.parseUnits('1.0', 6); // 1 USDC (6 decimals)
        const testToken = networkConfig.stablecoins.usdc; // USDC for current network
        
        const tx = await contract.requestPayment(testPayee, testAmount, testToken);
        console.log(`   ⏳ Transaction sent: ${tx.hash}`);
        transactionHashes.push(tx.hash);
        
        const receipt = await tx.wait();
        console.log(`   ✅ Transaction confirmed in block: ${receipt.blockNumber}`);
        
        results.push({
          step: '2. Request Payment',
          success: true,
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
        });
      } catch (error: any) {
        results.push({
          step: '2. Request Payment',
          success: false,
          error: error.message,
        });
        console.log(`   ❌ Error: ${error.message}`);
      }

      // 3. Test getTokenBalance
      console.log('3️⃣ Testing getTokenBalance...');
      try {
        const networkConfig = getCurrentNetworkConfig();
        const usdcAddress = networkConfig.stablecoins.usdc;
        logger.info(`   Using USDC address: ${usdcAddress} for network: ${networkConfig.name}`);
        const balance = await contractReadOnly.getTokenBalance(usdcAddress);
        const formatted = ethers.formatUnits(balance, 6);
        
        results.push({
          step: '3. Get Token Balance',
          success: true,
          balance: balance.toString(),
          formatted: `${formatted} USDC`,
        });
        console.log(`   ✅ USDC balance: ${formatted} USDC`);
      } catch (error: any) {
        results.push({
          step: '3. Get Token Balance',
          success: false,
          error: error.message,
        });
        console.log(`   ❌ Error: ${error.message}`);
      }

      // 4. Test authorizeSwap (only if owner)
      console.log('4️⃣ Testing authorizeSwap (owner only)...');
      try {
        const networkConfig = getCurrentNetworkConfig();
        const fromToken = networkConfig.stablecoins.usdc; // USDC
        const toToken = networkConfig.stablecoins.usdt; // USDT
        const maxAmount = ethers.parseUnits('1000', 6); // 1000 USDC
        
        const tx = await contract.authorizeSwap(fromToken, toToken, maxAmount);
        console.log(`   ⏳ Transaction sent: ${tx.hash}`);
        transactionHashes.push(tx.hash);
        
        const receipt = await tx.wait();
        console.log(`   ✅ Swap authorized in block: ${receipt.blockNumber}`);
        
        // Verify it was saved
        const allowance = await contractReadOnly.swapAllowances(fromToken, toToken);
        const formattedAllowance = ethers.formatUnits(allowance, 6);
        
        results.push({
          step: '4. Authorize Swap',
          success: true,
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber,
          allowance: `${formattedAllowance} USDC`,
        });
        console.log(`   ✅ Allowance saved: ${formattedAllowance} USDC`);
      } catch (error: any) {
        if (error.message.includes('Not owner')) {
          results.push({
            step: '4. Authorize Swap',
            success: false,
            error: 'Not owner - this function requires owner permissions',
          });
          console.log(`   ⚠️  You are not the owner`);
        } else {
          results.push({
            step: '4. Authorize Swap',
            success: false,
            error: error.message,
          });
          console.log(`   ❌ Error: ${error.message}`);
        }
      }

      // 5. Verify swapAllowances
      console.log('5️⃣ Verifying swapAllowances...');
      try {
        const networkConfig = getCurrentNetworkConfig();
        const fromToken = networkConfig.stablecoins.usdc; // USDC
        const toToken = networkConfig.stablecoins.usdt; // USDT
        const allowance = await contractReadOnly.swapAllowances(fromToken, toToken);
        const formatted = ethers.formatUnits(allowance, 6);
        
        results.push({
          step: '5. Verify Swap Allowances',
          success: true,
          allowance: `${formatted} USDC`,
        });
        console.log(`   ✅ Allowance USDC -> USDT: ${formatted} USDC`);
      } catch (error: any) {
        results.push({
          step: '5. Verify Swap Allowances',
          success: false,
          error: error.message,
        });
        console.log(`   ❌ Error: ${error.message}`);
      }

      // Build response message
      const successCount = results.filter((r) => r.success).length;
      const totalCount = results.length;
      
      const responseText = `🧪 Contract Test Completed!\n\n` +
        `Results: ${successCount}/${totalCount} operations successful\n\n` +
        results.map((r) => {
          const icon = r.success ? '✅' : '❌';
          const txInfo = r.transactionHash ? `\n   TX: ${r.transactionHash}` : '';
          return `${icon} ${r.step}${txInfo}${r.error ? `\n   Error: ${r.error}` : ''}`;
        }).join('\n\n') +
        `\n\n📊 Transaction Hashes:\n${transactionHashes.map((hash, i) => `${i + 1}. ${hash}`).join('\n')}`;

      task.status.state = TaskState.COMPLETED;
      task.status.message = {
        messageId: `msg-${Date.now()}`,
        role: 'agent',
        parts: [
          {
            kind: 'text',
            text: responseText,
          },
        ],
        metadata: {
          'contract.test.results': results,
          'contract.test.transactions': transactionHashes,
          'contract.test.summary': {
            total: totalCount,
            successful: successCount,
            failed: totalCount - successCount,
          },
        },
      };

      await eventQueue.enqueueEvent(task);
      console.log('✨ Contract test completed successfully');
    } catch (error) {
      console.error('❌ Error executing contract test:', error);
      
      task.status.state = TaskState.FAILED;
      task.status.message = {
        messageId: `msg-${Date.now()}`,
        role: 'agent',
        parts: [
          {
            kind: 'text',
            text: `Error executing contract test: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };

      await eventQueue.enqueueEvent(task);
      throw error;
    }
  }
}

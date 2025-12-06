# x402 Facilitator Server

Real facilitator server for validating and executing x402 payments on-chain on Avalanche.

## Features

- ✅ On-chain payment proof validation
- ✅ EIP-3009 signature verification
- ✅ On-chain payment settlement (gasless)
- ✅ Compatible with MerchantExecutor
- ✅ Support for Avalanche Fuji testnet
- ✅ Health checks and logging

## Installation and Usage

### 1. Configure Environment Variables

In your `.env` file:

```bash
# Network configuration
NETWORK=fuji

# RPC URL for Avalanche Fuji testnet
RPC_URL_AVALANCHE=https://api.avax-test.network/ext/bc/C/rpc

# Private key to execute settlements (optional, only if you want the facilitator to execute payments)
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

# Facilitator port (optional, default: 3001)
FACILITATOR_PORT=3001
```

### 2. Compile and Run

```bash
# Compile TypeScript
npm run build

# Run facilitator
npm run facilitator

# Or in development mode (recompiles and runs)
npm run facilitator:dev
```

The facilitator will be available at `http://localhost:3001`

### 3. Configure Backend to Use Local Facilitator

In the backend `.env`:

```bash
# Use local facilitator
X402_FACILITATOR_URL=http://localhost:3001
```

## Endpoints

### GET /health
Health check for the facilitator

```bash
curl http://localhost:3001/health
```

**Response:**
```json
{
  "status": "healthy",
  "network": "fuji",
  "timestamp": "2025-11-29T..."
}
```

### POST /validate
Validate a payment proof

```bash
curl -X POST http://localhost:3001/validate \
  -H "Content-Type: application/json" \
  -d '{
    "proof": "{\"from\":\"0x...\",\"to\":\"0x...\",\"value\":\"1000000\",\"signature\":\"0x...\"}",
    "meterId": "payroll_execute",
    "price": "1",
    "asset": "USDC",
    "chain": "fuji"
  }'
```

**Success response:**
```json
{
  "valid": true,
  "payer": "0x...",
  "amount": "1000000"
}
```

### POST /verify
Verify a payment (MerchantExecutor compatible)

```bash
curl -X POST http://localhost:3001/verify \
  -H "Content-Type: application/json" \
  -d '{
    "x402Version": 1,
    "paymentPayload": {...},
    "paymentRequirements": {...}
  }'
```

### POST /settle
Execute on-chain settlement (requires PRIVATE_KEY)

```bash
curl -X POST http://localhost:3001/settle \
  -H "Content-Type: application/json" \
  -d '{
    "x402Version": 1,
    "paymentPayload": {...},
    "paymentRequirements": {...}
  }'
```

**Success response:**
```json
{
  "success": true,
  "transactionHash": "0x...",
  "payer": "0x...",
  "amount": "1000000"
}
```

## Architecture

```
┌─────────────┐
│   Client    │
│  (Agent)   │
└──────┬──────┘
       │
       │ X-PAYMENT header
       ▼
┌─────────────┐
│   Backend   │
│  (API)      │
└──────┬──────┘
       │
       │ POST /validate
       ▼
┌─────────────┐
│ Facilitator │
│  Server     │
└──────┬──────┘
       │
       │ Validates on-chain
       ▼
┌─────────────┐
│  Avalanche  │
│  (Fuji)     │
└─────────────┘
```

## Payment Validation

The facilitator validates:

1. **Proof format**: Must contain `from`, `to`, `value`, `signature`
2. **Amount**: Must be equal to or greater than the meter price
3. **Signature**: Verifies EIP-3009 signature (simplified for testnet)
4. **Nonce**: Prevents replay attacks (basic implementation)

## On-Chain Settlement

If `PRIVATE_KEY` is configured, the facilitator can execute `transferWithAuthorization` on-chain:

- Executes the transaction using the configured private key
- Returns the transaction hash
- User doesn't pay gas (gasless)

## Development vs Production

### Testnet (Fuji)
- Simplified signature validation
- Accepts `demo-token` for testing
- Doesn't require strict nonce verification

### Production (Mainnet)
- Full EIP-712 signature verification
- Nonce verification against database
- Strict validation of all fields

## Troubleshooting

### Facilitator won't start
- Verify that port 3001 is available
- Check logs for configuration errors

### Validation fails
- Verify that the RPC URL is correct
- Ensure the proof has the correct format
- Check that the amount is sufficient

### Settlement fails
- Verify that `PRIVATE_KEY` is configured
- Ensure you have AVAX for gas in the wallet
- Check that the ERC20 contract supports `transferWithAuthorization`

## References

- [x402 Protocol Documentation](https://x402.org)
- [Avalanche Build Docs](https://build.avax.network)
- [EIP-3009 Specification](https://eips.ethereum.org/EIPS/eip-3009)

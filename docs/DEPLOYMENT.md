# 🚀 Deployment Guide

Complete guide for deploying SnowRail to Avalanche Testnet (Fuji) and Mainnet.

---

## Prerequisites

- Node.js 18+
- PostgreSQL database
- A wallet with Fuji testnet AVAX (for gas) and USDC
- Hardhat installed globally or locally

---

## Step 1: Deploy Smart Contract

### Fuji Testnet

```bash
cd contracts

# Install dependencies
npm install

# Set environment variables
export PRIVATE_KEY=0xYourPrivateKey
export ROUTER_ADDRESS_FUJI=0x688d21b0B8Fc35968A1940f5A36D66A0f522E5B3

# Deploy to Fuji testnet
npm run deploy:fuji
```

The script will output the deployed contract address. Save this for your `.env` file.

**Example output:**
```
SnowRailTreasury deployed to: 0xcba2318C6C4d9c98f7732c5fDe09D1BAe12c27be
```

### Avalanche Mainnet

```bash
cd contracts

# Set mainnet environment variables
export PRIVATE_KEY=0xYourPrivateKey
export ROUTER_ADDRESS_MAINNET=0x60aE616a2155Ee3d9A68541Ba4544862310933d4

# Deploy to Avalanche mainnet
npm run deploy:mainnet
```

---

## Step 2: Fund the Treasury

After deployment, fund the contract with USDC:

```bash
cd backend

# Set your environment
export PRIVATE_KEY=0xYourPrivateKey
export TREASURY_CONTRACT_ADDRESS=0xcba2318C6C4d9c98f7732c5fDe09D1BAe12c27be
export NETWORK=fuji  # or 'avalanche' for mainnet

# Fund with 100 USDC (example)
npx tsx fund-treasury.ts 100
```

The script will:
- Check your wallet balance
- Transfer USDC to the treasury contract
- Display the new treasury balance

---

## Step 3: Configure Backend

### Setup PostgreSQL Database

1. **Create database:**
```bash
createdb snowrail
# or using psql
psql -c "CREATE DATABASE snowrail;"
```

2. **Set DATABASE_URL in .env:**
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/snowrail
```

### Fuji Testnet Configuration

Update `backend/.env`:

```bash
# Server
PORT=4000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/snowrail

# Network
NETWORK=fuji
RPC_URL_AVALANCHE=https://api.avax-test.network/ext/bc/C/rpc

# Smart Contract
TREASURY_CONTRACT_ADDRESS=0xcba2318C6C4d9c98f7732c5fDe09D1BAe12c27be
PRIVATE_KEY=0xYourPrivateKey

# Rail API (Sandbox)
RAIL_API_BASE_URL=https://sandbox.layer2financial.com/api
RAIL_AUTH_URL=https://auth.layer2financial.com/oauth2/ausbdqlx69rH6OjWd696/v1/token
RAIL_CLIENT_ID=0oaomrdnngvTiszCO697
RAIL_CLIENT_SECRET=your_rail_secret_here
RAIL_SOURCE_ACCOUNT_ID=your_account_id
RAIL_COUNTERPARTY_ID=your_counterparty_id

# Arweave (optional)
ARWEAVE_JWK={"kty":"RSA","n":"..."}
```

See [Rail Setup Instructions](RAIL_SETUP_INSTRUCTIONS.md) for Rail API configuration.

### Avalanche Mainnet Configuration

```bash
# Network
NETWORK=avalanche
RPC_URL_AVALANCHE=https://api.avax.network/ext/bc/C/rpc

# Smart Contract
TREASURY_CONTRACT_ADDRESS=0xYourMainnetAddressHere
PRIVATE_KEY=0xYourPrivateKey

# Rail API (Production)
RAIL_API_BASE_URL=https://api.layer2financial.com
# ... update with production credentials
```

---

## Step 4: Initialize Database

```bash
cd backend

# Install dependencies
npm install

# Run Prisma migrations
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate
```

---

## Step 5: Verify Deployment

### View Contract on Block Explorer

**Fuji Testnet:**
- Contract: `https://testnet.snowtrace.io/address/YOUR_CONTRACT_ADDRESS`
- Transactions: Check the deployment transaction hash

**Avalanche Mainnet:**
- Contract: `https://snowtrace.io/address/YOUR_CONTRACT_ADDRESS`

### Test Contract Operations

```bash
# Start backend
cd backend
npm run dev

# In another terminal, test contract
curl -X POST http://localhost:4000/api/treasury/test \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT: demo-token"
```

Expected response:
```json
{
  "success": true,
  "message": "Contract test successful",
  "balance": "100.0 USDC"
}
```

---

## Step 6: Start Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will be available at `http://localhost:3000` with `/api` proxied to the backend.

---

## Getting Testnet Tokens

### AVAX (for gas)
- [Avalanche Faucet](https://faucet.avax.network/)
- Request free testnet AVAX

### USDC (Fuji Testnet)
Options:
1. Bridge from mainnet using [Avalanche Bridge](https://bridge.avax.network/)
2. Use a testnet faucet if available
3. Swap testnet AVAX for USDC on Trader Joe (Fuji)

---

## Production Deployment Checklist

### Security

- [ ] Use secure key management (AWS KMS, HashiCorp Vault)
- [ ] Never commit private keys to git
- [ ] Enable rate limiting on API endpoints
- [ ] Set up firewall rules
- [ ] Use HTTPS/TLS for all endpoints

### Database

- [ ] Set up PostgreSQL with proper credentials
- [ ] Configure database backups
- [ ] Set up connection pooling
- [ ] Enable SSL connections
- [ ] Run migrations in production

### Monitoring

- [ ] Set up error tracking (Sentry, Datadog)
- [ ] Configure application logs
- [ ] Monitor contract events
- [ ] Set up alerts for critical operations

### Infrastructure

- [ ] Deploy backend to cloud (AWS, GCP, Azure)
- [ ] Use load balancer for high availability
- [ ] Set up CI/CD pipeline
- [ ] Configure auto-scaling

### Rail API

- [ ] Upgrade to production credentials
- [ ] Test all payment flows
- [ ] Configure webhook endpoints
- [ ] Implement proper error handling

---

## Troubleshooting

### Contract Deployment Fails

**Error**: `insufficient funds for gas`
- **Solution**: Get more AVAX from faucet or exchange

**Error**: `nonce too low`
- **Solution**: Reset Hardhat cache: `npx hardhat clean`

### Backend Connection Issues

**Error**: `Cannot connect to RPC`
- **Solution**: Check `RPC_URL_AVALANCHE` in `.env`
- **Alternative RPC**: Try public RPC endpoints

**Error**: `Contract not deployed at address`
- **Solution**: Verify `TREASURY_CONTRACT_ADDRESS` matches deployed contract

### Database Issues

**Error**: `Prisma client not generated`
- **Solution**: Run `npx prisma generate`

**Error**: `Migration failed`
- **Solution**: Check PostgreSQL connection, verify DATABASE_URL
- **Reset**: Drop and recreate database if needed

**Error**: `Connection refused`
- **Solution**: Ensure PostgreSQL is running: `pg_isready`
- **Solution**: Check DATABASE_URL format: `postgresql://user:password@host:port/database`

---

## Network Switching

To switch between Fuji (testnet) and Avalanche (mainnet):

1. Update `NETWORK` in `.env` (`fuji` or `avalanche`)
2. Update `RPC_URL_AVALANCHE`
3. Update `TREASURY_CONTRACT_ADDRESS`
4. Restart backend

No code changes required - all network logic is abstracted in `backend/src/config/env.ts`.

---

[← Back to README](../README.md)


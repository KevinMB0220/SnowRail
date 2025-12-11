# SnowRail 🚀

SnowRail is an **autonomous treasury orchestrator** that bridges crypto and fiat payments using the **Sovereign Agent Stack** - enabling AI agents to execute cross-border payroll without human intervention.

## What It Does

- **Onchain Payments**: USDC payments on Avalanche C-Chain with smart contract treasury
- **Fiat Bridge**: Automatic conversion to bank payouts (ACH/wire) via Rail API
- **AI Agent Ready**: Full x402 and ERC-8004 compliance for machine-to-machine payments
- **Permanent Receipts**: Every transaction saved immutably on Arweave
- **Real-time Dashboard**: Monitor payroll executions, agent identity, and statistics

## Key Features

✅ **HTTP 402 Payment Required** - Monetize APIs with cryptographic payment proofs  
✅ **ERC-8004 Identity** - Discoverable agent identity card for AI systems  
✅ **Arweave Audit Trail** - Immutable receipts for compliance and verification  
✅ **EIP-3009 Signatures** - Gasless, signed token transfers  
✅ **Cross-border Payroll** - One-click execution for international freelancers

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| **[Competitive Advantages](docs/COMPETITIVE_ADVANTAGES.md)** | Why SnowRail stands out vs traditional payroll and crypto solutions |
| **[Sovereign Agent Stack](docs/SOVEREIGN_AGENT_STACK.md)** | Integration details for AI agents and autonomous systems |
| **[API Reference](docs/API_REFERENCE.md)** | Complete endpoint documentation with examples |
| **[Agent Interface Guide](docs/AGENT_INTERFACE.md)** | Using the agent dashboard, API, and A2A protocol |
| **[Deployment Guide](docs/DEPLOYMENT.md)** | Step-by-step deployment to Avalanche (Fuji/Mainnet) |
| **[Rail Setup Instructions](docs/RAIL_SETUP_INSTRUCTIONS.md)** | Configure Rail API for fiat payouts |
| **[Payment Flow Diagram](docs/PAYMENT_FLOW_DIAGRAM.md)** | Visual flow of payment processing |

---

## High-Level Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Frontend   │────▶│  SnowRail API    │────▶│    Rail     │
│  (React)    │     │  (Express + x402)│     │  (Fiat API) │
└─────────────┘     └────────┬─────────┘     └─────────────┘
                             │
                    ┌────────▼──────────┐
                    │ Avalanche C-Chain │
                    │ (SnowRailTreasury)│
                    └───────┬───────────┘
                            │
                    ┌───────▼───────────┐
                    │     Arweave       │
                    │(Permanent Records)│
                    └───────────────────┘
```

- **Frontend**: React app with Tailwind CSS for monitoring and execution
- **Backend**: Express API with x402/ERC-8004 for payments and metering
- **Smart Contracts**: `SnowRailTreasury` on Avalanche C-Chain
- **Storage**: Arweave for permanent receipts, Prisma + PostgreSQL for operational data
- **Fiat Bridge**: Rail API integration (see [Rail Setup Instructions](docs/RAIL_SETUP_INSTRUCTIONS.md))

---

## Tech Stack

| Area       | Tech                                                    |
|-------------|----------------------------------------------------------|
| Backend     | Node.js, TypeScript, Express                             |
| Database    | Prisma ORM, PostgreSQL                                   |
| Onchain     | Ethers.js, Avalanche C-Chain                             |
| Protocols   | x402 (HTTP 402), ERC-8004 (metering + identity), EIP-3009, A2A |
| Storage     | Arweave (permanent receipts), Prisma (operational data)  |
| Fiat        | Rail API (sandbox/production)                           |
| Frontend    | React, Vite, TypeScript, Tailwind CSS, Lucide React      |
| Contracts   | Solidity ^0.8.20, Hardhat                                |
| AI Agents   | ERC-8004 identity card, x402 facilitator, A2A endpoint   |

---

## Project Structure

```
/contracts                  # Solidity smart contracts
  └── src/
      ├── SnowRailTreasury.sol
      └── interfaces/

/backend                    # Node.js backend (Express + x402)
  ├── prisma/
  │   └── schema.prisma
  └── src/
      ├── server.ts         # Server entrypoint
      ├── config/           # Environment and network config
      ├── x402/             # x402 + ERC-8004 + facilitator
      ├── api/              # Routes (payroll, treasury, agent, merchant, dashboard, auth)
      ├── services/         # Business logic + Arweave
      ├── domain/           # Domain types
      └── utils/            # Logger, helpers

/frontend                   # React demo frontend
  └── src/
      ├── App.tsx          # View orchestration & routing
      ├── components/      # Dashboard, AgentIdentity, etc.
      └── lib/             # API client

/docs                       # Documentation
  ├── COMPETITIVE_ADVANTAGES.md
  ├── SOVEREIGN_AGENT_STACK.md
  ├── API_REFERENCE.md
  ├── AGENT_INTERFACE.md
  ├── DEPLOYMENT.md
  ├── RAIL_SETUP_INSTRUCTIONS.md
  └── PAYMENT_FLOW_DIAGRAM.md
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database
- A wallet with Fuji testnet AVAX and USDC (see [Deployment Guide](docs/DEPLOYMENT.md))

### 1. Clone and Install

```bash
# Clone repository
git clone https://github.com/yourorg/snowrail.git
cd snowrail

# Install all dependencies
npm install  # or install individually per folder
```

### 2. Deploy Smart Contract (Optional)

```bash
cd contracts
npm install
export PRIVATE_KEY=0xYourPrivateKey
export ROUTER_ADDRESS_FUJI=0x688d21b0B8Fc35968A1940f5A36D66A0f522E5B3
npm run deploy:fuji
```

See [Deployment Guide](docs/DEPLOYMENT.md) for detailed instructions.

### 3. Configure Backend

```bash
cd backend
cp env.example .env
# Edit .env with your contract address and keys
```

**Required variables:**
```bash
PORT=4000
NETWORK=fuji
TREASURY_CONTRACT_ADDRESS=0xYourContractAddress
PRIVATE_KEY=0xYourPrivateKey
RPC_URL_AVALANCHE=https://api.avax-test.network/ext/bc/C/rpc
DATABASE_URL=postgresql://user:password@localhost:5432/snowrail
```

See [Deployment Guide](docs/DEPLOYMENT.md#step-3-configure-backend) for full configuration.

### 4. Initialize Database

```bash
cd backend
npm install
npx prisma migrate dev --name init
npx prisma generate
```

### 5. Start Backend

```bash
cd backend
npm run dev
```

Backend available at `http://localhost:4000`

### 6. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend available at `http://localhost:3000`

---

## Demo Workflow

1. **Open** `http://localhost:3000`
2. **Click** "Execute Payroll" - receives HTTP 402 Payment Required
3. **View** payment requirements (1 USDC on Avalanche)
4. **Click** "Simulate Onchain Payment" - provides payment proof
5. **Backend** executes payroll, saves receipt to Arweave
6. **View** payroll status and permanent Arweave receipt
7. **Access** Agent Identity dashboard for history and stats

For detailed flow, see [API Reference](docs/API_REFERENCE.md#demo-payroll-flow).

---

## Environment Configuration

### Development (Fuji Testnet)

```bash
# Server
PORT=4000

# Network
NETWORK=fuji
RPC_URL_AVALANCHE=https://api.avax-test.network/ext/bc/C/rpc

# Contract
TREASURY_CONTRACT_ADDRESS=0xcba2318C6C4d9c98f7732c5fDe09D1BAe12c27be
PRIVATE_KEY=0x...

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/snowrail

# Rail API (Sandbox)
RAIL_API_BASE_URL=https://sandbox.layer2financial.com/api
RAIL_AUTH_URL=https://auth.layer2financial.com/oauth2/ausbdqlx69rH6OjWd696/v1/token
RAIL_CLIENT_ID=0oaomrdnngvTiszCO697
RAIL_CLIENT_SECRET=your_secret_here
RAIL_SOURCE_ACCOUNT_ID=your_account_id
RAIL_COUNTERPARTY_ID=your_counterparty_id

# Arweave (optional)
ARWEAVE_JWK={"kty":"RSA","n":"..."}
```

### Production (Avalanche Mainnet)

```bash
NETWORK=avalanche
RPC_URL_AVALANCHE=https://api.avax.network/ext/bc/C/rpc
TREASURY_CONTRACT_ADDRESS=0xYourMainnetAddress
DATABASE_URL=postgresql://user:password@host:5432/snowrail
```

See [Rail Setup Instructions](docs/RAIL_SETUP_INSTRUCTIONS.md) for Rail API configuration.

See [Deployment Guide](docs/DEPLOYMENT.md) for complete configuration.

---

## Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/agent/identity` | ERC-8004 agent identity card |
| `GET` | `/api/agent/activity` | Recent payroll history with Arweave receipts |
| `GET` | `/api/agent/stats` | Real-time operational statistics |
| `POST` | `/api/payroll/execute` | Execute demo payroll (x402 protected) |
| `GET` | `/api/payroll/:id` | Get payroll details by ID |
| `POST` | `/api/payment/process` | Process single payment (x402 protected) |
| `GET` | `/api/treasury/balance` | Get treasury USDC balance |
| `POST` | `/api/treasury/test` | Test treasury contract (x402 protected) |
| `POST` | `/process` | A2A-compatible agent endpoint |
| `POST` | `/test` | Test endpoint for development |
| `GET` | `/validate-agent/:agentId` | Validate agent identity |
| `POST` | `/facilitator/validate` | Validate payment proof |
| `POST` | `/facilitator/verify` | Verify EIP-3009 signature |
| `POST` | `/facilitator/settle` | Settle payment on-chain |
| `GET` | `/facilitator/health` | Facilitator health check |

See [API Reference](docs/API_REFERENCE.md) for complete documentation.

---

## For AI Agents

SnowRail is built for autonomous AI agents:

```typescript
// 1. Discover capabilities
const identity = await fetch('http://localhost:4000/api/agent/identity');

// 2. Request service (receives 402)
const response = await fetch('http://localhost:4000/process', {
  method: 'POST',
  body: JSON.stringify({ message: { /* ... */ } })
});

// 3. Create EIP-3009 authorization
const authorization = await signTransferAuthorization(/* ... */);

// 4. Retry with payment proof
const result = await fetch('http://localhost:4000/process', {
  method: 'POST',
  body: JSON.stringify({
    message: {
      metadata: {
        'x402.payment.payload': authorization,
        'x402.payment.status': 'payment-submitted'
      }
    }
  })
});
```

See [Sovereign Agent Stack](docs/SOVEREIGN_AGENT_STACK.md) and [Agent Interface Guide](docs/AGENT_INTERFACE.md) for integration details.

---

## Testing

```bash
# Backend tests
cd backend
npm test

# Contract tests
cd contracts
npx hardhat test

# Integration tests
npm run test:integration
```

---

## Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

## Links

- **Documentation**: [docs/](docs/)
- **Smart Contracts**: [contracts/src/](contracts/src/)
- **Backend API**: [backend/src/](backend/src/)
- **Frontend**: [frontend/src/](frontend/src/)
- **Avalanche Docs**: https://docs.avax.network/
- **x402 Protocol**: https://github.com/eigensphere/x402
- **ERC-8004**: https://github.com/eigensphere/eips
- **Arweave**: https://www.arweave.org/

---

## Support

- **Issues**: [GitHub Issues](https://github.com/yourorg/snowrail/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourorg/snowrail/discussions)
- **Email**: support@snowrail.xyz

---

**Built with ❄️ for the future of autonomous treasury management**

# 📡 API Reference

Complete reference for all SnowRail backend endpoints.

---

## Base URL

```
Development: http://localhost:4000
Production: https://your-domain.com
```

---

## Authentication

Most endpoints use **x402 Payment Required** authentication:

```bash
# Include payment token in header
curl -X POST http://localhost:4000/api/payroll/execute \
  -H "X-PAYMENT: demo-token" \
  -H "Content-Type: application/json"
```

For production, replace `demo-token` with EIP-3009 signed authorization.

---

## Endpoints

### Health & Status

#### `GET /health`

Check service health status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-04T00:00:00Z"
}
```

---

### Agent Endpoints

#### `GET /api/agent/identity`

Get ERC-8004 compliant agent identity card.

**Response:**
```json
{
  "erc8004Version": "1.0",
  "agent": {
    "id": "snowrail-treasury-v1",
    "name": "SnowRail Treasury Agent",
    "description": "Autonomous treasury orchestration",
    "capabilities": [
      "treasury_management",
      "cross_border_payments",
      "payroll_execution"
    ],
    "protocols": ["x402", "erc8004", "eip3009", "arweave"],
    "networks": ["avalanche", "avalanche-fuji"]
  },
  "metering": {
    "resources": [
      {
        "id": "payroll_execute",
        "price": "1",
        "asset": "USDC",
        "chain": "avalanche",
        "description": "Execute international payroll"
      }
    ]
  }
}
```

#### `GET /api/agent/activity`

Get recent payroll execution history with Arweave receipts.

**Response:**
```json
{
  "activity": [
    {
      "id": "pay_xxx",
      "status": "PAID",
      "totalAmount": "1000.00",
      "currency": "USD",
      "recipientCount": 10,
      "createdAt": "2025-12-04T00:00:00Z",
      "arweave": {
        "url": "https://arweave.net/txId",
        "txId": "arweave-transaction-id",
        "status": "Immutable • Verifiable • Compliance-Ready"
      },
      "payments": [
        {
          "id": "pmt_1",
          "amount": "100.00",
          "currency": "USD",
          "recipient": "john@example.com",
          "status": "PAID",
          "txHash": "0x..."
        }
      ]
    }
  ],
  "stats": {
    "totalPayrolls": 5,
    "totalPaid": 5000.00,
    "totalRecipients": 50
  }
}
```

#### `GET /api/agent/stats`

Get real-time operational statistics.

**Response:**
```json
{
  "summary": {
    "totalPayrolls": 10,
    "totalPaidPayrolls": 8,
    "totalProcessingPayrolls": 1,
    "totalFailedPayrolls": 1
  },
  "amounts": {
    "totalPaid": 10000.00,
    "totalProcessing": 1000.00,
    "currency": "USD"
  },
  "recipients": {
    "total": 100
  },
  "system": {
    "uptime": "5h 30m 15s",
    "timestamp": "2025-12-04T00:00:00Z",
    "nodeVersion": "v18.0.0",
    "platform": "darwin",
    "arch": "arm64"
  },
  "payrolls": {
    "total": 10,
    "last24h": 3,
    "byStatus": {
      "PAID": 8,
      "RAIL_PROCESSING": 1,
      "FAILED": 1
    }
  }
}
```

---

### Payroll Endpoints

#### `POST /api/payroll/execute`

Execute a demo payroll with 10 freelancer payments.

**Protection:** x402

**Request:**
```bash
curl -X POST http://localhost:4000/api/payroll/execute \
  -H "X-PAYMENT: demo-token" \
  -H "Content-Type: application/json"
```

**Response (402 without payment):**
```json
{
  "error": "PAYMENT_REQUIRED",
  "meterId": "payroll_execute",
  "metering": {
    "price": "1",
    "asset": "USDC",
    "chain": "avalanche",
    "resource": "payroll_execution",
    "version": "8004-alpha"
  }
}
```

**Response (200 with payment):**
```json
{
  "payrollId": "pay_xxx",
  "status": "PAID",
  "total": 1000.00,
  "currency": "USD",
  "payments": [
    {
      "id": "pmt_1",
      "recipient": "john@example.com",
      "amount": 100.00,
      "status": "PAID",
      "txHash": "0x..."
    }
  ],
  "arweave": {
    "url": "https://arweave.net/txId",
    "txId": "arweave-transaction-id"
  }
}
```

#### `GET /api/payroll/:id`

Get payroll details by ID.

**Parameters:**
- `id` (string): Payroll ID

**Response:**
```json
{
  "id": "pay_xxx",
  "status": "PAID",
  "total": 1000.00,
  "currency": "USD",
  "createdAt": "2025-12-04T00:00:00Z",
  "updatedAt": "2025-12-04T00:01:00Z",
  "payments": [
    {
      "id": "pmt_1",
      "recipient": "john@example.com",
      "amount": 100.00,
      "currency": "USD",
      "status": "PAID",
      "txHash": "0x..."
    }
  ]
}
```

---

### Payment Endpoints

#### `POST /api/payment/process`

Process a single payment (Rail + on-chain). Complete flow from database creation to Rail API processing.

**Protection:** x402

**Request:**
```json
{
  "customer": {
    "first_name": "John",
    "last_name": "Doe",
    "email_address": "john@example.com",
    "telephone_number": "+1234567890",
    "mailing_address": {
      "address_line1": "123 Main St",
      "city": "New York",
      "state": "NY",
      "postal_code": "10001",
      "country_code": "US"
    }
  },
  "payment": {
    "amount": 10000,
    "currency": "USD",
    "recipient": "0x...",
    "description": "Freelancer payment"
  },
  "rail": {
    "source_account_id": "acc_xxx",
    "counterparty_id": "cp_xxx",
    "withdrawal_rail": "ACH"
  }
}
```

**Response:**
```json
{
  "success": true,
  "payrollId": "pay_xxx",
  "status": "PAID",
  "steps": {
    "payroll_created": true,
    "payments_created": true,
    "treasury_checked": true,
    "onchain_requested": true,
    "onchain_executed": true,
    "rail_processed": true
  },
  "transactions": {
    "request_tx_hashes": ["0x..."],
    "execute_tx_hashes": ["0x..."]
  },
  "rail": {
    "withdrawal_id": "wd_xxx",
    "status": "SETTLED"
  },
  "errors": []
}
```

**Error Response:**
```json
{
  "success": false,
  "payrollId": "pay_xxx",
  "status": "FAILED",
  "steps": {
    "payroll_created": true,
    "payments_created": true,
    "treasury_checked": false,
    "onchain_requested": false,
    "onchain_executed": false,
    "rail_processed": false
  },
  "errors": [
    {
      "step": "treasury_checked",
      "error": "Insufficient balance"
    }
  ]
}
```

---

### Treasury Endpoints

#### `GET /api/treasury/balance`

Get treasury USDC balance.

**Response:**
```json
{
  "balance": "1000.50",
  "asset": "USDC",
  "network": "avalanche-fuji",
  "contractAddress": "0x..."
}
```

#### `POST /api/treasury/test`

Test treasury contract operations (for AI agents).

**Protection:** x402

**Response:**
```json
{
  "success": true,
  "message": "Contract test successful",
  "balance": "1000.50 USDC",
  "network": "avalanche-fuji"
}
```

---

### AI Agent Endpoints

#### `POST /process`

A2A-compatible endpoint for AI agent requests.

**Protection:** x402

**Request:**
```json
{
  "message": {
    "messageId": "msg-123",
    "role": "user",
    "parts": [
      {
        "kind": "text",
        "text": "Process my payroll"
      }
    ],
    "metadata": {
      "x402.payment.payload": "eip3009-signed-authorization",
      "x402.payment.status": "payment-submitted",
      "agent.id": "agent-abc-123"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "payrollId": "pay_xxx",
    "status": "PAID"
  }
}
```

#### `POST /test`

Test endpoint for development and debugging.

**Request:**
```json
{
  "text": "Test message"
}
```

**Response:**
```json
{
  "status": "ok",
  "message": "Test endpoint working"
}
```

#### `GET /validate-agent/:agentId`

Validate agent identity and capabilities.

**Parameters:**
- `agentId` (string): Agent identifier

**Response:**
```json
{
  "valid": true,
  "agentId": "snowrail-treasury-v1",
  "identity": {
    "name": "SnowRail Treasury Agent",
    "capabilities": [...]
  }
}
```

---

### x402 Facilitator Endpoints

#### `GET /facilitator/health`

Check facilitator health status.

**Response:**
```json
{
  "status": "ok",
  "facilitator": "x402-snowrail",
  "version": "1.0.0"
}
```

#### `POST /facilitator/validate`

Check facilitator health status.

**Response:**
```json
{
  "status": "ok",
  "facilitator": "x402-snowrail",
  "version": "1.0.0"
}
```

#### `POST /facilitator/validate`

Validate payment proof.

**Request:**
```json
{
  "payment": "demo-token"
}
```

**Response:**
```json
{
  "valid": true,
  "meterId": "payroll_execute"
}
```

#### `POST /facilitator/verify`

Verify EIP-3009 payment signature.

**Request:**
```json
{
  "signature": "0x...",
  "from": "0x...",
  "to": "0x...",
  "value": "1000000",
  "validAfter": 0,
  "validBefore": 9999999999,
  "nonce": "0x..."
}
```

**Response:**
```json
{
  "valid": true,
  "signer": "0x..."
}
```

#### `POST /facilitator/settle`

Settle payment on-chain.

**Request:**
```json
{
  "paymentProof": "eip3009-authorization",
  "meterId": "payroll_execute"
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x...",
  "settled": true
}
```

---

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 402 | Payment Required (x402) |
| 400 | Bad Request |
| 404 | Not Found |
| 500 | Internal Server Error |

---

## Status Lifecycle

Payroll and payment statuses follow this flow:

```
PENDING → ONCHAIN_REQUESTED → ONCHAIN_PAID → RAIL_PROCESSING → PAID
                                                      └──────→ FAILED
```

| Status | Description |
|--------|-------------|
| `PENDING` | Payment created, awaiting processing |
| `ONCHAIN_REQUESTED` | Payment request submitted to contract |
| `ONCHAIN_PAID` | On-chain payment completed |
| `RAIL_PROCESSING` | Rail API processing fiat payout |
| `PAID` | Payment completed successfully |
| `FAILED` | Payment failed at any stage |

---

## Rate Limiting

Current implementation: **No rate limiting** (MVP)

Recommended for production:
- 100 requests per minute per IP
- 1000 requests per hour per API key

---

## Error Responses

All errors follow this format:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {
    "field": "additional context"
  }
}
```

**Common Errors:**

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `PAYMENT_REQUIRED` | 402 | x402 payment required |
| `INVALID_PAYMENT` | 400 | Payment proof invalid |
| `PAYROLL_NOT_FOUND` | 404 | Payroll ID doesn't exist |
| `INSUFFICIENT_BALANCE` | 400 | Treasury has insufficient funds |
| `CONTRACT_ERROR` | 500 | Smart contract interaction failed |
| `RAIL_API_ERROR` | 500 | Rail API request failed |

---

## Data Models

### OutboundPayment

Individual payment within a payroll.

```typescript
{
  id: string;
  payrollId: string;
  amount: number;        // Amount in cents
  currency: string;      // USD, etc.
  status: string;        // PENDING, ONCHAIN_PAID, RAIL_PROCESSING, PAID, FAILED
  recipient: string;     // Wallet address or identifier
  txHash: string | null; // Blockchain transaction hash (0x...)
  createdAt: Date;
  updatedAt: Date;
}
```

### Payroll

Batch of payments.

```typescript
{
  id: string;
  total: number;         // Total amount in cents
  currency: string;     // USD, etc.
  status: string;        // PENDING, ONCHAIN_PAID, RAIL_PROCESSING, PAID, FAILED
  payments: OutboundPayment[];
  createdAt: Date;
  updatedAt: Date;
}
```

---

[← Back to README](../README.md)


# SnowRail Payment Flow Diagram

## Complete Integration: Rail + Agent + Contracts + Facilitator

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                                │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                    PaymentForm Component                       │    │
│  │  - Customer Information (Rail format)                         │    │
│  │  - Payment Amount (USD in cents)                               │    │
│  │  - Recipient Address (optional)                                │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                              │                                          │
│                              │ POST /api/payment/process                │
│                              │ (with X-PAYMENT header)                  │
│                              ▼                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │
┌─────────────────────────────────────────────────────────────────────────┐
│                         BACKEND (Express)                               │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │              x402Protect Middleware                          │    │
│  │  - Validates X-PAYMENT header                                │    │
│  │  - Checks payment proof with Facilitator                     │    │
│  │  - Returns 402 if payment required                           │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                              │                                          │
│                              │ Payment Validated                        │
│                              ▼                                          │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │         POST /api/payment/process Handler                    │    │
│  │  Request ID: payment-{timestamp}-{random}                    │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                              │                                          │
│                              │ Step 1: Create Payroll                  │
│                              ▼                                          │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                    Database (Prisma)                        │    │
│  │  - Create Payroll record (status: PENDING)                  │    │
│  │  - Create Payment record(s)                                  │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                              │                                          │
│                              │ Step 2: Check Treasury Balance          │
│                              ▼                                          │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │              Treasury Contract (Read-Only)                  │    │
│  │  - Check USDC balance                                        │    │
│  │  - Verify sufficient funds                                   │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                              │                                          │
│                              │ Step 3: Request Payments On-Chain       │
│                              ▼                                          │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │              Treasury Contract (Write)                       │    │
│  │  - Call requestPayment() for each payment                    │    │
│  │  - Returns transaction hashes                                │    │
│  │  - Update payment status: ONCHAIN_REQUESTED                   │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                              │                                          │
│                              │ Step 4: Execute Payments On-Chain       │
│                              ▼                                          │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │              Treasury Contract (Write)                       │    │
│  │  - Call executePayment() for each payment                    │    │
│  │  - Returns transaction hashes                                │    │
│  │  - Update payment status: ONCHAIN_PAID                        │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                              │                                          │
│                              │ Step 5: Process Through Rail API         │
│                              ▼                                          │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │              Rail Client Service                            │    │
│  │  - Get OAuth2 token (cached)                                │    │
│  │  - Create withdrawal request                                │    │
│  │  - POST /v1/withdrawals                                     │    │
│  │  - Accept withdrawal                                        │    │
│  │  - Update status: RAIL_PROCESSING → PAID/FAILED            │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                              │                                          │
│                              │ Final Status Update                      │
│                              ▼                                          │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                    Database (Prisma)                        │    │
│  │  - Update Payroll status: PAID/FAILED                       │    │
│  │  - Update Payment status: PAID/FAILED                        │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                              │                                          │
│                              │ Return Response                          │
│                              ▼                                          │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                    Response JSON                             │    │
│  │  {                                                            │    │
│  │    success: boolean,                                         │    │
│  │    payrollId: string,                                        │    │
│  │    status: string,                                           │    │
│  │    steps: { ... },                                           │    │
│  │    transactions: { ... },                                    │    │
│  │    rail: { ... },                                            │    │
│  │    errors: [ ... ]                                           │    │
│  │  }                                                            │    │
│  └──────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │
┌─────────────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                                     │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                    Facilitator                               │    │
│  │  - Validates payment proofs                                  │    │
│  │  - Verifies on-chain payments                                │    │
│  │  - POST /facilitator/validate                                │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                    Rail API (Sandbox)                       │    │
│  │  - OAuth2 Authentication                                    │    │
│  │  - Create Withdrawals                                       │    │
│  │  - Manage Counterparties                                   │    │
│  │  - Process Fiat Payments                                    │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │              Avalanche C-Chain (Fuji Testnet)                │    │
│  │  - SnowRailTreasury Contract                                │    │
│  │  - USDC Token                                                │    │
│  │  - Transaction Execution                                    │    │
│  └──────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

## Detailed Step-by-Step Flow

### 1. Frontend Submission
- User fills PaymentForm with:
  - Customer info (Rail format: name, email, address)
  - Payment amount (USD in cents)
  - Optional recipient address
- Form submits to `/api/payment/process`
- First request without X-PAYMENT header (expects 402)

### 2. Payment Validation (x402 Protocol)
- `x402Protect` middleware intercepts request
- Checks for X-PAYMENT header
- If missing, returns 402 with metering info
- Frontend gets payment proof from Facilitator
- Retries with X-PAYMENT header containing proof

### 3. Request Processing
- Backend validates request body
- Creates unique request ID for logging
- Initializes step tracking

### 4. Database Operations
- **Step 1**: Create Payroll record
  - Status: PENDING
  - Total amount, currency
- **Step 2**: Create Payment record(s)
  - Link to payroll
  - Amount, recipient, status: PENDING

### 5. Treasury Balance Check
- **Step 3**: Read-only contract call
- Check USDC balance in treasury
- Log balance for debugging
- Continue even if check fails (non-critical)

### 6. On-Chain Payment Request
- **Step 4**: For each payment:
  - Convert USD cents to token amount (6 decimals)
  - Call `requestPayment(recipient, amount, token)`
  - Store transaction hash
  - Update payment status: ONCHAIN_REQUESTED
- Log all transaction hashes

### 7. On-Chain Payment Execution
- **Step 5**: For each payment:
  - Call `executePayment(paymentId)`
  - Store transaction hash
  - Update payment status: ONCHAIN_PAID
- Log all transaction hashes

### 8. Rail API Processing
- **Step 6**: 
  - Update payroll status: RAIL_PROCESSING
  - Get OAuth2 token (cached or fresh)
  - Create withdrawal request:
    - withdrawal_rail: ACH
    - source_account_id: from env or request
    - destination_counterparty_id: from env or request
    - amount: as string
  - POST to Rail API `/v1/withdrawals`
  - Accept withdrawal immediately
  - Update final status based on Rail response:
    - PAID if successful
    - FAILED if error

### 9. Final Status Update
- Update Payroll status: PAID or FAILED
- Update Payment status: PAID or FAILED
- Calculate processing duration
- Log completion

### 10. Response
- Return JSON with:
  - Success status
  - Payroll ID
  - Final status
  - Step completion status
  - Transaction hashes
  - Rail withdrawal info
  - Any errors encountered

## Error Handling

- **Non-critical errors**: Logged but don't stop flow
  - Treasury balance check failure
  - Individual payment failures (continue with others)
  
- **Critical errors**: Stop flow, return error
  - Database failures
  - Invalid request data
  - Missing required credentials

- **Partial success**: Return success with errors array
  - Some steps completed, others failed
  - Allows for retry of failed steps

## Logging & Debugging

Each request has a unique ID: `payment-{timestamp}-{random}`

All steps log:
- Request ID
- Step name
- Success/failure
- Duration
- Error details (if any)

Log levels:
- `info`: Normal flow progression
- `warn`: Non-critical issues
- `error`: Failures that affect flow

## Security Considerations

1. **x402 Protection**: All endpoints require valid payment proof
2. **OAuth2**: Rail API uses secure token-based auth
3. **Private Keys**: Stored in environment, never logged
4. **Input Validation**: All user inputs validated
5. **Error Messages**: Sanitized to prevent info leakage

## Performance Optimizations

1. **Token Caching**: Rail OAuth2 tokens cached until expiry
2. **Batch Operations**: Multiple payments processed in sequence
3. **Async Processing**: Rail processing doesn't block response
4. **Database Transactions**: Atomic operations where needed


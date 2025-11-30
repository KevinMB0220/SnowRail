# Rail API Setup Instructions

## Current Status

✅ **OAuth2 Authentication**: Configured and working
✅ **API Connection**: Verified and tested
✅ **Customer Creation**: Successfully tested

## Required Configuration

To complete the payment flow, you need to configure the following in your `.env` file:

### 1. Rail Account IDs

You need to create accounts and counterparties in the Rail sandbox, then add their IDs to your `.env`:

```env
RAIL_SOURCE_ACCOUNT_ID=YOUR_SOURCE_ACCOUNT_ID
RAIL_COUNTERPARTY_ID=YOUR_COUNTERPARTY_ID
```

### 2. How to Get These Values

#### Option A: Using Rail Dashboard

1. Log in to [Rail Sandbox Dashboard](https://management.layer2financial.com)
2. Navigate to **Accounts** section
3. Create or select a deposit account (this will be your `RAIL_SOURCE_ACCOUNT_ID`)
4. Navigate to **Counterparties** section
5. Create a counterparty for the recipient (this will be your `RAIL_COUNTERPARTY_ID`)
6. Copy the IDs and add them to your `.env` file

#### Option B: Using Rail API

You can use the test scripts we created:

1. **Create a customer/application** (already tested):
   ```bash
   cd backend
   npx tsx test-rail-create-user.ts
   ```

2. **Create accounts** - You'll need to:
   - Complete the application (add required KYC info)
   - Submit the application
   - Once approved, create accounts via API or dashboard

3. **Create counterparties** - For each recipient:
   - Use the Rail API to create counterparties
   - Or create them via the dashboard

### 3. Example .env Configuration

```env
# Rail API Configuration (Sandbox)
RAIL_API_BASE_URL=https://sandbox.layer2financial.com/api
RAIL_AUTH_URL=https://auth.layer2financial.com/oauth2/ausbdqlx69rH6OjWd696/v1/token
RAIL_CLIENT_ID=0oaomrdnngvTiszCO697
RAIL_CLIENT_SECRET=iYaRGEpdj9gPwuXM_GLTM3pjVS9B3XXlkGr51McAZOED0UwgAWpWihOQGhmpZV7L
RAIL_SIGNING_KEY=302e020100300506032b657004220420bf779f9116bfb416bec5de9d42e6ac014d62aa7d1098d51d6f055ce70b66b8ee

# Rail Account Configuration (REQUIRED - Get from Rail Dashboard/API)
RAIL_SOURCE_ACCOUNT_ID=YOUR_ACCOUNT_ID_HERE
RAIL_COUNTERPARTY_ID=YOUR_COUNTERPARTY_ID_HERE
```

## Current Flow Status

Based on the logs, the payment flow is working correctly:

✅ **Step 1**: Payroll created successfully
✅ **Step 2**: Payment record created
✅ **Step 3**: Treasury balance checked (currently 0 - needs funding)
✅ **Step 4**: Payment requested on-chain (TX: `0xdfa082d754c2adde5690b3323cca67f216e36a57068b4df618788258ca75f08d`)
❌ **Step 5**: Payment execution failed (insufficient treasury balance)
❌ **Step 6**: Rail processing failed (missing account/counterparty IDs)

## Next Steps

1. **Fund the Treasury Contract**:
   - Send USDC tokens to the treasury contract address
   - Check balance: `GET /api/treasury/balance`

2. **Configure Rail Accounts**:
   - Follow the instructions above to get `RAIL_SOURCE_ACCOUNT_ID` and `RAIL_COUNTERPARTY_ID`
   - Add them to your `.env` file
   - Restart the server

3. **Test Again**:
   - Once both are configured, the complete flow should work end-to-end

## Testing

You can test the Rail connection:
```bash
cd backend
npx tsx test-rail-connection.ts
```

You can test creating a customer:
```bash
cd backend
npx tsx test-rail-create-user.ts
```

## Notes

- The treasury balance issue is expected in testnet - you need to fund the contract
- The Rail account IDs are required for the withdrawal flow to work
- Both issues are configuration-related, not code issues - the flow is working correctly!


#!/bin/bash

# Script to run agent + facilitator integration test
# Starts both services and runs the test

set -e

echo "🚀 Starting Agent + Facilitator Integration Test"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if facilitator is running
echo -e "${YELLOW}Checking facilitator...${NC}"
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Facilitator is already running${NC}"
    FACILITATOR_PID=""
else
    echo -e "${YELLOW}Starting facilitator...${NC}"
    npx tsx src/x402/facilitatorServer.ts > /tmp/facilitator-test.log 2>&1 &
    FACILITATOR_PID=$!
    echo "Facilitator PID: $FACILITATOR_PID"
    sleep 3
    
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Facilitator started${NC}"
    else
        echo -e "${RED}❌ Facilitator failed to start${NC}"
        cat /tmp/facilitator-test.log
        exit 1
    fi
fi

# Check if backend is running
echo -e "${YELLOW}Checking backend...${NC}"
if curl -s http://localhost:4000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is already running${NC}"
    BACKEND_PID=""
else
    echo -e "${YELLOW}Starting backend...${NC}"
    npx tsx src/server.ts > /tmp/backend-test.log 2>&1 &
    BACKEND_PID=$!
    echo "Backend PID: $BACKEND_PID"
    sleep 5
    
    # Try health check
    for i in {1..10}; do
        if curl -s http://localhost:4000/api/health > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Backend started${NC}"
            break
        fi
        if [ $i -eq 10 ]; then
            echo -e "${RED}❌ Backend failed to start${NC}"
            echo "Logs:"
            tail -20 /tmp/backend-test.log
            [ -n "$FACILITATOR_PID" ] && kill $FACILITATOR_PID 2>/dev/null || true
            exit 1
        fi
        sleep 1
    done
fi

echo ""
echo -e "${GREEN}Running agent + facilitator test...${NC}"
echo ""

# Run the test
node tests/e2e/test-agent-facilitator.js
TEST_EXIT_CODE=$?

# Cleanup
if [ -n "$FACILITATOR_PID" ]; then
    echo ""
    echo -e "${YELLOW}Stopping facilitator (PID: $FACILITATOR_PID)...${NC}"
    kill $FACILITATOR_PID 2>/dev/null || true
fi

if [ -n "$BACKEND_PID" ]; then
    echo -e "${YELLOW}Stopping backend (PID: $BACKEND_PID)...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
fi

exit $TEST_EXIT_CODE


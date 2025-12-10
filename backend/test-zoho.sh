#!/bin/bash

echo "Getting auth token..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test@example.com\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken // empty')

if [ -z "$TOKEN" ]; then
  echo "Failed to get token. Response:"
  echo "$LOGIN_RESPONSE"
  exit 1
fi

echo "✓ Got token: ${TOKEN:0:20}..."
echo ""
echo "Testing Zoho status endpoint..."
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/zoho/status | jq .

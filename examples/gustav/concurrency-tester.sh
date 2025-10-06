#!/bin/bash

# SETUP for testing the concurrency
#
# Go into the file examples/gustav/src/contexts/recipe/core/commands/updateRecipe.ts
# and add the following code right before eventStore.writeEvents.
#
# await new Promise((resolve) =>
#   setTimeout(resolve, Math.floor(Math.random() * (1000 - 200 + 1)) + 200)
# );
#
# This adds a random delay between 200ms and 1000ms between the read and the write
# on the event store. This way we can easier shake up the order on multiple commands
# to provoke some concurrency issues.

# Number of concurrent requests
CONCURRENCY=5

# Replace :slug with your actual recipe slug
SLUG="test"

echo "Starting $CONCURRENCY concurrent requests at $(date +%T.%3N)"
echo "=========================================="

for i in $(seq 1 $CONCURRENCY); do
  (
    echo "[Request $i] Starting at $(date +%T.%3N)"

    RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}\nTIME_TOTAL:%{time_total}" \
      --request PUT \
      --url "http://localhost:3100/recipes/$SLUG" \
      --header 'Authorization: Bearer very-special-secret' \
      --header 'Content-Type: application/json' \
      --header 'User-Agent: insomnium/0.2.3-a' \
      --data "{
        \"name\": \"Test Rezept Change $i\",
        \"instructions\": [
          \"1. Wasser kochen\"
        ]
      }")

    HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
    TIME_TOTAL=$(echo "$RESPONSE" | grep "TIME_TOTAL:" | cut -d: -f2)
    BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS:/,$d')

    echo "[Request $i] Completed at $(date +%T.%3N)"
    echo "[Request $i] Status: $HTTP_STATUS"
    echo "[Request $i] Time: ${TIME_TOTAL}s"
    echo "[Request $i] Response Body:"
    echo "$BODY" | sed 's/^/  /'
    echo "=========================================="
  ) &
done

wait

echo "All requests completed at $(date +%T.%3N)"

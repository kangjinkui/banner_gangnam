#!/bin/bash
# load-env.sh
# Bash script to load environment variables from .env file

ENV_FILE=".env"

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ .env file not found! Please create it from .env.example"
    echo "Run: cp .env.example .env"
    exit 1
fi

echo "Loading environment variables from $ENV_FILE..."
echo ""

# Load environment variables
set -a
source "$ENV_FILE"
set +a

# Display loaded variables
echo "✓ Environment variables loaded:"
grep -v '^\s*#' "$ENV_FILE" | grep -v '^\s*$' | while IFS='=' read -r key value; do
    echo "  ✓ $key = $value"
done

echo ""
echo "✅ Environment variables loaded successfully!"
echo "You can now use commands from commands.json"
echo ""
echo "Examples:"
echo "  gcloud compute ssh \$VM_USER@\$VM_INSTANCE_NAME --zone=\$VM_ZONE"
echo "  gcloud compute instances list"

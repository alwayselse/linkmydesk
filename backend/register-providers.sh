#!/bin/bash

# Script to register all required Azure providers and wait for completion

echo "🔧 Registering Azure providers for linkmydesk..."
echo ""

# List of providers needed
PROVIDERS=("Microsoft.Storage" "Microsoft.Sql" "Microsoft.Web" "Microsoft.KeyVault")

# Register each provider
for PROVIDER in "${PROVIDERS[@]}"; do
    echo "📦 Registering $PROVIDER..."
    az provider register --namespace $PROVIDER --wait
done

echo ""
echo "⏳ Waiting for all providers to be fully registered..."
echo "This may take 2-5 minutes..."
echo ""

# Wait and check status
for PROVIDER in "${PROVIDERS[@]}"; do
    while true; do
        STATUS=$(az provider show --namespace $PROVIDER --query "registrationState" --output tsv)
        
        if [ "$STATUS" = "Registered" ]; then
            echo "✅ $PROVIDER: Registered"
            break
        else
            echo "⏳ $PROVIDER: $STATUS (waiting...)"
            sleep 10
        fi
    done
done

echo ""
echo "🎉 All providers registered successfully!"
echo ""
echo "✅ You can now run: ./setup-azure.sh"

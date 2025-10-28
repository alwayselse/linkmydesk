#!/bin/bash

# Auto-update Azure SQL firewall rule with current IP
# Run this whenever your IP changes

set -e

RESOURCE_GROUP="linkmydesk-rg"
SQL_SERVER="lmdsql1761659"
RULE_NAME="MyDevMachine"

echo "🌐 Detecting your current public IP..."
MY_IP=$(curl -s https://api.ipify.org)

if [ -z "$MY_IP" ]; then
    echo "❌ Failed to detect IP address"
    exit 1
fi

echo "✅ Current IP: $MY_IP"
echo ""
echo "🔄 Updating SQL Server firewall rule..."

# Check if rule exists
RULE_EXISTS=$(az sql server firewall-rule show \
  --resource-group $RESOURCE_GROUP \
  --server $SQL_SERVER \
  --name $RULE_NAME 2>/dev/null || echo "")

if [ -z "$RULE_EXISTS" ]; then
    echo "📝 Creating new firewall rule..."
    az sql server firewall-rule create \
      --resource-group $RESOURCE_GROUP \
      --server $SQL_SERVER \
      --name $RULE_NAME \
      --start-ip-address $MY_IP \
      --end-ip-address $MY_IP
else
    echo "🔄 Updating existing firewall rule..."
    az sql server firewall-rule update \
      --resource-group $RESOURCE_GROUP \
      --server $SQL_SERVER \
      --name $RULE_NAME \
      --start-ip-address $MY_IP \
      --end-ip-address $MY_IP
fi

echo ""
echo "✅ Firewall rule updated successfully!"
echo "🚀 You can now connect to the database from: $MY_IP"

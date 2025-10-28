#!/bin/bash

# Check current firewall rules for your SQL server

RESOURCE_GROUP="linkmydesk-rg"
SQL_SERVER="lmdsql1761659"

echo "🔍 Current firewall rules for SQL Server: $SQL_SERVER"
echo ""

az sql server firewall-rule list \
  --resource-group $RESOURCE_GROUP \
  --server $SQL_SERVER \
  --output table

echo ""
echo "🌐 Your current public IP:"
curl -s https://api.ipify.org
echo ""

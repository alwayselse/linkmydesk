#!/bin/bash

# Manual Azure Setup Completion Script
# Use this to complete the setup with existing resources

set -e

echo "🔧 Completing Azure setup for linkmydesk..."

# Use the existing storage account
STORAGE_ACCOUNT="lmdstore1761658409"
RESOURCE_GROUP="linkmydesk-rg"
LOCATION="eastasia"
CONTAINER_NAME="presentations"
SQL_SERVER="lmdsql$(date +%s)"
SQL_DATABASE="linkmydesk-db"
SQL_ADMIN="sqladmin"
SQL_PASSWORD="LinkMyDesk2024!Secure"

echo "📋 Using existing resources:"
echo "  Storage Account: $STORAGE_ACCOUNT"
echo "  Resource Group: $RESOURCE_GROUP"
echo ""

# Get storage connection string with retry
echo "3️⃣ Getting storage connection string..."
sleep 5
STORAGE_CONNECTION_STRING=$(az storage account show-connection-string \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --output tsv 2>/dev/null || echo "")

if [ -z "$STORAGE_CONNECTION_STRING" ]; then
    echo "⚠️  Could not get connection string via CLI. Getting keys manually..."
    STORAGE_KEY=$(az storage account keys list \
        --resource-group $RESOURCE_GROUP \
        --account-name $STORAGE_ACCOUNT \
        --query "[0].value" \
        --output tsv)
    STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=$STORAGE_ACCOUNT;AccountKey=$STORAGE_KEY;EndpointSuffix=core.windows.net"
fi

echo "✅ Got storage connection string"

# 4. Create blob container
echo "4️⃣ Creating blob container..."
az storage container create \
  --name $CONTAINER_NAME \
  --account-name $STORAGE_ACCOUNT \
  --public-access blob \
  2>/dev/null || echo "Container may already exist, continuing..."

# 5. Create SQL Server
echo "5️⃣ Creating SQL Server..."
az sql server create \
  --name $SQL_SERVER \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --admin-user $SQL_ADMIN \
  --admin-password "$SQL_PASSWORD"

# 6. Create SQL Database (Serverless)
echo "6️⃣ Creating SQL Database (Serverless)..."
az sql db create \
  --name $SQL_DATABASE \
  --resource-group $RESOURCE_GROUP \
  --server $SQL_SERVER \
  --edition GeneralPurpose \
  --compute-model Serverless \
  --family Gen5 \
  --capacity 1 \
  --min-capacity 0.5

# 7. Get your public IP
echo "7️⃣ Getting your public IP..."
MY_IP=$(curl -s https://api.ipify.org)

# 8. Add firewall rule for your IP
echo "8️⃣ Adding firewall rule for IP: $MY_IP..."
az sql server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --server $SQL_SERVER \
  --name AllowMyIP \
  --start-ip-address $MY_IP \
  --end-ip-address $MY_IP

# 9. Allow Azure services
echo "9️⃣ Allowing Azure services..."
az sql server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --server $SQL_SERVER \
  --name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# 10. Build SQL connection string
SQL_CONNECTION_STRING="mssql+pyodbc://$SQL_ADMIN:$SQL_PASSWORD@$SQL_SERVER.database.windows.net/$SQL_DATABASE?driver=ODBC+Driver+18+for+SQL+Server"

# 11. Create .env file
echo "🔟 Creating .env file..."
cat > .env << EOF
# Azure Storage Configuration
AZURE_STORAGE_CONNECTION_STRING="$STORAGE_CONNECTION_STRING"

# Azure SQL Database Configuration
AZURE_SQL_CONNECTION_STRING="$SQL_CONNECTION_STRING"

# Optional: Add these for future use
STORAGE_ACCOUNT_NAME="$STORAGE_ACCOUNT"
CONTAINER_NAME="$CONTAINER_NAME"
SQL_SERVER_NAME="$SQL_SERVER"
SQL_DATABASE_NAME="$SQL_DATABASE"
EOF

echo ""
echo "✅ Azure setup complete!"
echo ""
echo "📝 Created/Used resources:"
echo "  - Resource Group: $RESOURCE_GROUP"
echo "  - Storage Account: $STORAGE_ACCOUNT"
echo "  - Blob Container: $CONTAINER_NAME"
echo "  - SQL Server: $SQL_SERVER.database.windows.net"
echo "  - SQL Database: $SQL_DATABASE"
echo ""
echo "🔐 Credentials saved to .env file"
echo ""
echo "⚠️  IMPORTANT NEXT STEPS:"
echo "1. Install ODBC Driver 18 for SQL Server if not already installed:"
echo "   HOMEBREW_ACCEPT_EULA=Y brew install msodbcsql18 mssql-tools18"
echo ""
echo "2. Create the Presentations table in your database:"
echo "   source venv/bin/activate"
echo "   python create_table.py"
echo ""
echo "3. Test your connection:"
echo "   python test_connection.py"
echo ""
echo "🚀 Ready to run: ./start.sh"

#!/bin/bash

# Azure Setup Script for linkmydesk
# This script creates all required Azure resources

set -e  # Exit on any error

echo "🚀 Starting Azure setup for linkmydesk..."

# Check if providers are registered
echo "🔍 Checking Azure provider registration..."
STORAGE_STATUS=$(az provider show --namespace Microsoft.Storage --query "registrationState" --output tsv 2>/dev/null || echo "NotRegistered")
SQL_STATUS=$(az provider show --namespace Microsoft.Sql --query "registrationState" --output tsv 2>/dev/null || echo "NotRegistered")

if [ "$STORAGE_STATUS" != "Registered" ] || [ "$SQL_STATUS" != "Registered" ]; then
    echo "⚠️  Required Azure providers are not registered!"
    echo "   Storage: $STORAGE_STATUS"
    echo "   SQL: $SQL_STATUS"
    echo ""
    echo "Please run: ./register-providers.sh"
    echo "Then run this script again."
    exit 1
fi

echo "✅ All required providers are registered"
echo ""

# Variables - customize these
RESOURCE_GROUP="linkmydesk-rg"
LOCATION="eastasia"  # East Asia - confirmed allowed in Azure for Students subscription
STORAGE_ACCOUNT="lmdstore$(date +%s)"  # Shortened name to fit 24 char limit
CONTAINER_NAME="presentations"
SQL_SERVER="lmdsql$(date +%s)"  # Shortened SQL server name
SQL_DATABASE="linkmydesk-db"
SQL_ADMIN="sqladmin"
SQL_PASSWORD="LinkMyDesk2024!Secure"  # Change this to something secure

echo "📋 Configuration:"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  Location: $LOCATION"
echo "  Storage Account: $STORAGE_ACCOUNT"
echo "  SQL Server: $SQL_SERVER"
echo ""

# 1. Resource Group (already created, but let's ensure it)
echo "1️⃣ Creating resource group..."
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION

# 2. Storage Account
echo "2️⃣ Creating storage account..."
az storage account create \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard_LRS \
  --allow-blob-public-access true

# Wait for storage account to be fully available
echo "⏳ Waiting for storage account to be fully provisioned..."
sleep 15

# 3. Get storage connection string
echo "3️⃣ Getting storage connection string..."
STORAGE_CONNECTION_STRING=$(az storage account show-connection-string \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --output tsv)

# 4. Create blob container
echo "4️⃣ Creating blob container..."
az storage container create \
  --name $CONTAINER_NAME \
  --account-name $STORAGE_ACCOUNT \
  --public-access blob

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
echo "📝 Created resources:"
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
echo "   brew tap microsoft/mssql-release https://github.com/Microsoft/homebrew-mssql-release"
echo "   brew update"
echo "   HOMEBREW_ACCEPT_EULA=Y brew install msodbcsql18 mssql-tools18"
echo ""
echo "2. Create the Presentations table in your database:"
echo "   python create_table.py"
echo ""
echo "3. Test your connection:"
echo "   python test_connection.py"
echo ""
echo "🚀 Ready to run: ./start.sh"

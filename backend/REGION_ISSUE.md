# Azure for Students - Diagnosing Region Restrictions

## Issue
Your Azure for Students subscription has a policy that restricts resource deployment to specific regions.

## What We've Tried
- ❌ eastus
- ❌ centralindia  
- ❌ southeastasia

All failed with: `RequestDisallowedByAzure - This policy maintains a set of best available regions`

## Solution Options

### Option 1: Check Azure Portal (Recommended)
1. Go to https://portal.azure.com
2. Try to create a Storage Account manually
3. In the "Region" dropdown, you'll see which regions are available
4. Note the allowed region
5. Update `setup-azure.sh` with that region

### Option 2: Contact Azure Support
Azure for Students subscriptions often have specific regional restrictions based on your university's location.

Contact support: https://azure.microsoft.com/en-us/support/create-ticket/

### Option 3: Try All Common Student Regions

Run this script to test which regions work:

```bash
#!/bin/bash

REGIONS=("westus2" "centralus" "westeurope" "northeurope" "uksouth")

for REGION in "${REGIONS[@]}"; do
    echo "Testing $REGION..."
    az storage account create \
        --name "teststore$(date +%s)" \
        --resource-group linkmydesk-rg \
        --location $REGION \
        --sku Standard_LRS \
        --allow-blob-public-access true \
        2>&1 | grep -q "RequestDisallowedByAzure"
    
    if [ $? -ne 0 ]; then
        echo "✅ $REGION works!"
        break
    else
        echo "❌ $REGION blocked"
    fi
done
```

### Option 4: Use Azure Portal to Create Resources
If the CLI restrictions are too strict:
1. Create resources manually in Azure Portal
2. Copy the connection strings
3. Create `.env` file manually

Would you like me to create the manual setup guide?

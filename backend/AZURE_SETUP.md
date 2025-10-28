# Azure Setup Guide for linkmydesk

## 🎓 Azure for Students Subscription Detected

You're using an **Azure for Students** subscription, which is great! However, it requires some initial setup.

## 📋 Issue Diagnosed

**Problem:** Azure resource providers (like Microsoft.Storage and Microsoft.Sql) are not registered by default in new subscriptions.

**Solution:** Register the required providers before creating resources.

---

## ✅ **STEP-BY-STEP SETUP**

### **Step 1: Register Azure Providers** (One-time setup)

This registers the services you need. Takes 2-5 minutes:

```bash
cd /Users/akashnileemborgohain/Desktop/linkmydesk/backend
./register-providers.sh
```

**What this does:**
- ✅ Registers Microsoft.Storage (for Blob Storage)
- ✅ Registers Microsoft.Sql (for SQL Database)
- ✅ Registers Microsoft.Web (for App Service)
- ✅ Registers Microsoft.KeyVault (for secrets)
- ⏳ Waits for all to complete (auto-checks every 10 seconds)

**Expected Output:**
```
🔧 Registering Azure providers for linkmydesk...

📦 Registering Microsoft.Storage...
📦 Registering Microsoft.Sql...
📦 Registering Microsoft.Web...
📦 Registering Microsoft.KeyVault...

⏳ Waiting for all providers to be fully registered...
This may take 2-5 minutes...

⏳ Microsoft.Storage: Registering (waiting...)
⏳ Microsoft.Sql: Registering (waiting...)
✅ Microsoft.Storage: Registered
✅ Microsoft.Sql: Registered
✅ Microsoft.Web: Registered
✅ Microsoft.KeyVault: Registered

🎉 All providers registered successfully!
```

---

### **Step 2: Run Azure Setup Script**

After providers are registered, create all Azure resources:

```bash
./setup-azure.sh
```

**What this does:**
- ✅ Checks provider registration (will fail fast if not ready)
- ✅ Creates resource group
- ✅ Creates storage account
- ✅ Creates blob container
- ✅ Creates SQL server
- ✅ Creates SQL database (serverless tier)
- ✅ Configures firewall rules
- ✅ Generates `.env` file with connection strings

**Time:** 3-5 minutes

---

### **Step 3: Install ODBC Driver**

Required for connecting to Azure SQL:

```bash
brew tap microsoft/mssql-release https://github.com/Microsoft/homebrew-mssql-release
brew update
HOMEBREW_ACCEPT_EULA=Y brew install msodbcsql18 mssql-tools18
```

**Time:** 2-3 minutes

---

### **Step 4: Create Database Table**

```bash
source venv/bin/activate
python create_table.py
```

**Expected Output:**
```
🔗 Connecting to Azure SQL Database...
📝 Creating Presentations table...
✅ Table created successfully!
🎉 Database setup complete!
```

---

### **Step 5: Test Connections**

```bash
python test_connection.py
```

**Expected Output:**
```
🧪 Testing Azure connections...

1️⃣ Testing Azure Blob Storage...
   ✅ Blob Storage connection successful!
   📦 Container 'presentations' exists

2️⃣ Testing Azure SQL Database...
   ✅ SQL Database connection successful!
   🗄️  Database version: Microsoft SQL Azure (RTM) - 12.0.2000...
   ✅ Presentations table exists

🎉 Connection tests complete!
```

---

### **Step 6: Start Backend Server**

```bash
./start.sh
```

Or manually:
```bash
source venv/bin/activate
uvicorn main:app --reload
```

Visit: `http://127.0.0.1:8000/docs` for API documentation

---

## 🎓 **Azure for Students Notes**

Your subscription includes:
- ✅ **$100 free credit** (valid for 12 months)
- ✅ **Free services** (some services free for 12 months, others always free)
- ✅ **No credit card required** (initially)

### **Cost Estimates for linkmydesk:**

| Service | Tier | Estimated Cost |
|---------|------|----------------|
| **Blob Storage** | Standard LRS | ~$0.02/GB/month |
| **SQL Database** | Serverless (0.5-1 vCore) | ~$5-10/month (pauses when idle) |
| **App Service** | Free F1 | **FREE** |

**Total:** ~$5-12/month (mostly SQL when active)

💡 **Tip:** The serverless SQL database automatically pauses after 1 hour of inactivity, so costs are minimal during development!

---

## 🚨 **If Something Goes Wrong**

### **Check Provider Registration Status:**
```bash
az provider show --namespace Microsoft.Storage --query "registrationState"
az provider show --namespace Microsoft.Sql --query "registrationState"
```

### **Manually Register a Provider:**
```bash
az provider register --namespace Microsoft.Storage
```

### **Delete All Resources and Start Over:**
```bash
az group delete --name linkmydesk-rg --yes --no-wait
```

### **Check What's Created:**
```bash
az resource list --resource-group linkmydesk-rg --output table
```

---

## 📝 **Quick Command Reference**

```bash
# Complete setup from scratch
./register-providers.sh      # One-time, 2-5 minutes
./setup-azure.sh             # One-time, 3-5 minutes
python create_table.py       # One-time, 10 seconds
python test_connection.py    # Test anytime

# Daily development
./start.sh                   # Start backend server
```

---

## ✅ **Current Status**

- ✅ Azure CLI installed and logged in
- ✅ Subscription active: Azure for Students
- ⏳ Providers registering (Microsoft.Storage, Microsoft.Sql)
- ⏳ Waiting to run setup script

**Next Step:** Wait for `./register-providers.sh` to complete, then run `./setup-azure.sh`

---

## 🆘 **Need Help?**

If you encounter any errors, share:
1. The exact command you ran
2. The full error message
3. Output of: `az account show`

Good luck! 🚀

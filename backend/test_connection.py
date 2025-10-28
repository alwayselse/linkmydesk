"""
Tests connections to Azure Storage and SQL Database.
"""

from azure.storage.blob import BlobServiceClient
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

load_dotenv()

AZURE_STORAGE_CONNECTION_STRING = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
AZURE_SQL_CONNECTION_STRING = os.getenv("AZURE_SQL_CONNECTION_STRING")

print("🧪 Testing Azure connections...\n")

# Test Blob Storage
print("1️⃣ Testing Azure Blob Storage...")
try:
    blob_service_client = BlobServiceClient.from_connection_string(AZURE_STORAGE_CONNECTION_STRING)
    container_client = blob_service_client.get_container_client("presentations")
    
    if container_client.exists():
        print("   ✅ Blob Storage connection successful!")
        print(f"   📦 Container 'presentations' exists")
    else:
        print("   ⚠️  Container 'presentations' not found")
except Exception as e:
    print(f"   ❌ Blob Storage connection failed: {e}")

# Test SQL Database
print("\n2️⃣ Testing Azure SQL Database...")
try:
    engine = create_engine(AZURE_SQL_CONNECTION_STRING)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT @@VERSION"))
        version = result.fetchone()[0]
        print("   ✅ SQL Database connection successful!")
        print(f"   🗄️  Database version: {version[:50]}...")
        
        # Check if table exists
        result = conn.execute(text("""
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME = 'Presentations'
        """))
        
        if result.fetchone()[0] > 0:
            print("   ✅ Presentations table exists")
        else:
            print("   ⚠️  Presentations table not found - run create_table.py")
            
except Exception as e:
    print(f"   ❌ SQL Database connection failed: {e}")

print("\n🎉 Connection tests complete!")

"""
Creates the Presentations table in Azure SQL Database.
Run this once after setting up your Azure SQL Database.
"""

from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

load_dotenv()

AZURE_SQL_CONNECTION_STRING = os.getenv("AZURE_SQL_CONNECTION_STRING")

if not AZURE_SQL_CONNECTION_STRING:
    raise ValueError("AZURE_SQL_CONNECTION_STRING not found in .env file")

print("🔗 Connecting to Azure SQL Database...")
engine = create_engine(AZURE_SQL_CONNECTION_STRING)

create_table_sql = """
CREATE TABLE Presentations (
    Id INT PRIMARY KEY IDENTITY(1,1),
    ShortCode NVARCHAR(10) NOT NULL UNIQUE,
    ViewerUrl NVARCHAR(1024) NOT NULL,
    BlobPath NVARCHAR(1024) NOT NULL,
    OriginalFileName NVARCHAR(255),
    CreatedAt DATETIME DEFAULT GETUTCDATE(),
    ExpiresAt DATETIME NOT NULL
);

CREATE INDEX IX_Presentations_ExpiresAt ON Presentations (ExpiresAt);
"""

try:
    with engine.connect() as conn:
        # Check if table exists
        result = conn.execute(text("""
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME = 'Presentations'
        """))
        
        if result.fetchone()[0] > 0:
            print("⚠️  Table 'Presentations' already exists. Skipping creation.")
        else:
            print("📝 Creating Presentations table...")
            conn.execute(text(create_table_sql))
            conn.commit()
            print("✅ Table created successfully!")
            
except Exception as e:
    print(f"❌ Error: {e}")
    raise

print("🎉 Database setup complete!")

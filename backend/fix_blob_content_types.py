"""
Fix Content-Type for existing blobs in Azure Storage.
Run this once to update all existing files.
"""
from azure.storage.blob import BlobServiceClient, ContentSettings
from dotenv import load_dotenv
import os

load_dotenv()

AZURE_STORAGE_CONNECTION_STRING = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
CONTAINER_NAME = "presentations"

blob_service_client = BlobServiceClient.from_connection_string(AZURE_STORAGE_CONNECTION_STRING)
container_client = blob_service_client.get_container_client(CONTAINER_NAME)

print("🔧 Fixing Content-Type for existing blobs...\n")

blob_list = container_client.list_blobs()
fixed_count = 0

for blob in blob_list:
    blob_client = container_client.get_blob_client(blob.name)
    
    # Determine correct content type based on file extension
    if blob.name.endswith('.pdf'):
        correct_content_type = 'application/pdf'
    elif blob.name.endswith('.pptx'):
        correct_content_type = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    else:
        print(f"⚠️ Unknown file type: {blob.name}")
        continue
    
    # Get current properties
    current_content_type = blob.content_settings.content_type if blob.content_settings else 'unknown'
    
    # Update if needed
    if current_content_type != correct_content_type:
        print(f"📝 Fixing {blob.name}")
        print(f"   Old: {current_content_type}")
        print(f"   New: {correct_content_type}")
        
        blob_client.set_http_headers(
            content_settings=ContentSettings(content_type=correct_content_type)
        )
        fixed_count += 1
    else:
        print(f"✅ Already correct: {blob.name}")

print(f"\n🎉 Fixed {fixed_count} blob(s)")

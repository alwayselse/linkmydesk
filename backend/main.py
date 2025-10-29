"""
LinkMyDesk FastAPI Backend

Production-ready API for anonymous presentation sharing.
Deployed on Azure App Service.

Production Startup Command:
    uvicorn main:app --host 0.0.0.0 --port 8000

Environment Variables Required:
    - AZURE_STORAGE_CONNECTION_STRING: Azure Blob Storage connection string
    - AZURE_SQL_CONNECTION_STRING: Azure SQL Database connection string
    - CONTAINER_NAME: Blob container name (default: "presentations")
    - CORS_ALLOWED_ORIGINS: Comma-separated list of allowed CORS origins
    - ENVIRONMENT: "production" or "development" (default: "development")
"""

import string
import random
import uuid
import os
import sys
import urllib.parse
import logging
import time
from datetime import datetime, timedelta
from typing import Optional, List

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.exc import OperationalError

# Azure SDKs
from azure.storage.blob import BlobServiceClient, ContentSettings

# --- Logging Configuration ---
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# --- Load Environment Variables ---
# Load .env only in development (for local testing)
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
if ENVIRONMENT == "development":
    try:
        from dotenv import load_dotenv
        load_dotenv()
        logger.info("Loaded .env file for development environment")
    except ImportError:
        logger.warning("python-dotenv not installed, skipping .env file")

# Required environment variables
AZURE_STORAGE_CONNECTION_STRING = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
AZURE_SQL_CONNECTION_STRING = os.getenv("AZURE_SQL_CONNECTION_STRING")
CONTAINER_NAME = os.getenv("CONTAINER_NAME", "presentations")

# CORS configuration
CORS_ORIGINS_ENV = os.getenv("CORS_ALLOWED_ORIGINS", "")
if CORS_ORIGINS_ENV:
    CORS_ALLOWED_ORIGINS = [origin.strip() for origin in CORS_ORIGINS_ENV.split(",")]
else:
    # Default to local development origins
    CORS_ALLOWED_ORIGINS = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]
    logger.info("No CORS_ALLOWED_ORIGINS set, using development defaults")

# --- Validate Required Environment Variables ---
missing_vars = []
if not AZURE_STORAGE_CONNECTION_STRING:
    missing_vars.append("AZURE_STORAGE_CONNECTION_STRING")
if not AZURE_SQL_CONNECTION_STRING:
    missing_vars.append("AZURE_SQL_CONNECTION_STRING")

if missing_vars:
    error_msg = f"Missing required environment variables: {', '.join(missing_vars)}"
    logger.error(error_msg)
    raise ValueError(error_msg)

logger.info(f"Environment: {ENVIRONMENT}")
logger.info(f"Container: {CONTAINER_NAME}")
logger.info(f"CORS Allowed Origins: {CORS_ALLOWED_ORIGINS}")

# --- Database Setup (SQLAlchemy) ---
logger.info("Initializing database connection...")
try:
    # Connection settings optimized for serverless Azure SQL (auto-pause/resume)
    engine = create_engine(
        AZURE_SQL_CONNECTION_STRING,
        echo=False,  # Disable SQL logging in production (we use Python logging)
        pool_pre_ping=True,  # Test connections before using them
        pool_recycle=3600,  # Recycle connections after 1 hour
        connect_args={
            "timeout": 60,  # 60 second connection timeout (for serverless wake-up)
        }
    )
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    logger.info("Database engine created successfully")
except Exception as e:
    logger.error(f"Failed to create database engine: {e}")
    raise

def get_db() -> Session:
    """
    Dependency to get database session.
    Ensures proper connection management and cleanup.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Initialize Azure Blob Storage ---
logger.info("Initializing Azure Blob Storage client...")
try:
    blob_service_client = BlobServiceClient.from_connection_string(AZURE_STORAGE_CONNECTION_STRING)
    container_client = blob_service_client.get_container_client(CONTAINER_NAME)
    logger.info(f"Blob storage client initialized for container: {CONTAINER_NAME}")
except Exception as e:
    logger.error(f"Failed to initialize blob storage: {e}")
    raise

# --- Security Headers Middleware ---
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Content-Security-Policy"] = "default-src 'self';"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        return response

# --- FastAPI App Setup ---
app = FastAPI(
    title="LinkMyDesk API",
    description="Anonymous presentation sharing service for temporary file viewing",
    version="1.0.0",
    docs_url="/docs" if ENVIRONMENT == "development" else None,  # Disable docs in production
    redoc_url="/redoc" if ENVIRONMENT == "development" else None
)

# Add security headers middleware
app.add_middleware(SecurityHeadersMiddleware)

# CORS Configuration
logger.info(f"Configuring CORS with origins: {CORS_ALLOWED_ORIGINS}")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# --- Global Exception Handler ---
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Global exception handler to catch all unhandled exceptions.
    Prevents stack trace leakage to clients in production.
    """
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    
    # In development, show detailed error
    if ENVIRONMENT == "development":
        return JSONResponse(
            status_code=500,
            content={"detail": f"Internal Server Error: {str(exc)}"}
        )
    
    # In production, return generic error
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error"}
    )

# --- Pydantic Models ---
class PresentationResponse(BaseModel):
    """Response model for successful file upload."""
    short_code: str
    original_file_name: str
    viewer_url: str

class ViewerResponse(BaseModel):
    """Response model for presentation retrieval."""
    viewer_url: str

# --- Helper Functions ---

def retry_db_operation(func, max_retries: int = 3, delay: float = 2):
    """
    Retry a database operation if it fails due to connection timeout.
    Useful for serverless databases that auto-pause and need time to wake up.
    
    Args:
        func: Function to execute (should return a value or None)
        max_retries: Maximum number of retry attempts
        delay: Initial delay between retries (doubles each time)
    
    Returns:
        Result of the function call
    
    Raises:
        OperationalError: If all retries are exhausted
    """
    for attempt in range(max_retries):
        try:
            return func()
        except OperationalError as e:
            if "timeout" in str(e).lower() and attempt < max_retries - 1:
                logger.warning(
                    f"Database connection timeout (serverless wake-up). "
                    f"Retrying in {delay}s... (Attempt {attempt + 1}/{max_retries})"
                )
                time.sleep(delay)
                delay *= 2  # Exponential backoff
            else:
                logger.error(f"Database operation failed after {attempt + 1} attempts: {e}")
                raise

def generate_short_code(length: int = 6) -> str:
    """
    Generate a random alphanumeric short code with dash separator.
    
    Args:
        length: Total length of code (default: 6)
    
    Returns:
        Short code in format "XXX-XXX" (e.g., "A7B-K9X")
    """
    chars = string.ascii_uppercase + string.digits
    code = ''.join(random.choices(chars, k=length))
    # Add dash for readability
    return f"{code[:3]}-{code[3:]}"

def upload_to_blob(file_bytes: bytes, file_name: str, content_type: Optional[str] = None) -> str:
    """
    Upload file to Azure Blob Storage with streaming and parallel chunks for better performance.
    
    Args:
        file_bytes: File content as bytes
        file_name: Blob name (should be unique)
        content_type: MIME type of the file
    
    Returns:
        Public HTTPS URL of the uploaded blob
    
    Raises:
        Exception: If upload fails
    """
    try:
        from io import BytesIO
        
        blob_client = container_client.get_blob_client(file_name)
        
        # Set Content-Type for proper file recognition
        content_settings = None
        if content_type:
            content_settings = ContentSettings(content_type=content_type)
        
        # Use streaming upload for better performance with large files
        file_stream = BytesIO(file_bytes)
        
        blob_client.upload_blob(
            file_stream, 
            overwrite=True,
            content_settings=content_settings,
            max_concurrency=4  # Upload in parallel chunks for faster upload
        )
        blob_url = blob_client.url
        
        # Force HTTPS for security
        if blob_url.startswith('http://'):
            blob_url = blob_url.replace('http://', 'https://', 1)
        
        logger.info(f"Successfully uploaded blob: {file_name}")
        return blob_url
    except Exception as e:
        logger.error(f"Blob upload failed for {file_name}: {e}")
        raise

def delete_from_blob(blob_path: str) -> None:
    """
    Delete a file from Azure Blob Storage.
    
    Args:
        blob_path: Blob name/path to delete
    """
    try:
        blob_client = container_client.get_blob_client(blob_path)
        blob_client.delete_blob(delete_snapshots="include")  # Delete blob and all snapshots
        logger.info(f"Successfully deleted blob: {blob_path}")
        print(f"🗑️ Deleted blob from storage: {blob_path}")
    except Exception as e:
        logger.warning(f"Error deleting blob {blob_path}: {e}")
        print(f"⚠️ Could not delete blob {blob_path}: {e}")

# --- API Endpoints ---

@app.get("/")
async def root():
    """
    Health check endpoint.
    
    Returns:
        dict: API status and timestamp
    """
    return {
        "message": "LinkMyDesk API is running.",
        "version": "1.0.0",
        "environment": ENVIRONMENT,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/upload", response_model=PresentationResponse)
async def upload_presentation(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
) -> PresentationResponse:
    """
    Upload a presentation file (.pptx or .pdf) and receive a unique short code.
    
    Args:
        file: Uploaded file (must be .pptx or .pdf, max 50MB)
        db: Database session
    
    Returns:
        PresentationResponse with short code and original filename
    
    Raises:
        HTTPException: If validation fails or upload errors occur
    """
    logger.info(f"Upload request received: {file.filename} ({file.content_type})")
    
    # 1. Validate file type
    allowed_types = [
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",  # .pptx
        "application/pdf"  # .pdf
    ]
    
    if file.content_type not in allowed_types:
        logger.warning(f"Invalid file type rejected: {file.content_type}")
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Only .pptx and .pdf are allowed. Got: {file.content_type}"
        )
    
    # 2. Read file and validate size
    file_bytes = await file.read()
    file_size_mb = len(file_bytes) / (1024 * 1024)
    max_size = 50 * 1024 * 1024  # 50MB
    
    logger.info(f"File size: {file_size_mb:.2f} MB")
    
    if len(file_bytes) > max_size:
        logger.warning(f"File too large: {file_size_mb:.2f} MB")
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is 50MB. Got: {file_size_mb:.1f}MB"
        )
    
    # 3. Generate unique blob name
    file_extension = ".pptx" if "presentation" in file.content_type else ".pdf"
    blob_name = f"{uuid.uuid4()}{file_extension}"
    logger.info(f"Generated blob name: {blob_name}")
    
    # 4. Upload to Azure Blob Storage with proper Content-Type
    try:
        blob_url = upload_to_blob(file_bytes, blob_name, content_type=file.content_type)
    except Exception as e:
        print(f"❌ Upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")
    
    # 5. Construct viewer URL based on file type
    # For PDFs: use direct blob URL (browser native viewer)
    # For PPTX: use Microsoft Office viewer with URL-encoded blob URL
    if file_extension == ".pdf":
        viewer_url = blob_url
        print(f"📄 PDF direct URL: {viewer_url}")
    else:
        # URL-encode the blob URL for Office Viewer
        encoded_blob_url = urllib.parse.quote(blob_url, safe='')
        viewer_url = f"https://view.officeapps.live.com/op/view.aspx?src={encoded_blob_url}"
        print(f"� PPTX viewer URL: {viewer_url}")
    
    # 6. Generate unique short code with retry logic
    max_attempts = 10
    short_code = None
    
    for attempt in range(max_attempts):
        candidate_code = generate_short_code()
        print(f"🎲 Attempt {attempt + 1}: Generated code {candidate_code}")
        
        # Check if code already exists (with retry for serverless DB)
        try:
            def check_code():
                result = db.execute(
                    text("SELECT COUNT(*) as count FROM Presentations WHERE ShortCode = :code"),
                    {"code": candidate_code}
                )
                return result.scalar()
            
            count = retry_db_operation(check_code)
            print(f"   Existing codes with this value: {count}")
            
            if count == 0:
                short_code = candidate_code
                print(f"✅ Unique code found: {short_code}")
                break
        except Exception as e:
            print(f"⚠️ Database check error: {e}")
            if attempt == max_attempts - 1:
                delete_from_blob(blob_name)
                raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")
            continue
    
    if not short_code:
        delete_from_blob(blob_name)
        print("❌ Failed to generate unique code after 10 attempts")
        raise HTTPException(status_code=500, detail="Failed to generate unique code. Please try again.")
    
    # 7. Calculate expiry (24 hours from now)
    created_at = datetime.utcnow()
    expires_at = created_at + timedelta(hours=24)
    
    print(f"⏰ Created: {created_at.isoformat()}")
    print(f"⏰ Expires: {expires_at.isoformat()}")
    
    # 8. Save to database (with retry for serverless DB)
    try:
        def save_to_db():
            db.execute(
                text("""
                    INSERT INTO Presentations (ShortCode, ViewerUrl, BlobPath, OriginalFileName, CreatedAt, ExpiresAt)
                    VALUES (:short_code, :viewer_url, :blob_path, :original_filename, :created_at, :expires_at)
                """),
                {
                    "short_code": short_code,
                    "viewer_url": viewer_url,
                    "blob_path": blob_name,
                    "original_filename": file.filename,
                    "created_at": created_at,
                    "expires_at": expires_at
                }
            )
            db.commit()
            return True
        
        retry_db_operation(save_to_db)
        print(f"✅ Saved to database: {short_code}")
        
        # Verify it was saved
        def verify_save():
            result = db.execute(
                text("SELECT COUNT(*) FROM Presentations WHERE ShortCode = :code"),
                {"code": short_code}
            )
            return result.scalar()
        
        verify = retry_db_operation(verify_save)
        print(f"✅ Verification: {verify} record(s) with code {short_code}")
        
    except Exception as e:
        print(f"❌ Database save failed: {e}")
        db.rollback()
        delete_from_blob(blob_name)
        raise HTTPException(status_code=500, detail=f"Failed to save record. Database may be starting up. Please try again in a moment.")
    
    print(f"🎉 Upload complete! Code: {short_code}\n")
    
    return PresentationResponse(
        short_code=short_code,
        original_file_name=file.filename or "unknown",
        viewer_url=viewer_url
    )

@app.get("/get_presentation/{short_code}", response_model=ViewerResponse)
async def get_presentation(short_code: str, db: Session = Depends(get_db)):
    """
    Retrieves the viewer URL for a given short code.
    Returns 404 if not found or expired.
    """
    print(f"\n🔍 Lookup request for code: {short_code}")
    
    # Query the database (with retry for serverless DB)
    try:
        def fetch_presentation():
            result = db.execute(
                text("""
                    SELECT ViewerUrl, BlobPath, ExpiresAt, CreatedAt
                    FROM Presentations 
                    WHERE ShortCode = :short_code
                """),
                {"short_code": short_code}
            ).fetchone()
            return result
        
        result = retry_db_operation(fetch_presentation)
        
        if not result:
            print(f"❌ Code not found: {short_code}")
            # List all codes for debugging
            def get_all_codes():
                return db.execute(text("SELECT ShortCode FROM Presentations")).fetchall()
            
            all_codes = retry_db_operation(get_all_codes)
            print(f"📋 Available codes in database: {[c[0] for c in all_codes]}")
            raise HTTPException(
                status_code=404,
                detail="Presentation not found or has expired."
            )
        
        viewer_url, blob_path, expires_at, created_at = result
        print(f"✅ Found presentation:")
        print(f"   Blob: {blob_path}")
        print(f"   Created: {created_at}")
        print(f"   Expires: {expires_at}")
        
        # Check if expired
        now = datetime.utcnow()
        if expires_at < now:
            print(f"⏰ Presentation expired (now: {now.isoformat()})")
            
            # Delete the blob from storage first
            try:
                delete_from_blob(blob_path)
            except Exception as e:
                logger.error(f"Failed to delete blob {blob_path} during expiry cleanup: {e}")
                print(f"⚠️ Blob deletion failed, but continuing with database cleanup")
            
            # Delete from database
            try:
                db.execute(
                    text("DELETE FROM Presentations WHERE ShortCode = :short_code"),
                    {"short_code": short_code}
                )
                db.commit()
                print(f"🗑️ Cleaned up expired presentation from database")
            except Exception as e:
                logger.error(f"Database cleanup failed: {e}")
                db.rollback()
                print(f"⚠️ Database cleanup error: {e}")
            
            raise HTTPException(
                status_code=404,
                detail="Presentation not found or has expired."
            )
        
        print(f"✅ Returning viewer URL\n")
        return ViewerResponse(viewer_url=viewer_url)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Database query failed: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# --- Debug endpoint ---
@app.get("/debug/presentations")
async def list_presentations(db: Session = Depends(get_db)):
    """List all presentations (for debugging only - remove in production!)"""
    try:
        results = db.execute(
            text("SELECT ShortCode, OriginalFileName, CreatedAt, ExpiresAt FROM Presentations ORDER BY CreatedAt DESC")
        ).fetchall()
        
        presentations = []
        for row in results:
            presentations.append({
                "short_code": row[0],
                "filename": row[1],
                "created_at": row[2].isoformat() if row[2] else None,
                "expires_at": row[3].isoformat() if row[3] else None,
                "is_expired": row[3] < datetime.utcnow() if row[3] else False
            })
        
        return {"count": len(presentations), "presentations": presentations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

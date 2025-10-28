# LinkMyDesk Backend - Production Deployment Guide# Backend Setup & Usage



## Overview## Initial Setup



Production-ready FastAPI backend for the linkmydesk anonymous presentation sharing service.This backend uses a Python virtual environment to manage dependencies separately from your system Python and Conda.



## Production Startup Command### One-Time Setup



```bash```bash

uvicorn main:app --host 0.0.0.0 --port 8000# Navigate to backend directory

```cd backend



For Azure App Service, this is automatically configured in the platform.# The virtual environment (venv) is already created with all dependencies installed

# If you need to recreate it:

## Required Environment Variables# python3 -m venv venv

# source venv/bin/activate

Set these in Azure App Service Configuration → Application settings:# pip install -r requirements.txt

```

| Variable | Description | Example |

|----------|-------------|---------|## Running the Server

| `AZURE_STORAGE_CONNECTION_STRING` | Azure Blob Storage connection string | `DefaultEndpointsProtocol=https;AccountName=...` |

| `AZURE_SQL_CONNECTION_STRING` | Azure SQL Database connection string | `mssql+pyodbc://user:pass@server.database.windows.net/db?driver=...` |### Option 1: Using the start script (Recommended)

| `CONTAINER_NAME` | Blob container name (optional) | `presentations` (default) |

| `CORS_ALLOWED_ORIGINS` | Comma-separated list of allowed origins | `https://linkmydesk.vercel.app,https://www.linkmydesk.com` |```bash

| `ENVIRONMENT` | Environment mode | `production` (disables docs, generic errors) |./start.sh

```

## Local Development

### Option 2: Manual start

### Setup

```bash

```bash# Activate the virtual environment

# Create virtual environmentsource venv/bin/activate

python3 -m venv venv

# Start the server

# Activate virtual environmentuvicorn main:app --reload

source venv/bin/activate  # On Windows: venv\Scripts\activate```



# Install dependencies## Important Notes

pip install -r requirements.txt

### About Conda vs venv

# Create .env file with credentials- You may see `(base)` in your terminal prompt - this is your Conda base environment

cp .env.example .env- This project uses a **Python venv** (not Conda) for better compatibility

# Edit .env with your Azure credentials- The venv is isolated and won't conflict with Conda

```- When you activate the venv with `source venv/bin/activate`, you'll see `(venv)` in your prompt



### Run Locally### Deactivating Environments



```bashTo deactivate the virtual environment:

# From backend directory```bash

uvicorn main:app --host 127.0.0.1 --port 8000 --reloaddeactivate

``````



The `--reload` flag enables auto-reload on code changes (development only).To deactivate Conda base (if needed):

```bash

### Environment Variables (.env for local)conda deactivate

```

Create a `.env` file in the `backend/` directory:

## Environment Variables

```env

AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=your_storage;...Create a `.env` file in this directory with:

AZURE_SQL_CONNECTION_STRING=mssql+pyodbc://...

CONTAINER_NAME=presentations```env

ENVIRONMENT=development# Azure Blob Storage

```AZURE_STORAGE_CONNECTION_STRING=your_connection_string_here

CONTAINER_NAME=presentations

## API Endpoints

# Azure SQL Database

### Health CheckDATABASE_URL=your_database_url_here

- **GET** `/` - Returns API status and version```



### Upload Presentation## API Endpoints

- **POST** `/upload`

- **Body**: `multipart/form-data` with `file` field- `GET /` - Health check

- **Accepts**: `.pptx` or `.pdf` (max 50MB)- `POST /upload` - Upload presentation file

- **Returns**: `{ "short_code": "ABC-123", "original_file_name": "file.pdf" }`- `GET /get_presentation/{short_code}` - Retrieve presentation viewer URL



### Retrieve Presentation## Development

- **GET** `/get_presentation/{short_code}`

- **Returns**: `{ "viewer_url": "https://..." }`The server runs on `http://127.0.0.1:8000` by default with hot reload enabled.

- **Errors**: `404` if not found or expired

Visit `http://127.0.0.1:8000/docs` for interactive API documentation.

### Debug (Development Only)
- **GET** `/debug/presentations` - List all presentations (disabled in production)

## Security Features

### Implemented
- ✅ Environment-based configuration (no hardcoded secrets)
- ✅ CORS configuration via environment variable
- ✅ Security headers (X-Content-Type-Options, X-Frame-Options, CSP)
- ✅ Global exception handler (no stack trace leakage in production)
- ✅ File type validation (only .pptx and .pdf)
- ✅ File size validation (50MB limit)
- ✅ HTTPS enforcement on blob URLs
- ✅ Structured logging with proper levels

### Security Headers Added
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Content-Security-Policy: default-src 'self';`
- `X-XSS-Protection: 1; mode=block`

## Database

### Schema
Table: `Presentations`
- `Id` (INT, Primary Key, Identity)
- `ShortCode` (NVARCHAR(10), Unique)
- `ViewerUrl` (NVARCHAR(1024))
- `BlobPath` (NVARCHAR(1024))
- `OriginalFileName` (NVARCHAR(255))
- `CreatedAt` (DATETIME)
- `ExpiresAt` (DATETIME)

### Serverless Database Support
The backend includes retry logic and connection pooling optimized for Azure SQL Serverless:
- Auto-retry on timeout (serverless wake-up)
- Connection pre-ping before use
- 60-second connection timeout
- Connection recycling after 1 hour

## Logging

### Production Logging
- All logs output to `stdout` (captured by Azure App Service)
- Log levels: INFO, WARNING, ERROR
- Structured format with timestamps
- Sensitive data excluded

### Key Log Events
- Application startup with configuration
- Upload requests (filename, size, generated code)
- Database operations (with retry attempts)
- Blob storage operations
- Errors with full stack traces (server-side only)

## Deployment to Azure App Service

### Prerequisites
- Azure CLI installed
- App Service created
- Environment variables configured

### Deployment Steps

1. **Configure App Service**
   ```bash
   az webapp config set --resource-group <rg> --name <app-name> \
     --startup-file "uvicorn main:app --host 0.0.0.0 --port 8000"
   ```

2. **Set Environment Variables**
   ```bash
   az webapp config appsettings set --resource-group <rg> --name <app-name> \
     --settings ENVIRONMENT=production \
                CORS_ALLOWED_ORIGINS="https://yourdomain.com" \
                AZURE_STORAGE_CONNECTION_STRING="..." \
                AZURE_SQL_CONNECTION_STRING="..."
   ```

3. **Deploy Code**
   ```bash
   # Option 1: ZIP deployment
   az webapp deployment source config-zip --resource-group <rg> --name <app-name> --src backend.zip
   
   # Option 2: GitHub Actions (recommended)
   # Connect repository in Azure Portal → Deployment Center
   ```

4. **Verify Deployment**
   ```bash
   curl https://<app-name>.azurewebsites.net/
   # Should return: {"message": "LinkMyDesk API is running.", ...}
   ```

## Performance Considerations

- Connection pooling enabled for database
- Blob uploads use streaming (no memory buffering of entire file)
- Database queries optimized with indexes
- Short code generation with collision retry (up to 10 attempts)

## Error Handling

### Client Errors (4xx)
- `400`: Invalid file type or size
- `404`: Presentation not found or expired

### Server Errors (5xx)
- `500`: Generic internal error (production) or detailed error (development)
- Automatic cleanup on failure (blob deletion if database save fails)

## Monitoring

### Health Check
Monitor the `/` endpoint for uptime checks.

### Logs
View logs in Azure Portal → App Service → Log stream or use:
```bash
az webapp log tail --resource-group <rg> --name <app-name>
```

### Metrics to Monitor
- Response time for `/upload` and `/get_presentation`
- Error rate (500 responses)
- Database connection timeout frequency
- Blob storage upload failures

## Maintenance

### Expired Presentations Cleanup
An Azure Function (`DailyCleanup`) runs at 4:00 AM UTC daily to delete expired presentations from both database and blob storage.

### Manual Cleanup (if needed)
```sql
-- Find expired presentations
SELECT ShortCode, BlobPath, ExpiresAt 
FROM Presentations 
WHERE ExpiresAt < GETUTCDATE();

-- Delete expired (Azure Function does this automatically)
DELETE FROM Presentations WHERE ExpiresAt < GETUTCDATE();
```

## Troubleshooting

### Database Connection Timeout
- **Symptom**: `Login timeout expired`
- **Cause**: Azure SQL serverless database auto-paused
- **Solution**: Retry logic handles this automatically (3 retries with exponential backoff)

### CORS Errors
- **Symptom**: Browser console shows CORS policy error
- **Solution**: Verify `CORS_ALLOWED_ORIGINS` includes your frontend domain

### Blob Upload Failures
- **Symptom**: 500 error on upload
- **Check**: `AZURE_STORAGE_CONNECTION_STRING` is correct and storage account is accessible

### Environment Variable Not Found
- **Symptom**: Application fails to start
- **Solution**: Check all required environment variables are set in App Service Configuration

## Code Quality

### Formatting
Code follows PEP 8 style guide. Format with:
```bash
pip install black
black main.py
```

### Type Hints
All functions include type hints for parameters and return values.

### Documentation
All functions and endpoints include docstrings.

## Support

For issues or questions:
- Check Azure App Service logs first
- Verify environment variables are set correctly
- Ensure database and storage account are accessible
- Review this README for configuration guidance

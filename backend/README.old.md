# Backend Setup & Usage

## Initial Setup

This backend uses a Python virtual environment to manage dependencies separately from your system Python and Conda.

### One-Time Setup

```bash
# Navigate to backend directory
cd backend

# The virtual environment (venv) is already created with all dependencies installed
# If you need to recreate it:
# python3 -m venv venv
# source venv/bin/activate
# pip install -r requirements.txt
```

## Running the Server

### Option 1: Using the start script (Recommended)

```bash
./start.sh
```

### Option 2: Manual start

```bash
# Activate the virtual environment
source venv/bin/activate

# Start the server
uvicorn main:app --reload
```

## Important Notes

### About Conda vs venv
- You may see `(base)` in your terminal prompt - this is your Conda base environment
- This project uses a **Python venv** (not Conda) for better compatibility
- The venv is isolated and won't conflict with Conda
- When you activate the venv with `source venv/bin/activate`, you'll see `(venv)` in your prompt

### Deactivating Environments

To deactivate the virtual environment:
```bash
deactivate
```

To deactivate Conda base (if needed):
```bash
conda deactivate
```

## Environment Variables

Create a `.env` file in this directory with:

```env
# Azure Blob Storage
AZURE_STORAGE_CONNECTION_STRING=your_connection_string_here
CONTAINER_NAME=presentations

# Azure SQL Database
DATABASE_URL=your_database_url_here
```

## API Endpoints

- `GET /` - Health check
- `POST /upload` - Upload presentation file
- `GET /get_presentation/{short_code}` - Retrieve presentation viewer URL

## Development

The server runs on `http://127.0.0.1:8000` by default with hot reload enabled.

Visit `http://127.0.0.1:8000/docs` for interactive API documentation.

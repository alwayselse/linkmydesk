# linkmydesk

A web application for anonymously sharing presentation files (PPTX or PDF) with a simple short code. Files expire after 24 hours.

## Project Structure

```
linkmydesk/
├── frontend/          # React SPA (Vite + Tailwind CSS)
├── backend/           # Python FastAPI application
└── .github/          # GitHub Copilot instructions
```

## Quick Start

### Backend Setup

```bash
cd backend
source venv/bin/activate  # Activate virtual environment
uvicorn main:app --reload

# Or use the start script:
./start.sh
```

The backend will run on `http://127.0.0.1:8000`

### Frontend Setup

```bash
cd frontend
npm install  # Already done
npm run dev
```

The frontend will run on `http://localhost:5173`

## Development Notes

### Python Environment
- The backend uses a **Python venv** (virtual environment)
- All dependencies are in `backend/requirements.txt`
- The venv is isolated from your system Python and Conda

### Frontend
- Built with React 19, Vite, Tailwind CSS
- Dark theme with modern, professional design
- Fully responsive

## Features

- 📤 **Anonymous Upload**: No login required
- 🔗 **Simple Sharing**: 6-8 character short codes
- ⏱️ **Temporary**: Files auto-expire after 24 hours
- 📱 **Responsive**: Works on all devices
- 🎨 **Modern UI**: Dark theme with smooth animations

## Tech Stack

**Frontend:**
- React 19 + Vite
- Tailwind CSS
- React Router DOM
- Axios
- react-dropzone
- react-hot-toast

**Backend:**
- Python 3.10+
- FastAPI
- SQLAlchemy + pyodbc
- Azure Blob Storage
- Azure SQL Database

## API Documentation

Once the backend is running, visit:
- Interactive docs: `http://127.0.0.1:8000/docs`
- Alternative docs: `http://127.0.0.1:8000/redoc`

## Environment Variables

Create a `.env` file in the `backend/` directory:

```env
AZURE_STORAGE_CONNECTION_STRING=your_connection_string
CONTAINER_NAME=presentations
DATABASE_URL=your_database_url
```

## License

MIT

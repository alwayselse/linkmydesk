# GitHub Copilot Instructions for linkmydesk

## Project Context

**linkmydesk** is a web application that allows users to anonymously upload presentation files (PPTX or PDF), receive a unique short code, and use that code on any device to instantly view and present the file. Files expire after 24 hours.

## Architecture Overview

This is a **monorepo** containing:
- **`frontend/`**: React SPA (Vite + Tailwind CSS)
- **`backend/`**: Python FastAPI application
- **Azure Cloud Services**: Blob Storage, SQL Database, App Service, Static Web Apps, Functions, Key Vault

## Technology Stack

### Frontend
- **Framework**: React 19+ with Vite
- **Styling**: Tailwind CSS (dark theme, zinc-900 background, indigo-600 accents)
- **Routing**: React Router DOM v7+
- **HTTP Client**: Axios
- **File Upload**: react-dropzone
- **Notifications**: react-hot-toast
- **Font**: Inter (loaded via Google Fonts)

### Backend
- **Framework**: FastAPI (Python 3.10+)
- **Server**: Uvicorn
- **Database**: SQLAlchemy + pyodbc (Azure SQL)
- **Storage**: azure-storage-blob
- **Authentication**: Azure Key Vault for secrets

## Database Schema

### Table: `Presentations`
```sql
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
```

## API Endpoints

### Backend Base URL
- **Local Development**: `http://127.0.0.1:8000`
- **Production**: `https://linkmydesk-api.azurewebsites.net`

### Endpoints

#### `GET /`
- Health check endpoint
- Returns: `{"message": "LinkMyDesk API is running."}`

#### `POST /upload`
- **Purpose**: Handle file upload, storage, and code generation
- **Request**: `multipart/form-data` with `file` field
- **Validation**:
  - File type: `.pptx` or `.pdf` only
  - Max size: 50MB
- **Process**:
  1. Validate file type and size (return 400 if invalid)
  2. Generate unique blob name using `uuid.uuid4()`
  3. Upload to Azure Blob Storage (`presentations` container)
  4. Get public blob URL
  5. Construct viewer URL: `https://view.officeapps.live.com/op/view.aspx?src={blob_url}`
  6. Generate unique 6-8 character alphanumeric short code
  7. Calculate expiry (now + 24 hours)
  8. Save to database
- **Success (200)**: `{"short_code": "A7B-K9", "original_file_name": "MyReport.pptx"}`
- **Error (400)**: `{"detail": "Invalid file type or size."}`

#### `GET /get_presentation/{short_code}`
- **Purpose**: Retrieve viewer URL for a given code
- **Process**:
  1. Query database for ShortCode
  2. If not found, return 404
  3. Check if expired (ExpiresAt < now)
  4. If expired, optionally delete and return 404
  5. If valid, return ViewerUrl
- **Success (200)**: `{"viewer_url": "https://view.officeapps.live.com/..."}`
- **Error (404)**: `{"detail": "Presentation not found or has expired."}`

## Frontend Structure

### Routes
- **`/`**: HomePage component
- **`/:shortCode`**: ViewerPage component

### Components

#### HomePage
- **Layout**: Centered card on dark background
- **CodeEntry**: Input field + "View" button → navigates to `/{code}`
- **Uploader**: Multi-state component with react-dropzone
  - **State 1 (Default)**: Dropzone with "Drag & drop" text
  - **State 2 (File Selected)**: Show filename + "Get Your Code" button
  - **State 3 (Loading)**: Full-screen modal with spinner
  - **State 4 (Success)**: Display short code (large, bold, monospace) + copy button
  - **State 5 (Error)**: Toast error, reset to State 2

#### ViewerPage
- **Loading State**: Full-screen spinner "Loading Presentation..."
- **Error State**: Full-screen error message + "Go Back Home" button
- **Success State**: Full-screen iframe with viewer URL + 10px indigo banner at top

## Design System

### Colors
- **Background**: `bg-zinc-900`
- **Text**: `text-zinc-100`
- **Secondary Text**: `text-zinc-400`, `text-zinc-500`
- **Borders**: `border-zinc-700`
- **Cards**: `bg-zinc-800`
- **Accent**: `bg-indigo-600`, `hover:bg-indigo-700`
- **Error**: `text-red-500` / `bg-red-600`

### Typography
- **Font Family**: Inter (Google Fonts)
- **Code Display**: Monospace, 6xl, bold
- **Headings**: Bold, 4xl-5xl
- **Body**: Regular, lg

### Components
- **Buttons**: Rounded-lg, semibold, with hover effects and scale transforms
- **Inputs**: Rounded-lg, px-6 py-4, focus ring
- **Cards**: Rounded-xl, border, padding
- **Modals**: Full-screen overlay, centered content
- **Toasts**: Dark theme, zinc-800 background

## Code Style Guidelines

### React/JavaScript
- Use functional components with hooks
- Prefer `const` over `let`
- Use arrow functions for callbacks
- Destructure props and state
- Keep components focused and single-purpose
- Use async/await for API calls
- Handle loading and error states explicitly

### Python/FastAPI
- Use async endpoints where possible
- Type hints for all function parameters and returns
- Use Pydantic models for request/response validation
- Handle exceptions with appropriate HTTP status codes
- Use environment variables for configuration
- Follow PEP 8 style guide

### File Validation
- Always validate file types on both client and server
- Enforce 50MB file size limit
- Check file extensions: `.pptx`, `.pdf`
- Use proper MIME type checking

### Error Handling
- Show user-friendly error messages via toast notifications
- Log detailed errors server-side
- Always handle network failures
- Provide fallback UI for error states

## Azure Integration

### Blob Storage
- **Container**: `presentations`
- **Access Level**: Blob (anonymous read)
- **File Naming**: UUID-based
- **SDK**: `azure-storage-blob`

### SQL Database
- **Type**: Azure SQL Database (Serverless)
- **Connection**: Via SQLAlchemy + pyodbc
- **Secrets**: Stored in Azure Key Vault

### Deployment
- **Backend**: Azure App Service (Python 3.10+)
- **Frontend**: Azure Static Web Apps
- **Functions**: Azure Functions (Consumption Plan)
  - **DailyCleanup**: Timer trigger (4:00 AM UTC)
  - Deletes expired presentations from storage and database

## Security Best Practices

1. **Never commit secrets** - use environment variables and Key Vault
2. **Validate all user input** - file types, sizes, codes
3. **Set CORS policies** appropriately
4. **Use HTTPS** in production
5. **Sanitize database queries** - use parameterized queries
6. **Rate limit** API endpoints to prevent abuse

## Development Workflow

### Running Locally

**Frontend:**
```bash
cd frontend
npm install
npm run dev  # Runs on http://localhost:5173
```

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload  # Runs on http://127.0.0.1:8000
```

### Testing
- Test file upload with both .pptx and .pdf files
- Test file size validation (should reject >50MB)
- Test file type validation (should reject other formats)
- Test code retrieval with valid and invalid codes
- Test expiry logic (24-hour TTL)

## Common Patterns

### API Calls (Frontend)
```javascript
try {
  const response = await axios.post(`${API_BASE_URL}/upload`, formData);
  // Handle success
} catch (error) {
  toast.error(error.response?.data?.detail || 'An error occurred');
}
```

### Database Queries (Backend)
```python
presentation = db.query(Presentation).filter(
    Presentation.short_code == short_code,
    Presentation.expires_at > datetime.utcnow()
).first()
```

### File Upload to Blob
```python
blob_client = container_client.get_blob_client(blob_name)
blob_client.upload_blob(file_bytes, overwrite=True)
blob_url = blob_client.url
```

## Code Generation Guidelines

When generating code for this project:

1. **Always maintain the dark theme** aesthetic with proper Tailwind classes
2. **Include proper error handling** for all API calls and file operations
3. **Use the established patterns** from existing components
4. **Follow the state management** approach (useState for local, no global state)
5. **Ensure responsiveness** - test on mobile and desktop viewports
6. **Add loading states** for async operations
7. **Provide user feedback** via toast notifications
8. **Keep components focused** - extract reusable logic
9. **Comment complex logic** but keep code self-documenting
10. **Handle edge cases** - empty states, network failures, expired content

## Performance Considerations

- Lazy load routes where possible
- Optimize image/file loading
- Use React.memo for expensive components
- Debounce user input where appropriate
- Cache API responses when suitable
- Minimize bundle size (code splitting)

## Accessibility

- Use semantic HTML elements
- Provide alt text for images/icons
- Ensure keyboard navigation works
- Maintain sufficient color contrast
- Add ARIA labels where needed
- Test with screen readers

---

**Remember**: This is a temporary, anonymous file-sharing service. Prioritize speed, simplicity, and user experience. Files expire after 24 hours automatically.

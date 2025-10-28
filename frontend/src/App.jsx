import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';

// API Base URL
const API_BASE_URL = 'http://127.0.0.1:8000';

// ============================================
// Component: CodeEntry
// ============================================
function CodeEntry() {
  const [code, setCode] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (code.trim()) {
      navigate(`/${code.trim()}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
      <div className="flex gap-3">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter presentation code..."
          className="flex-1 px-6 py-4 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-lg placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
        />
        <button
          type="submit"
          className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95"
        >
          View
        </button>
      </div>
    </form>
  );
}

// ============================================
// Component: SuccessCard
// ============================================
function SuccessCard({ shortCode }) {
  const handleCopy = () => {
    navigator.clipboard.writeText(shortCode);
    toast.success('Code copied to clipboard!');
  };

  return (
    <div className="w-full max-w-2xl bg-zinc-800 border border-zinc-700 rounded-xl p-8 text-center">
      <div className="mb-4">
        <p className="text-zinc-400 text-lg mb-3">Your code is ready!</p>
        <div className="flex items-center justify-center gap-4">
          <p className="text-6xl font-bold text-indigo-500 tracking-wider font-mono">
            {shortCode}
          </p>
          <button
            onClick={handleCopy}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105"
          >
            Copy
          </button>
        </div>
      </div>
      <p className="text-zinc-500 text-sm mt-6">
        Share this code to let others view your presentation
      </p>
    </div>
  );
}

// ============================================
// Component: Uploader
// ============================================
function Uploader() {
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [shortCode, setShortCode] = useState(null);

  const onDropAccepted = (acceptedFiles) => {
    setFile(acceptedFiles[0]);
  };

  const onDropRejected = () => {
    toast.error('File error: Only .pptx/.pdf files under 50MB are allowed.');
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'application/pdf': ['.pdf']
    },
    maxSize: 50 * 1024 * 1024,
    onDropAccepted,
    onDropRejected,
    multiple: false,
    disabled: file !== null
  });

  const handleUpload = async () => {
    if (!file) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setShortCode(response.data.short_code);
      toast.success('Upload complete!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Upload failed. Please try again.');
      setFile(file); // Keep the file so user can retry
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setShortCode(null);
  };

  // Success State
  if (shortCode) {
    return (
      <div className="w-full flex flex-col items-center gap-4">
        <SuccessCard shortCode={shortCode} />
        <button
          onClick={handleReset}
          className="text-zinc-400 hover:text-zinc-100 transition-colors text-sm underline"
        >
          Upload another file
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600 mb-4"></div>
            <p className="text-zinc-100 text-xl font-semibold">Uploading, please wait...</p>
          </div>
        </div>
      )}

      {/* Uploader UI */}
      <div className="w-full max-w-2xl">
        {!file ? (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200 ${
              isDragActive
                ? 'border-indigo-600 bg-indigo-600/10'
                : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600 hover:bg-zinc-800'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-4">
              <svg
                className="w-16 h-16 text-zinc-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <div>
                <p className="text-zinc-300 text-lg font-medium mb-2">
                  Drag & drop your .pptx or .pdf here
                </p>
                <p className="text-zinc-500 text-sm">or</p>
              </div>
              <button
                type="button"
                className="px-6 py-3 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 font-medium rounded-lg transition-all duration-200"
              >
                Click to select file
              </button>
              <p className="text-zinc-600 text-xs mt-2">Max file size: 50MB</p>
            </div>
          </div>
        ) : (
          <div className="border-2 border-zinc-700 rounded-xl p-8 bg-zinc-800/50 text-center">
            <div className="flex flex-col items-center gap-6">
              <div className="flex items-center gap-3 text-zinc-100">
                <svg
                  className="w-8 h-8 text-indigo-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="text-lg font-medium">{file.name}</p>
              </div>
              <button
                onClick={handleUpload}
                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-lg rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95"
              >
                Get Your Code
              </button>
              <button
                onClick={handleReset}
                className="text-zinc-400 hover:text-zinc-100 transition-colors text-sm underline"
              >
                Choose a different file
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ============================================
// Component: HomePage
// ============================================
function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl flex flex-col items-center gap-12">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-5xl font-bold text-zinc-100 mb-3">linkmydesk</h1>
          <p className="text-zinc-400 text-lg">Share presentations instantly with a simple code</p>
        </div>

        {/* Code Entry */}
        <div className="w-full flex flex-col items-center gap-8">
          <CodeEntry />
          
          <div className="flex items-center gap-4 w-full max-w-2xl">
            <div className="flex-1 h-px bg-zinc-800"></div>
            <span className="text-zinc-600 font-medium">OR</span>
            <div className="flex-1 h-px bg-zinc-800"></div>
          </div>

          {/* Uploader */}
          <Uploader />
        </div>
      </div>
    </div>
  );
}

// ============================================
// Component: ViewerPage
// ============================================
function ViewerPage() {
  const { shortCode } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [viewerUrl, setViewerUrl] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPresentation = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/get_presentation/${shortCode}`);
        setViewerUrl(response.data.viewer_url);
      } catch (err) {
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPresentation();
  }, [shortCode]);

  // Loading State
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600 mb-4"></div>
          <p className="text-zinc-100 text-xl font-semibold">Loading Presentation...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="fixed inset-0 bg-zinc-900 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h1 className="text-4xl font-bold text-zinc-100 mb-4">Presentation Not Found</h1>
          <p className="text-zinc-400 text-lg mb-8">
            This code may be invalid or the presentation has expired.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105"
          >
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  // Determine if this is a PDF (direct URL) or Office Viewer URL
  const isPDF = viewerUrl && !viewerUrl.includes('officeapps.live.com');

  // Success State
  return (
    <div className="fixed inset-0 flex flex-col">
      {/* Branding Banner */}
      <div className="h-[10px] bg-indigo-600 w-full"></div>
      
      {/* Display PDF directly or use iframe for Office Viewer */}
      {isPDF ? (
        <embed
          src={`${viewerUrl}#toolbar=1&navpanes=0&scrollbar=1`}
          type="application/pdf"
          className="flex-1 w-full border-none"
          title="PDF Viewer"
        />
      ) : (
        <iframe
          src={viewerUrl}
          className="flex-1 w-full border-none"
          title="Presentation Viewer"
        />
      )}
    </div>
  );
}

// ============================================
// Main App Component
// ============================================
function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#27272a',
            color: '#f4f4f5',
            border: '1px solid #3f3f46',
          },
          success: {
            iconTheme: {
              primary: '#4f46e5',
              secondary: '#f4f4f5',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#f4f4f5',
            },
          },
        }}
      />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/:shortCode" element={<ViewerPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

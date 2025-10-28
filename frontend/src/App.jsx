import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';

// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

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
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter presentation code..."
          className="flex-1 px-4 sm:px-6 py-3 sm:py-4 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-base sm:text-lg placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
        />
        <button
          type="submit"
          className="px-6 sm:px-8 py-3 sm:py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 whitespace-nowrap"
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
    <div className="w-full max-w-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 rounded-xl p-6 sm:p-10 text-center shadow-2xl shadow-indigo-600/10">
      <div className="mb-6">
        {/* Success Icon */}
        <div className="inline-flex items-center justify-center w-14 sm:w-16 h-14 sm:h-16 bg-indigo-600/20 rounded-full mb-4">
          <svg className="w-7 sm:w-8 h-7 sm:h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-zinc-400 text-base sm:text-lg mb-6">Your presentation code is ready!</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <div className="px-6 sm:px-8 py-3 sm:py-4 bg-zinc-900 border-2 border-indigo-600/30 rounded-lg">
            <p className="text-4xl sm:text-5xl md:text-7xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent tracking-wider font-mono">
              {shortCode}
            </p>
          </div>
          <button
            onClick={handleCopy}
            className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg shadow-indigo-600/30"
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy Code
            </div>
          </button>
        </div>
      </div>
      <div className="pt-6 border-t border-zinc-700">
        <p className="text-zinc-500 text-sm">
          ✨ Share this code to let anyone view your presentation
        </p>
        <p className="text-zinc-600 text-xs mt-2">
          Expires in 24 hours • Anonymous • Secure
        </p>
      </div>
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
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDropAccepted = (acceptedFiles) => {
    setFile(acceptedFiles[0]);
    setUploadProgress(0);
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
    setUploadProgress(0);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 300000, // 5 minutes timeout for large files
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        }
      });

      setShortCode(response.data.short_code);
      toast.success('Upload complete!');
    } catch (error) {
      let errorMessage = 'Upload failed. Please try again.';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Upload timed out. Please try a smaller file or check your connection.';
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }
      
      toast.error(errorMessage);
      setFile(file); // Keep the file so user can retry
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  const handleReset = () => {
    setFile(null);
    setShortCode(null);
    setUploadProgress(0);
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
      {/* Loading Overlay with Progress */}
      {isLoading && (
        <div className="fixed inset-0 bg-zinc-950/95 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center space-y-6 px-6">
            {/* Spinner */}
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 border-4 border-zinc-700 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
            </div>
            
            {/* Status Text */}
            <div className="space-y-2">
              <p className="text-xl text-zinc-100 font-medium">
                {uploadProgress < 100 ? 'Uploading...' : 'Processing...'}
              </p>
              <p className="text-zinc-400">
                {uploadProgress < 100 
                  ? `${uploadProgress}% uploaded` 
                  : 'Generating your code...'}
              </p>
            </div>
            
            {/* Progress Bar */}
            <div className="w-80 max-w-full h-2 bg-zinc-800 rounded-full overflow-hidden mx-auto">
              <div 
                className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            
            {/* File Info */}
            {file && (
              <p className="text-sm text-zinc-500">
                {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
              </p>
            )}
          </div>
        </div>
      )}

      {/* Uploader UI */}
      <div className="w-full max-w-2xl">
        {!file ? (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-300 ${
              isDragActive
                ? 'border-indigo-500 bg-indigo-600/10 scale-105 shadow-xl shadow-indigo-600/20'
                : 'border-zinc-700 bg-zinc-800/50 hover:border-indigo-600/50 hover:bg-zinc-800 hover:shadow-lg'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-3 sm:gap-4">
              <div className={`w-16 sm:w-20 h-16 sm:h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
                isDragActive 
                  ? 'bg-indigo-600/20 scale-110' 
                  : 'bg-zinc-700/50'
              }`}>
                <svg
                  className={`w-8 sm:w-10 h-8 sm:h-10 transition-colors duration-300 ${
                    isDragActive ? 'text-indigo-400' : 'text-zinc-500'
                  }`}
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
              </div>
              <div>
                <p className="text-zinc-200 text-base sm:text-lg font-semibold mb-2">
                  {isDragActive ? 'Drop your file here' : 'Drag & drop your presentation'}
                </p>
                <p className="text-zinc-500 text-sm mb-1">Supports .pptx and .pdf files</p>
                <p className="text-zinc-600 text-xs">Maximum file size: 50MB</p>
              </div>
              {!isDragActive && (
                <button
                  type="button"
                  className="mt-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 font-medium rounded-lg transition-all duration-200 transform hover:scale-105"
                >
                  Choose File
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="border-2 border-indigo-600/30 rounded-xl p-6 sm:p-8 bg-gradient-to-br from-zinc-800 to-zinc-900 text-center shadow-xl">
            <div className="flex flex-col items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-3 text-zinc-100 w-full">
                <div className="w-10 sm:w-12 h-10 sm:h-12 bg-indigo-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-6 sm:w-7 h-6 sm:h-7 text-indigo-400"
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
                </div>
                <div className="text-left overflow-hidden flex-1">
                  <p className="text-base sm:text-lg font-semibold text-zinc-100 truncate">{file.name}</p>
                  <p className="text-sm text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              
              {/* Large File Warning */}
              {file.size > 10 * 1024 * 1024 && (
                <div className="flex items-start gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-amber-500/10 border border-amber-500/30 rounded-lg w-full">
                  <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-xs text-amber-200">
                    Large file detected. Upload may take 1-2 minutes depending on your connection speed.
                  </p>
                </div>
              )}
              
              <button
                onClick={handleUpload}
                className="w-full sm:w-auto px-8 sm:px-10 py-3 sm:py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-base sm:text-lg rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg shadow-indigo-600/30"
              >
                Get Your Code →
              </button>
              <button
                onClick={handleReset}
                className="text-zinc-400 hover:text-zinc-100 transition-colors text-sm underline underline-offset-2"
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
// Component: Logo
// ============================================
function Logo() {
  return (
    <div className="flex items-center justify-center gap-3">
      <div className="relative">
        {/* Icon Background */}
        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/50 transform hover:scale-110 transition-transform duration-200">
          {/* Link Icon */}
          <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </div>
      </div>
      <div className="flex flex-col">
        <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent tracking-tight">
          linkmydesk
        </h1>
        <p className="text-xs text-zinc-500 tracking-wider">INSTANT PRESENTATION SHARING</p>
      </div>
    </div>
  );
}

// ============================================
// Component: Footer
// ============================================
function Footer() {
  return (
    <footer className="w-full border-t border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
      {/* How it Works Section */}
      <div className="max-w-5xl mx-auto px-6 py-8 border-b border-zinc-800">
        <h3 className="text-zinc-300 font-semibold text-sm mb-4 text-center">How it works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-indigo-600/20 rounded-full flex items-center justify-center mb-3 border border-indigo-600/30">
              <span className="text-indigo-400 font-bold text-lg">1</span>
            </div>
            <h4 className="text-zinc-200 font-medium text-sm mb-2">Upload</h4>
            <p className="text-zinc-500 text-xs leading-relaxed">
              Drop your .pptx or .pdf file (max 50MB) and get an instant code
            </p>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-indigo-600/20 rounded-full flex items-center justify-center mb-3 border border-indigo-600/30">
              <span className="text-indigo-400 font-bold text-lg">2</span>
            </div>
            <h4 className="text-zinc-200 font-medium text-sm mb-2">Share</h4>
            <p className="text-zinc-500 text-xs leading-relaxed">
              Copy and share your unique code with anyone, anywhere
            </p>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-indigo-600/20 rounded-full flex items-center justify-center mb-3 border border-indigo-600/30">
              <span className="text-indigo-400 font-bold text-lg">3</span>
            </div>
            <h4 className="text-zinc-200 font-medium text-sm mb-2">Present</h4>
            <p className="text-zinc-500 text-xs leading-relaxed">
              Enter the code on any device to view instantly. Auto-expires in 24h
            </p>
          </div>
        </div>
      </div>

      {/* Credits and Contact */}
      <div className="max-w-4xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs sm:text-sm">
        {/* Left: Developer Credit */}
        <div className="flex items-center gap-2 text-zinc-400 text-center md:text-left">
          <span>Developed by</span>
          <a
            href="https://github.com/alwayselse"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
            @alwayselse
          </a>
        </div>

        {/* Center: Tagline */}
        <div className="text-zinc-500 text-xs hidden md:block">
          Anonymous • Temporary • Simple
        </div>

        {/* Right: Feedback */}
        <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-zinc-400 text-center md:text-left">
          <span>Feedback:</span>
          <a
            href="mailto:nikhilvatsya@gmail.com"
            className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium break-all"
          >
            nikhilvatsya@gmail.com
          </a>
        </div>
      </div>
    </footer>
  );
}

// ============================================
// Component: HomePage
// ============================================
function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-900 flex flex-col">
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-4xl flex flex-col items-center gap-8 sm:gap-12">
          {/* Header with Logo */}
          <div className="text-center space-y-4 sm:space-y-6 px-4">
            <Logo />
            <p className="text-zinc-400 text-base sm:text-lg max-w-2xl mx-auto">
              Share presentations instantly with a simple code. No signup, no tracking, files expire in 24 hours.
            </p>
          </div>

          {/* Code Entry */}
          <div className="w-full flex flex-col items-center gap-6 sm:gap-8 px-4">
            <CodeEntry />
            
            <div className="flex items-center gap-4 w-full max-w-2xl">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent"></div>
              <span className="text-zinc-500 font-medium text-xs sm:text-sm px-2 sm:px-3 py-1 bg-zinc-800 rounded-full border border-zinc-700 whitespace-nowrap">OR UPLOAD NEW</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent"></div>
            </div>

            {/* Uploader */}
            <Uploader />
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl mt-4 sm:mt-8 px-4">
            <div className="text-center p-4 bg-zinc-800/30 rounded-lg border border-zinc-800">
              <div className="text-indigo-400 text-2xl mb-2">🔒</div>
              <h3 className="text-zinc-300 font-semibold text-sm mb-1">Anonymous</h3>
              <p className="text-zinc-500 text-xs">No accounts required</p>
            </div>
            <div className="text-center p-4 bg-zinc-800/30 rounded-lg border border-zinc-800">
              <div className="text-indigo-400 text-2xl mb-2">⚡</div>
              <h3 className="text-zinc-300 font-semibold text-sm mb-1">Instant</h3>
              <p className="text-zinc-500 text-xs">Get code in seconds</p>
            </div>
            <div className="text-center p-4 bg-zinc-800/30 rounded-lg border border-zinc-800">
              <div className="text-indigo-400 text-2xl mb-2">⏱️</div>
              <h3 className="text-zinc-300 font-semibold text-sm mb-1">Temporary</h3>
              <p className="text-zinc-500 text-xs">Auto-expires in 24h</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
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
    <div className="fixed inset-0 flex flex-col bg-zinc-900">
      {/* Header with Logo and Back Button */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            linkmydesk
          </span>
        </div>
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-all duration-200 border border-zinc-700"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>
      </div>
      
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

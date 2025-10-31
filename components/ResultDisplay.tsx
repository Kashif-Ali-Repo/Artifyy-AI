import React, { useState } from 'react';
import { ImageFile } from '../types';
import { CheckCircleIcon, SparklesIcon, UndoIcon } from './icons';
import ImageComparator from './ImageComparator';
import { getCreativeIdeas, applyCreativeEdit } from '../services/geminiService';

interface ResultDisplayProps {
  originalImage: ImageFile;
  enhancedImage: ImageFile;
  analysis: string;
  summary: string;
  onStartOver: () => void;
  onRefine: () => void;
  onImageUpdate: (image: ImageFile) => void;
  onUndo: () => void;
  canUndo: boolean;
  defaultFilename: string;
}

type DownloadFormat = 'image/jpeg' | 'image/png' | 'image/webp';
type CreativeState = 'idle' | 'loading' | 'showing' | 'applying' | 'error';

const ResultDisplay: React.FC<ResultDisplayProps> = ({ originalImage, enhancedImage, analysis, summary, onStartOver, onRefine, onImageUpdate, onUndo, canUndo, defaultFilename }) => {
  const [downloadFormat, setDownloadFormat] = useState<DownloadFormat>('image/jpeg');
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [filename, setFilename] = useState<string>(`${defaultFilename}-enhanced`);

  const [creativeState, setCreativeState] = useState<CreativeState>('idle');
  const [creativeIdeas, setCreativeIdeas] = useState<string[]>([]);
  const [creativeError, setCreativeError] = useState<string | null>(null);

  // State for the new chat feature
  const [chatPrompt, setChatPrompt] = useState<string>('');
  const [isChatting, setIsChatting] = useState<boolean>(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const handleFetchCreativeIdeas = async () => {
    setCreativeState('loading');
    setCreativeError(null);
    try {
      const ideas = await getCreativeIdeas(enhancedImage);
      setCreativeIdeas(ideas);
      setCreativeState('showing');
    } catch (error) {
      setCreativeState('error');
      setCreativeError(error instanceof Error ? error.message : "An unknown error occurred.");
    }
  };
  
  const handleApplyCreativeEdit = async (idea: string) => {
    setCreativeState('applying');
    setCreativeError(null);
    try {
      const newImage = await applyCreativeEdit(enhancedImage, idea);
      onImageUpdate(newImage);
      setCreativeState('idle'); // Reset after applying
      setCreativeIdeas([]);
    } catch (error) {
      setCreativeState('error');
      setCreativeError(error instanceof Error ? error.message : "An unknown error occurred.");
    }
  };
  
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatPrompt.trim() || isChatting) return;

    setIsChatting(true);
    setChatError(null);
    try {
      const newImage = await applyCreativeEdit(enhancedImage, chatPrompt);
      onImageUpdate(newImage);
      setChatPrompt('');
    } catch (error) {
      setChatError(error instanceof Error ? error.message : "An unknown error occurred.");
    } finally {
      setIsChatting(false);
    }
  };

  const handleDownload = () => {
    setIsDownloading(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = enhancedImage.url;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setIsDownloading(false);
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const link = document.createElement('a');
      link.download = `${filename || 'artifyy-ai-enhanced'}.${downloadFormat.split('/')[1]}`;
      link.href = canvas.toDataURL(downloadFormat, 0.95);
      link.click();
      setIsDownloading(false);
    };
    img.onerror = () => {
      setIsDownloading(false);
      alert("Failed to load image for download.");
    };
  };

  const renderCreativeContent = () => {
    const loadingState = (text: string) => (
      <div className="flex items-center justify-center text-gray-400">
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>{text}</span>
      </div>
    );

    switch(creativeState) {
      case 'loading':
        return loadingState('Thinking of creative ideas...');
      case 'applying':
        return loadingState('Applying creative edit...');
      case 'error':
        return (
          <div>
            <p className="text-red-400 mb-2">Error: {creativeError}</p>
            <button onClick={handleFetchCreativeIdeas} className="text-sm text-indigo-400 hover:underline">Try Again</button>
          </div>
        );
      case 'showing':
        return (
          <div className="flex flex-wrap justify-center gap-3">
            {creativeIdeas.map((idea, index) => (
              <button 
                key={index}
                onClick={() => handleApplyCreativeEdit(idea)}
                className="px-4 py-2 text-sm font-semibold text-white transition-all duration-200 bg-indigo-600/80 border border-transparent rounded-md hover:bg-indigo-700"
              >
                {idea}
              </button>
            ))}
          </div>
        );
      case 'idle':
      default:
        return (
          <div>
            <p className="text-gray-400 mb-4">Take your photo to the next level with AI-powered artistic suggestions.</p>
            <button
              onClick={handleFetchCreativeIdeas}
              className="inline-flex items-center justify-center px-6 py-3 text-base font-semibold text-white transition-all duration-200 bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
            >
              <SparklesIcon className="w-5 h-5 mr-2" />
              Get Creative Ideas
            </button>
          </div>
        );
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-6 animate-fade-in">
      <div className="w-full max-w-2xl mx-auto mb-8">
        <ImageComparator 
          beforeImage={originalImage.url} 
          afterImage={enhancedImage.url}
        />
      </div>

      {/* Comparison Summaries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-300 mb-4">Original Analysis</h2>
            <div className="prose prose-invert text-gray-300 max-w-none" dangerouslySetInnerHTML={{ __html: analysis.replace(/\*/g, '•') }} />
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-300 mb-4">Enhancements Applied</h2>
          <div className="prose prose-invert text-gray-300 max-w-none" dangerouslySetInnerHTML={{ __html: summary.replace(/\*/g, '•') }} />
        </div>
      </div>

      {/* Creative AI Suggestions */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6 mb-8 text-center">
         <h2 className="text-2xl font-bold text-indigo-400 mb-4">Creative AI Suggestions</h2>
         {renderCreativeContent()}
      </div>

      {/* Refine with Chat */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-bold text-indigo-400 mb-4 text-center">Refine with a Prompt</h2>
        <form onSubmit={handleChatSubmit} className="max-w-xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={chatPrompt}
              onChange={(e) => setChatPrompt(e.target.value)}
              placeholder="e.g., 'Make the background black and white'"
              disabled={isChatting}
              className="flex-grow px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isChatting || !chatPrompt.trim()}
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2 text-base font-semibold text-white transition-all duration-200 bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isChatting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Applying...
                </>
              ) : 'Apply'}
            </button>
          </div>
          {chatError && <p className="text-red-400 text-sm mt-2 text-center">{chatError}</p>}
        </form>
      </div>

      {/* Actions */}
      <div className="flex flex-col md:flex-row justify-center items-center gap-4 mb-8">
        {canUndo && (
            <button
            onClick={onUndo}
            className="w-full md:w-auto inline-flex items-center justify-center px-6 py-3 text-base font-semibold text-white transition-all duration-200 bg-gray-500 border border-transparent rounded-md hover:bg-gray-600"
            >
            <UndoIcon className="w-5 h-5 mr-2" />
            Undo
            </button>
        )}
        <button
          onClick={onRefine}
          className="w-full md:w-auto text-center px-6 py-3 text-base font-semibold text-gray-200 transition-all duration-200 bg-gray-700 border border-transparent rounded-md hover:bg-gray-600"
        >
          Refine Enhancements
        </button>
        <button
          onClick={onStartOver}
          className="w-full md:w-auto text-center px-6 py-3 text-base font-semibold text-white transition-all duration-200 bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
        >
          Start Over with New Photo
        </button>
      </div>

      {/* Download Panel */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6">
        <h3 className="text-xl font-bold text-center text-gray-200 mb-6">Download Your Masterpiece</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
          
          {/* Filename */}
          <div className="lg:col-span-2">
            <label htmlFor="filename" className="block text-sm font-medium text-gray-400 mb-1">Filename</label>
            <input 
              type="text" 
              id="filename"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Format */}
          <div>
            <label htmlFor="format" className="block text-sm font-medium text-gray-400 mb-1">Format</label>
            <select
              id="format"
              value={downloadFormat}
              onChange={(e) => setDownloadFormat(e.target.value as DownloadFormat)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="image/jpeg">JPEG</option>
              <option value="image/png">PNG</option>
              <option value="image/webp">WEBP</option>
            </select>
          </div>
          
          {/* Download Button */}
          <div className="w-full">
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full inline-flex items-center justify-center px-6 py-2 text-base font-semibold text-white transition-all duration-200 bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {isDownloading ? 'Preparing...' : 'Download Image'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultDisplay;
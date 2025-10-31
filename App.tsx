import React, { useState, useCallback } from 'react';
import { AppState, ImageFile, EnhancementStrength } from './types';
import { fileToImageFile } from './utils/fileUtils';
import { analyzeImage, enhanceImage } from './services/geminiService';
import ImageUploader from './components/ImageUploader';
import LoadingSpinner from './components/LoadingSpinner';
import AnalysisPanel from './components/AnalysisPanel';
import ResultDisplay from './components/ResultDisplay';
import ImageCropper from './components/ImageCropper';
import { SparklesIcon } from './components/icons';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [error, setError] = useState<string | null>(null);

  const [originalImage, setOriginalImage] = useState<ImageFile | null>(null);
  const [imageToProcess, setImageToProcess] = useState<ImageFile | null>(null);
  const [enhancedImage, setEnhancedImage] = useState<ImageFile | null>(null);
  
  const [analysis, setAnalysis] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [enhancementSummary, setEnhancementSummary] = useState('');

  const resetState = () => {
    setAppState(AppState.IDLE);
    setError(null);
    setOriginalImage(null);
    setImageToProcess(null);
    setEnhancedImage(null);
    setAnalysis('');
    setSuggestions([]);
    setEnhancementSummary('');
  };

  const handleImageUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file.');
      setAppState(AppState.ERROR);
      return;
    }
    
    setError(null);

    try {
      const imageFile = await fileToImageFile(file);
      setOriginalImage(imageFile);
      setImageToProcess(imageFile);
      setAppState(AppState.PREVIEW);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred while loading the image.');
      setAppState(AppState.ERROR);
    }
  }, []);

  const handleStartAnalysis = useCallback(async (image: ImageFile) => {
    setImageToProcess(image);
    setAppState(AppState.ANALYZING);
    try {
      const result = await analyzeImage(image);
      setAnalysis(result.analysis);
      setSuggestions(result.suggestions);
      setAppState(AppState.AWAITING_CONFIRMATION);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setAppState(AppState.ERROR);
    }
  }, []);
  
  const handleCropComplete = useCallback((imageFile: ImageFile) => {
    handleStartAnalysis(imageFile);
  }, [handleStartAnalysis]);

  const handleEnhance = useCallback(async (selectedSuggestions: string[], strength: EnhancementStrength, detailLevel: number) => {
    if (!imageToProcess) return;

    setAppState(AppState.ENHANCING);
    setError(null);

    try {
      const enhancedImageResult = await enhanceImage(imageToProcess, selectedSuggestions, strength, detailLevel);
      const summaryText = `Here are the enhancements I've made:\n\n* ${selectedSuggestions.join('\n* ')}`;
      
      setEnhancedImage(enhancedImageResult);
      setEnhancementSummary(summaryText);
      setAppState(AppState.DONE);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setAppState(AppState.ERROR);
    }
  }, [imageToProcess]);

  const handleRefine = () => {
    setEnhancedImage(null);
    setEnhancementSummary('');
    setAppState(AppState.AWAITING_CONFIRMATION);
  };

  const handleImageUpdate = (newImage: ImageFile) => {
    setEnhancedImage(newImage);
  };

  const renderContent = () => {
    switch (appState) {
      case AppState.IDLE:
        return <ImageUploader onImageUpload={handleImageUpload} disabled={false} />;
      case AppState.PREVIEW:
        if (imageToProcess) {
          return (
            <div className="flex flex-col items-center gap-8 w-full max-w-2xl animate-fade-in">
              <h2 className="text-2xl font-bold text-center text-indigo-400">Ready to Enhance?</h2>
              <img src={imageToProcess.url} alt="Preview" className="max-w-md w-full h-auto rounded-lg shadow-2xl" />
              <div className="flex flex-col sm:flex-row gap-4">
                 <button
                  onClick={() => handleStartAnalysis(imageToProcess)}
                  className="inline-flex items-center justify-center px-8 py-3 text-base font-semibold text-white transition-all duration-200 bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
                >
                  Analyze Now
                </button>
                <button
                  onClick={() => setAppState(AppState.CROPPING)}
                  className="w-full sm:w-auto text-center px-6 py-3 text-base font-semibold text-gray-200 transition-all duration-200 bg-gray-700 border border-transparent rounded-md hover:bg-gray-600"
                >
                  Crop Image
                </button>
                 <button
                  onClick={resetState}
                  className="w-full sm:w-auto text-center px-6 py-3 text-base font-semibold text-gray-200 transition-all duration-200 bg-gray-600 border border-transparent rounded-md hover:bg-gray-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          );
        }
        return <LoadingSpinner message="Loading image..." />;
      case AppState.CROPPING:
        if (originalImage) {
          return <ImageCropper imageFile={originalImage} onCropComplete={handleCropComplete} onCancel={() => setAppState(AppState.PREVIEW)} />;
        }
        return <LoadingSpinner message="Loading image..."/>;
      case AppState.ANALYZING:
        return <LoadingSpinner message="Analyzing your photo..." />;
      case AppState.AWAITING_CONFIRMATION:
        return (
          <div className="flex flex-col items-center gap-8 w-full">
            <img src={imageToProcess!.url} alt="Preview" className="max-w-md w-full h-auto rounded-lg shadow-2xl" />
            <AnalysisPanel 
              analysis={analysis}
              suggestions={suggestions}
              onEnhance={handleEnhance}
              isEnhancing={appState === AppState.ENHANCING}
            />
          </div>
        );
      case AppState.ENHANCING:
         return (
          <div className="flex flex-col items-center gap-8 w-full">
            <img src={imageToProcess!.url} alt="Preview" className="max-w-md w-full h-auto rounded-lg shadow-2xl opacity-50" />
            <LoadingSpinner message="Enhancing your photo..." />
          </div>
        );
      case AppState.DONE:
        if (imageToProcess && enhancedImage) {
          return <ResultDisplay 
            originalImage={imageToProcess}
            enhancedImage={enhancedImage}
            analysis={analysis}
            summary={enhancementSummary}
            onStartOver={resetState}
            onRefine={handleRefine}
            onImageUpdate={handleImageUpdate}
          />;
        }
        return null;
      case AppState.ERROR:
        return (
          <div className="text-center p-8 bg-red-900/20 border border-red-500 rounded-lg">
            <h3 className="text-xl font-bold text-red-400">An Error Occurred</h3>
            <p className="text-red-300 mt-2 mb-4">{error}</p>
            <button
              onClick={resetState}
              className="px-4 py-2 text-base font-semibold text-white transition-all duration-200 bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
            >
              Try Again
            </button>
          </div>
        );
      default:
        return null;
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center justify-center p-4">
      <header className="text-center mb-10">
        <div className="flex items-center justify-center gap-3">
          <SparklesIcon className="w-10 h-10 text-indigo-400"/>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            Artifyy AI
          </h1>
        </div>
        <p className="mt-3 text-lg text-gray-400 max-w-2xl mx-auto">
          Upload a photo and let our AI transform it into a professional-grade masterpiece.
        </p>
      </header>
      <main className="w-full flex-grow flex flex-col items-center justify-center">
        {renderContent()}
      </main>
      <footer className="text-center text-gray-500 mt-10 text-sm space-y-2">
        <p>Powered by Gemini. Designed for amazing results.</p>
        <p>Disclaimer: AI-generated enhancements may produce unexpected results. Please use responsibly.</p>
        <p>&copy; 2024 Artifyy AI. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default App;
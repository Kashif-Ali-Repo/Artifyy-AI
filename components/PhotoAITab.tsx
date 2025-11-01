import React, { useState, useCallback } from 'react';
import { AppState, ImageFile, EnhancementStrength } from '../types';
import { fileToImageFile } from '../utils/fileUtils';
import { analyzeImage, enhanceImage, generateImageFromPrompt } from '../services/geminiService';
import ImageUploader from './ImageUploader';
import LoadingSpinner from './LoadingSpinner';
import AnalysisPanel from './AnalysisPanel';
import ResultDisplay from './ResultDisplay';
import ImageCropper from './ImageCropper';

const PhotoAITab: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [error, setError] = useState<string | null>(null);

  const [originalImage, setOriginalImage] = useState<ImageFile | null>(null);
  const [imageToProcess, setImageToProcess] = useState<ImageFile | null>(null);
  const [originalFilename, setOriginalFilename] = useState<string>('');
  
  const [imageHistory, setImageHistory] = useState<ImageFile[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(-1);
  const enhancedImage = imageHistory[currentImageIndex] ?? null;

  const [analysis, setAnalysis] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [enhancementSummary, setEnhancementSummary] = useState('');

  const [generationPrompt, setGenerationPrompt] = useState('');

  const resetState = () => {
    setAppState(AppState.IDLE);
    setError(null);
    setOriginalImage(null);
    setImageToProcess(null);
    setImageHistory([]);
    setCurrentImageIndex(-1);
    setAnalysis('');
    setSuggestions([]);
    setEnhancementSummary('');
    setOriginalFilename('');
    setGenerationPrompt('');
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
      const nameWithoutExtension = file.name.split('.').slice(0, -1).join('.') || file.name;
      setOriginalFilename(nameWithoutExtension);
      setOriginalImage(imageFile);
      setImageToProcess(imageFile);
      setAppState(AppState.PREVIEW);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred while loading the image.');
      setAppState(AppState.ERROR);
    }
  }, []);
  
  const handleGenerateImage = useCallback(async () => {
    if (!generationPrompt.trim()) return;

    setAppState(AppState.GENERATING);
    setError(null);

    try {
      const generatedImage = await generateImageFromPrompt(generationPrompt);
      
      const filename = generationPrompt.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 50);
      setOriginalFilename(filename);
      setOriginalImage(generatedImage);
      setImageToProcess(generatedImage);
      setAppState(AppState.PREVIEW);
      setGenerationPrompt(''); // Clear prompt after use
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred during image generation.');
      setAppState(AppState.ERROR);
    }
  }, [generationPrompt]);

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
      
      setImageHistory([imageToProcess, enhancedImageResult]);
      setCurrentImageIndex(1);
      setEnhancementSummary(summaryText);
      setAppState(AppState.DONE);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setAppState(AppState.ERROR);
    }
  }, [imageToProcess]);

  const handleRefine = () => {
    setEnhancementSummary('');
    setAppState(AppState.AWAITING_CONFIRMATION);
  };

  const handleImageUpdate = (newImage: ImageFile) => {
    const newHistory = imageHistory.slice(0, currentImageIndex + 1);
    newHistory.push(newImage);
    setImageHistory(newHistory);
    setCurrentImageIndex(newHistory.length - 1);
  };
  
  const handleUndo = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };
  const canUndo = currentImageIndex > 0;

  const renderContent = () => {
    switch (appState) {
      case AppState.IDLE:
        return (
          <div className="w-full max-w-xl mx-auto flex flex-col gap-8 animate-fade-in">
            <ImageUploader onImageUpload={handleImageUpload} disabled={false} />
            <div className="flex items-center gap-4">
              <hr className="flex-grow border-gray-600" />
              <span className="text-gray-400 font-semibold">OR</span>
              <hr className="flex-grow border-gray-600" />
            </div>
            <div className="flex flex-col gap-3">
               <h3 className="text-xl font-semibold text-center text-gray-200">Generate an Image with AI</h3>
               <p className="text-center text-gray-400 text-sm">Describe the image you want to create, and let our AI bring it to life.</p>
               <textarea
                  value={generationPrompt}
                  onChange={(e) => setGenerationPrompt(e.target.value)}
                  placeholder="e.g., A majestic lion with a golden mane standing on a rocky cliff at sunrise"
                  className="w-full p-3 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 transition"
                  rows={3}
                />
                <button
                  onClick={handleGenerateImage}
                  disabled={!generationPrompt.trim()}
                  className="inline-flex items-center justify-center px-8 py-3 text-base font-semibold text-white transition-all duration-200 bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Generate Image
                </button>
            </div>
          </div>
        );
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
        return <LoadingSpinner messages={["Loading image..."]} />;
      case AppState.CROPPING:
        if (originalImage) {
          return <ImageCropper imageFile={originalImage} onCropComplete={handleCropComplete} onCancel={() => setAppState(AppState.PREVIEW)} />;
        }
        return <LoadingSpinner messages={["Loading image..."]}/>;
      case AppState.ANALYZING:
        return <LoadingSpinner messages={[
          "Scanning for imperfections...",
          "Evaluating lighting and color...",
          "Identifying areas for improvement...",
          "Preparing your analysis...",
        ]} />;
       case AppState.GENERATING:
        return <LoadingSpinner messages={[
            "Warming up the digital canvas...",
            "Mixing pixels and possibilities...",
            "Crafting your vision from imagination...",
            "Bringing your idea to life...",
        ]} />;
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
            <LoadingSpinner messages={[
              "Applying professional adjustments...",
              "Sharpening details and clarity...",
              "Balancing colors and tones...",
              "Adding the final masterpiece touches...",
            ]} />
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
            onUndo={handleUndo}
            canUndo={canUndo}
            defaultFilename={originalFilename}
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
  
  return <>{renderContent()}</>;
};

export default PhotoAITab;
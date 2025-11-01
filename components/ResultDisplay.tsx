import React, { useState, useCallback } from 'react';
import { ImageFile } from '../types';
import { CheckCircleIcon, SparklesIcon, UndoIcon } from './icons';
import ImageComparator from './ImageComparator';
import { getCreativeIdeas, applyCreativeEdit, applyBackgroundBlur } from '../services/geminiService';
import LoadingSpinner from './LoadingSpinner';

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
type ControlTab = 'adjustments' | 'creative';

const artisticStyles = [
  { name: 'Oil Painting', prompt: 'Transform this photo into a classic oil painting, emphasizing thick brushstrokes and rich, textured colors.', bg: 'bg-gradient-to-br from-yellow-400 via-orange-500 to-red-600' },
  { name: 'Watercolor', prompt: 'Convert this image into a soft watercolor painting with delicate washes of color and translucent layers.', bg: 'bg-gradient-to-br from-blue-300 via-purple-300 to-pink-300' },
  { name: 'Cyberpunk', prompt: 'Give this photo a futuristic, cyberpunk aesthetic with neon lights, high contrast, and cool, moody tones like magenta and cyan.', bg: 'bg-gradient-to-br from-pink-500 via-purple-600 to-blue-500' },
  { name: 'Vintage Film', prompt: 'Apply a vintage film look to this photo, with faded colors, subtle grain, and a warm, nostalgic color cast.', bg: 'bg-gradient-to-br from-orange-300 via-yellow-200 to-gray-400' },
  { name: 'Pencil Sketch', prompt: 'Redraw this image as a detailed pencil sketch, focusing on lines, shading, and cross-hatching to create a hand-drawn feel.', bg: 'bg-gradient-to-br from-gray-400 to-gray-600' },
  { name: 'Pop Art', prompt: 'Reimagine this photo in the style of pop art, with bold, saturated colors, strong outlines, and a graphic, comic-book-like quality.', bg: 'bg-gradient-to-br from-red-500 via-yellow-400 to-blue-500' },
];

const professionalFilters = [
    { name: 'Cinematic Teal & Orange', prompt: 'Apply a professional cinematic color grade. Enhance teal tones in the shadows and orange/skin tones in the highlights. Increase contrast for a dramatic, filmic look.', bg: 'bg-gradient-to-br from-orange-400 to-teal-600' },
    { name: 'Moody Noir', prompt: 'Convert the image to a high-contrast black and white. Deepen the blacks, preserve highlight detail, and add a subtle film grain to create a dramatic, moody noir aesthetic.', bg: 'bg-gradient-to-br from-gray-700 to-gray-900' },
    { name: 'Golden Hour Glow', prompt: 'Enhance the image with a warm, golden hour glow. Boost warm tones (yellows, oranges, and reds) and add a soft, dreamy haze to simulate the lighting just before sunset.', bg: 'bg-gradient-to-br from-yellow-400 via-orange-400 to-red-500' },
    { name: 'Vibrant & Punchy', prompt: 'Increase overall vibrance and saturation to make colors pop. Add a touch of clarity and contrast to make the image feel more dynamic and energetic.', bg: 'bg-gradient-to-br from-lime-400 via-green-500 to-emerald-600' },
];

const ResultDisplay: React.FC<ResultDisplayProps> = ({ originalImage, enhancedImage, summary, onStartOver, onRefine, onImageUpdate, onUndo, canUndo, defaultFilename }) => {
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [sharpness, setSharpness] = useState(0);
  const [backgroundBlurLevel, setBackgroundBlurLevel] = useState(0);

  const [creativeState, setCreativeState] = useState<CreativeState>('idle');
  const [creativeIdeas, setCreativeIdeas] = useState<string[]>([]);
  const [creativeError, setCreativeError] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isApplyingCustomPrompt, setIsApplyingCustomPrompt] = useState(false);

  const [isApplyingBlur, setIsApplyingBlur] = useState(false);

  const [activeTab, setActiveTab] = useState<ControlTab>('adjustments');
  
  const [downloadFormat, setDownloadFormat] = useState<DownloadFormat>('image/jpeg');

  const handleSuggestIdeas = useCallback(async () => {
    setCreativeState('loading');
    setCreativeError(null);
    try {
      const ideas = await getCreativeIdeas(enhancedImage);
      setCreativeIdeas(ideas);
      setCreativeState('showing');
    } catch (err) {
      setCreativeError(err instanceof Error ? err.message : 'Failed to get ideas.');
      setCreativeState('error');
    }
  }, [enhancedImage]);

  const handleApplyStyle = useCallback(async (prompt: string) => {
    setCreativeState('applying');
    setCreativeError(null);
    try {
      const newImage = await applyCreativeEdit(enhancedImage, prompt);
      onImageUpdate(newImage);
      setCreativeState('idle');
      setCreativeIdeas([]);
    } catch (err) {
      setCreativeError(err instanceof Error ? err.message : 'Failed to apply style.');
      setCreativeState('error');
    }
  }, [enhancedImage, onImageUpdate]);

  const handleApplyCustomPrompt = useCallback(async () => {
    if (!customPrompt.trim() || !enhancedImage) return;
    setIsApplyingCustomPrompt(true);
    setCreativeError(null);
    try {
        const newImage = await applyCreativeEdit(enhancedImage, customPrompt);
        onImageUpdate(newImage);
        setCustomPrompt('');
    } catch (err) {
        setCreativeError(err instanceof Error ? err.message : 'Failed to apply custom prompt.');
    } finally {
        setIsApplyingCustomPrompt(false);
    }
  }, [enhancedImage, customPrompt, onImageUpdate]);

  const handleApplyBackgroundBlur = useCallback(async () => {
    if (backgroundBlurLevel === 0) return;
    setIsApplyingBlur(true);
    setCreativeError(null);
    try {
      const newImage = await applyBackgroundBlur(enhancedImage, backgroundBlurLevel);
      onImageUpdate(newImage);
      setBackgroundBlurLevel(0); // Reset slider after successful application
    } catch (err) {
        setCreativeError(err instanceof Error ? err.message : 'Failed to apply blur.');
    } finally {
        setIsApplyingBlur(false);
    }
  }, [enhancedImage, backgroundBlurLevel, onImageUpdate]);

  const resetAdjustments = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setSharpness(0);
  };
  
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = enhancedImage.url;
    
    const extension = downloadFormat.split('/')[1];
    link.download = `${defaultFilename}-enhanced.${extension}`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const Slider = ({ label, value, min, max, onChange, displayValue }: { label: string; value: number; min: number; max: number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, displayValue?: string }) => (
    <div>
      <label className="flex justify-between items-center text-sm font-medium text-gray-300">
        <span>{label}</span>
        <span className="font-normal text-indigo-400">{displayValue ?? value}</span>
      </label>
      <input type="range" min={min} max={max} value={value} onChange={onChange} className="w-full h-2 mt-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
    </div>
  );

  // Fix: Explicitly type CreativeButton as a React.FC to allow for special props like `key`.
  const CreativeButton: React.FC<{ name: string, prompt: string, bg: string, disabled?: boolean }> = ({ name, prompt, bg, disabled }) => (
    <button 
        onClick={() => handleApplyStyle(prompt)} 
        className={`w-full text-left p-3 rounded-lg text-white font-semibold shadow-md transition-transform hover:scale-105 ${bg} disabled:opacity-50 disabled:cursor-not-allowed`}
        disabled={disabled}
    >
        {name}
    </button>
  );

  return (
    <div className="w-full max-w-6xl mx-auto animate-fade-in flex flex-col lg:flex-row gap-8">
      <div className="flex-grow lg:w-2/3">
        <div className="flex justify-center items-center gap-2 mb-4 text-center">
            <CheckCircleIcon className="w-7 h-7 text-green-400" />
            <h2 className="text-3xl font-bold text-gray-100">Enhancement Complete!</h2>
        </div>
        <ImageComparator 
            beforeImage={originalImage.url} 
            afterImage={enhancedImage.url}
            brightness={brightness}
            contrast={contrast}
            saturation={saturation}
            sharpness={sharpness}
        />
        <div className="mt-4 flex flex-wrap justify-center items-center gap-4">
            <button onClick={onUndo} disabled={!canUndo} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-200 bg-gray-700 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">
                <UndoIcon className="w-4 h-4"/> Undo
            </button>
            <button onClick={onRefine} className="px-4 py-2 text-sm font-medium text-gray-200 bg-gray-700 rounded-md hover:bg-gray-600">
                Refine Suggestions
            </button>
            <button onClick={onStartOver} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">
                Start Over
            </button>
        </div>
      </div>
      
      <aside className="w-full lg:w-1/3 lg:max-w-sm bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg shadow-lg p-1 flex flex-col">
        <div className="flex p-1 bg-gray-700/50 rounded-t-md">
            <button onClick={() => setActiveTab('adjustments')} className={`w-1/2 py-2 text-sm font-semibold rounded-md transition ${activeTab === 'adjustments' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>Adjustments</button>
            <button onClick={() => setActiveTab('creative')} className={`w-1/2 py-2 text-sm font-semibold rounded-md transition ${activeTab === 'creative' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>Creative Edits</button>
        </div>
        
        <div className="flex-grow overflow-y-auto p-4">
            {activeTab === 'adjustments' && (
                <div className="space-y-4 animate-fade-in">
                    <h3 className="text-lg font-semibold text-center text-gray-200">Manual Adjustments</h3>
                    <Slider label="Brightness" value={brightness} min={0} max={200} onChange={e => setBrightness(Number(e.target.value))} />
                    <Slider label="Contrast" value={contrast} min={0} max={200} onChange={e => setContrast(Number(e.target.value))} />
                    <Slider label="Saturation" value={saturation} min={0} max={200} onChange={e => setSaturation(Number(e.target.value))} />
                    <Slider label="Sharpness" value={sharpness} min={-100} max={100} onChange={e => setSharpness(Number(e.target.value))} />
                    <button onClick={resetAdjustments} className="w-full mt-2 text-sm text-indigo-400 hover:text-indigo-300">Reset Adjustments</button>
                    
                    <hr className="border-gray-600 my-4" />

                    <h3 className="text-lg font-semibold text-center text-gray-200">AI Background Blur</h3>
                     <Slider label="Blur Amount" value={backgroundBlurLevel} min={0} max={100} onChange={e => setBackgroundBlurLevel(Number(e.target.value))} />
                     <p className="text-xs text-gray-500 mt-2 text-center">Set the desired blur strength. The 'Apply' button uses AI to intelligently blur only the background.</p>

                    <button onClick={handleApplyBackgroundBlur} disabled={isApplyingBlur || backgroundBlurLevel === 0} className="w-full mt-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">
                        {isApplyingBlur ? 'Applying...' : 'Apply AI Blur'}
                    </button>
                </div>
            )}
            {activeTab === 'creative' && (
                <div className="animate-fade-in">
                    {creativeState === 'applying' || isApplyingCustomPrompt ? (
                        <LoadingSpinner messages={["Applying creative style..."]} />
                    ) : (
                        <>
                            <div className="mb-4">
                                <h3 className="text-lg font-semibold text-center text-gray-200 mb-2">Custom Prompt</h3>
                                <textarea
                                    value={customPrompt}
                                    onChange={(e) => setCustomPrompt(e.target.value)}
                                    placeholder="e.g., 'Make the background black and white but keep the person in color'"
                                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 transition"
                                    rows={3}
                                    disabled={isApplyingCustomPrompt || creativeState === 'applying'}
                                />
                                <button
                                    onClick={handleApplyCustomPrompt}
                                    disabled={isApplyingCustomPrompt || creativeState === 'applying' || !customPrompt.trim()}
                                    className="w-full mt-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isApplyingCustomPrompt ? 'Applying...' : 'Apply Custom Edit'}
                                </button>
                            </div>
                            <hr className="border-gray-600 my-4" />
                            <div className="mb-4">
                                <h3 className="text-lg font-semibold text-center text-gray-200 mb-2">Professional Filters</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {professionalFilters.map(style => <CreativeButton key={style.name} name={style.name} prompt={style.prompt} bg={style.bg} disabled={isApplyingCustomPrompt || creativeState === 'applying'} />)}
                                </div>
                            </div>
                            <div className="mb-4">
                                <h3 className="text-lg font-semibold text-center text-gray-200 mb-2">Artistic Styles</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {artisticStyles.map(style => <CreativeButton key={style.name} name={style.name} prompt={style.prompt} bg={style.bg} disabled={isApplyingCustomPrompt || creativeState === 'applying'}/>)}
                                </div>
                            </div>
                            <hr className="border-gray-600 my-4" />
                            <div className="text-center">
                                <h3 className="text-lg font-semibold text-center text-gray-200 mb-2">Need Inspiration?</h3>
                                {creativeState === 'idle' && <button onClick={handleSuggestIdeas} className="w-full flex items-center justify-center gap-2 px-4 py-2 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700"><SparklesIcon className="w-5 h-5"/> Suggest Ideas</button>}
                                {creativeState === 'loading' && <button disabled className="w-full px-4 py-2 font-semibold text-white bg-indigo-600 rounded-md opacity-75">Getting ideas...</button>}
                                {creativeState === 'showing' && (
                                    <div className="space-y-2">
                                        {creativeIdeas.map((idea, i) => <button key={i} onClick={() => handleApplyStyle(idea)} className="w-full p-2 bg-gray-700 rounded-md hover:bg-gray-600">{idea}</button>)}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
            {(creativeError) && <p className="text-red-400 text-center text-sm mt-4">{creativeError}</p>}
        </div>

        <div className="p-4 border-t border-gray-700 bg-gray-800/80 rounded-b-md">
            <h3 className="text-lg font-semibold text-center text-gray-200 mb-3">Download</h3>
             <div className="flex justify-center gap-1 rounded-lg bg-gray-700/50 p-1 mb-3">
                {(['jpeg', 'png', 'webp'] as const).map(format => (
                    <button key={format} onClick={() => setDownloadFormat(`image/${format}`)} className={`w-full rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${downloadFormat === `image/${format}` ? 'bg-indigo-600 text-white shadow' : 'text-gray-300 hover:bg-gray-700'}`}>
                    {format.toUpperCase()}
                    </button>
                ))}
            </div>
            <button onClick={handleDownload} className="w-full px-4 py-2 font-semibold text-white bg-green-600 rounded-md hover:bg-green-700">
                Download Image
            </button>
        </div>
      </aside>
    </div>
  );
};

export default ResultDisplay;

import React, { useState, useEffect } from 'react';
import { SparklesIcon } from './icons';
import { EnhancementStrength, SavedSettings } from '../types';

interface AnalysisPanelProps {
  analysis: string;
  suggestions: string[];
  onEnhance: (selected: string[], strength: EnhancementStrength, detailLevel: number) => void;
  isEnhancing: boolean;
}

const SETTINGS_KEY = 'artifyy-ai-settings';

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ analysis, suggestions, onEnhance, isEnhancing }) => {
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>(suggestions);
  const [strength, setStrength] = useState<EnhancementStrength>(EnhancementStrength.NATURAL);
  const [detailLevel, setDetailLevel] = useState(50);
  const [saveSettings, setSaveSettings] = useState(false);

  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem(SETTINGS_KEY);
      if (savedSettings) {
        const { strength, detailLevel }: SavedSettings = JSON.parse(savedSettings);
        setStrength(strength);
        setDetailLevel(detailLevel);
        setSaveSettings(true);
      }
    } catch (error) {
      console.error("Failed to load settings from localStorage", error);
    }
  }, []);

  const handleCheckboxChange = (suggestion: string) => {
    setSelectedSuggestions(prev => 
      prev.includes(suggestion) 
        ? prev.filter(s => s !== suggestion)
        : [...prev, suggestion]
    );
  };

  const handleEnhanceClick = () => {
    if (saveSettings) {
      const settings: SavedSettings = { strength, detailLevel };
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      } catch (error) {
        console.error("Failed to save settings to localStorage", error);
      }
    } else {
      localStorage.removeItem(SETTINGS_KEY);
    }
    onEnhance(selectedSuggestions, strength, detailLevel);
  };

  return (
    <div className="w-full max-w-2xl bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg shadow-lg p-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-center text-indigo-400 mb-4">Analysis Complete</h2>
      
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-200 mb-2">Detected Issues:</h3>
        <div className="prose prose-invert text-gray-300" dangerouslySetInnerHTML={{ __html: analysis.replace(/\*/g, '•') }} />
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-200 mb-3">Suggested Enhancements:</h3>
        <div className="space-y-3">
          {suggestions.map((suggestion, index) => (
            <label key={index} htmlFor={`suggestion-${index}`} className="flex items-center p-3 rounded-md bg-gray-700/50 cursor-pointer hover:bg-gray-700 transition-colors">
              <input
                id={`suggestion-${index}`}
                type="checkbox"
                className="h-5 w-5 rounded border-gray-500 bg-gray-800 text-indigo-500 focus:ring-indigo-600"
                checked={selectedSuggestions.includes(suggestion)}
                onChange={() => handleCheckboxChange(suggestion)}
              />
              <span className="ml-3 text-gray-200">{suggestion}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-200 mb-3">Enhancement Strength:</h3>
        <div className="flex flex-col sm:flex-row justify-center gap-2 rounded-lg bg-gray-700/50 p-1">
          {Object.values(EnhancementStrength).map((level) => (
            <button
              key={level}
              onClick={() => setStrength(level)}
              className={`w-full rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800 ${
                strength === level ? 'bg-indigo-600 text-white shadow' : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-200 mb-3">Detail Enhancement: <span className="font-normal text-indigo-400">{detailLevel}%</span></h3>
        <input
          type="range"
          min="0"
          max="100"
          value={detailLevel}
          onChange={(e) => setDetailLevel(Number(e.target.value))}
          className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          aria-label="Detail enhancement slider"
        />
      </div>

      <div className="mb-8">
        <label htmlFor="save-settings" className="flex items-center justify-center cursor-pointer">
          <input
            id="save-settings"
            type="checkbox"
            className="h-4 w-4 rounded border-gray-500 bg-gray-800 text-indigo-500 focus:ring-indigo-600"
            checked={saveSettings}
            onChange={(e) => setSaveSettings(e.target.checked)}
          />
          <span className="ml-2 text-sm text-gray-400">Save my settings for next time</span>
        </label>
      </div>
      
      <div className="text-center">
        <button
          onClick={handleEnhanceClick}
          disabled={isEnhancing || selectedSuggestions.length === 0}
          className="inline-flex items-center justify-center px-8 py-3 text-base font-semibold text-white transition-all duration-200 bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isEnhancing ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Enhancing...
            </>
          ) : (
            <>
              <SparklesIcon className="w-5 h-5 mr-2" />
              Enhance Photo
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default AnalysisPanel;
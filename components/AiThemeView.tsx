

import React, { useState } from 'react';
import { generateBackgroundImage } from '../utils/aiUtils';
import { playClickSound, playActionSound } from '../utils/soundUtils';
import { t } from '../utils/i18n';
import { Language, CustomTheme } from '../types';
import { MagicIcon } from './Icons';

interface AiThemeViewProps {
  lang: Language;
  onThemeSet: (theme: CustomTheme | null) => void;
  currentTheme: CustomTheme | null;
}

export const AiThemeView: React.FC<AiThemeViewProps> = ({ lang, onThemeSet, currentTheme }) => {
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        
        playActionSound();
        setIsGenerating(true);
        setError(null);
        setGeneratedImage(null);

        try {
            // If we have an existing theme image, we pass it to "edit" it (Nano Banana feature)
            const base64 = currentTheme?.backgroundImage || undefined;
            const resultBase64 = await generateBackgroundImage(prompt, base64);
            
            if (resultBase64) {
                setGeneratedImage(resultBase64);
            } else {
                setError("Failed to generate image. Please try again.");
            }
        } catch (e) {
            setError("Error connecting to AI. Check API Key.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleApply = () => {
        if (generatedImage) {
            playClickSound();
            onThemeSet({ backgroundImage: generatedImage, prompt });
            setPrompt('');
            setGeneratedImage(null);
        }
    };

    const handleReset = () => {
        playClickSound();
        onThemeSet(null);
    };

    return (
        <div className="w-full h-full flex flex-col p-6 animate-fade-in overflow-y-auto no-scrollbar">
            <div className="text-center mb-6">
                 <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3 text-purple-500 shadow-cartoon">
                    <MagicIcon className="w-8 h-8" />
                 </div>
                 <h2 className="text-2xl font-black text-purple-700 mb-2">{t('ai_title', lang)}</h2>
                 <p className="text-xs font-bold text-gray-400 max-w-[200px] mx-auto leading-relaxed">
                    {t('ai_desc', lang)}
                 </p>
            </div>

            {/* Current Status / Context for Editing */}
            {currentTheme && !generatedImage && (
                <div className="text-center flex flex-col items-center mb-4">
                    <p className="text-[10px] font-bold text-gray-400 mb-2">Editing Current Theme</p>
                    <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-purple-200 shadow-sm mb-3">
                         <img src={`data:image/png;base64,${currentTheme.backgroundImage}`} alt="Current" className="w-full h-full object-cover" />
                    </div>
                    <button
                        onClick={handleReset}
                        className="px-4 py-2 rounded-full bg-gray-100 text-gray-400 font-bold text-xs hover:bg-gray-200"
                    >
                        {t('ai_reset', lang)}
                    </button>
                </div>
            )}

            {/* Input Area */}
            <div className="bg-white rounded-3xl shadow-cartoon border border-purple-100 p-4 mb-6">
                <textarea 
                    className="w-full h-24 bg-gray-50 rounded-xl p-3 text-sm font-bold text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-200 resize-none mb-3"
                    placeholder={currentTheme ? t('ai_edit_placeholder', lang) : t('ai_placeholder', lang)}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                />
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt.trim()}
                    className={`w-full py-3 rounded-xl font-black uppercase text-xs tracking-wider transition-all active:scale-95 ${
                        isGenerating ? 'bg-gray-200 text-gray-400' : 'bg-purple-500 text-white shadow-md hover:bg-purple-600'
                    }`}
                >
                    {isGenerating ? t('ai_generating', lang) : t('ai_generate', lang)}
                </button>
                {error && <p className="text-red-500 text-[10px] font-bold mt-2 text-center">{error}</p>}
            </div>

            {/* Preview Area */}
            {generatedImage && (
                 <div className="mb-6 animate-bounce-in">
                    <div className="rounded-2xl overflow-hidden border-4 border-white shadow-cartoon mb-3 bg-gray-100 aspect-square">
                        <img src={`data:image/png;base64,${generatedImage}`} alt="Generated" className="w-full h-full object-cover" />
                    </div>
                    <button
                        onClick={handleApply}
                        className="w-full py-3 rounded-xl bg-green-500 text-white font-black uppercase text-xs tracking-wider shadow-md hover:bg-green-600 transition-all active:scale-95"
                    >
                        {t('ai_set_bg', lang)}
                    </button>
                 </div>
            )}

            {/* Status when not generated and no theme is just default view */}
        </div>
    );
};
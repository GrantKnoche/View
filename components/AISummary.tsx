import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { MagicIcon } from './Icons';
import { Language } from '../types';
import { t } from '../utils/i18n';
import { playActionSound, playClickSound } from '../utils/soundUtils';

interface AISummaryProps {
  statsContext: string;
  lang: Language;
}

export const AISummary: React.FC<AISummaryProps> = ({ statsContext, lang }) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');

  // Load API Key from local storage on mount
  useEffect(() => {
    const storedKey = localStorage.getItem('pomodoro_gemini_key');
    if (storedKey) setApiKey(storedKey);
  }, []);

  const handleSaveKey = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setApiKey(val);
    localStorage.setItem('pomodoro_gemini_key', val);
  };

  const handleGenerate = async () => {
    playActionSound();
    setIsGenerating(true);
    setSummary(null);

    // Use User Key first, then fallback to Env Key (if available in build)
    const effectiveKey = apiKey || process.env.API_KEY;

    if (!effectiveKey) {
        setSummary(lang === 'zh' ? "请先点击设置图标输入 API Key" : "Please click the settings icon to enter your API Key.");
        setIsGenerating(false);
        return;
    }

    try {
        const ai = new GoogleGenAI({ apiKey: effectiveKey });
        // Use gemini-2.5-flash as it is the standard for text tasks now
        const model = 'gemini-2.5-flash';
        
        const promptText = `
        Role: You are an energetic, humorous, and supportive Time Management Coach.
        Task: Analyze the user's productivity data and write a short report (under 100 words).
        
        Style:
        - Tone: Cheerful, friendly, encouraging, slightly humorous. Use emojis (✨🍅🔥).
        - Content: Praise their persistence, point out their peak productivity time (e.g., "Night Owl" or "Early Bird"), and give 1 specific rest tip.
        - Formatting: No headers. Just the paragraph.
        
        User Data:
        ${statsContext}
        
        Output Language: ${lang === 'zh' ? 'Chinese (Simplified)' : 'English'}
        `;

        const response = await ai.models.generateContent({
            model: model,
            contents: promptText,
        });

        setSummary(response.text || "AI is taking a nap...");
    } catch (e: any) {
        console.error(e);
        setSummary(lang === 'zh' ? "生成失败，请检查 Key 是否有效。" : "Generation failed. Please check your API Key.");
    } finally {
        setIsGenerating(false);
    }
  };

  return (
    <section>
        <div className="flex justify-between items-center mb-2 px-1">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('stats_ai_title', lang)}</h3>
            {/* Settings Toggle Button */}
            <button 
                onClick={() => { playClickSound(); setShowSettings(!showSettings); }}
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${showSettings ? 'bg-indigo-500 text-white' : 'text-gray-300 hover:text-indigo-500'}`}
                title="API Settings"
            >
                {/* Gear / Settings Icon */}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
            </button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
            <div className="mb-4 bg-white p-3 rounded-xl border border-indigo-100 shadow-sm animate-fade-in">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Google API Key</label>
                <input 
                    type="password" 
                    placeholder="Paste your Gemini API Key here..."
                    value={apiKey}
                    onChange={handleSaveKey}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono text-gray-700 outline-none focus:border-indigo-400 transition-colors"
                />
                <p className="text-[9px] text-gray-400 mt-1.5 leading-tight flex justify-between">
                    <span>Key stored locally.</span>
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">Get Key &rarr;</a>
                </p>
            </div>
        )}

        <div className="bg-[#9F9DF3] p-5 rounded-[24px] border border-indigo-300 shadow-sm relative overflow-hidden min-h-[180px] flex flex-col justify-center">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

            <div className="flex flex-col items-center text-center relative z-10">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-[#9F9DF3] shadow-cartoon mb-4 border border-indigo-100 transform -rotate-6">
                    <MagicIcon className="w-6 h-6" />
                </div>
                
                {summary ? (
                    <div className="bg-white/90 backdrop-blur-sm p-4 rounded-xl w-full text-xs font-bold text-indigo-900 leading-relaxed text-left animate-fade-in border border-indigo-100 shadow-sm min-h-[80px]">
                        {summary}
                    </div>
                ) : (
                    <p className="text-[11px] font-bold text-white/90 mb-4 max-w-[220px] leading-relaxed">
                    {t('stats_ai_placeholder', lang)}
                    </p>
                )}

                {!summary && (
                    <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className={`mt-2 px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-indigo-900/20 ${
                        isGenerating ? 'bg-white/50 text-white cursor-not-allowed' : 'bg-white text-indigo-600 hover:bg-gray-50'
                    }`}
                    >
                    {isGenerating ? t('stats_ai_generating', lang) : t('stats_ai_btn_generate', lang)}
                    </button>
                )}
            </div>
        </div>
    </section>
  );
};
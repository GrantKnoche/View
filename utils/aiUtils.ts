
import { GoogleGenAI } from "@google/genai";
import { Language } from "../types";

const getAiClient = () => {
    // SECURITY: Use system environment variable for API Key
    // Strictly adhere to system rule process.env.API_KEY
    const key = process.env.API_KEY;
    
    if (!key) {
        throw new Error("Missing API Key.");
    }
    return new GoogleGenAI({ apiKey: key });
};

/**
 * Generate a background image using Gemini 2.5 Flash Image.
 * (Keeping previous logic for image gen)
 */
export const generateBackgroundImage = async (prompt: string, previousImageBase64?: string): Promise<string | null> => {
    try {
        const ai = getAiClient();
        const model = 'gemini-2.5-flash-image';

        let contents;
        if (previousImageBase64) {
            contents = {
                parts: [
                    { inlineData: { mimeType: 'image/png', data: previousImageBase64 } },
                    { text: prompt }
                ]
            };
        } else {
            const enhancedPrompt = `A cute, cartoon-style wallpaper, soft pastel colors, suitable for a productivity app background. ${prompt}`;
            contents = { parts: [{ text: enhancedPrompt }] };
        }

        const response = await ai.models.generateContent({
            model: model,
            contents: contents,
        });

        if (response.candidates && response.candidates[0].content.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    return part.inlineData.data;
                }
            }
        }
        return null;
    } catch (error) {
        console.error("AI Generation Error:", error);
        throw error;
    }
};

/**
 * Generate a personalized statistics summary.
 * Updated to use gemini-2.5-flash and the new cheerful persona.
 */
export const generateStatsSummary = async (statsContext: string, lang: Language): Promise<string> => {
    try {
        const ai = getAiClient();
        // UPDATED MODEL: gemini-2.5-flash
        const model = 'gemini-2.5-flash';

        const promptText = `
        Role: You are an energetic, humorous, and supportive Time Management Coach / Best Friend.
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

        return response.text || (lang === 'zh' ? "AI 休息中..." : "AI is taking a nap...");
    } catch (error) {
        console.error("AI Summary Error:", error);
        return lang === 'zh' ? "请检查 API Key 配置。" : "Please check API Key.";
    }
};



import { GoogleGenAI } from "@google/genai";
import { Language } from "../types";

const getAiClient = () => {
    // API_KEY must be provided via process.env.API_KEY as per system rules
    // The system prompt ensures process.env.API_KEY is available.
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

/**
 * Generate a background image using Gemini 2.5 Flash Image.
 * @param prompt User's text description
 * @param previousImageBase64 Optional base64 string of existing image to edit
 */
export const generateBackgroundImage = async (prompt: string, previousImageBase64?: string): Promise<string | null> => {
    try {
        const ai = getAiClient();
        
        let contents;
        const model = 'gemini-2.5-flash-image';

        if (previousImageBase64) {
            // Editing mode: Pass the existing image and the user's specific instruction.
            // We use the raw prompt here to allow commands like "Add a retro filter" or "Remove the object"
            // without the generative style enforcement overriding the edit intent.
            contents = {
                parts: [
                    {
                        inlineData: {
                            mimeType: 'image/png',
                            data: previousImageBase64
                        }
                    },
                    { text: prompt }
                ]
            };
        } else {
            // Generation mode: Enforce the app's aesthetic.
            const enhancedPrompt = `A cute, cartoon-style wallpaper, soft pastel colors, suitable for a productivity app background. ${prompt}`;
            contents = {
                parts: [{ text: enhancedPrompt }]
            };
        }

        const response = await ai.models.generateContent({
            model: model,
            contents: contents,
            // Gemini 2.5 Flash Image handles image generation/editing via generateContent
        });

        // Parse response to find image data
        if (response.candidates && response.candidates[0].content.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    return part.inlineData.data; // Base64 string
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
 * Generate a text summary of the user's statistics.
 */
export const generateStatsSummary = async (statsContext: string, lang: Language): Promise<string> => {
    try {
        const ai = getAiClient();
        // Using Flash for quick text tasks
        const model = 'gemini-2.5-flash';

        const prompt = `
        You are a friendly, encouraging productivity coach for a "Pomodoro" app.
        
        Analyze the following user statistics and provide a short, 2-3 sentence summary and advice.
        Keep it warm, concise, and motivating.
        
        User Data:
        ${statsContext}
        
        Output Language: ${lang === 'zh' ? 'Chinese (Simplified)' : 'English'}
        `;

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
        });

        return response.text || (lang === 'zh' ? "暂时无法生成分析。" : "Could not generate analysis.");
    } catch (error) {
        console.error("AI Summary Error:", error);
        throw error;
    }
};
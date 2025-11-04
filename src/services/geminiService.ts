import { GoogleGenAI, Modality } from "@google/genai";
import type { UploadedImage } from '../types';

const base64Parser = (imageDataUrl: string): string => {
  const regex = /^data:[^;]+;base64,(.*)/;
  const match = imageDataUrl.match(regex);
  if (match) {
    return match[1];
  }
  // This is a fallback, but the app should always provide a data URL.
  return imageDataUrl;
};

export const generateImage = async (prompt: string, images: UploadedImage[]): Promise<string> => {
  // FIX: Per guidelines, assume API_KEY is always present.
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });

  const imageParts = images.map(image => ({
    inlineData: {
      data: base64Parser(image.data),
      mimeType: image.mimeType,
    },
  }));

  const textPart = { text: prompt };

  const allParts = [...imageParts, textPart];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: allParts },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    // FIX: Safely access response parts to prevent potential runtime errors.
    const candidate = response.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          const base64ImageBytes: string = part.inlineData.data;
          const mimeType = part.inlineData.mimeType || 'image/png';
          return `data:${mimeType};base64,${base64ImageBytes}`;
        }
      }
    }

    throw new Error("No image data found in the API response.");

  } catch (error) {
    console.error("Error generating image with Gemini:", error);
    
    // Check for missing API key first, as this is a common setup error.
    if (!process.env.API_KEY) {
        throw new Error("API key is not configured. Please ensure the API_KEY environment variable is set correctly.");
    }

    if (error instanceof Error) {
        // Provide more specific feedback for common API errors.
        if (error.message.includes('API key not valid') || error.message.includes('permission')) {
            throw new Error("The provided API key is not valid or lacks the necessary permissions.");
        }
        // For other errors, pass the underlying message along for better debugging.
        throw new Error(`Image generation failed: ${error.message}`);
    }
    
    throw new Error("An unknown error occurred while generating the image.");
  }
};
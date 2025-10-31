import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ImageFile, EnhancementStrength } from "../types";

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    analysis: {
      type: Type.STRING,
      description: "A concise, user-friendly summary of the detected issues in the photo. Use bullet points.",
    },
    suggestions: {
      type: Type.ARRAY,
      description: "A list of 3-5 suggested enhancement actions. For example: 'Smooth skin to remove blemishes', 'Improve lighting and contrast', 'Sharpen details and increase resolution'. If a face appears dark or poorly lit, you MUST include a suggestion like 'Brighten face to improve visibility'.",
      items: { type: Type.STRING },
    },
  },
  required: ["analysis", "suggestions"],
};

export const analyzeImage = async (image: ImageFile): Promise<{ analysis: string, suggestions: string[] }> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              data: image.base64,
              mimeType: image.mimeType,
            },
          },
          {
            text: `You are Artifyy AI, an intelligent photo-enhancement assistant. Analyze the uploaded image for quality issues. Focus on blur, noise, low resolution, lighting, contrast, color balance, and skin imperfections (like pimples, scars, or uneven tone). Crucially, check if any faces in the photo are dark or underexposed.
            Based on your analysis, provide a concise summary of the issues found and suggest a list of specific, actionable enhancements. If a face is poorly lit, you must suggest brightening it.`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
      },
    });

    const jsonText = response.text.trim();
    const result = JSON.parse(jsonText);
    return result;
  } catch (error) {
    console.error("Error analyzing image:", error);
    throw new Error("Failed to analyze image. Please try another one.");
  }
};

const getDetailLevelPrompt = (level: number): string => {
  if (level < 25) return "Apply minimal sharpening. The final image should have a soft, natural focus.";
  if (level < 50) return "Apply a subtle amount of sharpening to gently clarify details without looking overtly processed.";
  if (level < 75) return "Enhance details and texture clarity for a crisp, well-defined image. This is a standard level of sharpness.";
  return "Significantly increase sharpness and bring out fine textures for a high-definition look. Be careful to avoid creating artificial halos or artifacts.";
}

const getStrengthPrompt = (strength: EnhancementStrength): string => {
  switch (strength) {
    case EnhancementStrength.SUBTLE:
      return "Apply very gentle, barely noticeable enhancements. Prioritize realism over perfection.";
    case EnhancementStrength.NATURAL:
      return "Apply balanced, natural-looking enhancements. The photo should look like it was taken by a professional, but not overly edited.";
    case EnhancementStrength.STRONG:
      return "Apply significant enhancements for a dramatic effect, but maintain realism. Boost colors to be strong and warm, increase contrast, and sharpen details significantly. It is crucial to preserve the subject's natural features and avoid an over-processed or artificially bright look, especially on faces.";
    default:
      return `The desired enhancement intensity is "${strength}".`;
  }
};


export const enhanceImage = async (image: ImageFile, suggestions: string[], strength: EnhancementStrength, detailLevel: number): Promise<ImageFile> => {
  try {
    const prompt = `Enhance this photograph professionally.

**Instructions:**
*   Apply the following enhancements: ${suggestions.join(', ')}.
*   If brightening a face is requested, it is crucial to apply this enhancement evenly across all visible skin of the subject. Ensure the entire skin tone is brightened with consistent light and color to maintain a natural look. Avoid creating patches or making different parts of the skin appear disconnected. The goal is a uniform brightening of the person while keeping the background lighting consistent.
*   Enhancement Intensity: ${getStrengthPrompt(strength)}.
*   Detail Enhancement Level: ${detailLevel}/100. ${getDetailLevelPrompt(detailLevel)}.
*   Preserve the subject's original identity and expression. Do not unnaturally distort facial features or skin color.

**Output:**
Return ONLY the enhanced image. Do not include any text, summary, or explanation.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: image.base64,
              mimeType: image.mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    const candidate = response?.candidates?.[0];
    const part = candidate?.content?.parts?.[0];

    if (part?.inlineData) {
      return {
        base64: part.inlineData.data,
        mimeType: part.inlineData.mimeType,
        url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
      };
    } else {
        const finishReason = candidate?.finishReason;
        const safetyRatings = candidate?.safetyRatings;
        console.error("Image enhancement failed. Reason:", finishReason, "Safety Ratings:", JSON.stringify(safetyRatings, null, 2));
        throw new Error("The AI failed to generate an image. This might be due to safety filters. Please try a different image or adjust your selections.");
    }
  } catch (error) {
    console.error("Error enhancing image:", error);
    if (error instanceof Error) {
        throw error;
    }
    throw new Error("Failed to enhance image. The model may not be suitable for this type of photo.");
  }
};


const creativeIdeasSchema = {
  type: Type.OBJECT,
  properties: {
    ideas: {
      type: Type.ARRAY,
      description: "A list of 3 diverse, creative suggestions to artistically enhance the photo. Examples: 'Blur the background for a portrait effect', 'Apply a warm, cinematic color grade', 'Upscale image to a higher resolution'.",
      items: { type: Type.STRING },
    },
  },
  required: ["ideas"],
};

export const getCreativeIdeas = async (image: ImageFile): Promise<string[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          { inlineData: { data: image.base64, mimeType: image.mimeType } },
          { text: "You are a creative photo editor AI. Analyze this photo and suggest 3 creative, artistic edits. Provide short, actionable suggestions." },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: creativeIdeasSchema,
      },
    });

    const jsonText = response.text.trim();
    const result = JSON.parse(jsonText);
    return result.ideas || [];
  } catch (error) {
    console.error("Error getting creative ideas:", error);
    throw new Error("Failed to generate creative ideas for the image.");
  }
};

export const applyCreativeEdit = async (image: ImageFile, instruction: string): Promise<ImageFile> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: image.base64, mimeType: image.mimeType } },
          { text: `Apply the following single creative edit to this image: "${instruction}". Ensure the final result is high quality and artistically pleasing. Only return the final image.` },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });
    
    const part = response?.candidates?.[0]?.content?.parts?.[0];

    if (part?.inlineData) {
      return {
        base64: part.inlineData.data,
        mimeType: part.inlineData.mimeType,
        url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
      };
    } else {
      console.error("Creative edit failed. No image part in response.", JSON.stringify(response, null, 2));
      throw new Error("The AI failed to apply the creative edit. Please try a different one.");
    }
  } catch (error) {
     console.error("Error applying creative edit:", error);
    if (error instanceof Error) {
        throw error;
    }
    throw new Error("Failed to apply creative edit.");
  }
};
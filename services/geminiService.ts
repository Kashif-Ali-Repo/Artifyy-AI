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
    const prompt = `Enhance this photograph professionally with a strong emphasis on realism.

**Core Goal:** The final image must look like a real, high-quality photograph, not an AI-generated image.

**Instructions:**
*   Apply the following enhancements: ${suggestions.join(', ')}.
*   If brightening a face is requested, it is crucial to apply this enhancement evenly across all visible skin of the subject. Ensure the entire skin tone is brightened with consistent light and color to maintain a natural look. Avoid creating patches or making different parts of the skin appear disconnected. The goal is a uniform brightening of the person while keeping the background lighting consistent.
*   Enhancement Intensity: ${getStrengthPrompt(strength)}.
*   Detail Enhancement Level: ${detailLevel}/100. ${getDetailLevelPrompt(detailLevel)}.
*   **Realism Constraints (Crucial):**
    *   Preserve the subject's original identity, facial structure, and expression.
    *   Maintain natural skin texture. Do not over-smooth skin to the point it looks artificial or plastic-like.
    *   Ensure lighting enhancements look natural and consistent with the scene. Avoid creating an artificial "glowing" effect on subjects.
    *   Keep colors realistic, even when applying strong enhancements.

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

const getBlurLevelPrompt = (level: number): string => {
    if (level <= 10) return "very subtle, barely noticeable";
    if (level <= 30) return "subtle and natural";
    if (level <= 60) return "moderate, similar to a portrait lens";
    if (level <= 85) return "strong and prominent, making the subject stand out significantly";
    return "maximum, creating a very dreamy and artistic effect";
}

export const applyBackgroundBlur = async (image: ImageFile, blurLevel: number): Promise<ImageFile> => {
    if (blurLevel === 0) return image;
    try {
        const prompt = `Apply a realistic background blur (bokeh effect) to this image.
- The main subject(s) must remain perfectly sharp and in focus.
- The background should be blurred.
- The intensity of the background blur should be ${getBlurLevelPrompt(blurLevel)} (${blurLevel}/100).
- Do not change colors, lighting, or any other aspect of the photo.
- Return ONLY the edited image.`;

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
            console.error("Background blur failed. Reason:", finishReason, "Safety Ratings:", JSON.stringify(safetyRatings, null, 2));
            throw new Error("The AI failed to apply background blur. This might be due to safety filters or difficulty identifying a subject.");
        }
    } catch (error) {
        console.error("Error applying background blur:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("Failed to apply background blur.");
    }
};

const creativeIdeasSchema = {
  type: Type.OBJECT,
  properties: {
    ideas: {
      type: Type.ARRAY,
      description: "A list of 3-5 creative, short, and actionable editing ideas for the photo. Each idea should be a concise phrase. For example: 'Add a dramatic black and white filter', 'Make the sky more vibrant', 'Apply a vintage film look'.",
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
          {
            inlineData: {
              data: image.base64,
              mimeType: image.mimeType,
            },
          },
          {
            text: `You are Artifyy AI. Brainstorm 3-5 creative and different editing ideas for this photograph. The ideas should be short, punchy, and suitable for buttons. Examples: "Cinematic Black & White", "Vibrant & Punchy", "Dreamy Vintage Look". Do not add explanations.`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: creativeIdeasSchema,
      },
    });

    const jsonText = response.text.trim();
    const result = JSON.parse(jsonText);
    return result.ideas;
  } catch (error) {
    console.error("Error getting creative ideas:", error);
    throw new Error("Failed to generate creative ideas for this image.");
  }
};

export const applyCreativeEdit = async (image: ImageFile, prompt: string): Promise<ImageFile> => {
    try {
        const fullPrompt = `Professionally apply the following creative edit to the photograph with a strong emphasis on realism: "${prompt}".
- The final image must look like a real, high-quality photograph, not an AI-generated image.
- Preserve the subject's original identity and natural features.
- Return ONLY the enhanced image. Do not include any text, summary, or explanation.`;

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
                        text: fullPrompt,
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
            console.error("Creative edit failed. Reason:", finishReason, "Safety Ratings:", JSON.stringify(safetyRatings, null, 2));
            throw new Error("The AI failed to apply the creative edit. This might be due to safety filters.");
        }
    } catch (error) {
        console.error("Error applying creative edit:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("Failed to apply creative edit.");
    }
};

export const generateImageFromPrompt = async (prompt: string): Promise<ImageFile> => {
  try {
    const fullPrompt = `Create a photorealistic, high-quality photograph based on the following description: "${prompt}". The image should be professional-grade, with realistic lighting, textures, and details.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: fullPrompt,
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
      console.error("Image generation failed. Reason:", finishReason, "Safety Ratings:", JSON.stringify(safetyRatings, null, 2));
      throw new Error("The AI failed to generate an image. This might be due to safety filters or an invalid prompt.");
    }
  } catch (error) {
    console.error("Error generating image from prompt:", error);
    if (error instanceof Error) {
        throw error;
    }
    throw new Error("Failed to generate image from prompt.");
  }
};
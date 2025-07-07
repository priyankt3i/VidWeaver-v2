import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Script, VideoData, Scene } from '../types';


const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
if (!apiKey) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: apiKey });

const parseJsonResponse = <T,>(text: string): T => {
    let jsonStr = text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
        jsonStr = match[2].trim();
    }
    try {
        const parsed = JSON.parse(jsonStr);
        return parsed as T;
    } catch (e) {
        console.error("Failed to parse JSON response:", jsonStr);
        throw new Error("AI response was not in a valid JSON format.");
    }
};

const fileToGenerativePart = async (file: File) => {
    const base64EncodedData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
    return {
        inlineData: {
            mimeType: file.type,
            data: base64EncodedData,
        },
    };
};

export const summarizeFiles = async (files: File[]): Promise<string[]> => {
    const prompt = `
      Your task is to provide a concise, one-sentence summary for each of the following ${files.length} documents.
      Return the summaries in the exact same order as the documents are provided.
      Your response MUST be a single, valid JSON object as an array of strings, like this:
      ["Summary one.", "Summary two."]
    `;
    
    const fileParts = await Promise.all(files.map(fileToGenerativePart));
    const contents = [{ text: prompt }, ...fileParts];

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-04-17',
        contents: { parts: contents },
        config: { responseMimeType: "application/json" }
    });
    
    const parsed = parseJsonResponse<string[]>(response.text);
    if (!Array.isArray(parsed)) {
        throw new Error("AI response for summaries was not a JSON array.");
    }
    return parsed;
};

export const generateScript = async (
    { summaries, category, genre, duration }: { summaries: string[]; category: string; genre: string; duration: number }
): Promise<Script> => {
    const sceneCount = Math.floor(duration / 7); // Approx. 7 seconds per scene
    const prompt = `
      Act as an expert YouTube scriptwriter. Your task is to write a complete video script for a "${genre}" video in the "${category}" category with a target duration of ${duration} seconds.
      Base the script on these summaries: ${summaries.map(s => `- ${s}`).join('\n')}
      
      The "mainContent" should be broken into exactly ${sceneCount} distinct paragraphs (scenes), separated by a single newline character ('\\n').
      
      Your response MUST be a single, valid JSON object with this structure:
      {
        "intro": "A catchy intro for a ${duration}-second video.",
        "mainContent": "The main script body, split into ${sceneCount} paragraphs.",
        "summary": "A brief summary.",
        "cta": "A compelling call-to-action."
      }
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-04-17',
        contents: prompt,
        config: { responseMimeType: "application/json" }
    });

    return parseJsonResponse<Script>(response.text);
};

const getVisualPromptForScene = async (sceneScript: string, category: string, genre: string): Promise<{ imagePrompt: string; justification: string }> => {
    const prompt = `
      You are an AI Art Director for a "${genre}" video. The script for this scene is: "${sceneScript}".
      Generate a visual concept. Your response MUST be a single, valid JSON object like this:
      {
        "imagePrompt": "A concise, cinematic, visually descriptive prompt for an AI image generator.",
        "justification": "A brief explanation of why this visual was chosen."
      }
    `;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-04-17',
        contents: prompt,
        config: { responseMimeType: "application/json" }
    });

    return parseJsonResponse<{ imagePrompt: string; justification: string }>(response.text);
};

const generateImage = async (prompt: string): Promise<string> => {
    const enrichedPrompt = `${prompt}, cinematic lighting, high detail, high quality, masterpiece`;
    const response = await ai.models.generateImages({
        model: 'imagen-3.0-generate-002',
        prompt: enrichedPrompt,
        config: { numberOfImages: 1, outputMimeType: 'image/png' },
    });
    
    return `data:image/png;base64,${response.generatedImages[0].image.imageBytes}`;
};

const generateNarrationAudio = async (text: string, voice: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }], // For TTS, the prompt is simply the text to synthesize
        config: {
            responseModalities: ['AUDIO'],
            // Use the simpler voiceConfig for single-speaker narration
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: voice }
                }
            }
        }
    });

    const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!data) {
        throw new Error(`Audio generation failed for text: "${text}"`);
    }
    return `data:audio/wav;base64,${data}`;
};

export const generateVideoAssets = async (
    { script, category, genre, duration, voice }: { script: Script; category: string; genre: string; duration: number; voice: string; }
): Promise<VideoData> => {
    const sceneScripts = script.mainContent.split('\n').filter(line => line.trim() !== '');

    const thumbnailAndTagsPromise = (async () => {
        const prompt = `
            Based on this script for a ${duration}-second "${genre}" video, generate a YouTube thumbnail prompt and tags.
            Script Summary: ${script.summary}
            Your response MUST be a single, valid JSON object like this:
            {
              "thumbnailPrompt": "A highly engaging, visual prompt for a YouTube thumbnail.",
              "youtubeTags": ["tag one", "tag two"]
            }
        `;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-04-17', contents: prompt, config: { responseMimeType: "application/json" }
        });
        const { thumbnailPrompt, youtubeTags } = parseJsonResponse<{ thumbnailPrompt: string; youtubeTags: string[] }>(response.text);
        const thumbnailUrl = await generateImage(thumbnailPrompt);
        return { thumbnailUrl, youtubeTags };
    })();

    const sceneAssetPromises = sceneScripts.map(async (chunk, index) => {
        const { imagePrompt, justification } = await getVisualPromptForScene(chunk, category, genre);
        const [imageUrl, audioUrl] = await Promise.all([
            generateImage(imagePrompt),
            generateNarrationAudio(chunk, voice)
        ]);
        return { scene: index + 1, imagePrompt, justification, imageUrl, audioUrl, scriptChunk: chunk };
    });
    
    const [thumbnailResult, ...sceneResults] = await Promise.all([thumbnailAndTagsPromise, ...sceneAssetPromises]);

    return {
        scenes: sceneResults as Scene[],
        thumbnailUrl: thumbnailResult.thumbnailUrl,
        youtubeTags: thumbnailResult.youtubeTags || [],
        voice: voice,
    };
};
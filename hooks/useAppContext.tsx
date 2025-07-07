import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { Stage, Script, VideoData, AppContextType, UploadedFile } from '../types';
import { summarizeFiles as summarizeFilesService, generateScript as generateScriptService, generateVideoAssets } from '../services/geminiService';

const AppContext = createContext<AppContextType | undefined>(undefined);

const getAudioDuration = (audioUrl: string): Promise<number> => {
    return new Promise((resolve, reject) => {
        const audio = new Audio(audioUrl);
        audio.onloadedmetadata = () => resolve(audio.duration);
        audio.onerror = (e) => reject(`Could not load audio metadata for ${audioUrl}. Error: ${e}`);
    });
};


export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [stage, setStage] = useState<Stage>(Stage.UPLOAD);
  const [projectName, setProjectName] = useState<string>('My AI Video Project');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [category, setCategory] = useState<string | null>(null);
  const [genre, setGenre] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [script, setScript] = useState<Script | null>(null);
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);

  const navigateToStage = (newStage: Stage) => {
    if (newStage === Stage.SCRIPT && files.length === 0) {
      setError("Please upload files before proceeding to the script.");
      return;
    }
    if (newStage === Stage.GENERATE && !script) {
      setError("Please generate a script before creating the video.");
      return;
    }
    setError(null);
    setStage(newStage);
  };

  const handleSetFiles = (newFiles: File[]) => {
    setFiles(newFiles.map(file => ({ file })));
    setScript(null);
    setVideoData(null);
  };
  
  const handleSetCategory = (cat: string | null) => {
    setCategory(cat);
    setGenre(null); // Reset genre when category changes
  };

  const summarizeAndProceed = async () => {
    if (files.length === 0 || !category || !genre || !duration) {
      setError('Please select files, a category, a genre, and a duration.');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      navigateToStage(Stage.SCRIPT); // Navigate immediately to show loading state on next page
      const summaries = await summarizeFilesService(files.map(f => f.file));
      if (summaries.length !== files.length) {
          throw new Error("The AI returned a different number of summaries than files provided.");
      }
      const updatedFiles = files.map((uploadedFile, index) => ({
        ...uploadedFile,
        summary: summaries[index]
      }));
      setFiles(updatedFiles);

      const summariesForScript = updatedFiles.map(f => f.summary || '').filter(s => s);
      if (summariesForScript.length === 0) {
          throw new Error("Could not generate summaries from the provided files.");
      }
      
      const generatedScript = await generateScriptService({ summaries: summariesForScript, category, genre, duration });
      setScript(generatedScript);

    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred during processing.');
      console.error(e);
      setStage(Stage.UPLOAD); // Revert to upload stage on error
    } finally {
      setIsLoading(false);
    }
  };

  const generateScript = useCallback(async () => {
    const summaries = files.map(f => f.summary || '').filter(s => s);
    if (!category || !genre || !duration || summaries.length === 0) {
      setError('Cannot regenerate script without summaries, category, genre, and duration.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const generatedScript = await generateScriptService({ summaries, category, genre, duration });
      setScript(generatedScript);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown script generation error occurred.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [files, category, genre, duration]);

  const updateScript = (updatedScript: Script) => {
    setScript(updatedScript);
  };
  
  const generateVideo = async (voice?: string) => {
    if (!script || !category || !genre || !duration) {
        setError('A finalized script, category, genre, and duration are required.');
        return;
    }

    if (!voice) {
      setIsVoiceModalOpen(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    navigateToStage(Stage.GENERATE);
    try {
        const assets = await generateVideoAssets({ script, category, genre, duration, voice });
        
        // Post-process to get audio durations
        const scenesWithDurations = await Promise.all(assets.scenes.map(async (scene) => {
            if (!scene.audioUrl) return scene;
            try {
                const audioDuration = await getAudioDuration(scene.audioUrl);
                return { ...scene, audioDuration };
            } catch (e) {
                console.error(e);
                return scene; // Return scene without duration on error
            }
        }));

        setVideoData({ ...assets, scenes: scenesWithDurations });

    } catch (e) {
        setError(e instanceof Error ? e.message : 'An unknown error occurred during video generation.');
        console.error(e);
        navigateToStage(Stage.SCRIPT); // Revert on failure
    } finally {
        setIsLoading(false);
    }
  };

  const value: AppContextType = {
    stage,
    projectName,
    files,
    category,
    genre,
    duration,
    script,
    videoData,
    isLoading,
    error,
    isVoiceModalOpen,
    setProjectName,
    setFiles: handleSetFiles,
    setCategory: handleSetCategory,
    setGenre,
    setDuration,
    navigateToStage,
    summarizeAndProceed,
    generateScript,
    updateScript,
    generateVideo,
    setIsVoiceModalOpen,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
import React, { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import Muxer from 'mp4-muxer';
import { useApp } from '../hooks/useAppContext';
import { PlayIcon, PauseIcon, DownloadIcon } from '../components/Icons';

const GeneratePage: React.FC = () => {
  const { videoData, isLoading, error, script, projectName } = useApp();
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const advanceToNextScene = () => {
    if (!videoData) return;
    setCurrentSceneIndex(prevIndex => (prevIndex + 1) % videoData.scenes.length);
  };
  
  // Effect to control audio playback
  useEffect(() => {
    if (!audioRef.current || !videoData || videoData.scenes.length === 0) return;

    const currentScene = videoData.scenes[currentSceneIndex];
    if (currentScene.audioUrl) {
      if (audioRef.current.src !== currentScene.audioUrl) {
          audioRef.current.src = currentScene.audioUrl;
      }
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Audio play failed:", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [currentSceneIndex, isPlaying, videoData]);

  const handleDownload = async () => {
    if (!videoData || !script) return;
    setIsDownloading(true);

    try {
      // Create zip in parallel
      const zipPromise = createZipFile();
      // Create video in parallel
      const videoPromise = createMp4File();

      const [zipBlob, videoBlob] = await Promise.all([zipPromise, videoPromise]);
      
      // Trigger downloads
      downloadBlob(zipBlob, `${projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase() || "ai_video"}_assets.zip`);
      downloadBlob(videoBlob, `${projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase() || "ai_video"}.mp4`);

    } catch (err) {
        console.error("Failed during download process:", err);
        // You could set an error state here to show in the UI
    } finally {
        setIsDownloading(false);
    }
  };
  
  const downloadBlob = (blob: Blob, fileName: string) => {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
  };
  
  const dataUrlToBlob = (dataUrl: string) => fetch(dataUrl).then(res => res.blob());

  const createZipFile = async (): Promise<Blob> => {
    if (!videoData || !script) throw new Error("Missing data for zip file creation.");
    
    const zip = new JSZip();
    const folderName = projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase() || "ai-video-assets";
    const folder = zip.folder(folderName);
    if (!folder) throw new Error("Could not create zip folder.");

    const fullScript = `Intro:\n${script.intro}\n\nMain Content:\n${script.mainContent}\n\nSummary:\n${script.summary}\n\nCall to Action:\n${script.cta}`;
    folder.file("script.txt", fullScript);
    folder.file("tags.txt", videoData.youtubeTags.join(', '));
    
    const assetPromises = [
        dataUrlToBlob(videoData.thumbnailUrl).then(blob => folder.file("thumbnail.png", blob)),
        ...videoData.scenes.map(async (scene) => {
            const imageBlob = await dataUrlToBlob(scene.imageUrl);
            folder.file(`scene_${String(scene.scene).padStart(2, '0')}.png`, imageBlob);
            if (scene.audioUrl) {
                const audioBlob = await dataUrlToBlob(scene.audioUrl);
                folder.file(`scene_${String(scene.scene).padStart(2, '0')}.wav`, audioBlob);
            }
        })
    ];
    
    await Promise.all(assetPromises);
    return zip.generateAsync({ type: "blob" });
  };

  const createMp4File = async (): Promise<Blob> => {
      if (!videoData || !videoData.scenes.every(s => s.audioDuration && s.audioDuration > 0)) {
          throw new Error("Video data or audio durations are not available for MP4 generation.");
      }
      
      const frameRate = 30;
      const audioSampleRate = 24000;

      let muxer = new Muxer({
          target: 'mp4',
          video: { format: 'avc', width: 1280, height: 720, frameRate },
          audio: { format: 'aac', sampleRate: audioSampleRate, numberOfChannels: 1 },
          fastStart: 'fragmented'
      });
      
      const videoEncoder = new VideoEncoder({
          output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
          error: e => console.error('VideoEncoder error:', e)
      });
      videoEncoder.configure({ codec: 'avc1.42001f', width: 1280, height: 720, framerate: frameRate });

      const audioEncoder = new AudioEncoder({
          output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
          error: e => console.error('AudioEncoder error:', e)
      });
      audioEncoder.configure({ codec: 'mp4a.40.2', sampleRate: audioSampleRate, numberOfChannels: 1 });
      
      let videoTimestamp = 0; // Cumulative timestamp in microseconds for video
      let audioTimestamp = 0; // Cumulative timestamp in microseconds for audio
      const audioContext = new AudioContext({ sampleRate: audioSampleRate });

      for (const scene of videoData.scenes) {
          const imageBitmap = await createImageBitmap(await dataUrlToBlob(scene.imageUrl));
          const sceneDurationUs = scene.audioDuration! * 1_000_000;
          const frameDurationUs = 1_000_000 / frameRate;
          const frameCount = Math.round(sceneDurationUs / frameDurationUs);

          for (let i = 0; i < frameCount; i++) {
              const frame = new VideoFrame(imageBitmap, {
                  timestamp: videoTimestamp + (i * frameDurationUs),
                  duration: frameDurationUs
              });
              videoEncoder.encode(frame);
              frame.close();
          }
          imageBitmap.close();

          if (scene.audioUrl) {
             const audioBlob = await dataUrlToBlob(scene.audioUrl);
             const audioBuffer = await audioBlob.arrayBuffer();
             const decodedAudio = await audioContext.decodeAudioData(audioBuffer);
             
             const pcmData = decodedAudio.getChannelData(0);
             const audioData = new AudioData({
                 format: 'f32-planar',
                 sampleRate: audioSampleRate,
                 numberOfFrames: decodedAudio.length,
                 numberOfChannels: 1,
                 timestamp: audioTimestamp,
                 data: pcmData
             });
             audioEncoder.encode(audioData);
             audioData.close();
          }
          
          videoTimestamp += sceneDurationUs;
          audioTimestamp += sceneDurationUs;
      }

      await videoEncoder.flush();
      await audioEncoder.flush();
      muxer.finalize();
      
      const { buffer } = muxer.target.buffer;
      return new Blob([buffer], { type: 'video/mp4' });
  };


  if (isLoading && !videoData) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
         <svg className="animate-spin h-10 w-10 text-white mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-xl text-white">Generating your video assets...</p>
        <p className="text-slate-400">The AI is creating visuals and audio. This may take a moment.</p>
      </div>
    );
  }

   if (error) {
     return <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg" role="alert">
        <strong className="font-bold">Error: </strong>
        <span className="block sm:inline">{error}</span>
      </div>
  }

  if (!videoData || videoData.scenes.length === 0) {
     return <div className="text-center text-slate-400">Please complete the previous steps to generate video assets.</div>;
  }

  const currentScene = videoData.scenes[currentSceneIndex];

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
       <audio ref={audioRef} onEnded={advanceToNextScene} className="hidden" />
      <div className="lg:col-span-2 space-y-8">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold text-white">Stage 3: Your AI-Produced Video</h2>
           <button
            onClick={handleDownload}
            disabled={isDownloading || !videoData.scenes.every(s => s.audioDuration && s.audioDuration > 0)}
            className="flex items-center justify-center bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-900 disabled:cursor-not-allowed disabled:text-slate-400 transition-colors"
          >
            <DownloadIcon />
            {isDownloading ? 'Processing...' : 'Download Video & Assets'}
          </button>
        </div>

        <div className="relative aspect-video bg-black rounded-lg overflow-hidden shadow-2xl border border-slate-700">
          {currentScene && (
            <>
              <img
                key={currentScene.scene}
                src={currentScene.imageUrl}
                alt={`Scene ${currentScene.scene}`}
                className={`absolute inset-0 w-full h-full object-cover ${isPlaying ? 'ken-burns' : ''}`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
              <div className="absolute bottom-0 left-0 p-6 text-white w-full">
                <p className="text-lg md:text-xl lg:text-2xl drop-shadow-md">{currentScene.scriptChunk}</p>
              </div>
            </>
          )}
          <div className="absolute top-4 right-4">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="bg-black/50 text-white rounded-full p-2 hover:bg-black/75 transition-colors"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <PauseIcon className="w-6 h-6"/> : <PlayIcon className="w-6 h-6"/>}
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                <h3 className="text-xl font-semibold text-white mb-4">Generated Thumbnail</h3>
                <img src={videoData.thumbnailUrl} alt="Generated YouTube Thumbnail" className="w-full rounded-md aspect-video object-cover"/>
            </div>
             <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                <h3 className="text-xl font-semibold text-white mb-4">Suggested YouTube Tags</h3>
                <div className="flex flex-wrap gap-2">
                    {videoData.youtubeTags.map(tag => (
                        <span key={tag} className="bg-slate-700 text-indigo-300 text-sm font-medium px-3 py-1 rounded-full">{tag}</span>
                    ))}
                </div>
            </div>
        </div>
      </div>

      <aside className="lg:col-span-1 bg-slate-800 p-6 rounded-lg border border-slate-700 h-full max-h-[85vh] overflow-y-auto">
        <h3 className="text-xl font-semibold text-white mb-4">Scene Breakdown</h3>
        <div className="space-y-4">
          {videoData.scenes.map((scene, index) => (
            <div
              key={scene.scene}
              onClick={() => setCurrentSceneIndex(index)}
              className={`p-4 rounded-lg cursor-pointer transition-all duration-300 border-2
                ${index === currentSceneIndex ? 'bg-slate-700 border-indigo-500' : 'bg-slate-900/50 border-transparent hover:bg-slate-700/70'}
              `}
            >
              <p className="font-bold text-white mb-2">Scene {scene.scene} <span className="text-xs font-normal text-slate-400">({scene.audioDuration ? `${scene.audioDuration.toFixed(1)}s` : '...'})</span></p>
              <p className="text-sm text-slate-400 mb-3 italic">"{scene.scriptChunk}"</p>
              <p className="text-xs text-slate-500"><span className="font-semibold text-slate-400">AI Justification:</span> {scene.justification}</p>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
};

export default GeneratePage;
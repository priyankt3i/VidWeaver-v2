import React, { useState } from 'react';
import { useApp } from '../hooks/useAppContext';
import { SUPPORTED_VOICES } from '../constants';

const VoiceSelectionModal: React.FC = () => {
  const { isVoiceModalOpen, setIsVoiceModalOpen, generateVideo, isLoading } = useApp();
  const [selectedVoice, setSelectedVoice] = useState(SUPPORTED_VOICES[0]);

  if (!isVoiceModalOpen) return null;

  const handleGenerate = () => {
    generateVideo(selectedVoice);
    setIsVoiceModalOpen(false);
  };

  const handleCancel = () => {
    setIsVoiceModalOpen(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 transition-opacity" aria-modal="true" role="dialog">
      <div className="bg-slate-800 rounded-lg shadow-xl p-8 border border-slate-700 w-full max-w-md transform transition-all">
        <h2 className="text-2xl font-bold text-white mb-4">Select a Voice</h2>
        <p className="text-slate-400 mb-6">Choose a voice for your video's narration. The AI will read your script using this voice.</p>
        
        <div className="space-y-3">
          {SUPPORTED_VOICES.map((voice) => (
            <label key={voice} className="flex items-center p-4 bg-slate-900 rounded-lg cursor-pointer border-2 border-slate-700 hover:border-indigo-500 transition-colors has-[:checked]:border-indigo-600 has-[:checked]:bg-slate-700">
              <input
                type="radio"
                name="voice"
                value={voice}
                checked={selectedVoice === voice}
                onChange={() => setSelectedVoice(voice)}
                className="w-5 h-5 text-indigo-600 bg-slate-700 border-slate-500 focus:ring-indigo-500"
              />
              <span className="ml-4 text-lg font-medium text-white">{voice}</span>
            </label>
          ))}
        </div>

        <div className="mt-8 flex justify-end space-x-4">
          <button
            onClick={handleCancel}
            className="px-6 py-2 rounded-lg bg-slate-600 text-white font-semibold hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="flex items-center justify-center bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-900 disabled:cursor-not-allowed disabled:text-slate-400 transition-colors"
          >
            {isLoading ? 'Generating...' : 'Generate Video'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceSelectionModal;

import React, { useEffect, useState } from 'react';
import { useApp } from '../hooks/useAppContext';
import { Script } from '../types';
import { RegenerateIcon } from '../components/Icons';

const ScriptPage: React.FC = () => {
  const {
    category,
    genre,
    script,
    generateScript,
    updateScript,
    isLoading,
    error,
    duration,
    generateVideo,
  } = useApp();

  const [localScript, setLocalScript] = useState<Script | null>(script);
  
  useEffect(() => {
    setLocalScript(script);
  }, [script]);

  const handleScriptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!localScript) return;
    const { name, value } = e.target;
    const updatedScript = { ...localScript, [name]: value };
    setLocalScript(updatedScript);
    updateScript(updatedScript);
  };

  if (isLoading && !script) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <svg className="animate-spin h-10 w-10 text-white mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-xl text-white">Generating your script...</p>
        <p className="text-slate-400">The AI is reading your documents and getting creative.</p>
      </div>
    );
  }

  if (error) {
     return <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg" role="alert">
        <strong className="font-bold">Error: </strong>
        <span className="block sm:inline">{error}</span>
      </div>
  }

  if (!script || !localScript) {
    return <div className="text-center text-slate-400">Please complete the upload step first to generate a script.</div>;
  }

  return (
    <>
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-white mb-2">Stage 2: Review & Edit Script</h2>
        <p className="text-slate-400 mb-6">The AI has generated a script for you. Review, edit, and refine it here.</p>
        <div className="mb-6 bg-slate-800 border border-slate-700 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <p className="text-md text-white">Category: <span className="font-bold text-indigo-400">{category}</span></p>
            <p className="text-md text-white">Genre: <span className="font-bold text-indigo-400">{genre}</span></p>
            <p className="text-md text-white">Duration: <span className="font-bold text-indigo-400">{duration} seconds</span></p>
          </div>
          <button
            onClick={generateScript}
            disabled={isLoading}
            className="flex items-center bg-slate-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors flex-shrink-0"
          >
            <RegenerateIcon />
            {isLoading && localScript ? 'Regenerating...' : 'Regenerate Script'}
          </button>
        </div>

        <div className="space-y-6">
          {Object.keys(localScript).map((key) => (
            <div key={key} className="bg-slate-800 p-6 rounded-lg border border-slate-700">
              <label htmlFor={key} className="block text-lg font-medium text-white mb-2 capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
              <textarea
                id={key}
                name={key}
                value={localScript[key as keyof Script]}
                onChange={handleScriptChange}
                rows={key === 'mainContent' ? 12 : 3}
                className="w-full bg-slate-900 border border-slate-600 rounded-md py-2 px-3 text-slate-300 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={() => generateVideo()}
            disabled={isLoading}
            className="flex items-center justify-center bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-900 disabled:cursor-not-allowed disabled:text-slate-400 transition-colors"
          >
            Finalize Script & Generate Video
          </button>
        </div>
      </div>
    </>
  );
};

export default ScriptPage;
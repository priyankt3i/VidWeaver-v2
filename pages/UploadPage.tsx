import React, { useCallback, useState } from 'react';
import { useApp } from '../hooks/useAppContext';
import { UploadIcon, TrashIcon } from '../components/Icons';
import { VIDEO_STYLES } from '../videoStyles';

const UploadPage: React.FC = () => {
  const {
    projectName,
    setProjectName,
    files,
    setFiles,
    summarizeAndProceed,
    isLoading,
    error,
    category,
    genre,
    duration,
    setCategory,
    setGenre,
    setDuration,
  } = useApp();

  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(Array.from(e.target.files));
  };
  
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles(Array.from(e.dataTransfer.files));
      e.dataTransfer.clearData();
    }
  }, [setFiles]);

  const handleDragEvents = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setIsDragging(true);
    else if (e.type === 'dragleave') setIsDragging(false);
  };

  const removeFile = (fileName: string) => {
      setFiles(files.map(f => f.file).filter(file => file.name !== fileName));
  };

  const acceptedFileTypes = ".pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.txt,.png,.jpg,.jpeg";
  const durationOptions = [10, 20, 30, 40, 50, 60];

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-white mb-2">Stage 1: Upload Content</h2>
      <p className="text-slate-400 mb-8">Provide project details and upload your source documents.</p>

      {error && <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-6" role="alert">
        <strong className="font-bold">Error: </strong>
        <span className="block sm:inline">{error}</span>
      </div>}
      
      <div className="space-y-8">
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <label htmlFor="projectName" className="block text-lg font-medium text-white mb-2">Project Name</label>
          <input
            type="text" id="projectName" value={projectName} onChange={(e) => setProjectName(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded-md py-2 px-3 text-white focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g., My Awesome YouTube Video"
          />
        </div>

        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label htmlFor="category" className="block text-lg font-medium text-white mb-2">Category</label>
            <select id="category" value={category || ''} onChange={(e) => setCategory(e.target.value || null)} className="w-full bg-slate-900 border border-slate-600 rounded-md py-2.5 px-3 text-white focus:ring-2 focus:ring-indigo-500">
              <option value="">Select category...</option>
              {Object.keys(VIDEO_STYLES).map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="genre" className="block text-lg font-medium text-white mb-2">Genre</label>
            <select id="genre" value={genre || ''} onChange={(e) => setGenre(e.target.value || null)} disabled={!category} className="w-full bg-slate-900 border border-slate-600 rounded-md py-2.5 px-3 text-white focus:ring-2 focus:ring-indigo-500 disabled:opacity-50">
              <option value="">Select genre...</option>
              {category && VIDEO_STYLES[category as keyof typeof VIDEO_STYLES]?.map(gen => <option key={gen} value={gen}>{gen}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="duration" className="block text-lg font-medium text-white mb-2">Duration</label>
            <select id="duration" value={duration || ''} onChange={(e) => setDuration(e.target.value ? parseInt(e.target.value) : null)} className="w-full bg-slate-900 border border-slate-600 rounded-md py-2.5 px-3 text-white focus:ring-2 focus:ring-indigo-500">
              <option value="">Select length...</option>
              {durationOptions.map(d => <option key={d} value={d}>{d} seconds</option>)}
            </select>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <h3 className="text-lg font-medium text-white mb-4">Upload Source Files</h3>
          <div onDrop={handleDrop} onDragOver={handleDragEvents} onDragEnter={handleDragEvents} onDragLeave={handleDragEvents} className={`flex justify-center items-center w-full p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDragging ? 'border-indigo-500 bg-slate-700' : 'border-slate-600 hover:border-slate-500'}`}>
            <input type="file" id="file-upload" multiple onChange={handleFileChange} className="hidden" accept={acceptedFileTypes}/>
            <label htmlFor="file-upload" className="text-center cursor-pointer">
              <UploadIcon />
              <p className="mt-2 text-slate-400"><span className="font-semibold text-indigo-400">Click to upload</span> or drag and drop</p>
              <p className="text-xs text-slate-500">PDF, DOCX, TXT, PNG, JPG</p>
            </label>
          </div>

          {files.length > 0 && (
            <div className="mt-6">
              <h4 className="font-semibold text-white">Uploaded Files:</h4>
              <ul className="mt-2 space-y-2">
                {files.map(({ file }) => (
                  <li key={file.name} className="flex justify-between items-center bg-slate-700 p-3 rounded-md">
                    <span className="text-sm text-slate-300 truncate">{file.name}</span>
                    <button onClick={() => removeFile(file.name)} className="text-slate-400 hover:text-red-500"><TrashIcon /></button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button onClick={summarizeAndProceed} disabled={isLoading || files.length === 0 || !category || !genre || !duration} className="flex items-center justify-center bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-900 disabled:cursor-not-allowed disabled:text-slate-400 transition-colors">
            {isLoading ? ( <><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Summarizing...</> ) : 'Summarize & Proceed'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;
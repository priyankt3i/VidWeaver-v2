import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import UploadPage from './pages/UploadPage';
import ScriptPage from './pages/ScriptPage';
import GeneratePage from './pages/GeneratePage';
import { useApp } from './hooks/useAppContext';
import { Stage } from './types';
import VoiceSelectionModal from './components/VoiceSelectionModal';

const App: React.FC = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const { stage } = useApp();

  const renderCurrentStage = () => {
    switch (stage) {
      case Stage.UPLOAD:
        return <UploadPage />;
      case Stage.SCRIPT:
        return <ScriptPage />;
      case Stage.GENERATE:
        return <GeneratePage />;
      default:
        return <UploadPage />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-300 font-sans">
      <Sidebar isOpen={isSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(!isSidebarOpen)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {renderCurrentStage()}
        </main>
      </div>
      <VoiceSelectionModal />
    </div>
  );
};

export default App;
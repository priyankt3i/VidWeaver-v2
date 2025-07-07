import React from 'react';
import { useApp } from '../hooks/useAppContext';
import { NAV_ITEMS } from '../constants';
import { Stage } from '../types';

interface SidebarProps {
  isOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const { stage, navigateToStage, files, script } = useApp();

  const isStageDisabled = (targetStage: Stage) => {
    if (targetStage === Stage.SCRIPT) return files.length === 0;
    if (targetStage === Stage.GENERATE) return !script;
    return false;
  };

  return (
    <aside className={`bg-slate-800 text-slate-300 transition-all duration-300 ease-in-out ${isOpen ? 'w-64' : 'w-0'} overflow-hidden flex-shrink-0`}>
      <div className="p-4">
        <h2 className="text-2xl font-bold text-white mb-8 mt-2">🎬 VidWeaver</h2>
        <nav>
          <ul>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = stage === item.id;
              const isDisabled = isStageDisabled(item.id);
              return (
                <li key={item.id} className="mb-2">
                  <button
                    onClick={() => !isDisabled && navigateToStage(item.id)}
                    disabled={isDisabled}
                    className={`
                      flex items-center w-full text-left p-3 rounded-lg transition-colors
                      ${isActive ? 'bg-slate-700 text-white' : 'hover:bg-slate-700'}
                      ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    <Icon />
                    <span className="ml-4 font-semibold">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;

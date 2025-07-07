import React from 'react';
import { useApp } from '../hooks/useAppContext';
import { HamburgerIcon, KebabIcon } from './Icons';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { projectName } = useApp();

  return (
    <header className="flex-shrink-0 bg-slate-800 border-b border-slate-700">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center">
          <button onClick={onMenuClick} className="text-slate-400 hover:text-white mr-4 lg:hidden">
            <HamburgerIcon />
          </button>
          <h1 className="text-xl font-semibold text-white">{projectName}</h1>
        </div>
        <div className="relative">
          <button className="text-slate-400 hover:text-white">
            <KebabIcon />
          </button>
          {/* Dropdown menu can be added here */}
        </div>
      </div>
    </header>
  );
};

export default Header;

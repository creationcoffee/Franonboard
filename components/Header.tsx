import React from 'react';
import { User } from '../types';

interface HeaderProps {
  progress: number;
  currentUser: User | null;
  onLogout: () => void;
  showAdminLink?: boolean;
  onAdminClick?: () => void;
}

const Logo: React.FC = () => (
  <div className="flex items-center justify-center h-10 w-10 bg-gray-900 border-2 border-amber-600 rounded-full">
    <span className="text-amber-600 text-2xl font-black" style={{fontFamily: 'serif'}}>C</span>
  </div>
);

const Header: React.FC<HeaderProps> = ({ progress, currentUser, onLogout, showAdminLink, onAdminClick }) => {
  return (
    <header className="bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50 shadow-md shadow-black/20">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Logo />
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Creation Coffee <span className="font-light text-gray-400 hidden sm:inline">Franchise Onboarding</span>
            </h1>
          </div>
          {currentUser && (
            <div className="flex items-center space-x-2 sm:space-x-4">
              {showAdminLink && (
                <button
                  onClick={onAdminClick}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-all shadow-lg shadow-amber-900/20 flex items-center gap-1 sm:gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="hidden xs:inline">Admin Dashboard</span>
                  <span className="inline xs:hidden">Admin</span>
                </button>
              )}
              <span className="text-gray-300 hidden md:block text-sm">
                Welcome, <span className="font-semibold text-white">{currentUser.name}</span>
              </span>
              <button
                onClick={onLogout}
                className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-gray-400 hover:text-white transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="w-full bg-gray-700 h-1">
        <div 
          className="bg-amber-600 h-1 transition-all duration-500 ease-out" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </header>
  );
};

export default Header;

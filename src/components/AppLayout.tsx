import React from 'react';
import { motion } from 'motion/react';
import { Sidebar } from './layout/Sidebar';
import { Navbar } from './layout/Navbar';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

export const AppLayout = ({ children, activeTab, setActiveTab, isDarkMode, toggleDarkMode }: LayoutProps) => {
  return (
    <div className={`flex h-screen overflow-hidden ${isDarkMode ? 'dark' : ''}`}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 dark:bg-slate-950">
        <Navbar activeTab={activeTab} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />

        <div className="flex-1 overflow-y-auto p-8">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
};

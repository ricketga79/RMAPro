import { useState, useEffect } from 'react';
import { AppLayout } from './components/AppLayout';
import { Dashboard } from './components/Dashboard';
import { Suppliers } from './components/Suppliers';
import { Inventory } from './components/Inventory';
import { Customers } from './components/Customers';
import { RMAManagement } from './components/RMAManagement';
import { SupplierRMAManagement } from './components/SupplierRMAManagement';
import { RMAStatusManagement } from './components/RMAStatusManagement';
import { Auth } from './components/Auth';
import { supabase } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [loading, setLoading] = useState(true);

  // Sync dark mode class and localStorage
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'suppliers':
        return <Suppliers />;
      case 'inventory':
        return <Inventory />;
      case 'customers':
        return <Customers />;
      case 'management':
        return <RMAManagement />;
      case 'supplier_rma':
        return <SupplierRMAManagement />;
      case 'statuses':
        return <RMAStatusManagement />;
      default:
        return <Dashboard />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-500 dark:text-slate-400 font-medium tracking-wide">Iniciando sistema...</p>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <AppLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      isDarkMode={isDarkMode}
      toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
    >
      {renderContent()}
    </AppLayout>
  );
}

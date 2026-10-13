import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { VoiceProvider } from './context/VoiceContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import LiveCameraPage from './pages/LiveCameraPage';
import AnalyticsPage from './pages/AnalyticsPage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';
import PrivacyPage from './pages/PrivacyPage';

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  
  // Simple, reliable state & hash based router
  const [currentPage, setCurrentPage] = useState('landing');

  // Sync with window.location.hash
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').trim();
      if (hash) {
        setCurrentPage(hash);
      } else {
        setCurrentPage(isAuthenticated ? 'dashboard' : 'landing');
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isAuthenticated]);

  const handleNavigate = (page) => {
    setCurrentPage(page);
    window.location.hash = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-teal-400 font-mono text-xs">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <span>Initializing AI Vision platform...</span>
        </div>
      </div>
    );
  }

  // Determine which page component to display
  let PageComponent = LandingPage;

  if (!isAuthenticated) {
    if (currentPage === 'login') PageComponent = LoginPage;
    else if (currentPage === 'register') PageComponent = RegisterPage;
    else if (currentPage === 'privacy') PageComponent = PrivacyPage;
    else PageComponent = LandingPage;
  } else {
    // Authenticated users default to dashboard if landing/login/register was requested
    if (currentPage === 'landing' || currentPage === 'login' || currentPage === 'register') {
      PageComponent = DashboardPage;
    } else if (currentPage === 'live') {
      PageComponent = LiveCameraPage;
    } else if (currentPage === 'analytics') {
      PageComponent = AnalyticsPage;
    } else if (currentPage === 'history') {
      PageComponent = HistoryPage;
    } else if (currentPage === 'settings') {
      PageComponent = SettingsPage;
    } else if (currentPage === 'privacy') {
      PageComponent = PrivacyPage;
    } else {
      PageComponent = DashboardPage;
    }
  }

  return (
    <VoiceProvider onNavigate={handleNavigate}>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-teal-500 selection:text-white">
        <Navbar currentPage={currentPage} onNavigate={handleNavigate} />

        <div className="flex-1 flex">
          {isAuthenticated && (
            <Sidebar currentPage={currentPage} onNavigate={handleNavigate} />
          )}

          <main className="flex-1 overflow-x-hidden min-h-[calc(100vh-65px)]">
            <PageComponent onNavigate={handleNavigate} />
          </main>
        </div>
      </div>
    </VoiceProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

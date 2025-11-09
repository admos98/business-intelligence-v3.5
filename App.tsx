import React, { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import ShoppingView from './pages/ShoppingView';
import AnalysisDashboard from './pages/AnalysisDashboard';
import VendorsDashboard from './pages/VendorsDashboard';
import SummaryDashboard from './pages/SummaryDashboard';
import ItemsDashboard from './pages/ItemsDashboard';
import LoginPage from './pages/LoginPage';
import { ToastProvider } from './components/common/Toast';
import { useTheme } from './hooks/useTheme';
import { useShoppingStore } from './store/useShoppingStore';
import { t } from './translations';
import { logoSvg } from './assets/logo';

type View = 'dashboard' | 'list' | 'analysis' | 'vendors' | 'summary' | 'items';

const App: React.FC = () => {
  const [view, setView] = useState<View>('dashboard');
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const { currentUser, login, logout, hydrateFromCloud, isHydrating } = useShoppingStore();
  useTheme();

  useEffect(() => {
    if (currentUser) {
      hydrateFromCloud();
    }
  }, [currentUser, hydrateFromCloud]);


  const handleSelectList = (listId: string) => {
    setActiveListId(listId);
    setView('list');
  };

  const handleNavigate = (targetView: View) => {
    setActiveListId(null);
    setView(targetView);
  };

  const handleLogout = () => {
    logout();
    setView('dashboard'); // Reset to default view on logout
  };

  const commonProps = {
    onLogout: handleLogout,
  };

  const renderView = () => {
    if (isHydrating) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen text-center">
            <div className="w-20 h-20 mb-4" dangerouslySetInnerHTML={{ __html: logoSvg }} />
            <h2 className="text-xl font-semibold text-primary">{t.loadingData}</h2>
            <p className="text-secondary">{t.syncingData}</p>
        </div>
      );
    }

    switch (view) {
      case 'list':
        return activeListId ? (
          <ShoppingView
            listId={activeListId}
            onBack={() => handleNavigate('dashboard')}
            {...commonProps}
          />
        ) : null;
      case 'analysis':
        return <AnalysisDashboard onBack={() => handleNavigate('dashboard')} {...commonProps} />;
      case 'vendors':
        return <VendorsDashboard onBack={() => handleNavigate('dashboard')} {...commonProps} />;
      case 'items':
        return <ItemsDashboard onBack={() => handleNavigate('dashboard')} {...commonProps} />;
      case 'summary':
        return <SummaryDashboard onBack={() => handleNavigate('dashboard')} {...commonProps} />;
      case 'dashboard':
      default:
        return (
          <Dashboard
            onSelectList={handleSelectList}
            onViewAnalysis={() => handleNavigate('analysis')}
            onViewVendors={() => handleNavigate('vendors')}
            onViewItems={() => handleNavigate('items')}
            onViewSummary={() => handleNavigate('summary')}
            {...commonProps}
          />
        );
    }
  };

  if (!currentUser) {
    return (
      <ToastProvider>
        <div className="min-h-screen bg-background text-primary font-sans">
          <LoginPage onLogin={login} />
        </div>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-background text-primary font-sans">
        {renderView()}
      </div>
    </ToastProvider>
  );
};

export default App;

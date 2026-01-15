import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { LoginForm } from './components/LoginForm';
import { DateRangePicker } from './components/DateRangePicker';
import { LineFilter } from './components/LineFilter';
import { Timeline } from './components/Timeline';
import { ToastContainer } from './components/Toast';
import { AdminPanel } from './components/AdminPanel';
import { useOrders } from './hooks/useOrders';
import { getDefaultDateRange } from './utils/dates';
import { DateRange, PRODUCTION_LINES, ProductionLine } from './types';

const queryClient = new QueryClient();

function Dashboard() {
  const { user, logout } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);
  const [selectedLines, setSelectedLines] = useState<Set<ProductionLine>>(
    () => new Set(PRODUCTION_LINES)
  );
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const { data: orders = [], isLoading, error } = useOrders(dateRange);

  return (
    <div className="dashboard">
      <header className="header">
        <h1>Zlecenia Produkcyjne</h1>
        <div className="header-right">
          {user?.is_admin && (
            <button onClick={() => setShowAdminPanel(true)} className="btn-admin">
              Zarządzaj użytkownikami
            </button>
          )}
          <span>Zalogowany: {user?.display_name || user?.username}</span>
          <button onClick={logout} className="btn-logout">Wyloguj</button>
        </div>
      </header>

      {showAdminPanel && <AdminPanel onClose={() => setShowAdminPanel(false)} />}

      <main className="main">
        <div className="controls">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <LineFilter selectedLines={selectedLines} onChange={setSelectedLines} />
          <span className="order-count">Znaleziono: {orders.length} zleceń</span>
        </div>

        {error && (
          <div className="error-message">
            Błąd: {error instanceof Error ? error.message : 'Nieznany błąd'}
          </div>
        )}

        <Timeline orders={orders} dateRange={dateRange} isLoading={isLoading} selectedLines={selectedLines} />
      </main>
    </div>
  );
}

function AppContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="loading-screen">Ładowanie...</div>;
  }

  if (!user) {
    return <LoginForm />;
  }

  return <Dashboard />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <AppContent />
          <ToastContainer />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

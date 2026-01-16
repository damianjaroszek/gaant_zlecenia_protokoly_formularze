import { useState, useEffect, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoginForm } from './components/LoginForm';
import { DateRangePicker } from './components/DateRangePicker';
import { LineFilter } from './components/LineFilter';
import { Timeline } from './components/Timeline';
import { ToastContainer } from './components/Toast';
import { AdminPanel } from './components/AdminPanel';
import { ThemeToggle } from './components/ThemeToggle';
import { useOrders } from './hooks/useOrders';
import { getDefaultDateRange } from './utils/dates';
import { getProductionLines } from './api/client';
import { DateRange, ProductionLine } from './types';

const queryClient = new QueryClient();

function Dashboard() {
  const { user, logout } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);
  const [availableLines, setAvailableLines] = useState<number[]>([]);
  const [selectedLines, setSelectedLines] = useState<Set<ProductionLine>>(new Set());
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [linesLoading, setLinesLoading] = useState(true);
  const { data: orders = [], isLoading, error } = useOrders(dateRange);

  const loadLines = useCallback(async () => {
    try {
      setLinesLoading(true);
      const lines = await getProductionLines();
      const lineNumbers = lines.map(l => l.line_number);
      setAvailableLines(lineNumbers);
      // Zaznacz wszystkie dostępne linie
      setSelectedLines(new Set(lineNumbers));
    } catch (err) {
      console.error('Błąd ładowania linii:', err);
    } finally {
      setLinesLoading(false);
    }
  }, []);

  // Ładuj linie przy każdej zmianie użytkownika (np. po zalogowaniu)
  useEffect(() => {
    loadLines();
  }, [loadLines, user?.id]);

  return (
    <div className="dashboard">
      <header className="header">
        <h1>Zlecenia Produkcyjne</h1>
        <div className="header-right">
          {user?.is_admin && (
            <button onClick={() => setShowAdminPanel(true)} className="btn-admin">
              Administracja
            </button>
          )}
          <span>Zalogowany: {user?.display_name || user?.username}</span>
          <ThemeToggle />
          <button onClick={logout} className="btn-logout">Wyloguj</button>
        </div>
      </header>

      {showAdminPanel && (
        <AdminPanel
          onClose={() => setShowAdminPanel(false)}
          onLinesChanged={loadLines}
        />
      )}

      <main className="main">
        <div className="controls">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <LineFilter
            selectedLines={selectedLines}
            availableLines={availableLines}
            onChange={setSelectedLines}
          />
          <span className="order-count">Znaleziono: {orders.length} zleceń</span>
        </div>

        {error && (
          <div className="error-message">
            Błąd: {error instanceof Error ? error.message : 'Nieznany błąd'}
          </div>
        )}

        {linesLoading ? (
          <div className="timeline-loading">Ładowanie linii...</div>
        ) : (
          <Timeline
            orders={orders}
            dateRange={dateRange}
            isLoading={isLoading}
            selectedLines={selectedLines}
            availableLines={availableLines}
          />
        )}
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
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ToastProvider>
              <AppContent />
              <ToastContainer />
            </ToastProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

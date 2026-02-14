import { useState, useEffect } from 'react';
import { AdminUser, ProductionLineConfig } from '../../types';
import { getUsers, getAllLines, getDatabaseInfo, DatabaseInfo } from '../../api/client';
import { UsersTab } from './UsersTab';
import { LinesTab } from './LinesTab';
import { DatabaseTab } from './DatabaseTab';
import { TabType, AdminPanelProps } from './types';
import '../AdminPanel.css';

export function AdminPanel({ onClose, onLinesChanged }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [lines, setLines] = useState<ProductionLineConfig[]>([]);
  const [dbInfo, setDbInfo] = useState<DatabaseInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'lines') {
      loadLines();
    } else if (activeTab === 'database') {
      loadDbInfo();
    }
  }, [activeTab]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const data = await getUsers();
      setUsers(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd ładowania użytkowników');
    } finally {
      setIsLoading(false);
    }
  };

  const loadLines = async () => {
    try {
      setIsLoading(true);
      const data = await getAllLines();
      setLines(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd ładowania linii');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDbInfo = async () => {
    try {
      setIsLoading(true);
      const data = await getDatabaseInfo();
      setDbInfo(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd ładowania informacji o bazie');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-overlay" onClick={onClose}>
      <div className="admin-panel" onClick={e => e.stopPropagation()}>
        <div className="admin-header">
          <h2>Panel administracyjny</h2>
          <button className="admin-close" onClick={onClose}>&times;</button>
        </div>

        <div className="admin-tabs">
          <button
            className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Użytkownicy
          </button>
          <button
            className={`admin-tab ${activeTab === 'lines' ? 'active' : ''}`}
            onClick={() => setActiveTab('lines')}
          >
            Linie produkcyjne
          </button>
          <button
            className={`admin-tab ${activeTab === 'database' ? 'active' : ''}`}
            onClick={() => setActiveTab('database')}
          >
            Baza danych
          </button>
        </div>

        {error && <div className="admin-error">{error}</div>}

        <div className="admin-content">
          {isLoading ? (
            <div className="admin-loading">Ładowanie...</div>
          ) : activeTab === 'users' ? (
            <UsersTab
              users={users}
              setUsers={setUsers}
              lines={lines}
              setLines={setLines}
            />
          ) : activeTab === 'lines' ? (
            <LinesTab
              lines={lines}
              setLines={setLines}
              onLinesChanged={onLinesChanged}
            />
          ) : (
            <DatabaseTab dbInfo={dbInfo} />
          )}
        </div>
      </div>
    </div>
  );
}

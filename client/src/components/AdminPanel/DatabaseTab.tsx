import { DatabaseInfo } from '../../api/client';

interface DatabaseTabProps {
  dbInfo: DatabaseInfo | null;
}

export function DatabaseTab({ dbInfo }: DatabaseTabProps) {
  if (!dbInfo) {
    return <div className="admin-loading">Brak danych o bazie</div>;
  }

  return (
    <div className="database-info">
      <h3>Informacje o połączeniu z bazą danych</h3>
      <div className="db-info-grid">
        <div className="db-info-item">
          <span className="db-info-label">Nazwa bazy danych:</span>
          <span className="db-info-value">{dbInfo.database}</span>
        </div>
        <div className="db-info-item">
          <span className="db-info-label">Użytkownik:</span>
          <span className="db-info-value">{dbInfo.user}</span>
        </div>
        <div className="db-info-item">
          <span className="db-info-label">Host:</span>
          <span className="db-info-value">{dbInfo.host}</span>
        </div>
        <div className="db-info-item">
          <span className="db-info-label">Port:</span>
          <span className="db-info-value">{dbInfo.port}</span>
        </div>
        <div className="db-info-item db-info-version">
          <span className="db-info-label">Wersja PostgreSQL:</span>
          <span className="db-info-value">{dbInfo.version}</span>
        </div>
      </div>
    </div>
  );
}

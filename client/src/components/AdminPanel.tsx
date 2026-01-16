import { useState, useEffect, FormEvent } from 'react';
import {
  AdminUser,
  getUsers,
  createUser,
  updateUser,
  resetUserPassword,
  getUserLines,
  setUserLines,
  getAllLines,
  createLine,
  updateLine,
  deleteLine,
} from '../api/client';
import { ProductionLineConfig } from '../types';
import { useToast } from '../context/ToastContext';
import { validatePassword, getPasswordRequirements } from '../utils/validation';
import './AdminPanel.css';

type TabType = 'users' | 'lines';

interface Props {
  onClose: () => void;
  onLinesChanged?: () => void;
}

export function AdminPanel({ onClose, onLinesChanged }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [lines, setLines] = useState<ProductionLineConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { showToast } = useToast();

  // Formularz nowego użytkownika
  const [showUserForm, setShowUserForm] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    display_name: '',
    is_admin: false,
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Formularz nowej linii
  const [showLineForm, setShowLineForm] = useState(false);
  const [lineFormData, setLineFormData] = useState({
    line_number: '',
    name: '',
  });
  const [lineFormError, setLineFormError] = useState('');

  // Reset hasła
  const [resetPasswordUser, setResetPasswordUser] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetPasswordError, setResetPasswordError] = useState('');

  // Uprawnienia do linii
  const [lineAccessUser, setLineAccessUser] = useState<AdminUser | null>(null);
  const [selectedLineIds, setSelectedLineIds] = useState<Set<number>>(new Set());
  const [isLoadingLineAccess, setIsLoadingLineAccess] = useState(false);

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    } else {
      loadLines();
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Client-side password validation
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      setFormError(passwordValidation.error || 'Nieprawidłowe hasło');
      return;
    }

    setIsSubmitting(true);

    try {
      const newUser = await createUser({
        username: formData.username,
        password: formData.password,
        display_name: formData.display_name || undefined,
        is_admin: formData.is_admin,
      });
      setUsers([...users, newUser]);
      setShowUserForm(false);
      setFormData({ username: '', password: '', display_name: '', is_admin: false });
      showToast(`Użytkownik "${newUser.username}" został utworzony`, 'success');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Błąd tworzenia użytkownika');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLineSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLineFormError('');
    setIsSubmitting(true);

    const lineNumber = parseInt(lineFormData.line_number);
    if (isNaN(lineNumber) || lineNumber < 1) {
      setLineFormError('Numer linii musi być liczbą większą od 0');
      setIsSubmitting(false);
      return;
    }

    try {
      const newLine = await createLine({
        line_number: lineNumber,
        name: lineFormData.name || undefined,
      });
      setLines([...lines, newLine]);
      setShowLineForm(false);
      setLineFormData({ line_number: '', name: '' });
      showToast(`Linia ${newLine.line_number} została dodana`, 'success');
      onLinesChanged?.();
    } catch (err) {
      setLineFormError(err instanceof Error ? err.message : 'Błąd dodawania linii');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleLineActive = async (line: ProductionLineConfig) => {
    try {
      const updated = await updateLine(line.id, { is_active: !line.is_active });
      setLines(lines.map(l => l.id === line.id ? updated : l));
      showToast(
        `Linia ${line.line_number} ${updated.is_active ? 'włączona' : 'wyłączona'}`,
        'success'
      );
      onLinesChanged?.();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Błąd aktualizacji', 'error');
    }
  };

  const handleDeleteLine = async (line: ProductionLineConfig) => {
    if (!confirm(`Czy na pewno chcesz usunąć linię ${line.line_number}?`)) {
      return;
    }

    try {
      await deleteLine(line.id);
      setLines(lines.filter(l => l.id !== line.id));
      showToast(`Linia ${line.line_number} została usunięta`, 'success');
      onLinesChanged?.();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Błąd usuwania', 'error');
    }
  };

  const handleMoveLineUp = async (line: ProductionLineConfig) => {
    const sortedLines = [...lines].sort((a, b) =>
      (a.display_order ?? 999) - (b.display_order ?? 999)
    );
    const currentIndex = sortedLines.findIndex(l => l.id === line.id);

    if (currentIndex <= 0) return;

    const lineAbove = sortedLines[currentIndex - 1];
    const currentOrder = line.display_order ?? currentIndex + 1;
    const aboveOrder = lineAbove.display_order ?? currentIndex;

    try {
      const [updatedCurrent, updatedAbove] = await Promise.all([
        updateLine(line.id, { display_order: aboveOrder }),
        updateLine(lineAbove.id, { display_order: currentOrder }),
      ]);

      setLines(lines.map(l => {
        if (l.id === line.id) return updatedCurrent;
        if (l.id === lineAbove.id) return updatedAbove;
        return l;
      }));
      onLinesChanged?.();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Błąd zmiany kolejności', 'error');
    }
  };

  const handleMoveLineDown = async (line: ProductionLineConfig) => {
    const sortedLines = [...lines].sort((a, b) =>
      (a.display_order ?? 999) - (b.display_order ?? 999)
    );
    const currentIndex = sortedLines.findIndex(l => l.id === line.id);

    if (currentIndex < 0 || currentIndex >= sortedLines.length - 1) return;

    const lineBelow = sortedLines[currentIndex + 1];
    const currentOrder = line.display_order ?? currentIndex + 1;
    const belowOrder = lineBelow.display_order ?? currentIndex + 2;

    try {
      const [updatedCurrent, updatedBelow] = await Promise.all([
        updateLine(line.id, { display_order: belowOrder }),
        updateLine(lineBelow.id, { display_order: currentOrder }),
      ]);

      setLines(lines.map(l => {
        if (l.id === line.id) return updatedCurrent;
        if (l.id === lineBelow.id) return updatedBelow;
        return l;
      }));
      onLinesChanged?.();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Błąd zmiany kolejności', 'error');
    }
  };

  const handleToggleActive = async (user: AdminUser) => {
    try {
      const updated = await updateUser(user.id, { is_active: !user.is_active });
      setUsers(users.map(u => u.id === user.id ? updated : u));
      showToast(
        `Użytkownik "${user.username}" ${updated.is_active ? 'aktywowany' : 'dezaktywowany'}`,
        'success'
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Błąd aktualizacji', 'error');
    }
  };

  const handleToggleAdmin = async (user: AdminUser) => {
    try {
      const updated = await updateUser(user.id, { is_admin: !user.is_admin });
      setUsers(users.map(u => u.id === user.id ? updated : u));
      showToast(
        `Użytkownik "${user.username}" ${updated.is_admin ? 'jest teraz administratorem' : 'nie jest już administratorem'}`,
        'success'
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Błąd aktualizacji', 'error');
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!resetPasswordUser) return;

    setResetPasswordError('');

    // Client-side password validation
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      setResetPasswordError(passwordValidation.error || 'Nieprawidłowe hasło');
      return;
    }

    setIsSubmitting(true);

    try {
      await resetUserPassword(resetPasswordUser.id, newPassword);
      showToast(`Hasło użytkownika "${resetPasswordUser.username}" zostało zresetowane`, 'success');
      setResetPasswordUser(null);
      setNewPassword('');
    } catch (err) {
      setResetPasswordError(err instanceof Error ? err.message : 'Błąd resetowania hasła');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleOpenLineAccess = async (user: AdminUser) => {
    setLineAccessUser(user);
    setIsLoadingLineAccess(true);

    try {
      // Ładuj linie jeśli jeszcze nie załadowane
      if (lines.length === 0) {
        const allLines = await getAllLines();
        setLines(allLines);
      }

      // Pobierz aktualne uprawnienia użytkownika
      const userLines = await getUserLines(user.id);
      setSelectedLineIds(new Set(userLines.map(l => l.id)));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Błąd ładowania uprawnień', 'error');
      setLineAccessUser(null);
    } finally {
      setIsLoadingLineAccess(false);
    }
  };

  const handleToggleLineAccess = (lineId: number) => {
    setSelectedLineIds(prev => {
      const next = new Set(prev);
      if (next.has(lineId)) {
        next.delete(lineId);
      } else {
        next.add(lineId);
      }
      return next;
    });
  };

  const handleSaveLineAccess = async () => {
    if (!lineAccessUser) return;

    setIsSubmitting(true);
    try {
      await setUserLines(lineAccessUser.id, Array.from(selectedLineIds));
      showToast(`Uprawnienia użytkownika "${lineAccessUser.username}" zostały zapisane`, 'success');
      setLineAccessUser(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Błąd zapisywania uprawnień', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderUsersTab = () => (
    <>
      <div className="admin-toolbar">
        <button
          className="btn-add-user"
          onClick={() => setShowUserForm(!showUserForm)}
        >
          {showUserForm ? 'Anuluj' : '+ Nowy użytkownik'}
        </button>
      </div>

      {showUserForm && (
        <form className="user-form" onSubmit={handleSubmit}>
          <h3>Nowy użytkownik</h3>
          {formError && <div className="form-error">{formError}</div>}

          <div className="form-row">
            <label>
              Login *
              <input
                type="text"
                value={formData.username}
                onChange={e => setFormData({...formData, username: e.target.value})}
                required
                minLength={3}
                autoFocus
              />
            </label>
            <label>
              Hasło *
              <input
                type="password"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                required
                minLength={8}
                placeholder={getPasswordRequirements()}
              />
            </label>
          </div>

          <div className="form-row">
            <label>
              Nazwa wyświetlana
              <input
                type="text"
                value={formData.display_name}
                onChange={e => setFormData({...formData, display_name: e.target.value})}
                placeholder="Opcjonalne"
              />
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.is_admin}
                onChange={e => setFormData({...formData, is_admin: e.target.checked})}
              />
              Administrator
            </label>
          </div>

          <div className="form-actions">
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Tworzenie...' : 'Utwórz użytkownika'}
            </button>
          </div>
        </form>
      )}

      <table className="users-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Login</th>
            <th>Nazwa</th>
            <th>Admin</th>
            <th>Aktywny</th>
            <th>Utworzony</th>
            <th>Akcje</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id} className={!user.is_active ? 'inactive' : ''}>
              <td>{user.id}</td>
              <td>{user.username}</td>
              <td>{user.display_name || '-'}</td>
              <td>
                <span className={`badge ${user.is_admin ? 'badge-admin' : ''}`}>
                  {user.is_admin ? 'Tak' : 'Nie'}
                </span>
              </td>
              <td>
                <span className={`badge ${user.is_active ? 'badge-active' : 'badge-inactive'}`}>
                  {user.is_active ? 'Tak' : 'Nie'}
                </span>
              </td>
              <td>{formatDate(user.created_at)}</td>
              <td className="actions">
                <button
                  className="btn-action"
                  onClick={() => handleToggleAdmin(user)}
                  title={user.is_admin ? 'Odbierz uprawnienia admina' : 'Nadaj uprawnienia admina'}
                >
                  {user.is_admin ? 'Odbierz admin' : 'Nadaj admin'}
                </button>
                <button
                  className="btn-action"
                  onClick={() => handleToggleActive(user)}
                  title={user.is_active ? 'Dezaktywuj konto' : 'Aktywuj konto'}
                >
                  {user.is_active ? 'Dezaktywuj' : 'Aktywuj'}
                </button>
                <button
                  className="btn-action btn-reset-password"
                  onClick={() => {
                    setResetPasswordUser(user);
                    setNewPassword('');
                    setResetPasswordError('');
                  }}
                  title="Resetuj hasło"
                >
                  Resetuj hasło
                </button>
                {!user.is_admin && (
                  <button
                    className="btn-action btn-line-access"
                    onClick={() => handleOpenLineAccess(user)}
                    title="Zarządzaj dostępem do linii"
                  >
                    Linie
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {resetPasswordUser && (
        <div className="modal-overlay" onClick={() => setResetPasswordUser(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Resetuj hasło: {resetPasswordUser.username}</h3>
            <form onSubmit={handleResetPassword}>
              {resetPasswordError && <div className="form-error">{resetPasswordError}</div>}
              <div className="form-row">
                <label>
                  Nowe hasło *
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    autoFocus
                    placeholder={getPasswordRequirements()}
                  />
                </label>
              </div>
              <div className="form-actions modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setResetPasswordUser(null)}
                >
                  Anuluj
                </button>
                <button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Zapisywanie...' : 'Zapisz hasło'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {lineAccessUser && (
        <div className="modal-overlay" onClick={() => setLineAccessUser(null)}>
          <div className="modal-content modal-line-access" onClick={e => e.stopPropagation()}>
            <h3>Dostęp do linii: {lineAccessUser.username}</h3>
            {isLoadingLineAccess ? (
              <div className="admin-loading">Ładowanie...</div>
            ) : (
              <>
                <p className="modal-hint">Zaznacz linie, do których użytkownik ma mieć dostęp:</p>
                <div className="line-access-grid">
                  {[...lines]
                    .sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999))
                    .map(line => (
                      <label key={line.id} className="line-access-item">
                        <input
                          type="checkbox"
                          checked={selectedLineIds.has(line.id)}
                          onChange={() => handleToggleLineAccess(line.id)}
                        />
                        <span className="line-access-label">
                          <strong>{line.line_number}</strong>
                          {line.name && <span className="line-name">{line.name}</span>}
                        </span>
                      </label>
                    ))}
                </div>
                <div className="form-actions modal-actions">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => setLineAccessUser(null)}
                  >
                    Anuluj
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveLineAccess}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Zapisywanie...' : 'Zapisz uprawnienia'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );

  const renderLinesTab = () => {
    const sortedLines = [...lines].sort((a, b) =>
      (a.display_order ?? 999) - (b.display_order ?? 999)
    );

    return (
      <>
        <div className="admin-toolbar">
          <button
            className="btn-add-user"
            onClick={() => setShowLineForm(!showLineForm)}
          >
            {showLineForm ? 'Anuluj' : '+ Nowa linia'}
          </button>
        </div>

        {showLineForm && (
          <form className="user-form" onSubmit={handleLineSubmit}>
            <h3>Nowa linia produkcyjna</h3>
            {lineFormError && <div className="form-error">{lineFormError}</div>}

            <div className="form-row">
              <label>
                Numer linii *
                <input
                  type="number"
                  value={lineFormData.line_number}
                  onChange={e => setLineFormData({...lineFormData, line_number: e.target.value})}
                  required
                  min={1}
                  max={999}
                  autoFocus
                />
              </label>
              <label>
                Nazwa (opcjonalna)
                <input
                  type="text"
                  value={lineFormData.name}
                  onChange={e => setLineFormData({...lineFormData, name: e.target.value})}
                  placeholder="np. Linia pakowania"
                />
              </label>
            </div>

            <div className="form-actions">
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Dodawanie...' : 'Dodaj linię'}
              </button>
            </div>
          </form>
        )}

        <table className="users-table">
          <thead>
            <tr>
              <th>Numer</th>
              <th>Nazwa</th>
              <th>Aktywna</th>
              <th>Kolejność</th>
              <th>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {sortedLines.map((line, index) => (
              <tr key={line.id} className={!line.is_active ? 'inactive' : ''}>
                <td><strong>{line.line_number}</strong></td>
                <td>{line.name || '-'}</td>
                <td>
                  <span className={`badge ${line.is_active ? 'badge-active' : 'badge-inactive'}`}>
                    {line.is_active ? 'Tak' : 'Nie'}
                  </span>
                </td>
                <td className="order-cell">
                  <div className="order-controls">
                    <button
                      className="btn-order"
                      onClick={() => handleMoveLineUp(line)}
                      disabled={index === 0}
                      title="Przesuń w górę"
                    >
                      ▲
                    </button>
                    <span className="order-value">{line.display_order ?? '-'}</span>
                    <button
                      className="btn-order"
                      onClick={() => handleMoveLineDown(line)}
                      disabled={index === sortedLines.length - 1}
                      title="Przesuń w dół"
                    >
                      ▼
                    </button>
                  </div>
                </td>
                <td className="actions">
                  <button
                    className="btn-action"
                    onClick={() => handleToggleLineActive(line)}
                    title={line.is_active ? 'Wyłącz linię' : 'Włącz linię'}
                  >
                    {line.is_active ? 'Wyłącz' : 'Włącz'}
                  </button>
                  <button
                    className="btn-action btn-delete"
                    onClick={() => handleDeleteLine(line)}
                    title="Usuń linię"
                  >
                    Usuń
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
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
        </div>

        {error && <div className="admin-error">{error}</div>}

        <div className="admin-content">
          {isLoading ? (
            <div className="admin-loading">Ładowanie...</div>
          ) : (
            activeTab === 'users' ? renderUsersTab() : renderLinesTab()
          )}
        </div>
      </div>
    </div>
  );
}

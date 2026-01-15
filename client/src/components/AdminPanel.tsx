import { useState, useEffect, FormEvent } from 'react';
import { AdminUser, getUsers, createUser, updateUser } from '../api/client';
import { useToast } from '../context/ToastContext';
import './AdminPanel.css';

interface Props {
  onClose: () => void;
}

export function AdminPanel({ onClose }: Props) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { showToast } = useToast();

  // Formularz nowego użytkownika
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    display_name: '',
    is_admin: false,
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      const newUser = await createUser({
        username: formData.username,
        password: formData.password,
        display_name: formData.display_name || undefined,
        is_admin: formData.is_admin,
      });
      setUsers([...users, newUser]);
      setShowForm(false);
      setFormData({ username: '', password: '', display_name: '', is_admin: false });
      showToast(`Użytkownik "${newUser.username}" został utworzony`, 'success');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Błąd tworzenia użytkownika');
    } finally {
      setIsSubmitting(false);
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="admin-overlay" onClick={onClose}>
      <div className="admin-panel" onClick={e => e.stopPropagation()}>
        <div className="admin-header">
          <h2>Zarządzanie użytkownikami</h2>
          <button className="admin-close" onClick={onClose}>&times;</button>
        </div>

        {error && <div className="admin-error">{error}</div>}

        <div className="admin-content">
          {isLoading ? (
            <div className="admin-loading">Ładowanie...</div>
          ) : (
            <>
              <div className="admin-toolbar">
                <button
                  className="btn-add-user"
                  onClick={() => setShowForm(!showForm)}
                >
                  {showForm ? 'Anuluj' : '+ Nowy użytkownik'}
                </button>
              </div>

              {showForm && (
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
                        minLength={4}
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

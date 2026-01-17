import { useState } from 'react';
import { AdminUser, ProductionLineConfig } from '../../types';
import { updateUser, getAllLines } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { UserForm } from './UserForm';
import { ResetPasswordModal } from './ResetPasswordModal';
import { LineAccessModal } from './LineAccessModal';

interface UsersTabProps {
  users: AdminUser[];
  setUsers: React.Dispatch<React.SetStateAction<AdminUser[]>>;
  lines: ProductionLineConfig[];
  setLines: React.Dispatch<React.SetStateAction<ProductionLineConfig[]>>;
}

export function UsersTab({ users, setUsers, lines, setLines }: UsersTabProps) {
  const [showUserForm, setShowUserForm] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<AdminUser | null>(null);
  const [lineAccessUser, setLineAccessUser] = useState<AdminUser | null>(null);
  const { showToast } = useToast();

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
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

  const handleOpenLineAccess = async (user: AdminUser) => {
    if (lines.length === 0) {
      try {
        const allLines = await getAllLines();
        setLines(allLines);
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Błąd ładowania linii', 'error');
        return;
      }
    }
    setLineAccessUser(user);
  };

  const handleUserCreated = (newUser: AdminUser) => {
    setUsers([...users, newUser]);
    setShowUserForm(false);
  };

  return (
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
        <UserForm
          onUserCreated={handleUserCreated}
          onCancel={() => setShowUserForm(false)}
        />
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
                  onClick={() => setResetPasswordUser(user)}
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
        <ResetPasswordModal
          user={resetPasswordUser}
          onClose={() => setResetPasswordUser(null)}
        />
      )}

      {lineAccessUser && (
        <LineAccessModal
          user={lineAccessUser}
          lines={lines}
          onClose={() => setLineAccessUser(null)}
        />
      )}
    </>
  );
}

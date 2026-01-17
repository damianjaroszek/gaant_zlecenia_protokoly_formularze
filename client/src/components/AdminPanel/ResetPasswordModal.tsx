import { useState, FormEvent } from 'react';
import { resetUserPassword } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { validatePassword, getPasswordRequirements } from '../../utils/validation';
import { ResetPasswordModalProps } from './types';

export function ResetPasswordModal({ user, onClose }: ResetPasswordModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.error || 'Nieprawidłowe hasło');
      return;
    }

    setIsSubmitting(true);

    try {
      await resetUserPassword(user.id, newPassword);
      showToast(`Hasło użytkownika "${user.username}" zostało zresetowane`, 'success');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd resetowania hasła');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h3>Resetuj hasło: {user.username}</h3>
        <form onSubmit={handleSubmit}>
          {error && <div className="form-error">{error}</div>}
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
              onClick={onClose}
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
  );
}

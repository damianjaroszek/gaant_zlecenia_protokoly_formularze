import { useState, FormEvent } from 'react';
import { createUser } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { validatePassword, getPasswordRequirements } from '../../utils/validation';
import { UserFormProps } from './types';

export function UserForm({ onUserCreated, onCancel }: UserFormProps) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    display_name: '',
    is_admin: false,
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');

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
      showToast(`Użytkownik "${newUser.username}" został utworzony`, 'success');
      onUserCreated(newUser);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Błąd tworzenia użytkownika');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
        <button type="button" className="btn-cancel" onClick={onCancel}>
          Anuluj
        </button>
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Tworzenie...' : 'Utwórz użytkownika'}
        </button>
      </div>
    </form>
  );
}

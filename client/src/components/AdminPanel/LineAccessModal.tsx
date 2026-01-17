import { useState, useEffect } from 'react';
import { getUserLines, setUserLines } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { LineAccessModalProps } from './types';

export function LineAccessModal({ user, lines, onClose }: LineAccessModalProps) {
  const [selectedLineIds, setSelectedLineIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    loadUserLines();
  }, [user.id]);

  const loadUserLines = async () => {
    try {
      const userLines = await getUserLines(user.id);
      setSelectedLineIds(new Set(userLines.map(l => l.id)));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Błąd ładowania uprawnień', 'error');
      onClose();
    } finally {
      setIsLoading(false);
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

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await setUserLines(user.id, Array.from(selectedLineIds));
      showToast(`Uprawnienia użytkownika "${user.username}" zostały zapisane`, 'success');
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Błąd zapisywania uprawnień', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const sortedLines = [...lines].sort((a, b) =>
    (a.display_order ?? 999) - (b.display_order ?? 999)
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-line-access" onClick={e => e.stopPropagation()}>
        <h3>Dostęp do linii: {user.username}</h3>
        {isLoading ? (
          <div className="admin-loading">Ładowanie...</div>
        ) : (
          <>
            <p className="modal-hint">Zaznacz linie, do których użytkownik ma mieć dostęp:</p>
            <div className="line-access-grid">
              {sortedLines.map(line => (
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
                onClick={onClose}
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Zapisywanie...' : 'Zapisz uprawnienia'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

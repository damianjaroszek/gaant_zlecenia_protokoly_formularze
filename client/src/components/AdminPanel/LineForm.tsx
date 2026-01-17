import { useState, FormEvent } from 'react';
import { createLine } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { LineFormProps } from './types';

export function LineForm({ onLineCreated, onCancel, onLinesChanged }: LineFormProps) {
  const [formData, setFormData] = useState({
    line_number: '',
    name: '',
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');

    const lineNumber = parseInt(formData.line_number);
    if (isNaN(lineNumber) || lineNumber < 1) {
      setFormError('Numer linii musi być liczbą większą od 0');
      return;
    }

    setIsSubmitting(true);

    try {
      const newLine = await createLine({
        line_number: lineNumber,
        name: formData.name || undefined,
      });
      showToast(`Linia ${newLine.line_number} została dodana`, 'success');
      onLineCreated(newLine);
      onLinesChanged?.();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Błąd dodawania linii');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="user-form" onSubmit={handleSubmit}>
      <h3>Nowa linia produkcyjna</h3>
      {formError && <div className="form-error">{formError}</div>}

      <div className="form-row">
        <label>
          Numer linii *
          <input
            type="number"
            value={formData.line_number}
            onChange={e => setFormData({...formData, line_number: e.target.value})}
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
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            placeholder="np. Linia pakowania"
          />
        </label>
      </div>

      <div className="form-actions">
        <button type="button" className="btn-cancel" onClick={onCancel}>
          Anuluj
        </button>
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Dodawanie...' : 'Dodaj linię'}
        </button>
      </div>
    </form>
  );
}

import { useState } from 'react';
import { ProductionLineConfig } from '../../types';
import { updateLine, deleteLine } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { LineForm } from './LineForm';

interface LinesTabProps {
  lines: ProductionLineConfig[];
  setLines: React.Dispatch<React.SetStateAction<ProductionLineConfig[]>>;
  onLinesChanged?: () => void;
}

export function LinesTab({ lines, setLines, onLinesChanged }: LinesTabProps) {
  const [showLineForm, setShowLineForm] = useState(false);
  const { showToast } = useToast();

  const sortedLines = [...lines].sort((a, b) =>
    (a.display_order ?? 999) - (b.display_order ?? 999)
  );

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

  const handleLineCreated = (newLine: ProductionLineConfig) => {
    setLines([...lines, newLine]);
    setShowLineForm(false);
  };

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
        <LineForm
          onLineCreated={handleLineCreated}
          onCancel={() => setShowLineForm(false)}
          onLinesChanged={onLinesChanged}
        />
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
}

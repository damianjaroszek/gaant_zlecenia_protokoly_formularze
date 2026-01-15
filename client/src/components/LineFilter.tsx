import { ProductionLine } from '../types';

interface Props {
  selectedLines: Set<ProductionLine>;
  availableLines: number[];
  onChange: (lines: Set<ProductionLine>) => void;
}

export function LineFilter({ selectedLines, availableLines, onChange }: Props) {
  const allSelected = selectedLines.size === availableLines.length;

  const toggleLine = (line: ProductionLine) => {
    const newSet = new Set(selectedLines);
    if (newSet.has(line)) {
      // Nie pozwól odznaczyć ostatniej linii
      if (newSet.size > 1) {
        newSet.delete(line);
      }
    } else {
      newSet.add(line);
    }
    onChange(newSet);
  };

  const toggleAll = () => {
    if (allSelected) {
      // Zostaw tylko pierwszą linię
      onChange(new Set([availableLines[0]]));
    } else {
      // Zaznacz wszystkie
      onChange(new Set(availableLines));
    }
  };

  if (availableLines.length === 0) {
    return (
      <div className="line-filter">
        <span className="line-filter-label">Brak dostępnych linii</span>
      </div>
    );
  }

  return (
    <div className="line-filter">
      <span className="line-filter-label">Linie:</span>
      <button
        className={`line-filter-btn line-filter-all ${allSelected ? 'active' : ''}`}
        onClick={toggleAll}
        title={allSelected ? 'Odznacz wszystkie' : 'Zaznacz wszystkie'}
      >
        Wszystkie
      </button>
      {availableLines.map((line) => (
        <button
          key={line}
          className={`line-filter-btn line-${line} ${selectedLines.has(line) ? 'active' : ''}`}
          onClick={() => toggleLine(line)}
        >
          {line}
        </button>
      ))}
    </div>
  );
}

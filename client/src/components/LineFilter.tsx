import { PRODUCTION_LINES, ProductionLine } from '../types';

interface Props {
  selectedLines: Set<ProductionLine>;
  onChange: (lines: Set<ProductionLine>) => void;
}

export function LineFilter({ selectedLines, onChange }: Props) {
  const allSelected = selectedLines.size === PRODUCTION_LINES.length;

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
      onChange(new Set([PRODUCTION_LINES[0]]));
    } else {
      // Zaznacz wszystkie
      onChange(new Set(PRODUCTION_LINES));
    }
  };

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
      {PRODUCTION_LINES.map((line) => (
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

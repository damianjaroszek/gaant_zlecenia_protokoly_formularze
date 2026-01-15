import { useState } from 'react';
import { DateRange } from '../types';

// UWAGA: Ta sama wartość musi być w server/src/routes/orders.ts
const MAX_DAYS = 62;

interface Props {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

function getDaysDiff(from: string, to: string): number {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const diffMs = toDate.getTime() - fromDate.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function DateRangePicker({ value, onChange }: Props) {
  const [localRange, setLocalRange] = useState<DateRange>(value);
  const [error, setError] = useState<string | null>(null);

  const handleLoad = () => {
    const days = getDaysDiff(localRange.from, localRange.to);

    if (days < 0) {
      setError('Data "Od" musi być przed datą "Do"');
      return;
    }

    if (days > MAX_DAYS) {
      setError(`Maksymalny zakres to ${MAX_DAYS} dni (wybrano ${days} dni)`);
      return;
    }

    setError(null);
    onChange(localRange);
  };

  const days = getDaysDiff(localRange.from, localRange.to);
  const isValid = days >= 0 && days <= MAX_DAYS;

  return (
    <div className="date-range-picker">
      <label>
        Od:
        <input
          type="date"
          value={localRange.from}
          onChange={(e) => setLocalRange({ ...localRange, from: e.target.value })}
        />
      </label>
      <label>
        Do:
        <input
          type="date"
          value={localRange.to}
          onChange={(e) => setLocalRange({ ...localRange, to: e.target.value })}
        />
      </label>
      <button onClick={handleLoad} className="btn-load" disabled={!isValid}>
        Wczytaj
      </button>
      {error && <span className="date-error">{error}</span>}
      {!error && days >= 0 && <span className="date-info">{days + 1} dni (max {MAX_DAYS})</span>}
    </div>
  );
}

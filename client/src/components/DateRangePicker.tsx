import { DateRange } from '../types';

interface Props {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function DateRangePicker({ value, onChange }: Props) {
  return (
    <div className="date-range-picker">
      <label>
        Od:
        <input
          type="date"
          value={value.from}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
        />
      </label>
      <label>
        Do:
        <input
          type="date"
          value={value.to}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
        />
      </label>
    </div>
  );
}

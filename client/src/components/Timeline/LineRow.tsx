import { Order, SHIFTS } from '../../types';
import { ShiftCell } from './ShiftCell';

interface Props {
  line: number;
  days: string[];
  ordersByCell: Map<string, Order[]>;
}

export function LineRow({ line, days, ordersByCell }: Props) {
  return (
    <>
      <div className={`timeline-line-label line-${line}`}>
        Linia {line}
      </div>
      {days.map((day) =>
        SHIFTS.map((shift) => {
          const key = `${day}_${shift}_${line}`;
          const orders = ordersByCell.get(key) || [];
          const hasCollision = orders.length > 1;

          return (
            <ShiftCell
              key={key}
              day={day}
              shift={shift}
              line={line}
              orders={orders}
              hasCollision={hasCollision}
            />
          );
        })
      )}
    </>
  );
}

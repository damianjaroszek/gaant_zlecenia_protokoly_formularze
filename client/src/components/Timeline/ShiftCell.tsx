import { memo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Order } from '../../types';
import { OrderBlock } from './OrderBlock';

interface Props {
  day: string;
  shift: number;
  line: number;
  orders: Order[];
  hasCollision: boolean;
  hoveredOrderId: number | null;
  onOrderHover: (orderId: number | null) => void;
  orderColorMap: Map<number, number>;
}

export const ShiftCell = memo(function ShiftCell({ day, shift, line, orders, hasCollision, hoveredOrderId, onOrderHover, orderColorMap }: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: `cell_${day}_${shift}_${line}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={`timeline-cell ${hasCollision ? 'collision' : ''} ${isOver ? 'drop-target' : ''}`}
      data-day={day}
      data-shift={shift}
      data-line={line}
    >
      {orders.map((order) => (
        <OrderBlock
          key={order.id_zlecenia}
          order={order}
          hasCollision={hasCollision}
          isHighlighted={hoveredOrderId === order.id_zlecenia}
          onHover={onOrderHover}
          colorIndex={orderColorMap.get(order.id_zlecenia) ?? 0}
        />
      ))}
    </div>
  );
});

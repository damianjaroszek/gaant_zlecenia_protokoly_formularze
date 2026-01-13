import { useMemo, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  pointerWithin,
} from '@dnd-kit/core';
import { Order, PRODUCTION_LINES, SHIFTS } from '../../types';
import { getDaysInRange, formatDisplayDate } from '../../utils/dates';
import { useUpdateOrderLine } from '../../hooks/useOrders';
import { LineRow } from './LineRow';
import { OrderBlock } from './OrderBlock';
import './Timeline.css';

interface Props {
  orders: Order[];
  dateRange: { from: string; to: string };
  isLoading: boolean;
}

export function Timeline({ orders, dateRange, isLoading }: Props) {
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const updateOrderLine = useUpdateOrderLine();

  const days = useMemo(
    () => getDaysInRange(dateRange.from, dateRange.to),
    [dateRange.from, dateRange.to]
  );

  // Normalizuj datę z ISO do YYYY-MM-DD w lokalnej strefie czasowej
  const normalizeDate = (isoDate: string): string => {
    const date = new Date(isoDate);
    return date.toLocaleDateString('sv-SE'); // format YYYY-MM-DD
  };

  // Grupowanie zleceń: { "2025-01-15_1_3": [order1, order2] }
  // klucz: data_zmiana_linia
  const ordersByCell = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const order of orders) {
      if (order.liniapm === null) continue;
      const dateOnly = normalizeDate(order.data_realizacji);
      const key = `${dateOnly}_${order.zmiana}_${order.liniapm}`;
      const existing = map.get(key) || [];
      existing.push(order);
      map.set(key, existing);
    }
    return map;
  }, [orders]);

  const handleDragStart = (event: DragStartEvent) => {
    const order = orders.find((o) => o.id_zlecenia === event.active.id);
    setActiveOrder(order || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveOrder(null);

    const { active, over } = event;
    if (!over) return;

    // over.id format: "cell_DATA_ZMIANA_LINIA"
    const overId = String(over.id);
    if (!overId.startsWith('cell_')) return;

    const [, , , newLine] = overId.split('_');
    const order = orders.find((o) => o.id_zlecenia === active.id);

    if (!order) return;

    // Walidacja: inna linia
    if (String(order.liniapm) === newLine) {
      console.log('Drop rejected: same line');
      return;
    }

    console.log('Updating order:', order.id_zlecenia, 'to line:', newLine);
    updateOrderLine.mutate({
      id_zlecenia: order.id_zlecenia,
      new_line: Number(newLine),
    });
  };

  if (isLoading) {
    return <div className="timeline-loading">Ładowanie zleceń...</div>;
  }

  const totalShiftColumns = days.length * SHIFTS.length;

  return (
    <DndContext
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="timeline-container">
        <div
          className="timeline-grid"
          style={{
            gridTemplateColumns: `120px repeat(${totalShiftColumns}, minmax(80px, 1fr))`,
          }}
        >
          {/* Nagłówek - dni */}
          <div className="timeline-header-corner">Linia</div>
          {days.map((day) => (
            <div key={day} className="timeline-header-day" style={{ gridColumn: `span ${SHIFTS.length}` }}>
              {formatDisplayDate(day)}
            </div>
          ))}

          {/* Nagłówek - zmiany */}
          <div className="timeline-subheader-corner"></div>
          {days.map((day) =>
            SHIFTS.map((shift) => (
              <div key={`${day}_${shift}`} className="timeline-header-shift">
                Zm. {shift}
              </div>
            ))
          )}

          {/* Wiersze linii produkcyjnych */}
          {PRODUCTION_LINES.map((line) => (
            <LineRow
              key={line}
              line={line}
              days={days}
              ordersByCell={ordersByCell}
            />
          ))}
        </div>

        {/* Legenda */}
        <div className="timeline-legend">
          <span className="legend-title">Linie:</span>
          {PRODUCTION_LINES.map((line) => (
            <span key={line} className={`legend-item line-${line}`}>
              {line}
            </span>
          ))}
        </div>
      </div>

      {/* Overlay podczas przeciągania */}
      <DragOverlay>
        {activeOrder && (
          <OrderBlock order={activeOrder} hasCollision={false} isDragging />
        )}
      </DragOverlay>
    </DndContext>
  );
}

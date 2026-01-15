import { useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
} from '@dnd-kit/core';
import { Order, PRODUCTION_LINES, ProductionLine, SHIFTS } from '../../types';
import { getDaysInRange, formatDisplayDate } from '../../utils/dates';
import { useUpdateOrderLine } from '../../hooks/useOrders';
import { useToast } from '../../context/ToastContext';
import { LineRow } from './LineRow';
import { OrderBlock } from './OrderBlock';
import './Timeline.css';

interface Props {
  orders: Order[];
  dateRange: { from: string; to: string };
  isLoading: boolean;
  selectedLines: Set<ProductionLine>;
}

export function Timeline({ orders, dateRange, isLoading, selectedLines }: Props) {
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const updateOrderLine = useUpdateOrderLine();
  const { showToast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const savedScrollLeft = useRef(0);

  // Sensor z dystansem aktywacji - wymusza przesunięcie przed rozpoczęciem drag
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Wymagane przesunięcie o 8px przed aktywacją
      },
    })
  );

  const days = useMemo(
    () => getDaysInRange(dateRange.from, dateRange.to),
    [dateRange.from, dateRange.to]
  );

  // Filtruj linie na podstawie wyboru użytkownika
  const visibleLines = useMemo(
    () => PRODUCTION_LINES.filter((line) => selectedLines.has(line)),
    [selectedLines]
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

  // Oblicz maksymalną liczbę zleceń dla każdej linii
  const maxOrdersPerLine = useMemo(() => {
    const lineMaxMap = new Map<number, number>();
    for (const line of visibleLines) {
      let maxForLine = 1;
      for (const day of days) {
        for (const shift of SHIFTS) {
          const key = `${day}_${shift}_${line}`;
          const count = ordersByCell.get(key)?.length || 0;
          if (count > maxForLine) maxForLine = count;
        }
      }
      lineMaxMap.set(line, maxForLine);
    }
    return lineMaxMap;
  }, [ordersByCell, days, visibleLines]);

  // Generuj wysokości wierszy: nagłówek dni, nagłówek zmian, potem linie
  // WAŻNE: Ten hook musi być przed warunkowym return!
  const rowHeights = useMemo(() => {
    const baseHeight = 8; // padding komórki (4px × 2)
    const orderHeight = 46; // wysokość pojedynczego bloku zlecenia
    const orderGap = 4; // gap między blokami
    const minOrders = 4; // minimalna liczba zleceń do wyświetlenia w wierszu

    // Ustaw konkretne wysokości dla nagłówków (muszą być identyczne w obu gridach)
    const heights = ['40px', '28px'];
    for (const line of visibleLines) {
      const maxOrders = Math.max(minOrders, maxOrdersPerLine.get(line) || minOrders);
      // Wysokość = padding + (liczba bloków × wysokość bloku) + ((liczba bloków - 1) × gap)
      const height = baseHeight + (maxOrders * orderHeight) + ((maxOrders - 1) * orderGap);
      heights.push(`${height}px`);
    }
    console.log('Row heights:', heights.join(' '));
    return heights.join(' ');
  }, [maxOrdersPerLine, visibleLines]);

  // Zapisz pozycję scrolla przy pointerdown
  const handlePointerDown = () => {
    savedScrollLeft.current = scrollAreaRef.current?.scrollLeft ?? 0;
  };

  // Funkcja blokująca scroll przez określony czas
  const blockScrollFor = (duration: number) => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;

    const targetScroll = scrollArea.scrollLeft;

    const blockScroll = () => {
      scrollArea.scrollLeft = targetScroll;
    };

    // Nasłuchuj na scroll i natychmiast cofaj
    scrollArea.addEventListener('scroll', blockScroll);

    // Dodatkowo wymuszaj pozycję w interwałach
    const intervalId = setInterval(blockScroll, 10);

    setTimeout(() => {
      scrollArea.removeEventListener('scroll', blockScroll);
      clearInterval(intervalId);
    }, duration);
  };

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

    // KLUCZOWE: Zablokuj scroll PRZED mutacją i przez czas renderowania
    blockScrollFor(500);

    console.log('Updating order:', order.id_zlecenia, 'to line:', newLine);
    updateOrderLine.mutate(
      {
        id_zlecenia: order.id_zlecenia,
        new_line: Number(newLine),
      },
      {
        onSuccess: () => {
          showToast(`Zlecenie #${order.id_zlecenia} przeniesione na linię ${newLine}`, 'success');
        },
        onError: (error) => {
          showToast(`Błąd: ${error.message}`, 'error');
        },
      }
    );
  };

  if (isLoading) {
    return <div className="timeline-loading">Ładowanie zleceń...</div>;
  }

  const totalShiftColumns = days.length * SHIFTS.length;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      autoScroll={false}
    >
      <div className="timeline-wrapper">
        {/* Stała kolumna linii */}
        <div
          className="timeline-lines-column"
          style={{ gridTemplateRows: rowHeights }}
        >
          <div className="timeline-header-corner">Linia</div>
          <div className="timeline-subheader-corner"></div>
          {visibleLines.map((line) => (
            <div key={line} className={`timeline-line-label line-${line}`}>
              Linia {line}
            </div>
          ))}
        </div>

        {/* Scrollowalny obszar z danymi */}
        <div
          className="timeline-scroll-area"
          ref={scrollAreaRef}
          onPointerDown={handlePointerDown}
        >
          <div
            className="timeline-grid"
            style={{
              gridTemplateColumns: `repeat(${totalShiftColumns}, minmax(80px, 1fr))`,
              gridTemplateRows: rowHeights,
            }}
          >
            {/* Nagłówek - dni */}
            {days.map((day) => (
              <div
                key={day}
                className="timeline-header-day"
                style={{ gridColumn: `span ${SHIFTS.length}` }}
              >
                {formatDisplayDate(day)}
              </div>
            ))}

            {/* Nagłówek - zmiany */}
            {days.map((day) =>
              SHIFTS.map((shift) => (
                <div key={`${day}_${shift}`} className="timeline-header-shift">
                  Zm. {shift}
                </div>
              ))
            )}

            {/* Wiersze linii produkcyjnych */}
            {visibleLines.map((line) => (
              <LineRow
                key={line}
                line={line}
                days={days}
                ordersByCell={ordersByCell}
                showLabel={false}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Legenda */}
      <div className="timeline-legend">
        <span className="legend-title">Linie:</span>
        {visibleLines.map((line) => (
          <span key={line} className={`legend-item line-${line}`}>
            {line}
          </span>
        ))}
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

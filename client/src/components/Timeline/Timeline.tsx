import { useCallback, useMemo, useRef, useState } from 'react';
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
import { Order, ProductionLine, SHIFTS } from '../../types';
import { getDaysInRange, formatDisplayDate } from '../../utils/dates';
import { assignOrderColors } from '../../utils/orderColors';
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
  availableLines: number[];
}

export function Timeline({ orders, dateRange, isLoading, selectedLines, availableLines }: Props) {
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [hoveredOrderId, setHoveredOrderId] = useState<number | null>(null);
  const updateOrderLine = useUpdateOrderLine();
  const { showToast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const savedScrollLeft = useRef(0);

  // Cache kolorów - raz przypisany kolor nie zmienia się podczas sesji
  const colorCacheRef = useRef<Map<number, number>>(new Map());

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
    () => availableLines.filter((line) => selectedLines.has(line)),
    [selectedLines, availableLines]
  );

  // Normalizuj datę z ISO do YYYY-MM-DD w lokalnej strefie czasowej
  const normalizeDate = (isoDate: string): string => {
    const date = new Date(isoDate);
    return date.toLocaleDateString('sv-SE'); // format YYYY-MM-DD
  };

  // Kolory zleceń - używa cache, aby raz przypisany kolor nie zmieniał się podczas sesji
  const orderColorMap = useMemo(() => {
    const cache = colorCacheRef.current;

    // Znajdź zlecenia, które nie mają jeszcze przypisanego koloru
    const newOrders = orders.filter((o) => !cache.has(o.id_zlecenia));

    if (newOrders.length > 0) {
      // Oblicz kolory tylko dla nowych zleceń
      const newColors = assignOrderColors(newOrders);
      for (const [id, colorIndex] of newColors) {
        cache.set(id, colorIndex);
      }
    }

    return cache;
  }, [orders]);

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
    return heights.join(' ');
  }, [maxOrdersPerLine, visibleLines]);

  // Zapisz pozycję scrolla przy pointerdown
  const handlePointerDown = () => {
    savedScrollLeft.current = scrollAreaRef.current?.scrollLeft ?? 0;
  };

  // Ref do przechowywania stanu blokady scrolla
  const scrollBlockRef = useRef<boolean>(false);

  // Blokuj scroll przez ustawienie overflow: hidden (bardziej wydajne niż setInterval)
  const blockScrollFor = useCallback((duration: number) => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea || scrollBlockRef.current) return;

    scrollBlockRef.current = true;
    const savedOverflow = scrollArea.style.overflowX;
    scrollArea.style.overflowX = 'hidden';

    setTimeout(() => {
      scrollArea.style.overflowX = savedOverflow || 'auto';
      scrollBlockRef.current = false;
    }, duration);
  }, []);

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
      return;
    }

    // KLUCZOWE: Zablokuj scroll PRZED mutacją i przez czas renderowania
    blockScrollFor(500);

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
                hoveredOrderId={hoveredOrderId}
                onOrderHover={setHoveredOrderId}
                orderColorMap={orderColorMap}
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

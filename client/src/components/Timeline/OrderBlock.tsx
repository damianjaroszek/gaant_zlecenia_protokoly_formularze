import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Order } from '../../types';

interface Props {
  order: Order;
  hasCollision: boolean;
  isDragging?: boolean;
}

/**
 * Paleta 12 kolorów o WYSOKIM NASYCENIU dla maksymalnej rozróżnialności.
 *
 * Zasady:
 * 1. Tła mają nasycenie 60-75% (zamiast pastelowych 20-30%)
 * 2. Jasność tła 75-85% (czytelny tekst, ale wyrazisty kolor)
 * 3. Bordery bardzo intensywne (nasycenie 80-100%)
 * 4. Sekwencja kontrastów: każdy następny kolor różni się o ~150° na kole barw
 */
const COLOR_PALETTE = [
  // 0: Czerwony - intensywny, ciepły
  { bg: '#FF8A80', border: '#D32F2F', text: '#FFFFFF' },
  // 1: Cyjan - chłodny kontrast do czerwonego
  { bg: '#4DD0E1', border: '#0097A7', text: '#004D54' },
  // 2: Pomarańczowy - energiczny
  { bg: '#FFAB40', border: '#E65100', text: '#4E2600' },
  // 3: Niebieski - spokojny kontrast do pomarańczowego
  { bg: '#64B5F6', border: '#1565C0', text: '#FFFFFF' },
  // 4: Żółty - najjaśniejszy, przyciąga uwagę
  { bg: '#FFD54F', border: '#F9A825', text: '#5D4200' },
  // 5: Fioletowy - głęboki kontrast do żółtego
  { bg: '#BA68C8', border: '#7B1FA2', text: '#FFFFFF' },
  // 6: Limonkowy - świeży, żywy
  { bg: '#AED581', border: '#558B2F', text: '#1B3409' },
  // 7: Różowy - ciepły kontrast do limonkowego
  { bg: '#F06292', border: '#C2185B', text: '#FFFFFF' },
  // 8: Zielony - naturalny, wyrazisty
  { bg: '#66BB6A', border: '#2E7D32', text: '#FFFFFF' },
  // 9: Magenta - intensywny kontrast do zielonego
  { bg: '#CE93D8', border: '#8E24AA', text: '#3C0A47' },
  // 10: Morski - głęboki, chłodny
  { bg: '#4DB6AC', border: '#00695C', text: '#FFFFFF' },
  // 11: Indygo - ciemny, elegancki
  { bg: '#7986CB', border: '#303F9F', text: '#FFFFFF' },
];

/**
 * Generuje kolor na podstawie ID zlecenia.
 *
 * Proste i skuteczne: id % 12 daje indeks w palecie.
 * Paleta jest ułożona tak, że sąsiednie indeksy mają KONTRASTOWE kolory.
 * Więc zlecenie 1377 (czerwony) i 1378 (cyjan) będą łatwo rozróżnialne.
 */
function getOrderColor(id: number): { bg: string; border: string; text: string } {
  return COLOR_PALETTE[id % COLOR_PALETTE.length];
}

export function OrderBlock({ order, hasCollision, isDragging = false }: Props) {
  const [isHovered, setIsHovered] = useState(false);
  const blockRef = useRef<HTMLDivElement>(null);
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: order.id_zlecenia,
  });

  const colors = getOrderColor(order.id_zlecenia);

  const style = {
    ...(transform ? { transform: CSS.Translate.toString(transform) } : {}),
    backgroundColor: colors.bg,
    borderLeftColor: colors.border,
    color: colors.text,
  };

  const truncatedOpis = order.opis.length > 30
    ? order.opis.slice(0, 30) + '...'
    : order.opis;

  // Usuń tabIndex z atrybutów żeby zapobiec auto-scroll przy focus
  const { tabIndex, ...restAttributes } = attributes;

  // Formatuj datę do wyświetlenia
  const displayDate = new Date(order.data_realizacji).toLocaleDateString('pl-PL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  // Oblicz pozycję tooltipa na podstawie pozycji elementu
  const getTooltipPosition = () => {
    if (!blockRef.current) return { top: 0, left: 0 };
    const rect = blockRef.current.getBoundingClientRect();
    return {
      top: rect.top - 8,
      left: rect.left + rect.width / 2,
    };
  };

  const tooltipPos = getTooltipPosition();

  return (
    <>
      <div
        ref={(node) => {
          setNodeRef(node);
          (blockRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        style={style}
        {...listeners}
        {...restAttributes}
        className={`order-block ${hasCollision ? 'collision' : ''} ${isDragging ? 'dragging' : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <span className="order-id">#{order.id_zlecenia}</span>
        <span className="order-desc">{truncatedOpis}</span>
      </div>

      {/* Tooltip renderowany przez portal */}
      {isHovered && !isDragging && createPortal(
        <div
          className="order-tooltip-portal"
          style={{
            top: tooltipPos.top,
            left: tooltipPos.left,
          }}
        >
          <div className="tooltip-header">Zlecenie #{order.id_zlecenia}</div>
          <div className="tooltip-row">
            <span className="tooltip-label">Opis:</span>
            <span className="tooltip-value">{order.opis}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Data:</span>
            <span className="tooltip-value">{displayDate}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Zmiana:</span>
            <span className="tooltip-value">{order.zmiana}</span>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Linia:</span>
            <span className="tooltip-value">{order.liniapm}</span>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

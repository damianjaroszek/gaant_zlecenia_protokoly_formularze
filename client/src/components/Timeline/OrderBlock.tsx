import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Order } from '../../types';
import { getColorByIndex } from '../../utils/orderColors';

interface Props {
  order: Order;
  hasCollision: boolean;
  isDragging?: boolean;
  isHighlighted?: boolean;
  onHover?: (orderId: number | null) => void;
  colorIndex?: number;
}

export function OrderBlock({ order, hasCollision, isDragging = false, isHighlighted = false, onHover, colorIndex = 0 }: Props) {
  const [isHovered, setIsHovered] = useState(false);
  const blockRef = useRef<HTMLDivElement>(null);
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: order.id_zlecenia,
  });

  const colors = getColorByIndex(colorIndex);

  const style = {
    ...(transform ? { transform: CSS.Translate.toString(transform) } : {}),
    backgroundColor: colors.bg,
    borderLeftColor: colors.border,
    color: colors.text,
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    onHover?.(order.id_zlecenia);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    onHover?.(null);
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
        className={`order-block ${hasCollision ? 'collision' : ''} ${isDragging ? 'dragging' : ''} ${isHighlighted ? 'highlighted' : ''}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
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

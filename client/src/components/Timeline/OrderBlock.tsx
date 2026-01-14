import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Order } from '../../types';

interface Props {
  order: Order;
  hasCollision: boolean;
  isDragging?: boolean;
}

/**
 * Generuje unikalny kolor HSL na podstawie ID zlecenia.
 * Używamy złotego kąta (137.5°) dla optymalnego rozłożenia kolorów.
 * Nasycenie i jasność dobrane dla dobrej czytelności tekstu.
 */
function getOrderColor(id: number): { bg: string; border: string; text: string } {
  // Złoty kąt zapewnia maksymalne rozłożenie kolorów
  const goldenAngle = 137.508;
  const hue = (id * goldenAngle) % 360;

  // Pastelowe tło z dobrym kontrastem
  const saturation = 65;
  const lightness = 85;

  return {
    bg: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
    border: `hsl(${hue}, ${saturation + 15}%, ${lightness - 35}%)`,
    text: `hsl(${hue}, ${saturation + 10}%, ${lightness - 55}%)`,
  };
}

export function OrderBlock({ order, hasCollision, isDragging = false }: Props) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...restAttributes}
      className={`order-block ${hasCollision ? 'collision' : ''} ${isDragging ? 'dragging' : ''}`}
      title={`ID: ${order.id_zlecenia}\n${order.opis}\n\nPrzeciągnij na inną linię (ta sama data i zmiana)`}
    >
      <span className="order-id">#{order.id_zlecenia}</span>
      <span className="order-desc">{truncatedOpis}</span>
    </div>
  );
}

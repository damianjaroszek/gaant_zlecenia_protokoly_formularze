import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Order } from '../../types';

interface Props {
  order: Order;
  hasCollision: boolean;
  isDragging?: boolean;
}

export function OrderBlock({ order, hasCollision, isDragging = false }: Props) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: order.id_zlecenia,
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  const truncatedOpis = order.opis.length > 30
    ? order.opis.slice(0, 30) + '...'
    : order.opis;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`order-block line-${order.liniapm} ${hasCollision ? 'collision' : ''} ${isDragging ? 'dragging' : ''}`}
      title={`ID: ${order.id_zlecenia}\n${order.opis}\n\nPrzeciągnij na inną linię (ta sama data i zmiana)`}
    >
      <span className="order-id">#{order.id_zlecenia}</span>
      <span className="order-desc">{truncatedOpis}</span>
    </div>
  );
}

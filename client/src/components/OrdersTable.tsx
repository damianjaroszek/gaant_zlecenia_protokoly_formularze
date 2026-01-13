import { Order } from '../types';

interface Props {
  orders: Order[];
  isLoading: boolean;
}

export function OrdersTable({ orders, isLoading }: Props) {
  if (isLoading) {
    return <div className="loading">Ładowanie zleceń...</div>;
  }

  if (orders.length === 0) {
    return <div className="empty">Brak zleceń w wybranym okresie</div>;
  }

  return (
    <div className="orders-table-container">
      <table className="orders-table">
        <thead>
          <tr>
            <th>Data</th>
            <th>Zmiana</th>
            <th>Linia</th>
            <th>ID Zlecenia</th>
            <th>Opis</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={`${order.id_zlecenia}-${order.zmiana}`}>
              <td>{order.data_realizacji}</td>
              <td>{order.zmiana}</td>
              <td>{order.liniapm ?? '-'}</td>
              <td>{order.id_zlecenia}</td>
              <td>{order.opis}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

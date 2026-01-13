import { Order, User, DateRange } from '../types';

const API_BASE = '/api';

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Błąd serwera' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Auth
export async function login(username: string, password: string): Promise<User> {
  return fetchApi<User>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function logout(): Promise<void> {
  await fetchApi('/auth/logout', { method: 'POST' });
}

export async function getCurrentUser(): Promise<User> {
  return fetchApi<User>('/auth/me');
}

// Orders
export async function getOrders(dateRange: DateRange): Promise<Order[]> {
  const params = new URLSearchParams({
    from: dateRange.from,
    to: dateRange.to,
  });
  return fetchApi<Order[]>(`/orders?${params}`);
}

export async function updateOrderLine(
  id_zlecenia: number,
  new_line: number
): Promise<{ success: boolean }> {
  return fetchApi(`/orders/${id_zlecenia}`, {
    method: 'PATCH',
    body: JSON.stringify({ new_line }),
  });
}

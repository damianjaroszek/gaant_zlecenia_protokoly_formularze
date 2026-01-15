import { Order, User, DateRange, CreateUserRequest, ProductionLineConfig } from '../types';

// Typ użytkownika z dodatkowymi polami dla admina
export interface AdminUser extends User {
  is_active: boolean;
  created_at: string;
}

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

// Admin
export async function getUsers(): Promise<AdminUser[]> {
  return fetchApi<AdminUser[]>('/admin/users');
}

export async function createUser(data: CreateUserRequest): Promise<AdminUser> {
  return fetchApi<AdminUser>('/admin/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateUser(
  id: number,
  data: { is_active?: boolean; is_admin?: boolean; display_name?: string }
): Promise<AdminUser> {
  return fetchApi<AdminUser>(`/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// Production Lines
export async function getProductionLines(): Promise<ProductionLineConfig[]> {
  return fetchApi<ProductionLineConfig[]>('/settings/lines');
}

export async function getAllLines(): Promise<ProductionLineConfig[]> {
  return fetchApi<ProductionLineConfig[]>('/admin/lines');
}

export async function createLine(data: { line_number: number; name?: string }): Promise<ProductionLineConfig> {
  return fetchApi<ProductionLineConfig>('/admin/lines', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateLine(
  id: number,
  data: { is_active?: boolean; name?: string; display_order?: number }
): Promise<ProductionLineConfig> {
  return fetchApi<ProductionLineConfig>(`/admin/lines/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteLine(id: number): Promise<{ success: boolean }> {
  return fetchApi<{ success: boolean }>(`/admin/lines/${id}`, {
    method: 'DELETE',
  });
}

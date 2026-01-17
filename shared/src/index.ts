/**
 * Shared types between client and server
 */

// Order types
export interface Order {
  id_zlecenia: number;
  data_realizacji: string; // format YYYY-MM-DD
  zmiana: number; // 1, 2, 3
  liniapm: number | null;
  opis: string;
}

// User types
export interface User {
  id: number;
  username: string;
  display_name: string | null;
  is_admin: boolean;
}

export interface UserWithStatus extends User {
  is_active: boolean;
}

export interface AdminUser extends UserWithStatus {
  created_at: string;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  display_name?: string;
  is_admin?: boolean;
}

// Date range for queries
export interface DateRange {
  from: string;
  to: string;
}

// Production line types
export interface ProductionLineConfig {
  id: number;
  line_number: number;
  name: string | null;
  is_active: boolean;
  display_order: number | null;
  created_at?: string;
}

export type ProductionLine = number;

export interface UserLineAccess {
  id: number;
  line_number: number;
  name: string | null;
}

// Shifts
export const SHIFTS = [1, 2, 3] as const;
export type Shift = (typeof SHIFTS)[number];

export type SelectedLines = Set<ProductionLine>;

// API request/response types
export interface UpdateLineRequest {
  id_zlecenia: number;
  new_line: number;
}

export interface UpdateOrderLineResponse {
  success: boolean;
}

export interface ResetPasswordResponse {
  success: boolean;
  username: string;
}

export interface DeleteResponse {
  success: boolean;
}

// Constants
export const MAX_DAYS = 62;

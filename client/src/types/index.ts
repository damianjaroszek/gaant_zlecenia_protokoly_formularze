export interface Order {
  id_zlecenia: number;
  data_realizacji: string;
  zmiana: number;
  liniapm: number | null;
  opis: string;
}

export interface User {
  id: number;
  username: string;
  display_name: string | null;
  is_admin: boolean;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  display_name?: string;
  is_admin?: boolean;
}

export interface DateRange {
  from: string;
  to: string;
}

// Typ dla linii produkcyjnej z bazy danych
export interface ProductionLineConfig {
  id: number;
  line_number: number;
  name: string | null;
  is_active: boolean;
  display_order: number | null;
  created_at?: string;
}

// Typ numeru linii (dynamiczny, oparty na danych z bazy)
export type ProductionLine = number;

export const SHIFTS = [1, 2, 3] as const;
export type Shift = typeof SHIFTS[number];

export type SelectedLines = Set<ProductionLine>;

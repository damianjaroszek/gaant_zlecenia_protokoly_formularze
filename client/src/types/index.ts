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
}

export interface DateRange {
  from: string;
  to: string;
}

export const PRODUCTION_LINES = [1, 2, 3, 33, 4, 44, 5, 7] as const;
export type ProductionLine = typeof PRODUCTION_LINES[number];

export const SHIFTS = [1, 2, 3] as const;
export type Shift = typeof SHIFTS[number];

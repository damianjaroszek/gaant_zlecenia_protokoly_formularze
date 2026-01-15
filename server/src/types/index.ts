export interface Order {
  id_zlecenia: number;
  data_realizacji: string; // format YYYY-MM-DD
  zmiana: number; // 1, 2, 3
  liniapm: number | null; // 1, 2, 3, 33, 4, 44, 5, 7
  opis: string;
}

export interface User {
  id: number;
  username: string;
  display_name: string | null;
  is_active: boolean;
  is_admin: boolean;
}

export interface UpdateLineRequest {
  id_zlecenia: number;
  new_line: number;
}

// Rozszerzenie typu sesji Express
declare module 'express-session' {
  interface SessionData {
    userId: number;
    username: string;
    isAdmin: boolean;
  }
}

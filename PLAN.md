# Plan Implementacji - Aplikacja Zarządzania Zleceniami Produkcyjnymi

## Stack Technologiczny

### Frontend
- React 18 + TypeScript
- Vite (bundler)
- TanStack Query (React Query) - cache i synchronizacja danych
- dnd-kit - drag & drop
- CSS Modules - stylowanie

### Backend
- Node.js + Express + TypeScript
- pg (node-postgres) - połączenie z PostgreSQL
- express-session + connect-pg-simple - sesje w bazie
- bcrypt - hashowanie haseł

---

## Struktura Projektu

```
produkcja-app/
├── server/
│   ├── src/
│   │   ├── index.ts              # Entry point, Express setup
│   │   ├── config/
│   │   │   └── db.ts             # Połączenie PostgreSQL
│   │   ├── routes/
│   │   │   ├── auth.ts           # POST /login, /logout, GET /me
│   │   │   └── orders.ts         # GET /orders, PATCH /orders/:id
│   │   ├── middleware/
│   │   │   └── auth.ts           # Sprawdzanie sesji
│   │   └── types/
│   │       └── index.ts          # Typy TypeScript
│   ├── package.json
│   └── tsconfig.json
│
├── client/
│   ├── src/
│   │   ├── main.tsx              # Entry point
│   │   ├── App.tsx               # Routing, providers
│   │   ├── api/
│   │   │   └── client.ts         # Fetch wrapper
│   │   ├── components/
│   │   │   ├── LoginForm/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   └── LoginForm.module.css
│   │   │   ├── DateRangePicker/
│   │   │   │   └── DateRangePicker.tsx
│   │   │   ├── Timeline/
│   │   │   │   ├── Timeline.tsx          # Główny kontener
│   │   │   │   ├── DayColumn.tsx         # Kolumna dnia
│   │   │   │   ├── ShiftCell.tsx         # Komórka zmiany
│   │   │   │   ├── OrderBlock.tsx        # Blok zlecenia (draggable)
│   │   │   │   ├── LineRow.tsx           # Wiersz linii produkcyjnej
│   │   │   │   └── Timeline.module.css
│   │   │   └── Layout/
│   │   │       └── Header.tsx
│   │   ├── hooks/
│   │   │   ├── useOrders.ts      # React Query - pobieranie zleceń
│   │   │   ├── useUpdateOrder.ts # React Query - mutacja
│   │   │   └── useAuth.ts        # Kontekst autoryzacji
│   │   ├── context/
│   │   │   └── AuthContext.tsx
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   └── DashboardPage.tsx
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── utils/
│   │       ├── dates.ts          # Formatowanie dat
│   │       └── collisions.ts     # Wykrywanie kolizji
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
└── README.md
```

---

## Baza Danych - Nowa Tabela Użytkowników

Utworzę tabelę w NOWYM SCHEMACIE `app_produkcja` (nie modyfikuję istniejących):

```sql
-- Schemat dla aplikacji (oddzielony od ERP)
CREATE SCHEMA IF NOT EXISTS app_produkcja;

-- Tabela użytkowników
CREATE TABLE app_produkcja.users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela sesji (dla express-session)
CREATE TABLE app_produkcja.sessions (
    sid VARCHAR NOT NULL PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX idx_sessions_expire ON app_produkcja.sessions (expire);
```

---

## Zapytanie SQL do Zleceń

Zapisuję zapytanie jako widok lub użyję bezpośrednio:

```sql
-- Zapytanie do pobierania zleceń (parametry: data_od, data_do)
SELECT
    g.datasql(kp.data) as data_realizacji,
    kp.id_zlecenia,
    kp.zmiana,
    x.liniapm,
    mzkz.opis
FROM es.ter_karty_pracy kp
LEFT JOIN g.mzk_zlecenia mzkz ON kp.id_zlecenia = mzkz.id
LEFT JOIN (
    SELECT
        CASE
            WHEN COALESCE(linianew.opis, '0') > '0' THEN CAST(linianew.opis AS INTEGER)
            ELSE CAST(makr.wartosc AS INTEGER)
        END as liniapm,
        z.id
    FROM g.mzk_zlecenia z
    LEFT JOIN g.mzk_zlecenia_makra makr
        ON makr.id_zlecenia = z.id AND makr.makro = 'MPW'
    LEFT JOIN g.mzk_protokoly_poz linianew
        ON linianew.id_zrodla1 = z.id AND linianew.rodzajzrodla = 3
) x ON x.id = kp.id_zlecenia
WHERE kp.data BETWEEN g.sqldata($1) AND g.sqldata($2)
GROUP BY kp.data, kp.id_zlecenia, kp.zmiana, x.liniapm, mzkz.opis
```

### UPDATE linii produkcyjnej

Muszę zaktualizować `g.mzk_protokoly_poz.opis` lub `g.mzk_zlecenia_makra.wartosc`?

**PYTANIE: Które pole powinienem aktualizować przy zmianie linii?**
- `g.mzk_protokoly_poz.opis` (jeśli istnieje rekord)?
- `g.mzk_zlecenia_makra.wartosc` (makro MPW)?
- Czy trzeba wstawić nowy rekord jeśli nie istnieje?

---

## Etapy Implementacji

### ETAP 1: Setup projektu + połączenie z bazą ✅ UKOŃCZONY
- [x] Inicjalizacja server (Express + TypeScript)
- [x] Inicjalizacja client (Vite + React)
- [x] Połączenie z PostgreSQL
- [x] Endpoint GET /api/orders
- [x] Prosta tabela wyświetlająca zlecenia
- [x] System autoryzacji (login/logout/sesje)

---

### ETAP 2: Timeline/Gantt
- [ ] Struktura siatki CSS Grid
- [ ] Komponenty: Timeline, DayColumn, ShiftCell, OrderBlock
- [ ] Renderowanie zleceń w odpowiednich komórkach
- [ ] Wykrywanie i wizualizacja kolizji
- [ ] Legenda linii produkcyjnych

**Schemat wizualny:**
```
         | 2025-01-15          | 2025-01-16          |
         | Zm.1 | Zm.2 | Zm.3  | Zm.1 | Zm.2 | Zm.3  |
---------+------+------+-------+------+------+-------+
Linia 1  | [Z1] |      | [Z2]  |      | [Z5] |       |
Linia 2  |      | [Z3] |       | [Z6] |      |       |
Linia 3  | [Z4] | [Z4] |       |      |      | [Z7]  |  <- kolizja!
...
```

---

### ETAP 3: Drag & Drop
- [ ] Integracja dnd-kit (DndContext, Draggable, Droppable)
- [ ] OrderBlock jako Draggable
- [ ] ShiftCell jako Droppable (tylko ta sama data+zmiana)
- [ ] Walidacja: drop dozwolony tylko na inną linię
- [ ] Wizualna informacja zwrotna

---

### ETAP 4: Zapis zmian
- [ ] Endpoint PATCH /api/orders/:id
- [ ] Mutacja w React Query
- [ ] Optymistyczny update
- [ ] Obsługa błędów

---

### ETAP 5: Autoryzacja
- [ ] Utworzenie schematu i tabel w PostgreSQL
- [ ] Endpoint POST /api/auth/login
- [ ] Endpoint POST /api/auth/logout
- [ ] Endpoint GET /api/auth/me
- [ ] Middleware sprawdzający sesję
- [ ] AuthContext na frontendzie
- [ ] ProtectedRoute component
- [ ] Strona logowania

---

### ETAP 6: Dopracowanie
- [ ] Lepsze style, responsywność
- [ ] Loading states, error handling
- [ ] Tooltip z detalami zlecenia
- [ ] Prosty skrypt do dodawania użytkowników

---

## Konfiguracja

### Zmienne środowiskowe (server/.env)
```
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=erp_database
DB_USER=app_user
DB_PASSWORD=***
SESSION_SECRET=random-secret-key
```

### Linie produkcyjne (stałe)
```typescript
export const PRODUCTION_LINES = [1, 2, 3, 33, 4, 44, 5, 7] as const;
```

---

## Następne kroki

1. Potwierdź plan
2. Odpowiedz na pytanie o UPDATE (które pole/tabela)
3. Zaczynam kodowanie od Etapu 1

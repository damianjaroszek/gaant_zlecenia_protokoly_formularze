# Przewodnik Deploymentu - Produkcja App

Ten przewodnik zawiera dwie ścieżki wdrożenia:
- **Część A**: Szybki deployment na Windows 10 (pre-produkcja/testy)
- **Część B**: Pełny deployment na Linux Ubuntu (produkcja)

---

# CZĘŚĆ A: Deployment na Windows 10 (Pre-produkcja)

Szybkie wdrożenie do testów przed produkcją. Idealne do oddania aplikacji do testowania.

## Spis treści (Windows)

1. [Wymagania wstępne](#a1-wymagania-wstępne)
2. [Instalacja PostgreSQL](#a2-instalacja-postgresql)
3. [Przygotowanie aplikacji](#a3-przygotowanie-aplikacji)
4. [Konfiguracja zmiennych środowiskowych](#a4-konfiguracja-zmiennych-środowiskowych)
5. [Uruchomienie jako usługa Windows](#a5-uruchomienie-jako-usługa-windows)
6. [Konfiguracja dostępu sieciowego](#a6-konfiguracja-dostępu-sieciowego)
7. [Testowanie](#a7-testowanie)

---

## A1. Wymagania wstępne

### A1.1 Instalacja Node.js

1. Pobierz [Node.js 20 LTS](https://nodejs.org/) (wersja Windows Installer .msi)
2. Zainstaluj z domyślnymi opcjami
3. Zweryfikuj w PowerShell:
   ```powershell
   node --version  # v20.x.x
   npm --version
   ```

### A1.2 Instalacja Git (opcjonalnie)

Pobierz z [git-scm.com](https://git-scm.com/download/win) jeśli chcesz aktualizować przez Git.

---

## A2. Konfiguracja bazy danych (zdalny serwer PostgreSQL)

> **Uwaga**: Jeśli baza PostgreSQL jest na innym serwerze, nie musisz instalować PostgreSQL lokalnie. Wystarczy skonfigurować połączenie w `.env`.

### A2.1 Wymagania na serwerze bazy danych

Na serwerze z PostgreSQL administrator musi:

1. **Utworzyć użytkownika aplikacji** (jeśli jeszcze nie istnieje):
   ```sql
   CREATE USER produkcja_app_user WITH PASSWORD 'SilneHaslo123!';
   GRANT CONNECT ON DATABASE nazwa_bazy_erp TO produkcja_app_user;
   ```

2. **Uruchomić skrypty inicjalizacyjne**:
   - `server/src/scripts/init-db.sql` - tworzy schemat i tabele
   - `server/src/scripts/create-db-user.sql` - nadaje uprawnienia

3. **Zezwolić na połączenie z IP komputera testowego** w `pg_hba.conf`:
   ```
   host    nazwa_bazy_erp    produkcja_app_user    IP_KOMPUTERA_TESTOWEGO/32    scram-sha-256
   ```

### A2.2 Test połączenia (opcjonalnie)

Możesz zainstalować pgAdmin 4 lub użyć psql do testu:
```powershell
# Test połączenia z poziomu PowerShell (jeśli masz psql)
psql -h ADRES_SERWERA_DB -U produkcja_app_user -d nazwa_bazy_erp
```

---

## A3. Przygotowanie aplikacji

### A3.1 Kopiowanie projektu

Skopiuj cały folder projektu na komputer testowy, np. do:
```
C:\Apps\produkcja-app
```

### A3.2 Instalacja zależności i build

Otwórz PowerShell jako Administrator:

```powershell
# Shared
cd C:\Apps\produkcja-app\shared
npm install
npm run build

# Server
cd C:\Apps\produkcja-app\server
npm install --production
npm run build

# Client
cd C:\Apps\produkcja-app\client
npm install
npm run build
```

---

## A4. Konfiguracja zmiennych środowiskowych

### A4.1 Tworzenie pliku .env

Utwórz plik `C:\Apps\produkcja-app\server\.env`:

```env
# Środowisko - dla testów można użyć development
NODE_ENV=production
PORT=3011

# Baza danych (adres zdalnego serwera PostgreSQL)
DB_HOST=192.168.x.x
DB_PORT=5432
DB_NAME=nazwa_bazy_erp
DB_USER=produkcja_app_user
DB_PASSWORD=TwojeHaslo123!
DB_POOL_MAX=10
DB_POOL_MIN=2

# WAŻNE: Wygeneruj unikalny secret
# W PowerShell: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=wklej_wygenerowany_64_znakowy_hash

# CORS - adres frontendu (IP komputera testowego)
CORS_ORIGIN=http://192.168.1.100:3010

# Logowanie
LOG_LEVEL=info
```

### A4.2 Generowanie SESSION_SECRET

W PowerShell:
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Skopiuj wynik do `.env`.

---

## A5. Uruchomienie jako usługa Windows

### Opcja A: PM2 na Windows (zalecane)

```powershell
# Instalacja PM2 globalnie
npm install -g pm2
npm install -g pm2-windows-startup

# Konfiguracja autostartu
pm2-startup install

# Uruchomienie aplikacji
cd C:\Apps\produkcja-app\server
pm2 start dist/index.js --name produkcja-api

# Zapisanie konfiguracji
pm2 save

# Sprawdzenie statusu
pm2 status
```

### Opcja B: NSSM (Non-Sucking Service Manager)

1. Pobierz [NSSM](https://nssm.cc/download)
2. Rozpakuj do `C:\Tools\nssm`
3. W PowerShell (jako Administrator):

```powershell
# Instalacja usługi
C:\Tools\nssm\win64\nssm.exe install ProdukcjaAPI "C:\Program Files\nodejs\node.exe" "C:\Apps\produkcja-app\server\dist\index.js"

# Ustawienie katalogu roboczego
C:\Tools\nssm\win64\nssm.exe set ProdukcjaAPI AppDirectory "C:\Apps\produkcja-app\server"

# Ustawienie zmiennych środowiskowych
C:\Tools\nssm\win64\nssm.exe set ProdukcjaAPI AppEnvironmentExtra "NODE_ENV=production"

# Uruchomienie usługi
C:\Tools\nssm\win64\nssm.exe start ProdukcjaAPI

# Sprawdzenie statusu
Get-Service ProdukcjaAPI
```

---

## A6. Konfiguracja dostępu sieciowego

### A6.1 Serwowanie frontendu

Zainstaluj `serve` do serwowania statycznych plików:

```powershell
npm install -g serve

# Uruchomienie frontendu na porcie 3000
cd C:\Apps\produkcja-app\client
serve -s dist -l 3000
```

Dla trwałego uruchomienia, dodaj do PM2:
```powershell
pm2 start serve --name produkcja-frontend -- -s C:\Apps\produkcja-app\client\dist -l 3000
pm2 save
```

### A6.2 Firewall Windows (zazwyczaj niepotrzebne w sieci wewnętrznej)

> **Uwaga**: W sieci firmowej (domenowej/prywatnej) Windows Firewall domyślnie przepuszcza ruch. Ten krok jest potrzebny tylko jeśli kolega nie może się połączyć.

Jeśli połączenie nie działa, otwórz PowerShell jako Administrator:

```powershell
# Sprawdź profil sieci (powinien być Private lub Domain)
Get-NetConnectionProfile

# Jeśli profil to "Public", zmień na "Private":
# Set-NetConnectionProfile -Name "Nazwa_Sieci" -NetworkCategory Private

# Lub ręcznie otwórz porty (tylko jeśli powyższe nie pomoże):
New-NetFirewallRule -DisplayName "Produkcja API" -Direction Inbound -Port 3011 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Produkcja Frontend" -Direction Inbound -Port 3000 -Protocol TCP -Action Allow
```

### A6.3 Sprawdzenie IP komputera

```powershell
ipconfig
```

Zanotuj adres IPv4 (np. `192.168.1.100`).

### A6.4 Aktualizacja CORS

W pliku `.env` ustaw `CORS_ORIGIN` na adres frontendu:
```env
CORS_ORIGIN=http://192.168.1.100:3010
```

Zrestartuj API:
```powershell
pm2 restart produkcja-api
```

---

## A7. Testowanie

### A7.1 Lokalne testowanie

```powershell
# Test API
curl http://localhost:3011/api/health

# Lub w przeglądarce
Start-Process "http://localhost:3010"
```

### A7.2 Udostępnienie koledze

Przekaż koledze:
- **Adres aplikacji**: `http://192.168.1.100:3010`
- Upewnij się, że jesteście w tej samej sieci lokalnej

### A7.3 Sprawdzenie logów

```powershell
# Logi PM2
pm2 logs produkcja-api

# Lub wszystkie logi
pm2 logs
```

---

## A8. Szybki skrypt uruchomieniowy

Utwórz plik `C:\Apps\produkcja-app\start.ps1`:

```powershell
# start.ps1 - Uruchomienie aplikacji Produkcja
Write-Host "Uruchamianie aplikacji Produkcja..." -ForegroundColor Green

# Sprawdź czy PM2 jest zainstalowany
if (!(Get-Command pm2 -ErrorAction SilentlyContinue)) {
    Write-Host "Instalowanie PM2..." -ForegroundColor Yellow
    npm install -g pm2
}

# Uruchom backend
cd C:\Apps\produkcja-app\server
pm2 start dist/index.js --name produkcja-api -f

# Uruchom frontend
pm2 start serve --name produkcja-frontend -- -s C:\Apps\produkcja-app\client\dist -l 3000 -f

# Status
pm2 status

# Pokaż adresy
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.*" } | Select-Object -First 1).IPAddress
Write-Host "`nAplikacja dostepna pod adresami:" -ForegroundColor Cyan
Write-Host "  Lokalnie:  http://localhost:3010" -ForegroundColor White
Write-Host "  W sieci:   http://${ip}:3010" -ForegroundColor White
Write-Host "`nAPI Health: http://localhost:3011/api/health" -ForegroundColor Gray
```

Uruchomienie:
```powershell
powershell -ExecutionPolicy Bypass -File C:\Apps\produkcja-app\start.ps1
```

---

## A9. Zatrzymanie aplikacji

```powershell
# Zatrzymanie wszystkich procesów
pm2 stop all

# Lub tylko konkretnych
pm2 stop produkcja-api
pm2 stop produkcja-frontend

# Całkowite usunięcie
pm2 delete all
```

---

## Różnice: Pre-produkcja vs Produkcja

| Aspekt | Windows (Pre-prod) | Linux (Produkcja) |
|--------|-------------------|-------------------|
| Reverse proxy | Brak (bezpośredni dostęp) | Nginx |
| HTTPS | Brak (HTTP) | Let's Encrypt / self-signed |
| Proces manager | PM2 / NSSM | PM2 + systemd |
| Bezpieczeństwo | Podstawowe | Pełne (firewall, fail2ban) |
| Wydajność | Wystarczająca do testów | Zoptymalizowana |
| Monitoring | PM2 status | PM2 + logi systemowe |

---

# CZĘŚĆ B: Deployment na Linux Ubuntu (Produkcja)

Pełny przewodnik dla środowiska produkcyjnego na Ubuntu Server w Hyper-V.

## Konfiguracja portów

| Usługa | Port | Opis |
|--------|------|------|
| Nginx (HTTP) | 3010 | Frontend + proxy do API |
| Nginx (HTTPS) | 3011 | Frontend + proxy do API (SSL) |
| Node.js API | 3011 | Backend (wewnętrzny, tylko localhost) |
| SSH | 22 | Administracja |

> **Uwaga**: Nginx nasłuchuje na porcie 3010 (HTTP) i opcjonalnie 3011 (HTTPS). Backend Node.js działa na localhost:3011 i jest dostępny tylko przez Nginx proxy.

---

## Spis treści

1. [Przygotowanie maszyny wirtualnej](#1-przygotowanie-maszyny-wirtualnej)
2. [Instalacja wymaganego oprogramowania](#2-instalacja-wymaganego-oprogramowania)
3. [Konfiguracja bazy danych](#3-konfiguracja-bazy-danych)
4. [Przygotowanie aplikacji](#4-przygotowanie-aplikacji)
5. [Konfiguracja zmiennych środowiskowych](#5-konfiguracja-zmiennych-środowiskowych)
6. [Uruchomienie aplikacji z PM2](#6-uruchomienie-aplikacji-z-pm2)
7. [Konfiguracja Nginx (reverse proxy)](#7-konfiguracja-nginx-reverse-proxy)
8. [Konfiguracja HTTPS (certyfikat SSL)](#8-konfiguracja-https-certyfikat-ssl)
9. [Firewall i dostęp cross-VLAN](#9-firewall-i-dostęp-cross-vlan)
10. [Automatyczny start po restarcie](#10-automatyczny-start-po-restarcie)
11. [Monitorowanie i logi](#11-monitorowanie-i-logi)
12. [Aktualizacja aplikacji](#12-aktualizacja-aplikacji)

---

## 1. Przygotowanie maszyny wirtualnej

### 1.1 Tworzenie VM w Hyper-V

1. Otwórz **Hyper-V Manager**
2. Kliknij **Nowy > Maszyna wirtualna**
3. Ustawienia:
   - **Nazwa**: `produkcja-server`
   - **Generacja**: 2 (dla UEFI)
   - **RAM**: minimum 2048 MB (zalecane 4096 MB)
   - **Sieć**: Wybierz switch z dostępem do sieci lokalnej
   - **Dysk**: minimum 20 GB (zalecane 40 GB)

### 1.2 Pobieranie i instalacja Ubuntu Server

1. Pobierz [Ubuntu Server 24.04 LTS](https://ubuntu.com/download/server)
2. W Hyper-V: **Ustawienia VM > Napęd DVD > Plik obrazu** - wybierz pobrany ISO
3. Uruchom VM i zainstaluj Ubuntu:
   - Wybierz język, klawiaturę
   - Typ instalacji: **Ubuntu Server (minimized)**
   - Sieć: Skonfiguruj statyczny IP lub DHCP
   - Utwórz użytkownika (np. `admin`)
   - Zaznacz **Install OpenSSH server** (ważne!)
   - Poczekaj na instalację i zrestartuj

### 1.3 Pierwsze połączenie SSH

Z Windows (PowerShell):
```powershell
ssh admin@ADRES_IP_SERWERA
```

Gdzie `ADRES_IP_SERWERA` to IP Twojej maszyny wirtualnej (sprawdź przez `ip addr` na serwerze).

---

## 2. Instalacja wymaganego oprogramowania

Po zalogowaniu przez SSH, wykonaj:

### 2.1 Aktualizacja systemu

```bash
sudo apt update && sudo apt upgrade -y
```

### 2.2 Instalacja Node.js 20 LTS

```bash
# Dodanie repozytorium NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Instalacja Node.js
sudo apt install -y nodejs

# Weryfikacja
node --version  # Powinno pokazać v20.x.x
npm --version
```

### 2.3 Instalacja Nginx

```bash
sudo apt install -y nginx

# Sprawdzenie statusu
sudo systemctl status nginx
```

### 2.4 Instalacja PM2 (menedżer procesów Node.js)

```bash
sudo npm install -g pm2
```

### 2.5 Instalacja Git

```bash
sudo apt install -y git
```

---

## 3. Konfiguracja bazy danych (zdalny serwer PostgreSQL)

> **Uwaga**: Baza PostgreSQL jest na innym serwerze - nie instalujemy jej lokalnie.

### 3.1 Wymagania na serwerze bazy danych

Administrator bazy danych musi:

1. **Utworzyć użytkownika aplikacji**:
   ```sql
   CREATE USER produkcja_app_user WITH PASSWORD 'SilneHaslo123!';
   GRANT CONNECT ON DATABASE nazwa_bazy_erp TO produkcja_app_user;
   ```

2. **Uruchomić skrypty inicjalizacyjne** (skopiuj na serwer DB):
   - `server/src/scripts/init-db.sql` - tworzy schemat i tabele
   - `server/src/scripts/create-db-user.sql` - nadaje uprawnienia

3. **Zezwolić na połączenie z IP serwera aplikacji** w `pg_hba.conf`:
   ```
   host    nazwa_bazy_erp    produkcja_app_user    IP_SERWERA_APLIKACJI/32    scram-sha-256
   ```

   Po edycji: `sudo systemctl restart postgresql`

### 3.2 Test połączenia (z serwera aplikacji)

```bash
# Zainstaluj klienta PostgreSQL
sudo apt install -y postgresql-client

# Test połączenia
psql -h ADRES_SERWERA_DB -U produkcja_app_user -d nazwa_bazy_erp -c "SELECT 1;"
```

---

## 4. Przygotowanie aplikacji

### 4.1 Tworzenie katalogu aplikacji

```bash
sudo mkdir -p /var/www/produkcja-app
sudo chown $USER:$USER /var/www/produkcja-app
```

### 4.2 Opcja A: Kopiowanie przez Git (zalecane)

Jeśli masz repozytorium Git:
```bash
cd /var/www/produkcja-app
git clone https://github.com/TWOJE_REPO/produkcja-app.git .
```

### 4.2 Opcja B: Kopiowanie przez SCP

Z komputera Windows (PowerShell):
```powershell
# Kopiowanie całego projektu
scp -r C:\Users\user\produkcja-app\* admin@ADRES_IP_SERWERA:/var/www/produkcja-app/
```

### 4.3 Instalacja zależności i build

```bash
# Build shared
cd /var/www/produkcja-app/shared
npm install
npm run build

# Build server
cd /var/www/produkcja-app/server
npm install --production
npm run build

# Build client
cd /var/www/produkcja-app/client
npm install
npm run build
```

---

## 5. Konfiguracja zmiennych środowiskowych

### 5.1 Tworzenie pliku .env

```bash
cd /var/www/produkcja-app/server
nano .env
```

Wklej i dostosuj:
```env
# Środowisko
NODE_ENV=production
PORT=3011

# Baza danych (adres zdalnego serwera PostgreSQL)
DB_HOST=192.168.x.x
DB_PORT=5432
DB_NAME=nazwa_bazy_erp
DB_USER=produkcja_app_user
DB_PASSWORD=TWOJE_SILNE_HASLO_DO_BAZY
DB_POOL_MAX=20
DB_POOL_MIN=2

# WAŻNE: Wygeneruj unikalny secret!
# Uruchom: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=WKLEJ_WYGENEROWANY_64_ZNAKOWY_HASH

# CORS - adres frontendu (IP serwera z portem Nginx)
# Dla HTTP: http://IP_SERWERA:3010
# Dla HTTPS: https://IP_SERWERA:3010
CORS_ORIGIN=http://192.168.x.x:3010

# Logowanie
LOG_LEVEL=info
```

### 5.2 Zabezpieczenie pliku .env

```bash
chmod 600 /var/www/produkcja-app/server/.env
```

---

## 6. Uruchomienie aplikacji z PM2

### 6.1 Tworzenie konfiguracji PM2

```bash
cd /var/www/produkcja-app/server
nano ecosystem.config.cjs
```

Wklej:
```javascript
module.exports = {
  apps: [{
    name: 'produkcja-api',
    script: 'dist/index.js',
    cwd: '/var/www/produkcja-app/server',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    },
    error_file: '/var/log/pm2/produkcja-error.log',
    out_file: '/var/log/pm2/produkcja-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
```

### 6.2 Tworzenie katalogu logów

```bash
sudo mkdir -p /var/log/pm2
sudo chown $USER:$USER /var/log/pm2
```

### 6.3 Uruchomienie aplikacji

```bash
cd /var/www/produkcja-app/server
pm2 start ecosystem.config.cjs

# Sprawdzenie statusu
pm2 status

# Podgląd logów
pm2 logs produkcja-api
```

### 6.4 Test działania API

```bash
curl http://localhost:3011/api/health
```

Powinieneś zobaczyć odpowiedź JSON ze statusem "healthy".

---

## 7. Konfiguracja Nginx (reverse proxy)

### 7.1 Tworzenie konfiguracji

```bash
sudo nano /etc/nginx/sites-available/produkcja-app
```

Wklej:
```nginx
server {
    listen 3010;                    # Port frontendu (HTTP)
    server_name _;                  # Akceptuje wszystkie hosty (IP)

    # Logowanie
    access_log /var/log/nginx/produkcja-access.log;
    error_log /var/log/nginx/produkcja-error.log;

    # Frontend (statyczne pliki)
    root /var/www/produkcja-app/client/dist;
    index index.html;

    # Obsługa React Router (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API - proxy do Node.js (backend na porcie 3011)
    location /api {
        proxy_pass http://127.0.0.1:3011;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Bezpieczeństwo - ukrycie plików
    location ~ /\. {
        deny all;
    }
}
```

### 7.2 Aktywacja konfiguracji

```bash
# Usunięcie domyślnej strony
sudo rm /etc/nginx/sites-enabled/default

# Aktywacja nowej konfiguracji
sudo ln -s /etc/nginx/sites-available/produkcja-app /etc/nginx/sites-enabled/

# Test konfiguracji
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### 7.3 Test

Otwórz w przeglądarce: `http://ADRES_IP_SERWERA:3010`

---

## 8. Konfiguracja HTTPS (certyfikat SSL)

### Opcja A: Certyfikat Let's Encrypt (dla publicznej domeny)

```bash
# Instalacja Certbot
sudo apt install -y certbot python3-certbot-nginx

# Uzyskanie certyfikatu
sudo certbot --nginx -d produkcja.twoja-firma.pl

# Automatyczne odnowienie (certbot dodaje automatycznie cron)
sudo certbot renew --dry-run
```

### Opcja B: Certyfikat self-signed (dla sieci wewnętrznej) - ZALECANE

```bash
# Tworzenie katalogu na certyfikaty
sudo mkdir -p /etc/nginx/ssl

# Generowanie certyfikatu (ważny 365 dni)
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/produkcja.key \
    -out /etc/nginx/ssl/produkcja.crt \
    -subj "/CN=produkcja-app"
```

Następnie edytuj `/etc/nginx/sites-available/produkcja-app` i **zamień** całą konfigurację na wersję z HTTPS:

```nginx
# Przekierowanie HTTP -> HTTPS
server {
    listen 3010;
    server_name _;
    return 301 https://$host:3010$request_uri;
}

# HTTPS
server {
    listen 3010 ssl http2;
    server_name _;

    ssl_certificate /etc/nginx/ssl/produkcja.crt;
    ssl_certificate_key /etc/nginx/ssl/produkcja.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # Logowanie
    access_log /var/log/nginx/produkcja-access.log;
    error_log /var/log/nginx/produkcja-error.log;

    # Frontend (statyczne pliki)
    root /var/www/produkcja-app/client/dist;
    index index.html;

    # Obsługa React Router (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API - proxy do Node.js
    location /api {
        proxy_pass http://127.0.0.1:3011;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    location ~ /\. {
        deny all;
    }
}
```

Po edycji:
```bash
sudo nginx -t && sudo systemctl restart nginx
```

> **Uwaga**: Przy self-signed certyfikacie przeglądarka pokaże ostrzeżenie - kliknij "Zaawansowane" > "Przejdź do strony".

---

## 9. Firewall i dostęp cross-VLAN

### 9.1 Konfiguracja UFW (firewall na serwerze)

```bash
# Włączenie firewalla
sudo ufw enable

# Dozwolone porty
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 3010/tcp    # Aplikacja (Nginx)

# Sprawdzenie statusu
sudo ufw status
```

### 9.2 Konfiguracja dostępu z innych VLANów

Aby komputery z innych VLANów mogły się łączyć, potrzebujesz:

#### A) Na routerze/firewall firmowym (np. pfSense, MikroTik, FortiGate)

Dodaj regułę zezwalającą na ruch:
- **Źródło**: Wszystkie VLANy, które mają mieć dostęp (np. 192.168.10.0/24, 192.168.20.0/24)
- **Cel**: IP serwera aplikacji
- **Port docelowy**: 3010/TCP
- **Akcja**: Allow

Przykład dla MikroTik:
```
/ip firewall filter add chain=forward src-address=192.168.10.0/24 dst-address=192.168.1.100 dst-port=3010 protocol=tcp action=accept
/ip firewall filter add chain=forward src-address=192.168.20.0/24 dst-address=192.168.1.100 dst-port=3010 protocol=tcp action=accept
```

Przykład dla pfSense:
1. Firewall > Rules > [VLAN interface]
2. Add rule: Pass, TCP, Destination: IP_serwera, Port: 3010

#### B) Routing między VLANami

Upewnij się, że VLANy mają skonfigurowany routing do siebie przez router główny (gateway).

#### C) Hyper-V Virtual Switch

Jeśli VM jest na Hyper-V, upewnij się że:
- Virtual Switch jest typu **External** (połączony z fizyczną kartą sieciową)
- VM ma przypisany statyczny IP w odpowiedniej sieci

### 9.3 Testowanie dostępu z innego VLANu

Z komputera w innym VLANie:
```powershell
# Test połączenia
Test-NetConnection -ComputerName 192.168.x.x -Port 3010

# Lub w przeglądarce
http://192.168.x.x:3010
```

### 9.4 Zabezpieczenie SSH

```bash
sudo nano /etc/ssh/sshd_config
```

Zmień/dodaj:
```
PermitRootLogin no
MaxAuthTries 3
```

Restart SSH:
```bash
sudo systemctl restart sshd
```

### 9.5 Automatyczne aktualizacje bezpieczeństwa

```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## 10. Automatyczny start po restarcie

### 10.1 PM2 startup

```bash
# Generowanie skryptu startowego
pm2 startup

# PM2 wyświetli komendę do uruchomienia - skopiuj ją i wykonaj, np:
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u admin --hp /home/admin

# Zapisanie aktualnej konfiguracji
pm2 save
```

### 10.2 Sprawdzenie usług

```bash
# Wszystkie usługi powinny być enabled
sudo systemctl is-enabled nginx
```

---

## 11. Monitorowanie i logi

### 11.1 Logi aplikacji

```bash
# Logi PM2 (aplikacja Node.js)
pm2 logs produkcja-api

# Lub bezpośrednio
tail -f /var/log/pm2/produkcja-out.log
tail -f /var/log/pm2/produkcja-error.log
```

### 11.2 Logi Nginx

```bash
# Logi dostępu
tail -f /var/log/nginx/produkcja-access.log

# Logi błędów
tail -f /var/log/nginx/produkcja-error.log
```

### 11.3 Monitorowanie PM2

```bash
# Status wszystkich procesów
pm2 status

# Szczegółowy monitoring
pm2 monit

# Informacje o procesie
pm2 show produkcja-api
```

### 11.4 Health check

```bash
# Sprawdzenie czy aplikacja działa
curl -s http://localhost:3011/api/health | jq
```

---

## 12. Aktualizacja aplikacji

### 12.1 Procedura aktualizacji

```bash
# 1. Przejdź do katalogu aplikacji
cd /var/www/produkcja-app

# 2. Pobierz najnowszy kod (jeśli używasz Git)
git pull origin main

# 3. Zainstaluj zależności i zbuduj
cd shared && npm install && npm run build
cd ../server && npm install --production && npm run build
cd ../client && npm install && npm run build

# 4. Zrestartuj aplikację
pm2 restart produkcja-api

# 5. Sprawdź logi
pm2 logs produkcja-api --lines 50
```

### 12.2 Rollback (cofnięcie zmian)

```bash
# Jeśli używasz Git
cd /var/www/produkcja-app
git checkout POPRZEDNI_COMMIT_HASH

# Przebuduj i zrestartuj
cd server && npm run build
pm2 restart produkcja-api
```

---

## Szybka lista kontrolna

Po zakończeniu deploymentu sprawdź:

- [ ] Aplikacja odpowiada na `http://IP_SERWERA:3010/api/health`
- [ ] Można się zalogować przez interfejs webowy
- [ ] PM2 pokazuje status "online": `pm2 status`
- [ ] Nginx działa: `sudo systemctl status nginx`
- [ ] Firewall skonfigurowany: `sudo ufw status`
- [ ] Dostęp z innego VLANu działa
- [ ] Logi nie pokazują błędów: `pm2 logs --lines 100`
- [ ] Automatyczny restart działa: `pm2 save` i restart serwera

---

## Rozwiązywanie problemów

### Aplikacja nie startuje

```bash
# Sprawdź logi
pm2 logs produkcja-api --err --lines 100

# Sprawdź czy .env istnieje i ma poprawne uprawnienia
ls -la /var/www/produkcja-app/server/.env

# Przetestuj ręcznie
cd /var/www/produkcja-app/server
node dist/index.js
```

### Błąd połączenia z bazą danych

```bash
# Sprawdź czy PostgreSQL działa
sudo systemctl status postgresql

# Przetestuj połączenie
psql -h localhost -U produkcja_app_user -d nazwa_bazy_erp
```

### Nginx zwraca 502 Bad Gateway

```bash
# Sprawdź czy aplikacja Node.js działa
pm2 status
curl http://localhost:3011/api/health

# Sprawdź logi Nginx
sudo tail -f /var/log/nginx/produkcja-error.log
```

### Brak dostępu z zewnątrz / innego VLANu

```bash
# Sprawdź firewall na serwerze
sudo ufw status

# Sprawdź czy Nginx nasłuchuje na porcie 3010
sudo ss -tlnp | grep 3010

# Test z serwera
curl http://localhost:3010/api/health
```

Jeśli lokalnie działa, ale z innego VLANu nie:
1. Sprawdź reguły na routerze/firewall firmowym
2. Sprawdź routing między VLANami
3. Wykonaj traceroute z komputera klienckiego: `tracert IP_SERWERA`

---

## Kontakt i wsparcie

W razie problemów:
1. Sprawdź logi (PM2, Nginx, PostgreSQL)
2. Zweryfikuj konfigurację zmiennych środowiskowych
3. Upewnij się, że wszystkie usługi działają

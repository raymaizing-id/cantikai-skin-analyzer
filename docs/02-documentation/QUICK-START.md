# Quick Start

## 1. Database (MySQL)
Pastikan MySQL nyala dulu:
```bash
net start mysql
```
Fresh install? Jalankan sekali:
```bash
cantikai-skin-analyzer\backend
node src/scripts/init-database.js
node src/scripts/migrate-doctors.js
```

## 2. Backend
```bash
cd cantikai-skin-analyzer/backend
node src/index.js
```
Cek: http://localhost:8000/health

## 3. Frontend
```bash
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
cd cantikai-skin-analyzer/platforms/pwa
npm run dev
```
Buka: http://localhost:5173

---

## URL
| | URL |
|---|---|
| PWA | http://localhost:5173 |
| Admin | http://localhost:5173/admin |

## Admin Login
```
Username : admin
Password : admin123
```

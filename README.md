# QuickCart 🛒

⚡ Quick-commerce mobile & web application with a **Python FastAPI** backend, **MongoDB** database, and an **Expo (React Native)** frontend.

---

## 📁 Repository Structure

```
quickCart00000/
├── backend/                  # 🐍 Python FastAPI Backend
│   ├── .env                  # Backend configuration (PORT, MONGODB_URI, JWT_SECRET)
│   ├── requirements.txt      # FastAPI, Motor, Pydantic, Bcrypt, PyJWT dependencies
│   ├── main.py               # Main API application & CORS
│   ├── config/               # Asynchronous MongoDB (Motor) connection
│   ├── routers/              # API Endpoints (/api/auth, /api/products, /api/orders, etc.)
│   └── utils/                # Password hashing, JWT tokens, and SMTP email dispatcher
│
├── frontend/                 # 📱 Expo (React Native) Frontend
│   ├── app/                  # Expo Router file-based screens
│   ├── components/           # Reusable UI components
│   ├── services/             # Client services (orders, addresses, products)
│   ├── utils/                # API client (api.ts), session management, currency
│   ├── assets/               # Fonts, images, and branding assets
│   ├── package.json          # React Native & Expo SDK 54 dependencies
│   └── tsconfig.json         # TypeScript configuration
│
├── docs/                     # 📄 Project documentation & presentations
├── start-backend.bat         # 🚀 1-Click script to run FastAPI server
└── start-frontend.bat        # 🚀 1-Click script to run Expo frontend
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Python 3.10+** (tested on Python 3.14)
- **Node.js 18+** & npm
- **MongoDB** running locally on `mongodb://127.0.0.1:27017`

### 2. Start the Backend (Python FastAPI)
Double-click `start-backend.bat` or run:
```powershell
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 5000 --reload
```
- **API URL**: `http://localhost:5000`
- **Interactive Swagger Docs**: `http://localhost:5000/docs`

### 3. Start the Frontend (Expo / React Native)
Double-click `start-frontend.bat` or run:
```powershell
cd frontend
npx expo start
```
- Press **`a`** to open in Android Emulator / Device.
- Press **`w`** to open in Web Browser.
- Scan the QR code with **Expo Go** on your phone.

---

## 🔑 Test Accounts in MongoDB

| Role | Email | Password |
| :--- | :--- | :--- |
| **Customer** | `rajputayush18012004@gmail.com` | `Password123` |
| **Admin** | `admin@quickcart.com` | `Admin123` |

# 📈 Taizer Profit Book - Crypto Daily Income & Target Sheet

An advanced, responsive Progressive Web Application (PWA) and Crypto Trading Journal designed for daily profit tracking, 30-day compounded targets, real live wallet balance management, and multi-user administration.

---

## 🚀 Key Features

- **Real Live Wallet Balance Tracking**: Real-time balance calculation (`Base Starting Deposit + Net Realized Profits/Losses`) across all trades.
- **Auto 30-Day Compounding Target Engine**: Automated tier and target calculations based on multiples of $10 ($10-$19: $3/day, $20-$29: $6/day, etc.) with end-of-month baseline rollover projections.
- **Admin Approval & Multi-Trader Management**:
  - Regular users sign up and require Admin approval before gaining access.
  - Dedicated Admin **Users** tab (exclusive to Admin) to review, approve, reject, and delete trader accounts.
  - Admin view shows real live wallet balances, net P&L badges, trade counts, and combined portfolio capital.
- **MongoDB Atlas Cloud Persistence**: All traders, trades, daily targets, and approval statuses persist securely to MongoDB Atlas with auto-reconnection and DNS resolution.
- **Installable PWA (Mobile & Desktop)**: Fully installable as a standalone app on Android, iOS, Windows, and Mac with custom app icons and offline support.
- **Clean Starting Data**: Zero dummy or mock transactions—starts fresh with your real trades.
- **Export & Filtering**: Monthly and yearly filtering, win rate calculations, and 1-click CSV target sheet export.

---

## 🛠️ Quick Start

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- MongoDB Atlas cluster or local MongoDB instance

### 2. Installation
```bash
git clone https://github.com/econoacademylk-png/taizer-profite-book.git
cd taizer-profite-book
npm install
```

### 3. Environment Setup
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Configure your MongoDB Atlas connection in `.env`:
```env
MONGODB_URI="mongodb+srv://<username>:<password>@cluster0.ouxm37c.mongodb.net/taizer_profit_book?retryWrites=true&w=majority&appName=Cluster0"
PORT=3000
```

### 4. Run Locally
Start the development server (runs both frontend & MongoDB API on port 3000):
```bash
npm run dev
```
Or double-click `start.bat` on Windows.

Open your browser at:
`http://localhost:3000`

---

## 🛡️ Default Administrator
- **Admin Email**: `supundilshan38@gmail.com`
- **Admin Password**: `addi`

---

## 📦 Production Build
```bash
npm run build
npm start
```

---

## 📄 License
Apache-2.0

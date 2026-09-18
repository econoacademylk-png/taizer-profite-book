export type TransactionType = 'income' | 'loss';

export interface Transaction {
  id: string;
  userId?: string;
  amount: number;
  type: TransactionType;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss A or HH:mm A
  timestamp: number; // Date.now()
  note?: string;
}

export interface SheetFilter {
  mode: 'month' | 'year';
  year: number;
  month: number; // 0 to 11 (0 = January)
}

export type UserRole = 'admin' | 'user';
export type UserStatus = 'pending' | 'approved' | 'rejected';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  status: UserStatus;
  walletBalance: number; // Starting wallet balance in USD (must be >= 10)
  currentRealBalance?: number; // Real current wallet balance (Starting + Net Profit)
  netProfit?: number; // Total net profit accumulated (Income - Loss)
  totalIncome?: number; // Total income generated
  totalLoss?: number; // Total loss incurred
  totalTrades?: number; // Number of recorded transactions
  dailyTarget: number; // calculated tier * 3
  startDate: string; // YYYY-MM-DD
  monthNumber: number; // 1, 2, 3...
  isRegistered: boolean;
  pin?: string;
  createdAt: string; // YYYY-MM-DD or ISO string
}

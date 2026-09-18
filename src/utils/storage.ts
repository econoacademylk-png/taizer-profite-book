import { Transaction, UserProfile, UserStatus } from '../types';
import {
  registerUserOnCloud,
  loginUserOnCloud,
  updateUserStatusOnCloud,
  deleteUserOnCloud,
  saveTransactionToCloud,
  deleteTransactionFromCloud,
  saveTargetToCloud,
  fetchTransactionsFromCloud,
  fetchUsersFromCloud,
} from './api';

export const ADMIN_EMAIL = 'supundilshan38@gmail.com';
export const ADMIN_PASSWORD = 'addi';

const STORAGE_KEY = 'income_target_sheet_transactions';
const TARGET_STORAGE_KEY = 'income_target_sheet_goals';
const PROFILE_STORAGE_KEY = 'taizer_crypto_user_profile';
const USERS_LIST_KEY = 'taizer_registered_users_list';

export function calculateDailyTarget(walletBalance: number): number {
  if (walletBalance < 10) return 0;
  // Multiples of 3 based on 10s:
  // $10 - $19.99: $3
  // $20 - $29.99: $6
  // $30 - $39.99: $9
  // $40 - $49.99: $12
  // $50 - $59.99: $15
  const tier = Math.floor(walletBalance / 10);
  return tier * 3;
}

/**
 * Calculates Next Month Target based on the user's account balance after 30 days.
 */
export function calculateNextMonthTargetFromBalance(accountBalance: number) {
  const safeBalance = Math.max(10, accountBalance);
  // Floor to multiples of $10:
  const baseTierBalance = Math.floor(safeBalance / 10) * 10;
  const tier = Math.floor(baseTierBalance / 10);
  const dailyTarget = tier * 3;
  const thirtyDayGoal = dailyTarget * 30;
  const surplusBalance = Number((safeBalance - baseTierBalance).toFixed(2));
  const nextMilestoneBalance = baseTierBalance + 10;
  const neededForNextTier = Number((nextMilestoneBalance - safeBalance).toFixed(2));

  return {
    rawBalance: safeBalance,
    baseTierBalance,
    tier,
    dailyTarget,
    thirtyDayGoal,
    surplusBalance,
    nextMilestoneBalance,
    neededForNextTier,
    nextTierTarget: (tier + 1) * 3,
  };
}

export function getTierInfo(walletBalance: number) {
  const safeBalance = Math.max(10, walletBalance);
  const tier = Math.floor(safeBalance / 10);
  const dailyTarget = tier * 3;
  const minRange = tier * 10;
  const maxRange = (tier + 1) * 10;
  return {
    tier,
    dailyTarget,
    minRange,
    maxRange,
    nextTierBalance: maxRange,
    nextTierTarget: (tier + 1) * 3,
    thirtyDayGoal: dailyTarget * 30,
  };
}

export function getAdminSeedUser(): UserProfile {
  return {
    id: 'admin-supundilshan',
    name: 'Supun Dilshan (Admin)',
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    role: 'admin',
    status: 'approved',
    walletBalance: 100,
    dailyTarget: 30,
    startDate: getCurrentDateString(),
    monthNumber: 1,
    isRegistered: true,
    createdAt: new Date().toISOString().split('T')[0],
  };
}

/**
 * Load all registered users. Automatically seeds admin user if not present.
 */
export function loadAllUsers(): UserProfile[] {
  try {
    const raw = localStorage.getItem(USERS_LIST_KEY);
    let users: UserProfile[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(users)) users = [];

    // Ensure default admin account exists and has latest credentials
    const adminIndex = users.findIndex(
      (u) => u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
    );

    if (adminIndex === -1) {
      users.unshift(getAdminSeedUser());
      saveAllUsers(users);
    } else {
      // Ensure password and role are in sync
      if (users[adminIndex].password !== ADMIN_PASSWORD || users[adminIndex].role !== 'admin' || users[adminIndex].status !== 'approved') {
        users[adminIndex] = {
          ...users[adminIndex],
          password: ADMIN_PASSWORD,
          role: 'admin',
          status: 'approved',
        };
        saveAllUsers(users);
      }
    }

    return users;
  } catch (err) {
    console.error('Failed to load users list', err);
    return [getAdminSeedUser()];
  }
}

export function saveAllUsers(users: UserProfile[]): void {
  try {
    localStorage.setItem(USERS_LIST_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('Failed to save users list', err);
  }
}

/**
 * Register a new user with status 'pending' (requires Admin approval).
 */
export function registerNewUser(data: {
  name: string;
  email: string;
  password: string;
  walletBalance: number;
}): { success: boolean; message: string; user?: UserProfile } {
  const users = loadAllUsers();
  const cleanEmail = data.email.trim().toLowerCase();

  // Check if admin email
  if (cleanEmail === ADMIN_EMAIL.toLowerCase()) {
    return {
      success: false,
      message: 'This email is reserved for the System Administrator.',
    };
  }

  // Check existing email
  const existing = users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (existing) {
    return {
      success: false,
      message: 'An account with this email already exists. Please log in or wait for Admin approval.',
    };
  }

  const calculatedTarget = calculateDailyTarget(data.walletBalance);
  const newUser: UserProfile = {
    id: 'user-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    name: data.name.trim(),
    email: cleanEmail,
    password: data.password,
    role: 'user',
    status: 'pending', // Requires admin approval!
    walletBalance: data.walletBalance,
    dailyTarget: calculatedTarget,
    startDate: getCurrentDateString(),
    monthNumber: 1,
    isRegistered: false,
    createdAt: getCurrentDateString(),
  };

  users.push(newUser);
  saveAllUsers(users);

  return {
    success: true,
    message: 'Registration submitted! Your account is pending Admin approval. You will be able to log in once Admin (supundilshan38@gmail.com) approves your request.',
    user: newUser,
  };
}

/**
 * Authenticate login for Admin or User.
 */
export function authenticateUser(
  identifier: string,
  passwordInput: string
): { success: boolean; message: string; user?: UserProfile } {
  const users = loadAllUsers();
  const cleanId = identifier.trim().toLowerCase();

  // Find user by email or username
  const matched = users.find(
    (u) => u.email.toLowerCase() === cleanId || u.name.toLowerCase() === cleanId
  );

  if (!matched) {
    return {
      success: false,
      message: 'No account found matching this email or username.',
    };
  }

  if (matched.password !== passwordInput) {
    return {
      success: false,
      message: 'Incorrect password. Please try again.',
    };
  }

  // If regular user, check approval status
  if (matched.role === 'user') {
    if (matched.status === 'pending') {
      return {
        success: false,
        message: 'Your account is pending approval by the Admin (supundilshan38@gmail.com). Please wait until approved.',
      };
    }
    if (matched.status === 'rejected') {
      return {
        success: false,
        message: 'Your account request was declined by the Admin. Please contact supundilshan38@gmail.com for assistance.',
      };
    }
  }

  const loggedInProfile: UserProfile = {
    ...matched,
    isRegistered: true,
  };

  saveUserProfile(loggedInProfile);

  return {
    success: true,
    message: matched.role === 'admin' ? 'Welcome Admin!' : 'Logged in successfully!',
    user: loggedInProfile,
  };
}

/**
 * Admin action: Approve or reject user.
 */
export function updateUserStatus(userId: string, newStatus: UserStatus): void {
  const users = loadAllUsers();
  const updated = users.map((u) => {
    if (u.id === userId) {
      return { ...u, status: newStatus };
    }
    return u;
  });
  saveAllUsers(updated);

  // If current logged-in user is this user, update active profile
  const current = loadUserProfile();
  if (current && current.id === userId) {
    saveUserProfile({ ...current, status: newStatus });
  }
}

/**
 * Admin action: Delete a user permanently.
 */
export function deleteUser(userId: string): boolean {
  const users = loadAllUsers();
  const target = users.find((u) => u.id === userId);
  if (!target || target.role === 'admin') return false; // cannot delete admin

  const filtered = users.filter((u) => u.id !== userId);
  saveAllUsers(filtered);

  // Clear user's transactions
  try {
    localStorage.removeItem(`${STORAGE_KEY}_${userId}`);
    localStorage.removeItem(`${TARGET_STORAGE_KEY}_${userId}`);
  } catch (err) {
    console.error(err);
  }

  return true;
}

export function getPendingUsersCount(): number {
  const users = loadAllUsers();
  return users.filter((u) => u.role === 'user' && u.status === 'pending').length;
}

export function loadUserProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) {
      // Return default admin profile as logged in if none exists
      return null;
    }
    const profile = JSON.parse(raw);
    return profile;
  } catch (err) {
    console.error('Failed to load profile', err);
    return null;
  }
}

export function saveUserProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch (err) {
    console.error('Failed to save profile', err);
  }
}

export function calculateDayProfit(transactions: Transaction[], dateStr: string): number {
  const dayTxs = transactions.filter((t) => t.date === dateStr);
  const income = dayTxs.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const loss = dayTxs.filter((t) => t.type === 'loss').reduce((sum, t) => sum + t.amount, 0);
  return income - loss;
}

/**
 * Load transactions isolated per user. Fallback to global storage if legacy.
 */
export function loadTransactions(userId?: string): Transaction[] {
  try {
    const userKey = userId ? `${STORAGE_KEY}_${userId}` : STORAGE_KEY;
    let raw = localStorage.getItem(userKey);

    // If per-user storage is empty, check legacy global storage
    if (!raw && userId) {
      raw = localStorage.getItem(STORAGE_KEY);
    }

    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];

    // Purge any mock sample data
    const clean = data.filter((t: any) => !t.id?.startsWith('sample-'));
    if (clean.length !== data.length) {
      localStorage.setItem(userKey, JSON.stringify(clean));
    }
    return clean;
  } catch (err) {
    console.error('Failed to load transactions from localStorage', err);
    return [];
  }
}

export function saveTransactions(transactions: Transaction[], userId?: string): void {
  try {
    const userKey = userId ? `${STORAGE_KEY}_${userId}` : STORAGE_KEY;
    localStorage.setItem(userKey, JSON.stringify(transactions));
  } catch (err) {
    console.error('Failed to save transactions to localStorage', err);
  }
}

export function loadTargets(userId?: string): Record<string, number> {
  try {
    const userKey = userId ? `${TARGET_STORAGE_KEY}_${userId}` : TARGET_STORAGE_KEY;
    let raw = localStorage.getItem(userKey);
    if (!raw && userId) {
      raw = localStorage.getItem(TARGET_STORAGE_KEY);
    }
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    return {};
  }
}

export function saveTarget(monthKey: string, amount: number, userId?: string): void {
  try {
    const targets = loadTargets(userId);
    targets[monthKey] = amount;
    const userKey = userId ? `${TARGET_STORAGE_KEY}_${userId}` : TARGET_STORAGE_KEY;
    localStorage.setItem(userKey, JSON.stringify(targets));
    saveTargetToCloud(monthKey, amount, userId).catch((e) =>
      console.log('MongoDB target sync error:', e)
    );
  } catch (err) {
    console.error('Failed to save target', err);
  }
}

export function formatCurrency(amount: number, type?: 'income' | 'loss'): string {
  const formatted = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (type === 'loss') {
    return `-$${formatted}`;
  } else if (type === 'income') {
    return `+$${formatted}`;
  }
  return `$${formatted}`;
}

export function getCurrentDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentTimeString(): string {
  const now = new Date();
  return now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

export function formatDateDisplay(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}


import { Transaction, UserProfile, UserStatus } from '../types';

export const API_BASE = '/api';

export async function checkCloudHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === 'connected';
  } catch (err) {
    return false;
  }
}

export async function fetchUsersFromCloud(): Promise<UserProfile[] | null> {
  try {
    const res = await fetch(`${API_BASE}/users`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

export async function registerUserOnCloud(data: {
  name: string;
  email: string;
  password?: string;
  walletBalance: number;
}): Promise<{ success: boolean; message: string; user?: UserProfile }> {
  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    return result;
  } catch (err: any) {
    return { success: false, message: 'Network error connecting to database.' };
  }
}

export async function loginUserOnCloud(
  identifier: string,
  password?: string
): Promise<{ success: boolean; message: string; user?: UserProfile }> {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });
    const result = await res.json();
    return result;
  } catch (err: any) {
    return { success: false, message: 'Network error connecting to database.' };
  }
}

export async function updateUserStatusOnCloud(
  userId: string,
  status: UserStatus
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/users/${userId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return res.ok;
  } catch (err) {
    return false;
  }
}

export async function deleteUserOnCloud(userId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/users/${userId}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (err) {
    return false;
  }
}

export async function updateProfileOnCloud(
  userId: string,
  updates: Partial<UserProfile>
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return res.ok;
  } catch (err) {
    return false;
  }
}

export async function fetchTransactionsFromCloud(userId?: string): Promise<Transaction[] | null> {
  try {
    const param = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    const res = await fetch(`${API_BASE}/transactions${param}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

export async function saveTransactionToCloud(tx: Transaction, userId?: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...tx, userId: userId || 'global' }),
    });
    return res.ok;
  } catch (err) {
    return false;
  }
}

export async function deleteTransactionFromCloud(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/transactions/${id}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (err) {
    return false;
  }
}

export async function fetchTargetsFromCloud(userId?: string): Promise<Record<string, number> | null> {
  try {
    const param = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    const res = await fetch(`${API_BASE}/targets${param}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

export async function saveTargetToCloud(
  monthKey: string,
  amount: number,
  userId?: string
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/targets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monthKey, amount, userId: userId || 'global' }),
    });
    return res.ok;
  } catch (err) {
    return false;
  }
}

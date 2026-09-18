import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Users as UsersIcon,
  CheckCircle2,
  XCircle,
  Trash2,
  Search,
  Clock,
  Wallet,
  Target,
  ShieldCheck,
  AlertTriangle,
  UserCheck,
  UserX,
  Mail,
  Calendar,
  Sparkles,
  Edit3,
  DollarSign,
  X,
  TrendingUp,
} from 'lucide-react';
import { UserProfile, UserStatus } from '../types';
import {
  loadAllUsers,
  updateUserStatus,
  deleteUser,
  formatCurrency,
  formatDateDisplay,
  ADMIN_EMAIL,
  saveAllUsers,
  calculateDailyTarget,
  getTierInfo,
  loadUserProfile,
  saveUserProfile,
} from '../utils/storage';
import { fetchUsersFromCloud, updateProfileOnCloud } from '../utils/api';
import { TaizerLogo } from './TaizerLogo';

interface UsersViewProps {
  onUserStatusChanged?: () => void;
  onProfileUpdated?: (updated: UserProfile) => void;
}

export const UsersView: React.FC<UsersViewProps> = ({ onUserStatusChanged, onProfileUpdated }) => {
  const [users, setUsers] = useState<UserProfile[]>(() => loadAllUsers());
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'all' | 'approved' | 'rejected'>('pending');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'danger' } | null>(null);

  // Sync users with MongoDB Atlas on load
  React.useEffect(() => {
    fetchUsersFromCloud().then((cloudUsers) => {
      if (cloudUsers && Array.isArray(cloudUsers)) {
        setUsers(cloudUsers);
        saveAllUsers(cloudUsers);

        // Sync currently logged-in user profile from MongoDB Atlas cloud database
        const currentProfile = loadUserProfile();
        if (currentProfile) {
          const self = cloudUsers.find(
            (u) =>
              (currentProfile.id && u.id === currentProfile.id) ||
              (currentProfile.email && u.email.toLowerCase() === currentProfile.email.toLowerCase())
          );
          if (self && onProfileUpdated) {
            const syncedProfile = {
              ...currentProfile,
              ...self,
            };
            saveUserProfile(syncedProfile);
            onProfileUpdated(syncedProfile);
          }
        }
      }
    });
  }, [onProfileUpdated]);

  const refreshUsers = () => {
    const updated = loadAllUsers();
    setUsers(updated);
    if (onUserStatusChanged) onUserStatusChanged();
    fetchUsersFromCloud().then((cloudUsers) => {
      if (cloudUsers && Array.isArray(cloudUsers)) {
        setUsers(cloudUsers);
        saveAllUsers(cloudUsers);

        // Sync currently logged-in user profile from MongoDB Atlas cloud database
        const currentProfile = loadUserProfile();
        if (currentProfile) {
          const self = cloudUsers.find(
            (u) =>
              (currentProfile.id && u.id === currentProfile.id) ||
              (currentProfile.email && u.email.toLowerCase() === currentProfile.email.toLowerCase())
          );
          if (self && onProfileUpdated) {
            const syncedProfile = {
              ...currentProfile,
              ...self,
            };
            saveUserProfile(syncedProfile);
            onProfileUpdated(syncedProfile);
          }
        }
      }
    });
  };

  const handleApprove = (user: UserProfile) => {
    updateUserStatus(user.id, 'approved');
    refreshUsers();
    setFeedback({
      message: `User "${user.name}" (${user.email}) has been APPROVED! They can now log in.`,
      type: 'success',
    });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleReject = (user: UserProfile) => {
    updateUserStatus(user.id, 'rejected');
    refreshUsers();
    setFeedback({
      message: `User "${user.name}" has been REJECTED.`,
      type: 'danger',
    });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleDelete = (user: UserProfile) => {
    if (user.role === 'admin' || user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      alert('The primary Admin account cannot be deleted.');
      return;
    }

    if (window.confirm(`Are you sure you want to permanently remove user "${user.name}" (${user.email})?`)) {
      deleteUser(user.id);
      refreshUsers();
      setFeedback({
        message: `User "${user.name}" has been removed.`,
        type: 'danger',
      });
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  // Edit Starting Wallet & Daily Target Modal State
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editWalletInput, setEditWalletInput] = useState<string>('');
  const [isSavingWallet, setIsSavingWallet] = useState<boolean>(false);

  const handleOpenEditWallet = (user: UserProfile) => {
    setEditingUser(user);
    setEditWalletInput(String(user.walletBalance || 10));
  };

  const handleSaveEditWallet = async () => {
    if (!editingUser) return;
    const parsed = parseFloat(editWalletInput);
    if (isNaN(parsed) || parsed < 10) {
      alert('Wallet deposit must be at least $10.00 USD.');
      return;
    }

    setIsSavingWallet(true);
    const newDailyTarget = calculateDailyTarget(parsed);

    // 1. Update in local storage
    const allUsers = loadAllUsers();
    const updatedList = allUsers.map((u) => {
      if (u.id === editingUser.id || u.email === editingUser.email) {
        return {
          ...u,
          walletBalance: parsed,
          dailyTarget: newDailyTarget,
        };
      }
      return u;
    });
    saveAllUsers(updatedList);

    // If currently logged-in user is this user (e.g. Admin or self), update active profile
    const currentProfile = loadUserProfile();
    if (currentProfile && (currentProfile.id === editingUser.id || currentProfile.email === editingUser.email)) {
      const updatedSelf = {
        ...currentProfile,
        walletBalance: parsed,
        dailyTarget: newDailyTarget,
      };
      saveUserProfile(updatedSelf);
      if (onProfileUpdated) onProfileUpdated(updatedSelf);
    }

    // 2. Sync to MongoDB Atlas Cloud Database
    await updateProfileOnCloud(editingUser.id || editingUser.email, {
      walletBalance: parsed,
      dailyTarget: newDailyTarget,
    });

    setIsSavingWallet(false);
    setEditingUser(null);
    refreshUsers();
    setFeedback({
      message: `Updated wallet balance for "${editingUser.name}" to $${parsed.toFixed(2)} USD (Daily Target: $${newDailyTarget.toFixed(2)}/day). Saved to MongoDB Atlas!`,
      type: 'success',
    });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Metrics
  const totalUsers = users.filter((u) => u.role !== 'admin').length;
  const pendingUsers = users.filter((u) => u.role !== 'admin' && u.status === 'pending');
  const approvedUsers = users.filter((u) => u.role !== 'admin' && u.status === 'approved');
  const totalStartingCapital = approvedUsers.reduce((sum, u) => sum + (u.walletBalance || 0), 0);
  const totalCapital = approvedUsers.reduce(
    (sum, u) => sum + (typeof u.currentRealBalance === 'number' ? u.currentRealBalance : (u.walletBalance || 0)),
    0
  );
  const totalCombinedProfit = Number((totalCapital - totalStartingCapital).toFixed(2));

  // Filtered list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Don't show admin in the approval pending list
      if (statusFilter === 'pending' && u.role === 'admin') return false;

      if (statusFilter !== 'all' && u.status !== statusFilter) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = u.name.toLowerCase().includes(q);
        const matchesEmail = u.email.toLowerCase().includes(q);
        return matchesName || matchesEmail;
      }
      return true;
    });
  }, [users, statusFilter, searchTerm]);

  return (
    <div id="users-view-container" className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-5">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`p-3.5 sm:p-4 rounded-2xl flex items-center justify-between border shadow-sm transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <div className="flex items-center space-x-2 text-sm font-semibold">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-bold underline cursor-pointer ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Admin Header & Welcome Card */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-xs p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-stone-950 text-white flex items-center justify-center font-black shadow-xs">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg sm:text-xl font-black text-stone-900 tracking-tight">
                  User Management &amp; Approvals
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-stone-900 text-emerald-400">
                  Admin Only
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Logged in as <strong>{ADMIN_EMAIL}</strong> • Review and approve trader access
              </p>
            </div>
          </div>

          {pendingUsers.length > 0 && (
            <div className="flex items-center space-x-2 bg-amber-50 border border-amber-200 text-amber-900 px-3.5 py-1.5 rounded-2xl animate-pulse">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-bold">
                {pendingUsers.length} {pendingUsers.length === 1 ? 'user requires' : 'users require'} your approval!
              </span>
            </div>
          )}
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
          {/* Card 1: Pending Approvals */}
          <div
            onClick={() => setStatusFilter('pending')}
            className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-amber-500/10 border-amber-400 ring-2 ring-amber-400/20'
                : 'bg-amber-50/50 border-amber-200/80 hover:bg-amber-50'
            }`}
          >
            <div className="flex items-center justify-between text-amber-800 text-xs font-semibold">
              <span>Pending Requests</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-mono font-black text-amber-950 mt-1">
              {pendingUsers.length}
            </div>
            <span className="text-[11px] text-amber-700 font-medium">Awaiting approval</span>
          </div>

          {/* Card 2: Approved Traders */}
          <div
            onClick={() => setStatusFilter('approved')}
            className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
              statusFilter === 'approved'
                ? 'bg-emerald-500/10 border-emerald-400 ring-2 ring-emerald-400/20'
                : 'bg-emerald-50/50 border-emerald-200/80 hover:bg-emerald-50'
            }`}
          >
            <div className="flex items-center justify-between text-emerald-800 text-xs font-semibold">
              <span>Approved Traders</span>
              <UserCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-mono font-black text-emerald-950 mt-1">
              {approvedUsers.length}
            </div>
            <span className="text-[11px] text-emerald-700 font-medium">Active users</span>
          </div>

          {/* Card 3: Total Users */}
          <div
            onClick={() => setStatusFilter('all')}
            className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-stone-900 text-white border-stone-900'
                : 'bg-stone-50 border-stone-200 hover:bg-stone-100 text-stone-800'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold opacity-80">
              <span>Total Registrations</span>
              <UsersIcon className="w-4 h-4" />
            </div>
            <div className="text-2xl sm:text-3xl font-mono font-black mt-1">
              {totalUsers}
            </div>
            <span className="text-[11px] opacity-75 font-medium">All accounts</span>
          </div>

          {/* Card 4: Total Combined Capital */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-stone-50 border border-stone-200">
            <div className="flex items-center justify-between text-stone-600 text-xs font-semibold">
              <span>Real Trader Capital</span>
              <Wallet className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-mono font-black text-stone-900 mt-1">
              ${totalCapital.toFixed(2)}
            </div>
            <div className="flex items-center space-x-1 text-[11px] text-stone-500 font-medium mt-0.5">
              <span>Base: ${totalStartingCapital.toFixed(2)}</span>
              <span>•</span>
              <span className={totalCombinedProfit >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                {totalCombinedProfit >= 0 ? '+' : ''}${totalCombinedProfit.toFixed(2)} P&L
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              statusFilter === 'pending'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Approvals</span>
            {pendingUsers.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                statusFilter === 'pending' ? 'bg-white text-amber-700' : 'bg-amber-500 text-white'
              }`}>
                {pendingUsers.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
            }`}
          >
            All Users ({users.length})
          </button>

          <button
            onClick={() => setStatusFilter('approved')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              statusFilter === 'approved'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Approved ({approvedUsers.length})</span>
          </button>

          <button
            onClick={() => setStatusFilter('rejected')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              statusFilter === 'rejected'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
            }`}
          >
            <UserX className="w-3.5 h-3.5" />
            <span>Rejected</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-stone-200 bg-stone-50 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
        </div>
      </div>

      {/* Users Table / List */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-16 px-4 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
              <UsersIcon className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-stone-800">No users found</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              {statusFilter === 'pending'
                ? 'Great job! There are currently no pending users waiting for approval.'
                : 'No users matched your current filter or search criteria.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50/80 border-b border-stone-200 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-3">Real Balance &amp; Target</th>
                  <th className="py-3.5 px-3">Registered Date</th>
                  <th className="py-3.5 px-3 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs">
                {filteredUsers.map((user) => {
                  const isAdmin = user.role === 'admin' || user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

                  return (
                    <tr
                      key={user.id}
                      className={`hover:bg-stone-50/70 transition-colors ${
                        user.status === 'pending' ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      {/* User Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                              isAdmin
                                ? 'bg-stone-950 text-emerald-400'
                                : user.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : user.status === 'pending'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {user.name ? user.name.slice(0, 2).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <span className="font-bold text-stone-900 text-sm">{user.name}</span>
                              {isAdmin && (
                                <span className="bg-stone-950 text-emerald-400 text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md">
                                  Admin
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-1 text-stone-500 text-[11px]">
                              <Mail className="w-3 h-3 text-stone-400" />
                              <span>{user.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Real Balance & Daily Target */}
                      <td className="py-3.5 px-3">
                        <div className="space-y-1">
                          {/* Real Live Balance */}
                          <div className="flex items-baseline space-x-1.5">
                            <span className="font-mono font-black text-sm text-stone-950">
                              ${(typeof user.currentRealBalance === 'number' ? user.currentRealBalance : (user.walletBalance || 0)).toFixed(2)}
                            </span>
                            <span className="text-[10px] font-bold uppercase text-stone-400">USD</span>
                            <span className="text-[9px] uppercase font-black px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                              Live
                            </span>
                          </div>

                          {/* Net Profit & Trades Badge */}
                          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                            <span
                              className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                                (user.netProfit || 0) > 0
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : (user.netProfit || 0) < 0
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-stone-100 text-stone-600 border-stone-200'
                              }`}
                            >
                              {(user.netProfit || 0) > 0
                                ? `+$${(user.netProfit || 0).toFixed(2)}`
                                : (user.netProfit || 0) < 0
                                ? `-$${Math.abs(user.netProfit || 0).toFixed(2)}`
                                : '$0.00'}{' '}
                              P&amp;L
                            </span>
                            <span className="text-[10px] text-stone-400">
                              ({user.totalTrades || 0} {user.totalTrades === 1 ? 'trade' : 'trades'})
                            </span>
                          </div>

                          {/* Base Starting Wallet & Daily Target */}
                          <div className="text-[11px] text-stone-500 font-mono flex items-center space-x-1.5 mt-0.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditWallet(user)}
                              className="group inline-flex items-center space-x-1 hover:text-emerald-700 bg-stone-100 hover:bg-emerald-50 px-1.5 py-0.5 rounded border border-stone-200 hover:border-emerald-300 transition-colors cursor-pointer"
                              title="Click to edit starting deposit"
                            >
                              <span>Base: ${(user.walletBalance || 0).toFixed(2)}</span>
                              <Edit3 className="w-3 h-3 text-stone-400 group-hover:text-emerald-600" />
                            </button>
                            <span>•</span>
                            <span className="text-emerald-700 font-semibold">
                              Target: ${(user.dailyTarget || 3).toFixed(2)}/d
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Registered Date */}
                      <td className="py-3.5 px-3 text-stone-600">
                        <div className="flex items-center space-x-1 text-[11px]">
                          <Calendar className="w-3 h-3 text-stone-400" />
                          <span>{user.createdAt ? formatDateDisplay(user.createdAt) : 'Recently'}</span>
                        </div>
                        <span className="text-[10px] text-stone-400">Month {user.monthNumber || 1}</span>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-3 text-center">
                        {isAdmin ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-stone-900 text-emerald-400">
                            <ShieldCheck className="w-3 h-3" />
                            <span>System Admin</span>
                          </span>
                        ) : user.status === 'approved' ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300/80">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Approved</span>
                          </span>
                        ) : user.status === 'pending' ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Pending Approval</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300/80">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            <span>Rejected</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {isAdmin ? (
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEditWallet(user)}
                              className="px-2.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-emerald-400 text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer border border-stone-700"
                              title="Edit Admin Starting Balance & Target"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit Wallet</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end space-x-2">
                            {/* Edit Wallet button for regular user */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditWallet(user)}
                              className="p-1.5 rounded-xl text-stone-500 hover:text-emerald-700 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-colors cursor-pointer"
                              title="Edit Starting Deposit & Daily Target"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            {/* If Pending or Rejected, show Approve button */}
                            {user.status !== 'approved' && (
                              <button
                                onClick={() => handleApprove(user)}
                                className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-1 shadow-xs transition-colors cursor-pointer"
                                title="Approve user"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                            )}

                            {/* If Pending or Approved, show Reject button */}
                            {user.status !== 'rejected' && (
                              <button
                                onClick={() => handleReject(user)}
                                className="px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-rose-50 text-stone-700 hover:text-rose-700 border border-stone-200 text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                                title="Reject user"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            )}

                            {/* Delete User button */}
                            <button
                              onClick={() => handleDelete(user)}
                              className="p-1.5 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete user"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Wallet Deposit & Daily Target Modal */}
      {editingUser &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden">
              {/* Header */}
              <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-stone-900">Edit Starting Wallet</h3>
                    <p className="text-xs text-stone-500 truncate max-w-[220px]">
                      {editingUser.name} • {editingUser.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingUser(null)}
                  disabled={isSavingWallet}
                  className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5">
                {/* Live Real Balance Context Banner */}
                <div className="p-3.5 bg-stone-900 text-stone-100 rounded-2xl flex items-center justify-between shadow-inner">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block">
                      Current Real Balance
                    </span>
                    <span className="text-lg font-mono font-black text-emerald-400">
                      ${(typeof editingUser.currentRealBalance === 'number'
                        ? editingUser.currentRealBalance
                        : (editingUser.walletBalance || 0) + (editingUser.netProfit || 0)
                      ).toFixed(2)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block">
                      Trade P&amp;L
                    </span>
                    <span
                      className={`text-xs font-mono font-bold ${
                        (editingUser.netProfit || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {(editingUser.netProfit || 0) >= 0 ? '+' : ''}
                      ${(editingUser.netProfit || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Amount Input */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    Starting Deposit Amount (USD)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <input
                      type="number"
                      min="10"
                      step="1"
                      value={editWalletInput}
                      onChange={(e) => setEditWalletInput(e.target.value)}
                      placeholder="e.g. 100"
                      className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl font-mono text-lg font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-stone-400 mt-1">Minimum initial deposit is $10.00 USD.</p>
                </div>

                {/* Quick Presets */}
                <div>
                  <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-2">
                    Quick Preset Amounts
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {[10, 20, 50, 100, 200, 500, 1000].map((amt) => {
                      const isSelected = parseFloat(editWalletInput) === amt;
                      return (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setEditWalletInput(String(amt))}
                          className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                          }`}
                        >
                          ${amt}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Live Target & Tier Preview */}
                {(() => {
                  const parsed = parseFloat(editWalletInput);
                  if (isNaN(parsed) || parsed <= 0) return null;
                  const newTarget = calculateDailyTarget(parsed);
                  const tier = getTierInfo(parsed);
                  const projectedRealBalance = parsed + (editingUser.netProfit || 0);

                  return (
                    <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5 text-emerald-800 text-xs font-bold">
                          <Target className="w-4 h-4 text-emerald-600" />
                          <span>Calculated Daily Target</span>
                        </div>
                        <span className="font-mono text-base font-black text-emerald-700">
                          ${newTarget.toFixed(2)}/day
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-emerald-200/50">
                        <span className="text-stone-600">Trading Growth Tier</span>
                        <span className="font-bold text-emerald-800">
                          {tier.name} ({tier.percentage}%)
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-stone-600">Projected Live Balance</span>
                        <span className="font-mono font-bold text-stone-900">
                          ${projectedRealBalance.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                <div className="p-3 bg-stone-50 rounded-xl text-[11px] text-stone-500 leading-relaxed">
                  💡 <strong>MongoDB Atlas Sync:</strong> Updating this balance will immediately sync to your cloud database and re-calculate real balance and daily target for this user.
                </div>
              </div>

              {/* Footer Actions */}
              <div className="px-6 py-4 bg-stone-50/50 border-t border-stone-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  disabled={isSavingWallet}
                  className="px-4 py-2.5 text-xs font-bold text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditWallet}
                  disabled={isSavingWallet || isNaN(parseFloat(editWalletInput)) || parseFloat(editWalletInput) < 10}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 rounded-xl shadow-xs transition-all cursor-pointer flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingWallet ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Saving to Cloud...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Save &amp; Sync to Database</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

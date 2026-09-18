/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import {
  Calculator,
  FileSpreadsheet,
  Calendar as CalendarIcon,
  Clock,
  Wallet,
  UserCheck,
  Sparkles,
  LogIn,
  LogOut,
  User,
  UserPlus,
  Users as UsersIcon,
  ShieldCheck,
} from 'lucide-react';
import { Transaction, UserProfile } from './types';
import {
  loadTransactions,
  saveTransactions,
  loadUserProfile,
  saveUserProfile,
  calculateDailyTarget,
  getCurrentDateString,
  getPendingUsersCount,
  ADMIN_EMAIL,
  saveAllUsers,
} from './utils/storage';
import { HomeView } from './components/HomeView';
import { TargetSheetView } from './components/TargetSheetView';
import { CalendarView } from './components/CalendarView';
import { UsersView } from './components/UsersView';
import { TaizerLogo } from './components/TaizerLogo';
import { RegisterModal } from './components/RegisterModal';
import { NextMonthModal } from './components/NextMonthModal';
import { ProfileModal } from './components/ProfileModal';
import { InstallPwaButton } from './components/InstallPwaButton';
import {
  fetchTransactionsFromCloud,
  saveTransactionToCloud,
  deleteTransactionFromCloud,
  checkCloudHealth,
  updateProfileOnCloud,
  fetchUsersFromCloud,
} from './utils/api';

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(() => loadUserProfile());
  const [activeTab, setActiveTab] = useState<'home' | 'sheet' | 'calendar' | 'users'>('home');
  const [transactions, setTransactions] = useState<Transaction[]>(() => loadTransactions(profile?.id));
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');

  const [isRegisterOpen, setIsRegisterOpen] = useState<boolean>(() => !loadUserProfile()?.isRegistered);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [isNextMonthOpen, setIsNextMonthOpen] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(() => getPendingUsersCount());

  // Check if current user is admin
  const isAdmin = Boolean(
    profile?.isRegistered &&
      (profile.role === 'admin' || profile.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase())
  );

  // Real live wallet balance across all trades
  const totalNetProfit = transactions.reduce(
    (sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount),
    0
  );
  const liveWalletBalance = Number(Math.max(0, (profile?.walletBalance || 10) + totalNetProfit).toFixed(2));
  const liveProfile: UserProfile | null = profile
    ? {
        ...profile,
        currentRealBalance: liveWalletBalance,
        netProfit: totalNetProfit,
      }
    : null;

  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(false);

  // Check MongoDB Atlas Cloud connection on start and sync active profile
  useEffect(() => {
    checkCloudHealth().then((connected) => {
      setIsCloudConnected(connected);
      if (connected) {
        fetchUsersFromCloud().then((cloudUsers) => {
          if (cloudUsers && Array.isArray(cloudUsers)) {
            saveAllUsers(cloudUsers);
            setPendingCount(getPendingUsersCount());

            // Synchronize active profile directly with MongoDB Atlas cloud database
            const current = loadUserProfile();
            if (current) {
              const matched = cloudUsers.find(
                (u) =>
                  (current.id && u.id === current.id) ||
                  (current.email && u.email.toLowerCase() === current.email.toLowerCase())
              );
              if (matched) {
                const synchronized: UserProfile = {
                  ...current,
                  walletBalance: matched.walletBalance,
                  dailyTarget: matched.dailyTarget,
                  name: matched.name || current.name,
                  role: matched.role || current.role,
                  status: matched.status || current.status,
                  monthNumber: matched.monthNumber || current.monthNumber,
                  startDate: matched.startDate || current.startDate,
                };
                setProfile(synchronized);
                saveUserProfile(synchronized);
              }
            }
          }
        }).catch(() => {});
      }
    });
  }, []);

  // Sync transactions and profile whenever active profile changes
  useEffect(() => {
    // 1. Instant local load (clean data without mocks)
    setTransactions(loadTransactions(profile?.id));
    setPendingCount(getPendingUsersCount());

    // 2. Sync with MongoDB Atlas Cloud
    if (profile?.id || profile?.email) {
      if (profile?.id) {
        fetchTransactionsFromCloud(profile.id).then((cloudTxs) => {
          if (cloudTxs && Array.isArray(cloudTxs)) {
            setTransactions(cloudTxs);
            saveTransactions(cloudTxs, profile.id);
            setIsCloudConnected(true);
          }
        }).catch(() => {});
      }

      // Sync latest cloud profile fields (e.g. walletBalance, dailyTarget edited elsewhere)
      fetchUsersFromCloud().then((cloudUsers) => {
        if (cloudUsers && Array.isArray(cloudUsers)) {
          saveAllUsers(cloudUsers);
          const matched = cloudUsers.find(
            (u) =>
              (profile.id && u.id === profile.id) ||
              (profile.email && u.email.toLowerCase() === profile.email.toLowerCase())
          );
          if (
            matched &&
            (matched.walletBalance !== profile.walletBalance || matched.dailyTarget !== profile.dailyTarget)
          ) {
            const synced: UserProfile = {
              ...profile,
              walletBalance: matched.walletBalance,
              dailyTarget: matched.dailyTarget,
              name: matched.name || profile.name,
            };
            setProfile(synced);
            saveUserProfile(synced);
          }
        }
      }).catch(() => {});
    }
  }, [profile?.id, profile?.email]);

  // Save to localStorage when transactions change
  useEffect(() => {
    saveTransactions(transactions, profile?.id);
  }, [transactions, profile?.id]);

  // Real-time clock update
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }) +
          ' • ' +
          now.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
          })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Save profile handler
  const handleSaveProfile = (newProfile: UserProfile) => {
    setProfile(newProfile);
    saveUserProfile(newProfile);
    setIsRegisterOpen(false);
    setPendingCount(getPendingUsersCount());

    // Sync updated wallet balance, target, name to MongoDB Atlas
    const identifier = newProfile.id || newProfile.email;
    if (identifier) {
      updateProfileOnCloud(identifier, {
        name: newProfile.name,
        walletBalance: newProfile.walletBalance,
        dailyTarget: newProfile.dailyTarget,
        startDate: newProfile.startDate,
        monthNumber: newProfile.monthNumber,
      }).then((ok) => {
        if (ok) setIsCloudConnected(true);
      });
    }
  };

  // Start next month handler
  const handleStartNextMonth = (newProfile: UserProfile) => {
    setProfile(newProfile);
    saveUserProfile(newProfile);
    setIsNextMonthOpen(false);

    const identifier = newProfile.id || newProfile.email;
    if (identifier) {
      updateProfileOnCloud(identifier, {
        walletBalance: newProfile.walletBalance,
        dailyTarget: newProfile.dailyTarget,
        startDate: newProfile.startDate,
        monthNumber: newProfile.monthNumber,
      });
    }
  };

  // Add transaction handler (saved to state, localStorage, and MongoDB Atlas)
  const handleAddTransaction = (newTxData: Omit<Transaction, 'id' | 'timestamp'>) => {
    const newTx: Transaction = {
      ...newTxData,
      id: 'tx-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      timestamp: Date.now(),
    };
    setTransactions((prev) => [newTx, ...prev]);
    saveTransactionToCloud(newTx, profile?.id).then((ok) => {
      if (ok) setIsCloudConnected(true);
    });
  };

  // Delete transaction handler (removed from state, localStorage, and MongoDB Atlas)
  const handleDeleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    deleteTransactionFromCloud(id);
  };

  // Sign out handler
  const handleSignOut = () => {
    if (profile) {
      const loggedOut: UserProfile = {
        ...profile,
        isRegistered: false,
      };
      setProfile(loggedOut);
      saveUserProfile(loggedOut);
    }
    if (activeTab === 'users') {
      setActiveTab('home');
    }
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden min-h-screen bg-stone-100 text-stone-800 flex flex-col font-sans selection:bg-stone-200">
      {/* Top Navbar */}
      <header className="w-full bg-white/95 backdrop-blur-md border-b border-stone-200/90 sticky top-0 z-30 shadow-2xs">
        <div className="w-full max-w-7xl mx-auto px-2.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-1.5 sm:gap-4">
          {/* Left: Brand Logo */}
          <div className="flex items-center space-x-2 sm:space-x-3 cursor-pointer shrink-0" onClick={() => setActiveTab('home')}>
            <TaizerLogo size="md" showText={true} />
            <div className="hidden 2xl:flex items-center text-[11px] text-stone-500 pl-3 border-l border-stone-200 space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-mono text-[11px] text-stone-600">{currentTimeStr || ''}</span>
            </div>
          </div>

          {/* Center: Desktop Navigation Tabs (Sleek Segmented Pill) */}
          <nav className="hidden md:flex items-center bg-stone-100/90 p-1 rounded-2xl border border-stone-200/80 shadow-2xs">
            <button
              id="nav-home-tab"
              onClick={() => setActiveTab('home')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'home'
                  ? 'bg-white text-stone-950 shadow-xs font-bold'
                  : 'text-stone-600 hover:text-stone-950 hover:bg-white/50'
              }`}
            >
              <Calculator className={`w-4 h-4 ${activeTab === 'home' ? 'text-emerald-600' : 'text-stone-500'}`} />
              <span>Home</span>
            </button>
            <button
              id="nav-sheet-tab"
              onClick={() => setActiveTab('sheet')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'sheet'
                  ? 'bg-white text-stone-950 shadow-xs font-bold'
                  : 'text-stone-600 hover:text-stone-950 hover:bg-white/50'
              }`}
            >
              <FileSpreadsheet className={`w-4 h-4 ${activeTab === 'sheet' ? 'text-emerald-600' : 'text-stone-500'}`} />
              <span>Target Sheet</span>
            </button>
            <button
              id="nav-calendar-tab"
              onClick={() => setActiveTab('calendar')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'calendar'
                  ? 'bg-white text-stone-950 shadow-xs font-bold'
                  : 'text-stone-600 hover:text-stone-950 hover:bg-white/50'
              }`}
            >
              <CalendarIcon className={`w-4 h-4 ${activeTab === 'calendar' ? 'text-emerald-600' : 'text-stone-500'}`} />
              <span>Calendar</span>
            </button>

            {/* Users Tab (Visible ONLY to Admin) */}
            {isAdmin && (
              <button
                id="nav-users-tab"
                onClick={() => setActiveTab('users')}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'users'
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'text-stone-700 hover:text-stone-950 hover:bg-white/50'
                }`}
                title="User Management & Approvals (Admin Only)"
              >
                <UsersIcon className={`w-4 h-4 ${activeTab === 'users' ? 'text-emerald-400' : 'text-emerald-600'}`} />
                <span>Users</span>
                {pendingCount > 0 && (
                  <span className="bg-amber-500 text-stone-950 font-black text-[10px] px-1.5 py-0.5 rounded-full leading-none animate-pulse shadow-xs">
                    {pendingCount}
                  </span>
                )}
              </button>
            )}
          </nav>

          {/* Right: Actions (Install App, Profile, Sign Out / Login) */}
          <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0">
            {/* PWA Install Button */}
            <InstallPwaButton />

            {/* Profile & Wallet Status Badge or Login / Sign Out Buttons */}
            {profile?.isRegistered ? (
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <button
                  id="header-profile-btn"
                  onClick={() => setIsProfileOpen(true)}
                  className="flex items-center space-x-1.5 sm:space-x-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-stone-50 hover:bg-stone-100/90 border border-stone-200/90 text-stone-800 shadow-2xs transition-all cursor-pointer"
                  title="View Trader Profile"
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                    isAdmin ? 'bg-stone-950 text-emerald-400' : 'bg-stone-950 text-white'
                  }`}>
                    {isAdmin ? (
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <User className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </div>
                  <div className="text-left hidden xs:block sm:block">
                    <div className="text-[11px] font-bold leading-tight text-stone-900 truncate max-w-[95px] flex items-center space-x-1">
                      <span>{profile.name || 'Trader'}</span>
                    </div>
                    <div className="text-[9px] text-emerald-700 font-bold leading-none font-mono mt-0.5">
                      {isAdmin ? 'Admin' : `$${liveWalletBalance.toFixed(2)} Live`}
                    </div>
                  </div>
                </button>

                {/* Sign Out Button */}
                <button
                  id="header-signout-btn"
                  onClick={handleSignOut}
                  className="flex items-center space-x-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/90 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-600" />
                  <span className="hidden lg:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <button
                  id="header-login-btn"
                  onClick={() => {
                    setAuthModalMode('login');
                    setIsRegisterOpen(true);
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-stone-950 hover:bg-stone-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Login</span>
                </button>
                <button
                  id="header-signup-btn"
                  onClick={() => {
                    setAuthModalMode('signup');
                    setIsRegisterOpen(true);
                  }}
                  className="hidden xs:flex sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5 text-stone-600" />
                  <span>Sign Up</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-full overflow-x-hidden pb-28 md:pb-12">
        {activeTab === 'home' ? (
          <HomeView
            transactions={transactions}
            profile={liveProfile}
            onAddTransaction={handleAddTransaction}
            onNavigateToSheet={() => setActiveTab('sheet')}
            onNavigateToCalendar={() => setActiveTab('calendar')}
            onOpenProfile={() => {
              if (profile?.isRegistered) {
                setIsProfileOpen(true);
              } else {
                setAuthModalMode('login');
                setIsRegisterOpen(true);
              }
            }}
            onOpenNextMonth={() => setIsNextMonthOpen(true)}
          />
        ) : activeTab === 'sheet' ? (
          <TargetSheetView
            transactions={transactions}
            profile={liveProfile}
            onDeleteTransaction={handleDeleteTransaction}
            onNavigateToCalendar={() => setActiveTab('calendar')}
          />
        ) : activeTab === 'calendar' ? (
          <CalendarView
            transactions={transactions}
            profile={liveProfile}
            onNavigateToHome={() => setActiveTab('home')}
            onNavigateToSheet={() => setActiveTab('sheet')}
          />
        ) : isAdmin ? (
          <UsersView
            onUserStatusChanged={() => setPendingCount(getPendingUsersCount())}
            onProfileUpdated={(updated) => setProfile(updated)}
          />
        ) : (
          <HomeView
            transactions={transactions}
            profile={liveProfile}
            onAddTransaction={handleAddTransaction}
            onNavigateToSheet={() => setActiveTab('sheet')}
            onNavigateToCalendar={() => setActiveTab('calendar')}
          />
        )}
      </main>

      {/* Trader Profile Modal (For Authenticated User) */}
      {liveProfile?.isRegistered && (
        <ProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          profile={liveProfile}
          onSaveProfile={(updated) => {
            handleSaveProfile(updated);
          }}
          onSignOut={() => {
            setIsProfileOpen(false);
            handleSignOut();
          }}
        />
      )}

      {/* Registration / Trading Plan Modal (Auth Login / Signup) */}
      <RegisterModal
        isOpen={isRegisterOpen}
        canDismiss={Boolean(profile?.isRegistered)}
        onClose={() => setIsRegisterOpen(false)}
        currentProfile={liveProfile}
        onSaveProfile={handleSaveProfile}
        initialMode={authModalMode}
      />

      {/* Advance to Next Month Modal */}
      {liveProfile && (
        <NextMonthModal
          isOpen={isNextMonthOpen}
          onClose={() => setIsNextMonthOpen(false)}
          profile={liveProfile}
          transactions={transactions}
          onStartNextMonth={handleStartNextMonth}
        />
      )}

      {/* Mobile Fixed Bottom Navigation Bar */}
      <nav
        id="mobile-bottom-navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-3 py-1.5 pb-safe"
      >
        <div className={`grid gap-1 max-w-sm mx-auto ${isAdmin ? 'grid-cols-4' : 'grid-cols-3'}`}>
          {/* Mobile Home Button */}
          <button
            id="mobile-tab-home"
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'home'
                ? 'bg-stone-900 text-white font-bold shadow-xs scale-[1.02]'
                : 'text-stone-500 hover:text-stone-900 active:bg-stone-100'
            }`}
          >
            <Calculator className={`w-5 h-5 mb-0.5 ${activeTab === 'home' ? 'text-white' : 'text-stone-600'}`} />
            <span className="text-[10px] sm:text-[11px] tracking-tight">Home</span>
          </button>

          {/* Mobile Target Sheet Button */}
          <button
            id="mobile-tab-sheet"
            onClick={() => setActiveTab('sheet')}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'sheet'
                ? 'bg-stone-900 text-white font-bold shadow-xs scale-[1.02]'
                : 'text-stone-500 hover:text-stone-900 active:bg-stone-100'
            }`}
          >
            <FileSpreadsheet className={`w-5 h-5 mb-0.5 ${activeTab === 'sheet' ? 'text-white' : 'text-stone-600'}`} />
            <span className="text-[10px] sm:text-[11px] tracking-tight">Target Sheet</span>
          </button>

          {/* Mobile Calendar Button */}
          <button
            id="mobile-tab-calendar"
            onClick={() => setActiveTab('calendar')}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'calendar'
                ? 'bg-stone-900 text-white font-bold shadow-xs scale-[1.02]'
                : 'text-stone-500 hover:text-stone-900 active:bg-stone-100'
            }`}
          >
            <CalendarIcon className={`w-5 h-5 mb-0.5 ${activeTab === 'calendar' ? 'text-emerald-400' : 'text-emerald-600'}`} />
            <span className="text-[10px] sm:text-[11px] tracking-tight">Calendar</span>
          </button>

          {/* Mobile Users Tab (Admin Only) */}
          {isAdmin && (
            <button
              id="mobile-tab-users"
              onClick={() => setActiveTab('users')}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer relative ${
                activeTab === 'users'
                  ? 'bg-stone-900 text-white font-bold shadow-xs scale-[1.02]'
                  : 'text-stone-500 hover:text-stone-900 active:bg-stone-100'
              }`}
            >
              <div className="relative">
                <UsersIcon className={`w-5 h-5 mb-0.5 ${activeTab === 'users' ? 'text-emerald-400' : 'text-emerald-600'}`} />
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-2 bg-amber-500 text-stone-950 font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                    {pendingCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] sm:text-[11px] tracking-tight">Users</span>
            </button>
          )}
        </div>
      </nav>

      {/* Footer (Desktop only or non-obstructive) */}
      <footer className="hidden md:block border-t border-stone-200 bg-white py-4 text-center text-xs text-stone-500">
        <div className="flex items-center justify-center space-x-2">
          <TaizerLogo size="sm" showText={false} />
          <span className="font-semibold text-stone-700">Taizer Crypto</span>
          <span>•</span>
          <span>Daily Income &amp; Target Sheet</span>
          <span>•</span>
          <span>{isAdmin ? 'Admin Session' : 'Trader Session'}</span>
        </div>
      </footer>
    </div>
  );
}

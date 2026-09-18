import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Mail, Wallet, Target, Sparkles, X, CheckCircle2, LogOut, TrendingUp, ShieldCheck } from 'lucide-react';
import { UserProfile } from '../types';
import { formatCurrency, calculateDailyTarget, getTierInfo, formatDateDisplay, ADMIN_EMAIL } from '../utils/storage';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onSaveProfile: (updatedProfile: UserProfile) => void;
  onSignOut: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSaveProfile,
  onSignOut,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email || '');
  const [walletStr, setWalletStr] = useState(String(profile.walletBalance));
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync state if profile changes
  useEffect(() => {
    setName(profile.name);
    setEmail(profile.email || '');
    setWalletStr(String(profile.walletBalance));
  }, [profile]);

  // Lock background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isAdmin = profile.role === 'admin' || profile.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const currentParsedWallet = parseFloat(walletStr) || profile.walletBalance;
  const previewDailyTarget = calculateDailyTarget(currentParsedWallet);
  const tierInfo = getTierInfo(currentParsedWallet);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const finalWallet = Math.max(10, parseFloat(walletStr) || 10);
    const finalDailyTarget = calculateDailyTarget(finalWallet);

    const updated: UserProfile = {
      ...profile,
      name: name.trim() || profile.name,
      email: email.trim() || profile.email,
      walletBalance: finalWallet,
      dailyTarget: finalDailyTarget,
    };

    onSaveProfile(updated);
    setSavedSuccess(true);
    setIsEditing(false);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 2500);
  };

  const displayName = profile.name || 'Trader';
  const displayEmail = profile.email || '';
  const isNameSameAsEmail = displayName.toLowerCase() === displayEmail.toLowerCase();

  return (
    <AnimatePresence>
      <div
        id="profile-modal-backdrop"
        className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4 bg-stone-950/80 backdrop-blur-xs overflow-y-auto overscroll-contain"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-md sm:max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 my-auto flex flex-col max-h-[92vh] overflow-hidden"
        >
          {/* Top Header - Compact on mobile */}
          <div className="bg-stone-950 text-white p-4 sm:p-6 shrink-0 relative overflow-hidden">
            {/* Background graphic */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

            <div className="relative flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2.5 sm:space-x-3.5 min-w-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-stone-900 border border-stone-800 flex items-center justify-center shadow-inner shrink-0">
                  <User className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-1.5 flex-wrap">
                    <h2 className="text-sm sm:text-base font-black text-white tracking-tight truncate max-w-[180px] sm:max-w-xs">
                      {isNameSameAsEmail ? displayName.split('@')[0] : displayName}
                    </h2>
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 shrink-0">
                      <ShieldCheck className="w-2.5 h-2.5" />
                      <span>{isAdmin ? 'Admin' : 'Active Trader'}</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400 font-mono truncate max-w-[210px] sm:max-w-xs mt-0.5">
                    {displayEmail || displayName}
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-stone-900 hover:bg-stone-800 border border-stone-800 flex items-center justify-center text-stone-400 hover:text-white transition-colors cursor-pointer shrink-0"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Metrics Banner - Compact cards */}
            <div className="mt-3.5 grid grid-cols-4 gap-1.5 sm:gap-2 pt-3 border-t border-stone-800/90 text-center">
              <div className="bg-stone-900/80 p-1.5 sm:p-2 rounded-xl border border-stone-800/80">
                <span className="text-[9px] text-emerald-400 font-semibold block uppercase tracking-wider">Live Wallet</span>
                <span className="text-xs sm:text-sm font-black text-emerald-400 font-mono">
                  ${(profile.currentRealBalance ?? profile.walletBalance).toFixed(2)}
                </span>
              </div>
              <div className="bg-stone-900/80 p-1.5 sm:p-2 rounded-xl border border-stone-800/80">
                <span className="text-[9px] text-stone-400 font-semibold block uppercase tracking-wider">Starting</span>
                <span className="text-xs sm:text-sm font-black text-white font-mono">${profile.walletBalance.toFixed(2)}</span>
              </div>
              <div className="bg-stone-900/80 p-1.5 sm:p-2 rounded-xl border border-stone-800/80">
                <span className="text-[9px] text-stone-300 font-semibold block uppercase tracking-wider">Target</span>
                <span className="text-xs sm:text-sm font-black text-white font-mono">${profile.dailyTarget}/day</span>
              </div>
              <div className="bg-stone-900/80 p-1.5 sm:p-2 rounded-xl border border-stone-800/80">
                <span className="text-[9px] text-stone-400 font-semibold block uppercase tracking-wider">30-Day</span>
                <span className="text-xs sm:text-sm font-black text-white font-mono">${(profile.dailyTarget * 30).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Scrollable Body Content */}
          <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
            {savedSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Trading profile and target settings updated successfully!</span>
              </div>
            )}

            {isEditing ? (
              /* Edit Profile Form */
              <form onSubmit={handleSave} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-stone-700 block">Trader Name</label>
                  <div className="relative border-b-2 border-stone-300 focus-within:border-stone-950 transition-colors pb-1">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Trader Name"
                      className="w-full bg-transparent pr-7 text-xs font-medium text-stone-900 focus:outline-none"
                    />
                    <User className="w-3.5 h-3.5 text-stone-500 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-stone-700 block">Email Address</label>
                  <div className="relative border-b-2 border-stone-300 focus-within:border-stone-950 transition-colors pb-1">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email"
                      className="w-full bg-transparent pr-7 text-xs font-medium text-stone-900 focus:outline-none"
                    />
                    <Mail className="w-3.5 h-3.5 text-stone-500 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <label className="font-bold text-stone-700">Wallet Balance (USD)</label>
                    <span className="font-mono text-emerald-700 font-bold">
                      Target: ${previewDailyTarget}/day
                    </span>
                  </div>
                  <div className="relative border-b-2 border-stone-300 focus-within:border-stone-950 transition-colors pb-1">
                    <input
                      type="number"
                      min="10"
                      step="any"
                      value={walletStr}
                      onChange={(e) => setWalletStr(e.target.value)}
                      className="w-full bg-transparent pr-7 text-xs font-mono font-bold text-stone-900 focus:outline-none"
                    />
                    <Wallet className="w-3.5 h-3.5 text-stone-500 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <p className="text-[10px] text-stone-500 pt-0.5">
                    Tier rule: Math.floor(Balance / 10) × $3. Minimum $10.
                  </p>
                </div>

                <div className="pt-2 flex items-center space-x-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 px-3 bg-stone-950 hover:bg-stone-800 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer text-center"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setName(profile.name);
                      setEmail(profile.email || '');
                      setWalletStr(String(profile.walletBalance));
                    }}
                    className="py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              /* View Profile Details */
              <div className="space-y-3">
                <div className="bg-stone-50 rounded-2xl p-3.5 sm:p-4 border border-stone-200/80 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                    <span className="text-stone-500 font-medium">Account Name</span>
                    <span className="font-bold text-stone-900 truncate max-w-[170px] sm:max-w-xs">{profile.name}</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                    <span className="text-stone-500 font-medium">Email</span>
                    <span className="font-mono text-stone-800 truncate max-w-[170px] sm:max-w-xs">{profile.email || 'Not provided'}</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                    <span className="text-stone-500 font-medium">Current Tier</span>
                    <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 font-mono text-[11px]">
                      Tier {tierInfo.tier} (${tierInfo.minRange}+)
                    </span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                    <span className="text-stone-500 font-medium">Daily Target</span>
                    <span className="font-mono font-black text-stone-900">${profile.dailyTarget}.00 / day</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500 font-medium">Plan Started</span>
                    <span className="font-mono text-stone-700">
                      {profile.startDate ? formatDateDisplay(profile.startDate) : 'Active'}
                    </span>
                  </div>
                </div>

                {/* Edit Wallet / Plan button */}
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="w-full py-2.5 px-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center space-x-2"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Update Wallet Balance or Details</span>
                </button>
              </div>
            )}
          </div>

          {/* Fixed Bottom Actions Footer - Always visible and clean */}
          <div className="p-3 sm:p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={onSignOut}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-600" />
              <span>Sign Out</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-bold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

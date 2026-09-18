import React, { useState } from 'react';
import { Sparkles, ArrowRight, X, Wallet, CheckCircle2, TrendingUp, Info, ShieldCheck } from 'lucide-react';
import { UserProfile, Transaction } from '../types';
import { calculateNextMonthTargetFromBalance, getCurrentDateString } from '../utils/storage';
import { TaizerLogo } from './TaizerLogo';

interface NextMonthModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  transactions: Transaction[];
  onStartNextMonth: (updatedProfile: UserProfile) => void;
}

export const NextMonthModal: React.FC<NextMonthModalProps> = ({
  isOpen,
  onClose,
  profile,
  transactions,
  onStartNextMonth,
}) => {
  // Calculate total net profit accumulated during this 30-day month
  const cycleNetProfit = transactions
    .filter((t) => !profile.startDate || t.date >= profile.startDate)
    .reduce((sum, tx) => {
      return sum + (tx.type === 'income' ? tx.amount : -tx.amount);
    }, 0);

  // Total account balance at end of 30 days = starting balance + net profit
  const totalAccountBalance = Math.max(10, profile.walletBalance + cycleNetProfit);
  
  // Auto-calculated projection using the user's rule:
  // e.g. $23 or $25 -> base $20 -> tier 2 -> $6/day target!
  const autoTierData = calculateNextMonthTargetFromBalance(totalAccountBalance);

  // Mode: 'auto' (keeps full balance with floored tier target) or 'custom'
  const [balanceInput, setBalanceInput] = useState<string>(String(totalAccountBalance.toFixed(2)));
  const [useAuto, setUseAuto] = useState<boolean>(true);

  // Lock body scroll when modal is open
  React.useEffect(() => {
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

  const currentBalanceNum = parseFloat(balanceInput) || 10;
  const currentTierData = calculateNextMonthTargetFromBalance(currentBalanceNum);
  const nextMonthNum = profile.monthNumber + 1;

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentBalanceNum < 10) return;

    const updated: UserProfile = {
      ...profile,
      walletBalance: currentBalanceNum,
      dailyTarget: currentTierData.dailyTarget,
      startDate: getCurrentDateString(),
      monthNumber: nextMonthNum,
      isRegistered: true,
    };

    onStartNextMonth(updated);
    onClose();
  };

  return (
    <div
      id="next-month-modal-backdrop"
      className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4 bg-stone-950/80 backdrop-blur-xs overflow-y-auto overscroll-contain"
    >
      <div
        id="next-month-modal-container"
        className="bg-white rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-stone-200 space-y-4 my-auto max-h-[92vh] overflow-y-auto"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <TaizerLogo size="sm" showText={false} />
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  Month {profile.monthNumber} • 30-Day Cycle Complete
                </span>
                <Sparkles className="w-4 h-4 text-emerald-600" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-stone-900 mt-1">
                Auto-Generate Month {nextMonthNum} Target
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 30-Day Performance Recap */}
        <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Month {profile.monthNumber} Final Results
            </span>
            <span className="text-xs font-mono font-bold text-stone-700">30 Days Finished</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-white p-2.5 rounded-xl border border-stone-200/80">
              <span className="text-stone-400 block text-[11px]">Start Wallet</span>
              <span className="font-mono font-bold text-stone-900 text-sm block mt-0.5">
                ${profile.walletBalance.toFixed(2)}
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-stone-200/80">
              <span className="text-stone-400 block text-[11px]">30-Day Profit</span>
              <span
                className={`font-mono font-bold text-sm block mt-0.5 ${
                  cycleNetProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                {cycleNetProfit >= 0 ? `+$${cycleNetProfit.toFixed(2)}` : `-$${Math.abs(cycleNetProfit).toFixed(2)}`}
              </span>
            </div>
            <div className="bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200">
              <span className="text-emerald-800 block text-[11px] font-semibold">Account Balance</span>
              <span className="font-mono font-black text-emerald-900 text-sm block mt-0.5">
                ${totalAccountBalance.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Rule Explanation Banner based on user instruction */}
        <div className="bg-stone-900 text-white rounded-2xl p-4 space-y-3 shadow-md">
          <div className="flex items-center justify-between pb-2 border-b border-stone-800">
            <div className="flex items-center space-x-1.5 text-emerald-400 font-bold text-xs">
              <ShieldCheck className="w-4 h-4" />
              <span>Next Month Auto Target Rule</span>
            </div>
            <span className="text-[11px] font-mono bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-800">
              Floor to 10s Base
            </span>
          </div>

          {/* Demonstration formula */}
          <div className="text-xs space-y-2 text-stone-300">
            <p className="text-[11.5px] leading-relaxed">
              Based on your 30-day closing account balance of <strong className="text-white font-mono">${currentBalanceNum.toFixed(2)}</strong>:
            </p>

            <div className="bg-stone-800/90 rounded-xl p-3 border border-stone-700 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-400">Account Balance:</span>
                <span className="font-mono font-bold text-white">${currentBalanceNum.toFixed(2)} USD</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-400">Calculated Base Tier:</span>
                <span className="font-mono font-bold text-emerald-400">
                  ${currentTierData.baseTierBalance}.00 USD (Tier {currentTierData.tier})
                </span>
              </div>
              {currentTierData.surplusBalance > 0 && (
                <div className="flex items-center justify-between text-xs text-stone-400 border-t border-stone-700/60 pt-1.5">
                  <span>Safety Buffer Retained:</span>
                  <span className="font-mono font-semibold text-emerald-300">
                    +${currentTierData.surplusBalance.toFixed(2)} USD
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="bg-emerald-950/80 border border-emerald-800 p-2.5 rounded-xl text-center">
                <span className="text-[10px] text-emerald-300 uppercase font-bold tracking-wider block">
                  New Daily Target
                </span>
                <span className="text-xl sm:text-2xl font-mono font-black text-emerald-400 block mt-0.5">
                  ${currentTierData.dailyTarget.toFixed(2)}
                </span>
                <span className="text-[10px] text-emerald-300/80 block mt-0.5">per day ({currentTierData.tier} × $3)</span>
              </div>

              <div className="bg-stone-800/80 border border-stone-700 p-2.5 rounded-xl text-center">
                <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider block">
                  30-Day Total Target
                </span>
                <span className="text-xl sm:text-2xl font-mono font-black text-white block mt-0.5">
                  ${currentTierData.thirtyDayGoal.toFixed(2)}
                </span>
                <span className="text-[10px] text-stone-400 block mt-0.5">30 days sum</span>
              </div>
            </div>

            <div className="text-[10.5px] text-stone-400 bg-stone-950/70 p-2 rounded-lg border border-stone-800">
              💡 <em>Example: If balance is $23 or $25, base tier is set to $20 → Daily Target is $6.00/day.</em>
            </div>
          </div>
        </div>

        {/* Adjust Balance / Confirmation Form */}
        <form onSubmit={handleConfirm} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-stone-800 flex items-center space-x-1.5">
                <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Account Balance for Month {nextMonthNum} (USD)</span>
              </label>
              <span className="text-[11px] text-stone-500">Min $10.00</span>
            </div>

            {/* Auto vs Custom Toggle */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setUseAuto(true);
                  setBalanceInput(totalAccountBalance.toFixed(2));
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                  useAuto
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-xs'
                    : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                Auto Balance (${totalAccountBalance.toFixed(2)})
              </button>

              <button
                type="button"
                onClick={() => setUseAuto(false)}
                className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all cursor-pointer text-center ${
                  !useAuto
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold shadow-xs'
                    : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                Custom Balance
              </button>
            </div>

            <div className="relative pt-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold font-mono">
                $
              </span>
              <input
                id="next-month-balance-input"
                type="number"
                step="any"
                min="10"
                value={balanceInput}
                onChange={(e) => {
                  setBalanceInput(e.target.value);
                  setUseAuto(false);
                }}
                className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50 font-mono font-bold text-base text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <button
            id="start-next-month-submit-btn"
            type="submit"
            className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-emerald-950/20 transition-all cursor-pointer"
          >
            <span>Start Month {nextMonthNum} with ${currentTierData.dailyTarget.toFixed(2)}/day Target</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

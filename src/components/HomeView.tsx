import React, { useState } from 'react';
import { Plus, Minus, Delete, CheckCircle2, Clock, Calendar, ArrowRight, DollarSign, Target, Sparkles, Award, TrendingUp, Info } from 'lucide-react';
import { Transaction, UserProfile } from '../types';
import { formatCurrency, getCurrentDateString, getCurrentTimeString, formatDateDisplay, calculateNextMonthTargetFromBalance } from '../utils/storage';
import { TaizerLogo } from './TaizerLogo';

interface HomeViewProps {
  transactions: Transaction[];
  profile: UserProfile | null;
  onAddTransaction: (transaction: Omit<Transaction, 'id' | 'timestamp'>) => void;
  onNavigateToSheet: () => void;
  onNavigateToCalendar?: () => void;
  onOpenProfile?: () => void;
  onOpenNextMonth?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  transactions,
  profile,
  onAddTransaction,
  onNavigateToSheet,
  onNavigateToCalendar,
  onOpenProfile,
  onOpenNextMonth,
}) => {
  const [displayValue, setDisplayValue] = useState<string>('0');
  const [note, setNote] = useState<string>('');
  const [customDate, setCustomDate] = useState<string>(getCurrentDateString());
  const [notification, setNotification] = useState<{ message: string; type: 'income' | 'loss' } | null>(null);

  // Keypad button handler
  const handleDigit = (digit: string) => {
    setDisplayValue((prev) => {
      if (prev === '0' && digit !== '.') {
        return digit;
      }
      if (digit === '.' && prev.includes('.')) {
        return prev;
      }
      // Max 2 decimal places restriction
      if (prev.includes('.')) {
        const parts = prev.split('.');
        if (parts[1] && parts[1].length >= 2) {
          return prev;
        }
      }
      // Max length limit
      if (prev.length >= 10) return prev;
      return prev + digit;
    });
  };

  const handleClear = () => {
    setDisplayValue('0');
  };

  const handleBackspace = () => {
    setDisplayValue((prev) => {
      if (prev.length <= 1) return '0';
      return prev.slice(0, -1);
    });
  };

  const handleSubmit = (type: 'income' | 'loss') => {
    const amountNum = parseFloat(displayValue);
    if (isNaN(amountNum) || amountNum <= 0) {
      setNotification({
        message: 'Please enter a valid dollar amount greater than $0',
        type: 'loss',
      });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    const currentTime = getCurrentTimeString();
    const entryDate = customDate || getCurrentDateString();

    onAddTransaction({
      amount: amountNum,
      type,
      date: entryDate,
      time: currentTime,
      note: note.trim() ? note.trim() : undefined,
    });

    // Show feedback
    const formatted = formatCurrency(amountNum, type);
    setNotification({
      message: `${type === 'income' ? 'Income' : 'Loss'} added: ${formatted} at ${currentTime}`,
      type,
    });
    setTimeout(() => setNotification(null), 4000);

    // Reset keypad
    setDisplayValue('0');
    setNote('');
  };

  // Today's summary calculations
  const todayStr = getCurrentDateString();
  const todayTransactions = transactions.filter((t) => t.date === todayStr);
  const todayIncome = todayTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const todayLoss = todayTransactions
    .filter((t) => t.type === 'loss')
    .reduce((sum, t) => sum + t.amount, 0);
  const todayNet = todayIncome - todayLoss;

  // Target metrics based on user's wallet tier
  const dailyTarget = profile?.dailyTarget || 3;
  const isTargetCompleted = todayNet >= dailyTarget;
  const extraProfit = isTargetCompleted ? Math.max(0, todayNet - dailyTarget) : 0;
  const remainingForTarget = Math.max(0, dailyTarget - todayNet);
  const targetProgressPercent = Math.min(200, Math.max(0, Math.round((todayNet / dailyTarget) * 100)));

  // 30-Day Cycle Day Calculation
  const startObj = profile?.startDate ? new Date(profile.startDate) : new Date(todayStr);
  const todayObj = new Date(todayStr);
  const diffDays = Math.max(1, Math.floor((todayObj.getTime() - startObj.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const dayInCycle = Math.min(30, diffDays);
  const isMonthCompleted = diffDays >= 30;

  // Total Net Profit across all trades and Real Live Wallet Balance
  const totalAllTimeProfit = transactions.reduce(
    (sum, tx) => sum + (tx.type === 'income' ? tx.amount : -tx.amount),
    0
  );
  const startingWalletBalance = profile?.walletBalance || 10;
  const currentRealWalletBalance = Number(Math.max(0, startingWalletBalance + totalAllTimeProfit).toFixed(2));

  // Cycle Net Profit and Account Balance calculation
  const cycleNetProfit = transactions
    .filter((t) => !profile?.startDate || t.date >= profile.startDate)
    .reduce((sum, tx) => sum + (tx.type === 'income' ? tx.amount : -tx.amount), 0);
  const currentAccountBalance = Math.max(0, startingWalletBalance + cycleNetProfit);
  const nextMonthProjection = calculateNextMonthTargetFromBalance(currentAccountBalance);

  return (
    <div id="home-view-container" className="max-w-4xl mx-auto px-3 sm:px-4 py-2 sm:py-6 space-y-4 sm:space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          id="submission-notification"
          className={`p-3.5 sm:p-4 rounded-xl flex items-center justify-between shadow-sm border transition-all ${
            notification.type === 'income'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium text-sm sm:text-base">{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs font-semibold underline ml-3 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 30-Day Month Completed Banner (Alerts when 30 days are done) */}
      {isMonthCompleted && (
        <div
          id="month-completed-alert"
          className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950 via-stone-900 to-stone-950 text-white shadow-lg border border-emerald-600/60 space-y-3"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="bg-emerald-500 text-stone-950 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                  Day 30 Finished!
                </span>
                <span className="text-xs text-emerald-300 font-semibold">Month {profile?.monthNumber || 1} Complete</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold">
                Account Balance: <span className="font-mono text-emerald-400">${currentAccountBalance.toFixed(2)} USD</span>
              </h3>
              <p className="text-xs text-stone-300 leading-relaxed">
                Floor to 10s Base: <strong className="text-white font-mono">${nextMonthProjection.baseTierBalance}.00 USD</strong> (Tier {nextMonthProjection.tier})
                {' '}• Next Month Target: <strong className="text-emerald-400 font-mono">${nextMonthProjection.dailyTarget.toFixed(2)} / day</strong> (${nextMonthProjection.thirtyDayGoal.toFixed(2)} for 30 days)
                {nextMonthProjection.surplusBalance > 0 && (
                  <span className="text-emerald-300"> • Buffer: +${nextMonthProjection.surplusBalance.toFixed(2)}</span>
                )}
              </p>
            </div>
            {onOpenNextMonth && (
              <button
                id="month-completed-advance-btn"
                onClick={onOpenNextMonth}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs flex items-center justify-center space-x-1.5 shrink-0 shadow-md transition-all cursor-pointer"
              >
                <span>Start Month {(profile?.monthNumber || 1) + 1} with ${nextMonthProjection.dailyTarget.toFixed(2)}/day Target</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Daily Target Progress & Profile Overview Banner */}
      <div id="daily-target-banner" className="bg-white rounded-2xl border border-stone-200 shadow-xs p-4 sm:p-5 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-stone-900 text-white flex items-center justify-center font-black shrink-0">
              <Target className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap">
                <span className="font-bold text-stone-900 text-sm sm:text-base">
                  {profile?.name || 'Taizer Trader'}
                </span>
                <span className="text-xs font-semibold bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md">
                  Month {profile?.monthNumber || 1} • Day {dayInCycle}/30
                </span>
                <span className="text-[10px] uppercase font-black px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                  Live Wallet
                </span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-stone-500 mt-1 flex-wrap">
                <span className="flex items-baseline space-x-1">
                  <span className="text-stone-600 font-medium">Real Balance:</span>
                  <strong className="text-stone-950 font-mono text-sm sm:text-base font-black">
                    ${currentRealWalletBalance.toFixed(2)}
                  </strong>
                  <span className="text-[10px] text-stone-400 font-bold">USD</span>
                </span>
                <span>•</span>
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                    totalAllTimeProfit > 0
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : totalAllTimeProfit < 0
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-stone-100 text-stone-600 border-stone-200'
                  }`}
                >
                  {totalAllTimeProfit > 0
                    ? `+$${totalAllTimeProfit.toFixed(2)}`
                    : totalAllTimeProfit < 0
                    ? `-$${Math.abs(totalAllTimeProfit).toFixed(2)}`
                    : '$0.00'}{' '}
                  Net P&amp;L
                </span>
                <span>•</span>
                <span>Base: <strong className="text-stone-700 font-mono">${startingWalletBalance.toFixed(2)}</strong></span>
                <span>•</span>
                <span>Goal: <strong className="text-emerald-700 font-mono">${(dailyTarget * 30).toFixed(2)}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenProfile && (
              <button
                id="edit-trading-plan-btn"
                onClick={onOpenProfile}
                className="px-3 py-1.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Change Wallet
              </button>
            )}
            {onOpenNextMonth && (
              <button
                id="advance-next-month-btn"
                onClick={onOpenNextMonth}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center space-x-1"
              >
                <span>Next Month</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Real Live Balance Card & Daily Target Progress Tracker */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-stretch">
          {/* Card 1: Prominent Real Live Balance */}
          <div className="sm:col-span-5 bg-gradient-to-br from-stone-900 to-stone-950 text-white p-3.5 sm:p-4 rounded-xl shadow-xs border border-stone-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Real Live Balance
                </span>
                <span className="text-[9px] uppercase font-black px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Live
                </span>
              </div>
              <div className="flex items-baseline space-x-1.5 mt-1">
                <span className="text-2xl sm:text-3xl font-mono font-black text-emerald-400">
                  ${currentRealWalletBalance.toFixed(2)}
                </span>
                <span className="text-xs text-stone-400 font-mono">USD</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-stone-400 pt-2 border-t border-stone-800/80 font-mono mt-2">
              <span>Base: ${startingWalletBalance.toFixed(2)}</span>
              <span className={totalAllTimeProfit >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {totalAllTimeProfit >= 0 ? '+' : '-'}${Math.abs(totalAllTimeProfit).toFixed(2)} P&amp;L
              </span>
            </div>
          </div>

          {/* Card 2: Today's Target & Progress */}
          <div className="sm:col-span-7 bg-stone-50 p-3 sm:p-4 rounded-xl border border-stone-200/80 space-y-2 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs flex-wrap gap-1">
              <span className="font-semibold text-stone-700 flex items-center space-x-1">
                <span>Today's Profit:</span>
                <span className={`font-mono font-bold ${todayNet >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {todayNet >= 0 ? `+$${todayNet.toFixed(2)}` : `-$${Math.abs(todayNet).toFixed(2)}`}
                </span>
              </span>

              {isTargetCompleted ? (
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300/80">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Target Completed! 🎉</span>
                </span>
              ) : (
                <span className="text-stone-500 font-medium text-xs">
                  Target: <strong className="text-stone-800 font-mono">${dailyTarget.toFixed(2)}</strong> (Remaining: <strong className="text-stone-800 font-mono">${remainingForTarget.toFixed(2)}</strong>)
                </span>
              )}
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full h-2.5 bg-stone-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isTargetCompleted ? 'bg-emerald-500' : 'bg-emerald-600'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, targetProgressPercent))}%` }}
              />
            </div>

            {/* Extra Profit Highlight (Wadi Gana) */}
            {isTargetCompleted && extraProfit > 0 && (
              <div id="extra-profit-callout" className="flex items-center justify-between bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 text-xs">
                <span className="font-bold text-emerald-900 flex items-center space-x-1">
                  <Award className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Extra Profit (Wadi Gana):</span>
                </span>
                <span className="font-mono font-black text-emerald-700 text-sm">
                  +${extraProfit.toFixed(2)} USD
                </span>
              </div>
            )}

            {/* Next Month Auto-Target Live Projection */}
            <div className="flex items-center justify-between bg-stone-100/80 px-2.5 py-1 rounded-lg border border-stone-200/80 text-[11px] text-stone-600 flex-wrap gap-1">
              <span className="flex items-center space-x-1">
                <TrendingUp className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>Next Month Auto Target:</span>
                <strong className="font-mono text-emerald-800 font-bold">
                  ${nextMonthProjection.dailyTarget.toFixed(2)}/day
                </strong>
              </span>
              <span className="text-stone-500 font-mono text-[10px]">
                30-day: ${nextMonthProjection.thirtyDayGoal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Calculator & Daily Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Left / Main: Calculator Section */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-stone-200 shadow-xs p-3.5 sm:p-6 space-y-3.5 sm:space-y-5">
          {/* Header section - Hidden on mobile as requested by user ("mobile device ekata me tika pennanna epa cal eka udatama ganna lassanata penna kohomath time eka date eka auto watenwane") */}
          <div className="hidden sm:flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-stone-100 gap-3">
            <div className="flex items-center space-x-2.5">
              <TaizerLogo size="sm" showText={false} />
              <div>
                <h2 className="text-base sm:text-lg font-bold text-stone-900 flex items-center space-x-1.5">
                  <span>Taizer Crypto</span>
                  <span className="text-stone-400 font-normal">•</span>
                  <span className="text-stone-700 font-medium text-xs sm:text-sm">Calculator</span>
                </h2>
                <p className="text-[11px] text-stone-500">Record daily crypto income or loss in USD</p>
              </div>
            </div>
            {/* Desktop Date Selector */}
            <div className="flex items-center space-x-1.5 bg-stone-50 px-2.5 py-1.5 rounded-lg border border-stone-200 shrink-0 self-start sm:self-auto">
              <Calendar className="w-3.5 h-3.5 text-stone-500" />
              <input
                id="entry-date-picker"
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="text-xs bg-transparent border-0 text-stone-700 font-medium focus:outline-none cursor-pointer"
              />
            </div>
          </div>

          {/* Display Screen - Positioned right at the very top on mobile */}
          <div className="bg-stone-900 text-white rounded-xl p-3.5 sm:p-5 shadow-inner flex flex-col justify-between h-20 sm:h-24">
            <div className="w-full flex items-center justify-between text-xs font-mono text-stone-400">
              <span className="sm:hidden text-[11px] text-emerald-400 font-sans font-semibold">
                Taizer Crypto
              </span>
              <span className="text-[10px] sm:text-xs uppercase tracking-wider text-stone-400 font-mono ml-auto">
                Amount (USD)
              </span>
            </div>
            <div className="text-3xl sm:text-4xl font-mono font-bold tracking-tight text-emerald-400 text-right">
              $ {displayValue}
            </div>
          </div>

          {/* Optional Note Field */}
          <div>
            <input
              id="entry-note-input"
              type="text"
              placeholder="Optional note / reason (e.g. BTC trade, Fee)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-400 transition-colors"
            />
          </div>

          {/* Calculator Keypad */}
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
            {['7', '8', '9', '4', '5', '6', '1', '2', '3', 'C', '0', '.'].map((key) => {
              if (key === 'C') {
                return (
                  <button
                    key={key}
                    id="calc-key-clear"
                    onClick={handleClear}
                    className="h-11 sm:h-13 rounded-xl bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-stone-700 font-semibold text-base transition-colors flex items-center justify-center cursor-pointer"
                  >
                    C
                  </button>
                );
              }
              return (
                <button
                  key={key}
                  id={`calc-key-${key === '.' ? 'dot' : key}`}
                  onClick={() => handleDigit(key)}
                  className="h-11 sm:h-13 rounded-xl bg-stone-50 hover:bg-stone-100 active:bg-stone-200 text-stone-800 font-semibold text-base sm:text-lg border border-stone-200/70 transition-colors cursor-pointer"
                >
                  {key}
                </button>
              );
            })}
          </div>

          {/* Additional Quick Controls: 00 and Backspace */}
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
            <button
              id="calc-key-double-zero"
              onClick={() => handleDigit('00')}
              className="h-10 sm:h-11 rounded-xl bg-stone-50 hover:bg-stone-100 active:bg-stone-200 text-stone-700 font-semibold text-xs sm:text-sm border border-stone-200/70 transition-colors cursor-pointer"
            >
              00
            </button>
            <button
              id="calc-key-backspace"
              onClick={handleBackspace}
              className="h-10 sm:h-11 rounded-xl bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-stone-700 font-semibold text-xs sm:text-sm transition-colors flex items-center justify-center space-x-1 cursor-pointer"
            >
              <Delete className="w-4 h-4" />
              <span>Backspace</span>
            </button>
          </div>

          {/* Submission Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 pt-1 sm:pt-2">
            <button
              id="submit-income-button"
              onClick={() => handleSubmit('income')}
              className="w-full py-3 sm:py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-sm sm:text-base flex items-center justify-center space-x-2 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 sm:w-5 h-4 sm:h-5" />
              <span>+ Add Daily Income</span>
            </button>
            <button
              id="submit-loss-button"
              onClick={() => handleSubmit('loss')}
              className="w-full py-3 sm:py-3.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-semibold text-sm sm:text-base flex items-center justify-center space-x-2 shadow-sm transition-all cursor-pointer"
            >
              <Minus className="w-4 sm:w-5 h-4 sm:h-5" />
              <span>- Add Daily Loss</span>
            </button>
          </div>
        </div>

        {/* Right / Side: Today's Summary & Quick Log */}
        <div className="lg:col-span-5 space-y-6">
          {/* Today Overview Card */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <span className="text-sm font-semibold text-stone-900">Today's Summary</span>
              <span className="text-xs text-stone-500 font-medium">{formatDateDisplay(todayStr)}</span>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-100 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs text-emerald-800 font-medium">Today's Income</div>
                  <div className="text-xl font-bold font-mono text-emerald-700">
                    +{formatCurrency(todayIncome)}
                  </div>
                </div>
                <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>

              <div className="p-3.5 bg-rose-50/70 border border-rose-100 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs text-rose-800 font-medium">Today's Loss</div>
                  <div className="text-xl font-bold font-mono text-rose-700">
                    -{formatCurrency(todayLoss)}
                  </div>
                </div>
                <div className="w-9 h-9 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700">
                  <Minus className="w-5 h-5" />
                </div>
              </div>

              <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs text-stone-600 font-medium">Today's Net Result</div>
                  <div
                    className={`text-xl font-bold font-mono ${
                      todayNet >= 0 ? 'text-stone-900' : 'text-rose-600'
                    }`}
                  >
                    {todayNet < 0 ? `-${formatCurrency(Math.abs(todayNet))}` : `+${formatCurrency(todayNet)}`}
                  </div>
                </div>
                <div className="text-xs font-medium px-2 py-1 rounded bg-stone-200 text-stone-700">
                  {todayTransactions.length} {todayTransactions.length === 1 ? 'entry' : 'entries'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                id="view-full-target-sheet-button"
                onClick={onNavigateToSheet}
                className="w-full py-2.5 px-3 rounded-xl border border-stone-200 hover:border-stone-300 bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
              >
                <span>Target Sheet</span>
                <ArrowRight className="w-3 h-3" />
              </button>
              {onNavigateToCalendar && (
                <button
                  id="view-calendar-profit-button"
                  onClick={onNavigateToCalendar}
                  className="w-full py-2.5 px-3 rounded-xl border border-emerald-200 hover:border-emerald-300 bg-emerald-50/70 hover:bg-emerald-100/70 text-emerald-800 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Calendar Profit</span>
                </button>
              )}
            </div>
          </div>

          {/* Today's Recent Entries */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-3">
              Today's Recorded Entries
            </h3>
            {todayTransactions.length === 0 ? (
              <p className="text-xs text-stone-400 py-6 text-center">
                No entries submitted today yet. Use the calculator on the left to add income or loss.
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {[...todayTransactions].reverse().map((item) => (
                  <div
                    key={item.id}
                    id={`today-item-${item.id}`}
                    className="p-2.5 rounded-lg border border-stone-100 bg-stone-50/50 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-2">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          item.type === 'income'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {item.type === 'income' ? '+' : '-'}
                      </span>
                      <div>
                        <div className="font-medium text-stone-800">
                          {item.note || (item.type === 'income' ? 'Daily Income' : 'Daily Loss')}
                        </div>
                        <div className="text-[11px] text-stone-400 flex items-center space-x-1">
                          <Clock className="w-3 h-3 inline" />
                          <span>{item.time}</span>
                        </div>
                      </div>
                    </div>
                    <div
                      className={`font-mono font-semibold text-sm ${
                        item.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {formatCurrency(item.amount, item.type)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

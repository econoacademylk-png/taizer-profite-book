import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  ArrowRight,
  X,
  Target,
  Sparkles,
  Award,
  CheckCircle2,
} from 'lucide-react';
import { Transaction, UserProfile } from '../types';
import { formatCurrency, formatDateDisplay, getCurrentDateString } from '../utils/storage';
import { TaizerLogo } from './TaizerLogo';

interface CalendarViewProps {
  transactions: Transaction[];
  profile?: UserProfile | null;
  onNavigateToHome?: () => void;
  onNavigateToSheet?: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CalendarView: React.FC<CalendarViewProps> = ({
  transactions,
  profile,
  onNavigateToHome,
  onNavigateToSheet,
}) => {
  const today = new Date();
  const todayStr = getCurrentDateString();
  const dailyTarget = profile?.dailyTarget || 3;

  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth());
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(todayStr);

  // Group transactions by date string YYYY-MM-DD
  const dailyStatsMap = useMemo(() => {
    const map = new Map<
      string,
      {
        income: number;
        loss: number;
        net: number;
        count: number;
        items: Transaction[];
      }
    >();

    transactions.forEach((tx) => {
      const existing = map.get(tx.date) || {
        income: 0,
        loss: 0,
        net: 0,
        count: 0,
        items: [],
      };

      if (tx.type === 'income') {
        existing.income += tx.amount;
      } else {
        existing.loss += tx.amount;
      }
      existing.net = existing.income - existing.loss;
      existing.count += 1;
      existing.items.push(tx);

      map.set(tx.date, existing);
    });

    return map;
  }, [transactions]);

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const handleJumpToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setSelectedDayDate(todayStr);
  };

  // Calendar cells generation for current month
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days: Array<{
      dayNumber: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    // Previous month padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevM = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevY = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dStr = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({
        dayNumber: dayNum,
        dateStr: dStr,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dayNumber: d,
        dateStr: dStr,
        isCurrentMonth: true,
        isToday: dStr === todayStr,
      });
    }

    // Next month padding days to complete 35 or 42 grid slots
    const totalSlots = days.length > 35 ? 42 : 35;
    const remainingSlots = totalSlots - days.length;
    for (let d = 1; d <= remainingSlots; d++) {
      const nextM = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextY = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dStr = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dayNumber: d,
        dateStr: dStr,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
      });
    }

    return days;
  }, [currentYear, currentMonth, todayStr]);

  // Overall monthly total calculations for selected month
  const currentMonthTotals = useMemo(() => {
    let income = 0;
    let loss = 0;
    let daysWithProfit = 0;

    transactions.forEach((tx) => {
      const [yStr, mStr] = tx.date.split('-');
      if (parseInt(yStr, 10) === currentYear && parseInt(mStr, 10) - 1 === currentMonth) {
        if (tx.type === 'income') {
          income += tx.amount;
        } else {
          loss += tx.amount;
        }
      }
    });

    calendarDays.forEach((day) => {
      if (day.isCurrentMonth) {
        const stats = dailyStatsMap.get(day.dateStr);
        if (stats && stats.net > 0) {
          daysWithProfit++;
        }
      }
    });

    return {
      income,
      loss,
      net: income - loss,
      daysWithProfit,
    };
  }, [transactions, currentYear, currentMonth, calendarDays, dailyStatsMap]);

  // Selected day data
  const selectedDayData = selectedDayDate ? dailyStatsMap.get(selectedDayDate) : null;

  return (
    <div id="calendar-view-container" className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header bar */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <TaizerLogo size="sm" showText={false} />
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-stone-900 tracking-tight">Taizer Calendar Profit</h2>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                  Green Daily Profit
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Daily profit total highlighted in green beside each date
              </p>
            </div>
          </div>

          {/* Month & Year Navigation Controls */}
          <div className="flex items-center space-x-2">
            <button
              id="cal-jump-today-btn"
              onClick={handleJumpToToday}
              className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Today
            </button>
            <div className="flex items-center bg-stone-50 border border-stone-200 rounded-xl p-1">
              <button
                id="cal-prev-month-btn"
                onClick={handlePrevMonth}
                className="p-1 text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 rounded-lg transition-colors cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-xs font-bold text-stone-800 px-3 whitespace-nowrap min-w-[130px] text-center">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </span>

              <button
                id="cal-next-month-btn"
                onClick={handleNextMonth}
                className="p-1 text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 rounded-lg transition-colors cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Month Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-stone-100">
          <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3">
            <div className="text-[11px] font-medium text-emerald-800 uppercase tracking-wider">
              {MONTH_NAMES[currentMonth].slice(0, 3)} Net Profit
            </div>
            <div
              className={`text-lg font-bold font-mono ${
                currentMonthTotals.net >= 0 ? 'text-emerald-700' : 'text-rose-600'
              }`}
            >
              {currentMonthTotals.net >= 0
                ? `+${formatCurrency(currentMonthTotals.net)}`
                : `-${formatCurrency(Math.abs(currentMonthTotals.net))}`}
            </div>
          </div>

          <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-3">
            <div className="text-[11px] font-medium text-stone-600 uppercase tracking-wider">
              Total Income
            </div>
            <div className="text-lg font-bold font-mono text-emerald-600">
              +{formatCurrency(currentMonthTotals.income)}
            </div>
          </div>

          <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-3">
            <div className="text-[11px] font-medium text-stone-600 uppercase tracking-wider">
              Total Loss
            </div>
            <div className="text-lg font-bold font-mono text-rose-600">
              -{formatCurrency(currentMonthTotals.loss)}
            </div>
          </div>

          <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-3">
            <div className="text-[11px] font-medium text-stone-600 uppercase tracking-wider">
              Profitable Days
            </div>
            <div className="text-lg font-bold font-mono text-stone-800">
              {currentMonthTotals.daysWithProfit} days
            </div>
          </div>
        </div>
      </div>

      {/* Main Calendar Grid & Day Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Calendar Grid (8 cols on lg) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-stone-200 shadow-xs p-4 sm:p-5">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
            {WEEKDAYS.map((wd, index) => (
              <div
                key={wd}
                className={`text-center text-xs font-semibold py-1.5 uppercase tracking-wider ${
                  index === 0 || index === 6 ? 'text-stone-400' : 'text-stone-600'
                }`}
              >
                {wd}
              </div>
            ))}
          </div>

          {/* Calendar Day Cells */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {calendarDays.map((day) => {
              const stats = dailyStatsMap.get(day.dateStr);
              const isSelected = selectedDayDate === day.dateStr;
              const hasActivity = Boolean(stats && stats.count > 0);
              const isProfitable = Boolean(stats && stats.net > 0);
              const isLossDay = Boolean(stats && stats.net < 0);
              const isEvenZero = Boolean(stats && stats.net === 0 && stats.count > 0);

              return (
                <button
                  key={day.dateStr}
                  id={`cal-day-${day.dateStr}`}
                  onClick={() => setSelectedDayDate(day.dateStr)}
                  className={`min-h-[66px] sm:min-h-[96px] p-1 sm:p-2 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer relative ${
                    isSelected
                      ? 'ring-2 ring-stone-900 border-stone-900 shadow-sm z-10'
                      : day.isToday
                      ? 'border-emerald-300 bg-emerald-50/20'
                      : day.isCurrentMonth
                      ? 'border-stone-200/80 bg-white hover:border-stone-300 hover:bg-stone-50/50'
                      : 'border-stone-100 bg-stone-50/40 text-stone-300 hover:bg-stone-50'
                  }`}
                >
                  {/* Day header: number + Today badge */}
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-[11px] sm:text-sm font-semibold rounded-md px-1 sm:px-1.5 py-0.5 ${
                        day.isToday
                          ? 'bg-emerald-600 text-white font-bold'
                          : day.isCurrentMonth
                          ? 'text-stone-800'
                          : 'text-stone-400'
                      }`}
                    >
                      {day.dayNumber}
                    </span>

                    {stats && stats.count > 0 && (
                      <span className="text-[9px] sm:text-[10px] text-stone-400 font-medium">
                        {stats.count}
                      </span>
                    )}
                  </div>

                  {/* Daily Profit Badge */}
                  <div className="mt-auto w-full pt-1">
                    {hasActivity && stats ? (
                      <div className="space-y-0.5">
                        {isProfitable ? (
                          /* Highlighted beautifully in green with Target & Extra Profit (Wadi Gana) */
                          (() => {
                            const isTargetMet = stats.net >= dailyTarget;
                            const extraProfit = isTargetMet ? stats.net - dailyTarget : 0;
                            return (
                              <div
                                id={`profit-badge-${day.dateStr}`}
                                className={`rounded-md sm:rounded-lg px-0.5 sm:px-1.5 py-0.5 sm:py-1 text-center shadow-xs border ${
                                  isTargetMet
                                    ? 'bg-emerald-100 text-emerald-900 border-emerald-400'
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                }`}
                              >
                                <div className="flex items-center justify-center space-x-0.5">
                                  {isTargetMet && (
                                    <span className="text-[9px] text-emerald-700 font-black">★</span>
                                  )}
                                  <span className="block font-mono font-extrabold text-[9px] sm:text-xs text-emerald-800 tracking-tight leading-tight">
                                    +${stats.net >= 1000 ? `${(stats.net / 1000).toFixed(1)}k` : stats.net.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                                {isTargetMet && extraProfit > 0 && (
                                  <span className="block text-[8px] sm:text-[9px] font-mono font-bold text-emerald-700 leading-tight">
                                    +{extraProfit >= 100 ? `${Math.round(extraProfit)}` : extraProfit.toFixed(1)} wadi
                                  </span>
                                )}
                              </div>
                            );
                          })()
                        ) : isLossDay ? (
                          /* Day with Net Loss */
                          <div
                            id={`loss-badge-${day.dateStr}`}
                            className="bg-rose-50 text-rose-800 border border-rose-200 rounded-md sm:rounded-lg px-0.5 sm:px-1.5 py-0.5 sm:py-1 text-center"
                          >
                            <span className="hidden sm:block text-[9px] uppercase tracking-tight font-bold text-rose-600">
                              Loss
                            </span>
                            <span className="block font-mono font-bold text-[9px] sm:text-xs text-rose-600 tracking-tight leading-tight">
                              -${Math.abs(stats.net) >= 1000 ? `${(Math.abs(stats.net) / 1000).toFixed(1)}k` : Math.abs(stats.net).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        ) : isEvenZero ? (
                          /* Break even */
                          <div className="bg-stone-100 text-stone-700 rounded-md px-1 py-0.5 text-center font-mono text-[9px] font-semibold">
                            $0
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="h-3 sm:h-4"></div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Color Key Guide */}
          <div className="mt-4 pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between text-xs text-stone-500 gap-2">
            <div className="flex items-center space-x-3">
              <span className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span>
                <span className="font-medium text-stone-700">Daily Profit (Green)</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded bg-rose-500 inline-block"></span>
                <span>Daily Loss</span>
              </span>
            </div>
            <span className="text-[11px] text-stone-400">Click any date to see exact breakdown</span>
          </div>
        </div>

        {/* Selected Day Details Panel (4 cols on lg) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <span className="text-xs text-stone-400 font-semibold uppercase tracking-wider block">
                  Date Details
                </span>
                <h3 className="text-base font-bold text-stone-900">
                  {selectedDayDate ? formatDateDisplay(selectedDayDate) : 'Select a date'}
                </h3>
              </div>
              {selectedDayDate === todayStr && (
                <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                  Today
                </span>
              )}
            </div>

            {/* Daily Profit / Result Summary for Selected Day */}
            {selectedDayData ? (
              <div className="space-y-3 mt-4">
                {/* Highlighted Profit box */}
                <div
                  className={`p-4 rounded-xl border ${
                    selectedDayData.net >= 0
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                      : 'bg-rose-50/80 border-rose-200 text-rose-950'
                  }`}
                >
                  <div className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                    Daily Profit / Net
                  </div>
                  <div
                    className={`text-2xl font-mono font-extrabold mt-0.5 ${
                      selectedDayData.net >= 0 ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {selectedDayData.net >= 0
                      ? `+${formatCurrency(selectedDayData.net)}`
                      : `-${formatCurrency(Math.abs(selectedDayData.net))}`}
                  </div>
                  <div className="text-xs text-stone-500 mt-1">
                    Calculated automatically from {selectedDayData.count} transactions on this day
                  </div>
                </div>

                {/* Target Progress & Extra Profit (Wadi Gana) Box */}
                {(() => {
                  const isTargetMet = selectedDayData.net >= dailyTarget;
                  const extraAmount = isTargetMet ? selectedDayData.net - dailyTarget : 0;
                  return (
                    <div className="p-3 bg-stone-900 text-white rounded-xl space-y-2 border border-stone-800">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-stone-400">Day Target:</span>
                        <span className="font-mono font-bold text-emerald-400">
                          ${dailyTarget.toFixed(2)} USD
                        </span>
                      </div>

                      {isTargetMet ? (
                        <div className="space-y-1.5 pt-1 border-t border-stone-800">
                          <div className="flex items-center space-x-1.5 text-xs text-emerald-400 font-bold">
                            <Sparkles className="w-3.5 h-3.5 shrink-0" />
                            <span>Target Completed! 🎉</span>
                          </div>
                          {extraAmount > 0 ? (
                            <div className="flex items-center justify-between bg-emerald-950/80 border border-emerald-800/80 px-2.5 py-1.5 rounded-lg text-xs">
                              <span className="text-emerald-300 font-medium">Extra Profit (Wadi Gana):</span>
                              <span className="font-mono font-black text-emerald-400 text-sm">
                                +${extraAmount.toFixed(2)}
                              </span>
                            </div>
                          ) : (
                            <p className="text-[11px] text-stone-400">Exactly hit daily target</p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1 pt-1 border-t border-stone-800 text-xs">
                          <span className="text-stone-400">
                            {selectedDayData.net <= 0
                              ? `Need $${dailyTarget.toFixed(2)} profit to reach target`
                              : `Need $${(dailyTarget - selectedDayData.net).toFixed(2)} more to reach target`}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Income & Loss breakdown */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-stone-50 border border-stone-200/80 rounded-xl">
                    <span className="text-[11px] font-medium text-stone-500 block">Total Income</span>
                    <span className="font-mono font-bold text-sm text-emerald-600">
                      +{formatCurrency(selectedDayData.income)}
                    </span>
                  </div>
                  <div className="p-3 bg-stone-50 border border-stone-200/80 rounded-xl">
                    <span className="text-[11px] font-medium text-stone-500 block">Total Loss</span>
                    <span className="font-mono font-bold text-sm text-rose-600">
                      -{formatCurrency(selectedDayData.loss)}
                    </span>
                  </div>
                </div>

                {/* Transaction list for selected day */}
                <div className="pt-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
                    Transactions on this Day
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {selectedDayData.items.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-lg border border-stone-100 bg-stone-50/50 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-semibold text-stone-800">
                            {item.note || (item.type === 'income' ? 'Daily Income' : 'Daily Loss')}
                          </div>
                          <div className="text-[11px] text-stone-400 flex items-center space-x-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            <span>{item.time}</span>
                          </div>
                        </div>
                        <span
                          className={`font-mono font-bold text-sm ${
                            item.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {formatCurrency(item.amount, item.type)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center space-y-3">
                <p className="text-xs text-stone-400">
                  No income or loss entries recorded for this date.
                </p>
                {onNavigateToHome && (
                  <button
                    onClick={onNavigateToHome}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    <span>+ Add via Calculator</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Quick link buttons to other views */}
          <div className="flex gap-2">
            {onNavigateToSheet && (
              <button
                onClick={onNavigateToSheet}
                className="flex-1 py-2.5 px-3 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1 transition-colors cursor-pointer"
              >
                <span>View Full Target Sheet</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

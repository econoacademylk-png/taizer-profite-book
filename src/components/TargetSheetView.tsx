import React, { useState, useMemo } from 'react';
import {
  Calendar,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Trash2,
  Download,
  Target,
  Search,
  Filter,
} from 'lucide-react';
import { Transaction, UserProfile } from '../types';
import { formatCurrency, formatDateDisplay, loadTargets, saveTarget } from '../utils/storage';
import { TaizerLogo } from './TaizerLogo';

interface TargetSheetViewProps {
  transactions: Transaction[];
  profile?: UserProfile | null;
  onDeleteTransaction: (id: string) => void;
  onNavigateToCalendar?: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const TargetSheetView: React.FC<TargetSheetViewProps> = ({
  transactions,
  profile,
  onDeleteTransaction,
  onNavigateToCalendar,
}) => {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth());
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'loss'>('all');

  // Target Goal management
  const monthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
  const [targets, setTargets] = useState<Record<string, number>>(() => loadTargets());
  const defaultCalculatedTarget = (profile?.dailyTarget || 3) * 30;
  const [targetInput, setTargetInput] = useState<string>(() => {
    const t = loadTargets();
    return t[monthKey] ? String(t[monthKey]) : String(defaultCalculatedTarget);
  });
  const [isEditingTarget, setIsEditingTarget] = useState<boolean>(false);

  // When year or month changes, update targetInput
  const currentTarget = targets[monthKey] || defaultCalculatedTarget;

  const handleSaveTarget = () => {
    const parsed = parseFloat(targetInput);
    const validTarget = isNaN(parsed) || parsed < 0 ? 0 : parsed;
    saveTarget(monthKey, validTarget);
    setTargets((prev) => ({ ...prev, [monthKey]: validTarget }));
    setIsEditingTarget(false);
  };

  // Available years from transactions + current year
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    yearsSet.add(currentDate.getFullYear());
    yearsSet.add(currentDate.getFullYear() - 1);
    yearsSet.add(currentDate.getFullYear() + 1);

    transactions.forEach((t) => {
      const y = parseInt(t.date.split('-')[0], 10);
      if (!isNaN(y)) yearsSet.add(y);
    });

    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [transactions, currentDate]);

  // Filtered transactions based on view mode (Month vs Year) and filters
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const [yStr, mStr] = t.date.split('-');
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10) - 1;

      // Year match
      if (y !== selectedYear) return false;

      // Month match (only if month mode is active)
      if (viewMode === 'month' && m !== selectedMonth) return false;

      // Type filter
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesNote = t.note?.toLowerCase().includes(query);
        const matchesDate = t.date.includes(query);
        const matchesTime = t.time.toLowerCase().includes(query);
        const matchesAmount = t.amount.toString().includes(query);

        if (!matchesNote && !matchesDate && !matchesTime && !matchesAmount) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => b.timestamp - a.timestamp);
  }, [transactions, selectedYear, selectedMonth, viewMode, typeFilter, searchTerm]);

  // Summary calculations specifically for the currently selected month
  const selectedMonthSummary = useMemo(() => {
    let income = 0;
    let loss = 0;
    let incomeCount = 0;
    let lossCount = 0;

    transactions.forEach((t) => {
      const [yStr, mStr] = t.date.split('-');
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10) - 1;

      if (y === selectedYear && m === selectedMonth) {
        if (t.type === 'income') {
          income += t.amount;
          incomeCount += 1;
        } else {
          loss += t.amount;
          lossCount += 1;
        }
      }
    });

    const overallProfit = income - loss;
    const totalCount = incomeCount + lossCount;
    const winRate = totalCount > 0 ? Math.round((incomeCount / totalCount) * 100) : 0;

    return {
      income,
      loss,
      overallProfit,
      incomeCount,
      lossCount,
      totalCount,
      winRate,
    };
  }, [transactions, selectedYear, selectedMonth]);

  const monthProgressPercent = currentTarget > 0 ? Math.min(100, Math.round((selectedMonthSummary.income / currentTarget) * 100)) : 0;

  // Automated Calculations for filtered set
  const totals = useMemo(() => {
    let income = 0;
    let loss = 0;

    filteredTransactions.forEach((t) => {
      if (t.type === 'income') {
        income += t.amount;
      } else {
        loss += t.amount;
      }
    });

    const net = income - loss;
    return { income, loss, net };
  }, [filteredTransactions]);

  // Target Progress
  const progressPercent = currentTarget > 0 ? Math.min(100, Math.round((totals.income / currentTarget) * 100)) : 0;

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      alert('No data to export.');
      return;
    }

    const headers = ['Date', 'Time', 'Type', 'Amount (USD)', 'Signed Amount', 'Note'];
    const rows = filteredTransactions.map((t) => [
      t.date,
      `"${t.time}"`,
      t.type.toUpperCase(),
      t.amount.toFixed(2),
      t.type === 'loss' ? `-${t.amount.toFixed(2)}` : t.amount.toFixed(2),
      `"${(t.note || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
      '',
      `"Total Income",,"",${totals.income.toFixed(2)}`,
      `"Total Loss",,"",-${totals.loss.toFixed(2)}`,
      `"Net Profit/Balance",,"",${totals.net.toFixed(2)}`,
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filename = `Target_Sheet_${selectedYear}_${viewMode === 'month' ? MONTH_NAMES[selectedMonth] : 'Full_Year'}.csv`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="target-sheet-container" className="w-full max-w-6xl mx-auto px-2.5 sm:px-4 py-3 sm:py-6 space-y-4 sm:space-y-6 overflow-x-hidden">
      {/* Top Summary Card for Currently Selected Month */}
      <div
        id="monthly-summary-card"
        className="bg-white rounded-3xl border border-stone-200 shadow-xs p-5 sm:p-6 space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-stone-900 text-white flex items-center justify-center shadow-xs">
              <Calendar className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                  Monthly Performance Summary
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    selectedMonthSummary.overallProfit > 0
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : selectedMonthSummary.overallProfit < 0
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-stone-100 text-stone-700 border-stone-200'
                  }`}
                >
                  {selectedMonthSummary.overallProfit > 0
                    ? `+ Net Profit (${selectedMonthSummary.winRate}% win rate)`
                    : selectedMonthSummary.overallProfit < 0
                    ? `- Net Loss (${selectedMonthSummary.winRate}% win rate)`
                    : 'Break Even'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-stone-950 tracking-tight">
                {MONTH_NAMES[selectedMonth]} {selectedYear}
              </h2>
            </div>
          </div>

          {/* Quick Month & Year Switcher Controls */}
          <div className="flex items-center space-x-2">
            <select
              id="summary-month-select"
              value={selectedMonth}
              onChange={(e) => {
                const m = parseInt(e.target.value, 10);
                setSelectedMonth(m);
                const newKey = `${selectedYear}-${String(m + 1).padStart(2, '0')}`;
                setTargetInput(targets[newKey] ? String(targets[newKey]) : String(defaultCalculatedTarget));
              }}
              className="text-xs font-semibold bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-800 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-400 cursor-pointer"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={name} value={idx}>
                  {name}
                </option>
              ))}
            </select>

            <select
              id="summary-year-select"
              value={selectedYear}
              onChange={(e) => {
                const y = parseInt(e.target.value, 10);
                setSelectedYear(y);
                const newKey = `${y}-${String(selectedMonth + 1).padStart(2, '0')}`;
                setTargetInput(targets[newKey] ? String(targets[newKey]) : String(defaultCalculatedTarget));
              }}
              className="text-xs font-semibold bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-800 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-400 cursor-pointer"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 3 Metric Cards: Total Income, Total Losses, Overall Profit */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Total Income */}
          <div
            id="summary-total-income"
            className="p-4 sm:p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 transition-all hover:bg-emerald-50"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                Total Income
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-700 tracking-tight">
                +{formatCurrency(selectedMonthSummary.income)}
              </div>
              <p className="text-xs text-stone-500 mt-1 flex items-center justify-between">
                <span>
                  {selectedMonthSummary.incomeCount}{' '}
                  {selectedMonthSummary.incomeCount === 1 ? 'gain entry' : 'gain entries'}
                </span>
                {selectedMonthSummary.totalCount > 0 && (
                  <span className="font-semibold text-emerald-700">
                    {Math.round((selectedMonthSummary.incomeCount / selectedMonthSummary.totalCount) * 100)}% of trades
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Total Losses */}
          <div
            id="summary-total-losses"
            className="p-4 sm:p-5 rounded-2xl bg-rose-50/70 border border-rose-200/80 transition-all hover:bg-rose-50"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">
                Total Losses
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="text-2xl sm:text-3xl font-black font-mono text-rose-600 tracking-tight">
                -{formatCurrency(selectedMonthSummary.loss)}
              </div>
              <p className="text-xs text-stone-500 mt-1 flex items-center justify-between">
                <span>
                  {selectedMonthSummary.lossCount}{' '}
                  {selectedMonthSummary.lossCount === 1 ? 'loss entry' : 'loss entries'}
                </span>
                {selectedMonthSummary.totalCount > 0 && (
                  <span className="font-semibold text-rose-700">
                    {Math.round((selectedMonthSummary.lossCount / selectedMonthSummary.totalCount) * 100)}% of trades
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Overall Profit */}
          <div
            id="summary-overall-profit"
            className={`p-4 sm:p-5 rounded-2xl border transition-all ${
              selectedMonthSummary.overallProfit >= 0
                ? 'bg-stone-950 text-white border-stone-800 shadow-xs'
                : 'bg-rose-100/70 border-rose-300 text-stone-950'
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-[11px] font-bold uppercase tracking-wider ${
                  selectedMonthSummary.overallProfit >= 0 ? 'text-stone-300' : 'text-rose-900'
                }`}
              >
                Overall Profit
              </span>
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  selectedMonthSummary.overallProfit >= 0
                    ? 'bg-stone-800 text-emerald-400'
                    : 'bg-rose-200 text-rose-800'
                }`}
              >
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <div
                className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
                  selectedMonthSummary.overallProfit >= 0
                    ? 'text-emerald-400'
                    : 'text-rose-600'
                }`}
              >
                {selectedMonthSummary.overallProfit < 0
                  ? `-${formatCurrency(Math.abs(selectedMonthSummary.overallProfit))}`
                  : `+${formatCurrency(selectedMonthSummary.overallProfit)}`}
              </div>
              <p
                className={`text-xs mt-1 ${
                  selectedMonthSummary.overallProfit >= 0 ? 'text-stone-400' : 'text-rose-800'
                }`}
              >
                {selectedMonthSummary.overallProfit >= 0
                  ? `Net positive profit for ${MONTH_NAMES[selectedMonth]}`
                  : `Net loss incurred in ${MONTH_NAMES[selectedMonth]}`}
              </p>
            </div>
          </div>
        </div>

        {/* Monthly Target Progress & Setting Integration */}
        <div className="pt-3 border-t border-stone-100 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-stone-700 flex items-center space-x-1.5">
                <Target className="w-4 h-4 text-emerald-600" />
                <span>Monthly Target Goal: {formatCurrency(currentTarget)}</span>
              </span>
              {profile?.dailyTarget && (
                <span className="text-stone-400 text-[11px]">
                  (${profile.dailyTarget}/day plan)
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <span
                className={`font-mono font-bold ${
                  selectedMonthSummary.income >= currentTarget
                    ? 'text-emerald-600'
                    : 'text-stone-600'
                }`}
              >
                {selectedMonthSummary.income >= currentTarget
                  ? 'Target Achieved! 🎉'
                  : `${monthProgressPercent}% reached (${formatCurrency(Math.max(0, currentTarget - selectedMonthSummary.income))} remaining)`}
              </span>

              {isEditingTarget ? (
                <div className="flex items-center space-x-1.5">
                  <input
                    type="number"
                    value={targetInput}
                    onChange={(e) => setTargetInput(e.target.value)}
                    className="w-24 px-2 py-1 text-xs border border-stone-300 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-stone-500"
                  />
                  <button
                    onClick={handleSaveTarget}
                    className="px-2 py-1 bg-stone-900 text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditingTarget(false)}
                    className="px-2 py-1 bg-stone-100 text-stone-600 rounded-lg text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditingTarget(true)}
                  className="text-[11px] font-semibold text-stone-500 hover:text-stone-900 underline cursor-pointer"
                >
                  Edit Target
                </button>
              )}
            </div>
          </div>

          <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${monthProgressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Top Filter & Mode Selection Bar */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Title & View Toggle */}
          <div className="flex items-center space-x-3">
            <TaizerLogo size="sm" showText={false} />
            <div>
              <h2 className="text-xl font-bold text-stone-900 tracking-tight flex items-center space-x-2">
                <span>Taizer Target Sheet</span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                  {viewMode === 'month' ? `${MONTH_NAMES[selectedMonth]} ${selectedYear}` : `Year ${selectedYear}`}
                </span>
              </h2>
              <p className="text-xs text-stone-500">Automated income, loss, and net calculation</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Switcher: Month vs Year vs Calendar */}
            <div className="bg-stone-100 p-1 rounded-xl flex items-center text-xs font-semibold">
              <button
                id="view-mode-month"
                onClick={() => setViewMode('month')}
                className={`px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'month'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Month View
              </button>
              <button
                id="view-mode-year"
                onClick={() => setViewMode('year')}
                className={`px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'year'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Year View
              </button>
              {onNavigateToCalendar && (
                <button
                  id="view-mode-calendar-btn"
                  onClick={onNavigateToCalendar}
                  className="px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer text-stone-600 hover:text-stone-900 flex items-center space-x-1"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Calendar</span>
                </button>
              )}
            </div>

            {/* Year Selector */}
            <div className="relative">
              <select
                id="sheet-year-select"
                value={selectedYear}
                onChange={(e) => {
                  const y = parseInt(e.target.value, 10);
                  setSelectedYear(y);
                  const newKey = `${y}-${String(selectedMonth + 1).padStart(2, '0')}`;
                  setTargetInput(targets[newKey] ? String(targets[newKey]) : '');
                }}
                className="text-xs font-semibold bg-stone-50 border border-stone-200 text-stone-800 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-400 cursor-pointer"
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Export CSV */}
            <button
              id="export-csv-button"
              onClick={handleExportCSV}
              className="text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-white rounded-xl px-3 py-2 flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="Download Target Sheet as CSV file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Month Selector Pills (visible when Month View is active) */}
        {viewMode === 'month' && (
          <div className="pt-2 border-t border-stone-100">
            <div className="flex items-center space-x-1 overflow-x-auto pb-1 scrollbar-none">
              {MONTH_NAMES.map((name, index) => {
                const isSelected = selectedMonth === index;
                return (
                  <button
                    key={name}
                    id={`month-select-${index}`}
                    onClick={() => {
                      setSelectedMonth(index);
                      const newKey = `${selectedYear}-${String(index + 1).padStart(2, '0')}`;
                      setTargetInput(targets[newKey] ? String(targets[newKey]) : '');
                    }}
                    className={`text-xs px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-stone-900 text-white font-semibold'
                        : 'bg-stone-50 hover:bg-stone-100 text-stone-600'
                    }`}
                  >
                    {name.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Full Year Aggregate Summary (Visible when Year View is active) */}
      {viewMode === 'year' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-stone-900 flex items-center space-x-2">
                <span>Full Year {selectedYear} Aggregate Summary</span>
                <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full font-medium">
                  {filteredTransactions.length} recorded entries
                </span>
              </h3>
              <p className="text-xs text-stone-500">Combined totals across all months in {selectedYear}</p>
            </div>
            <div className="text-xs font-mono font-bold">
              {totals.net >= 0 ? (
                <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  Annual Net: +{formatCurrency(totals.net)}
                </span>
              ) : (
                <span className="text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                  Annual Net: -{formatCurrency(Math.abs(totals.net))}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="bg-emerald-50/60 border border-emerald-200/70 rounded-xl p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                Year Total Income
              </span>
              <div className="text-lg font-black font-mono text-emerald-700">
                +{formatCurrency(totals.income)}
              </div>
            </div>
            <div className="bg-rose-50/60 border border-rose-200/70 rounded-xl p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800">
                Year Total Loss
              </span>
              <div className="text-lg font-black font-mono text-rose-600">
                -{formatCurrency(totals.loss)}
              </div>
            </div>
            <div
              className={`rounded-xl p-3 border ${
                totals.net >= 0
                  ? 'bg-stone-950 text-white border-stone-800'
                  : 'bg-rose-100/60 text-stone-950 border-rose-200'
              }`}
            >
              <span
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  totals.net >= 0 ? 'text-stone-300' : 'text-rose-900'
                }`}
              >
                Year Overall Net
              </span>
              <div
                className={`text-lg font-black font-mono ${
                  totals.net >= 0 ? 'text-emerald-400' : 'text-rose-600'
                }`}
              >
                {totals.net >= 0 ? `+${formatCurrency(totals.net)}` : `-${formatCurrency(Math.abs(totals.net))}`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Target Sheet Table Section */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        {/* Table Controls (Search & Type Filter) */}
        <div className="p-4 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/50">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-semibold text-stone-900">Recorded Sheet Entries</span>
            <span className="text-xs bg-stone-200/70 text-stone-700 px-2 py-0.5 rounded-full font-medium">
              {filteredTransactions.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-stone-400" />
              <input
                id="search-transactions-input"
                type="text"
                placeholder="Search note, date..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-white rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-400 w-44"
              />
            </div>

            {/* Type Filter */}
            <div className="flex items-center bg-stone-100 rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  typeFilter === 'all' ? 'bg-white font-semibold text-stone-900 shadow-xs' : 'text-stone-600'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setTypeFilter('income')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  typeFilter === 'income' ? 'bg-white font-semibold text-emerald-700 shadow-xs' : 'text-stone-600'
                }`}
              >
                Income
              </button>
              <button
                onClick={() => setTypeFilter('loss')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  typeFilter === 'loss' ? 'bg-white font-semibold text-rose-700 shadow-xs' : 'text-stone-600'
                }`}
              >
                Loss
              </button>
            </div>
          </div>
        </div>

        {/* Table & Mobile Card View */}
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Calendar className="w-10 h-10 text-stone-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-stone-600">No transactions recorded for this period</p>
            <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
              Submit daily income or loss from the Home calculator to populate this sheet automatically with date and time.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card List View (Clean & Native on phone screens) */}
            <div className="md:hidden divide-y divide-stone-100">
              {filteredTransactions.map((tx) => {
                const isIncome = tx.type === 'income';
                return (
                  <div
                    key={tx.id}
                    id={`sheet-mobile-card-${tx.id}`}
                    className="p-3.5 space-y-2 hover:bg-stone-50/60 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            isIncome ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {isIncome ? '+ Income' : '- Loss'}
                        </span>
                        <span className="text-xs text-stone-600 font-medium">
                          {formatDateDisplay(tx.date)}
                        </span>
                      </div>
                      <span
                        className={`font-mono font-extrabold text-sm ${
                          isIncome ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {formatCurrency(tx.amount, tx.type)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-stone-500 pt-0.5">
                      <div className="flex items-center space-x-2 truncate mr-2">
                        <span className="font-mono text-[11px] text-stone-400 shrink-0">{tx.time}</span>
                        {tx.note ? (
                          <span className="text-stone-700 font-medium truncate">"{tx.note}"</span>
                        ) : (
                          <span className="text-stone-400 italic text-[11px]">No note</span>
                        )}
                      </div>
                      <button
                        id={`delete-mobile-btn-${tx.id}`}
                        onClick={() => {
                          if (confirm(`Delete this ${tx.type} entry of $${tx.amount.toFixed(2)}?`)) {
                            onDeleteTransaction(tx.id);
                          }
                        }}
                        className="p-1.5 text-stone-400 hover:text-rose-600 active:bg-rose-50 rounded transition-colors cursor-pointer shrink-0"
                        title="Delete entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Note / Reason</th>
                    <th className="py-3 px-4 text-right">Amount (USD)</th>
                    <th className="py-3 px-4 text-center w-12">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredTransactions.map((tx) => {
                    const isIncome = tx.type === 'income';
                    return (
                      <tr key={tx.id} id={`sheet-row-${tx.id}`} className="hover:bg-stone-50/60 transition-colors">
                        {/* Date */}
                        <td className="py-3 px-4 font-medium text-stone-800 whitespace-nowrap">
                          {formatDateDisplay(tx.date)}
                          <span className="text-[11px] text-stone-400 block font-normal">{tx.date}</span>
                        </td>

                        {/* Time */}
                        <td className="py-3 px-4 text-stone-600 font-mono text-xs whitespace-nowrap">
                          {tx.time}
                        </td>

                        {/* Type Badge */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                              isIncome
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {isIncome ? '+ Income' : '- Loss'}
                          </span>
                        </td>

                        {/* Note */}
                        <td className="py-3 px-4 text-stone-600">
                          {tx.note || <span className="text-stone-400 italic">—</span>}
                        </td>

                        {/* Amount: Income (+) or Loss (-) as explicitly requested */}
                        <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
                          <span className={isIncome ? 'text-emerald-600' : 'text-rose-600'}>
                            {formatCurrency(tx.amount, tx.type)}
                          </span>
                        </td>

                        {/* Delete action */}
                        <td className="py-3 px-4 text-center">
                          <button
                            id={`delete-btn-${tx.id}`}
                            onClick={() => {
                              if (confirm(`Delete this ${tx.type} entry of $${tx.amount.toFixed(2)}?`)) {
                                onDeleteTransaction(tx.id);
                              }
                            }}
                            className="p-1 text-stone-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

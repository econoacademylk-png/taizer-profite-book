import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DollarSign, RefreshCw, TrendingUp, X, ArrowRightLeft, Sparkles, CheckCircle2 } from 'lucide-react';
import { DollarRateData, getCachedDollarRate, fetchLiveDollarRate } from '../utils/exchangeRate';

export const DollarRateBadge: React.FC = () => {
  const [rateData, setRateData] = useState<DollarRateData>(() => getCachedDollarRate());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Currency Converter State
  const [usdInput, setUsdInput] = useState<string>('30');
  const [lkrInput, setLkrInput] = useState<string>('');
  const [lastEdited, setLastEdited] = useState<'usd' | 'lkr'>('usd');
  const [copied, setCopied] = useState<boolean>(false);

  // Initial fetch and 30-minute periodic background auto-update
  useEffect(() => {
    let mounted = true;

    const updateRate = async (showSpinner = false) => {
      if (showSpinner) setIsRefreshing(true);
      try {
        const fresh = await fetchLiveDollarRate();
        if (mounted) {
          setRateData(fresh);
        }
      } finally {
        if (mounted && showSpinner) setIsRefreshing(false);
      }
    };

    // 1. Initial fetch on mount
    updateRate(false);

    // 2. Periodic check every 30 minutes
    const interval = setInterval(() => {
      updateRate(false);
    }, 30 * 60 * 1000);

    // 3. Auto-update when tab gains focus
    const handleFocus = () => {
      updateRate(false);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      mounted = false;
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Update converter calculations
  useEffect(() => {
    const rate = rateData.rate || 331.88;
    if (lastEdited === 'usd') {
      const numUsd = parseFloat(usdInput);
      if (!isNaN(numUsd) && numUsd >= 0) {
        setLkrInput((numUsd * rate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      } else {
        setLkrInput('');
      }
    } else {
      const cleanLkr = lkrInput.replace(/,/g, '');
      const numLkr = parseFloat(cleanLkr);
      if (!isNaN(numLkr) && numLkr >= 0) {
        setUsdInput((numLkr / rate).toFixed(2));
      } else {
        setUsdInput('');
      }
    }
  }, [usdInput, lkrInput, lastEdited, rateData.rate]);

  // Lock background scrolling when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    const fresh = await fetchLiveDollarRate();
    setRateData(fresh);
    setIsRefreshing(false);
  };

  const handlePresetClick = (amount: number) => {
    setLastEdited('usd');
    setUsdInput(String(amount));
  };

  return (
    <>
      {/* Navbar Interactive Badge */}
      <button
        type="button"
        id="dollar-rate-navbar-badge"
        onClick={() => setIsModalOpen(true)}
        className="flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl bg-emerald-50/90 hover:bg-emerald-100 text-emerald-950 border border-emerald-200/90 shadow-2xs transition-all cursor-pointer group active:scale-[0.97]"
        title="Today's Live Dollar Rate (USD to LKR) • Click to open calculator"
      >
        <div className="w-5 h-5 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
          <DollarSign className="w-3.5 h-3.5 stroke-[2.5]" />
        </div>

        <div className="flex items-center space-x-1 text-left leading-none font-mono">
          <span className="text-[10px] sm:text-xs font-black text-emerald-900">
            Rs. {rateData.rate.toFixed(2)}
          </span>
          <span className="hidden xl:inline text-[9px] font-semibold text-emerald-700 bg-emerald-200/60 px-1 py-0.2 rounded">
            LKR
          </span>
        </div>

        {/* Pulsing Live Dot */}
        <span className="relative flex h-1.5 w-1.5 ml-0.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-600" />
        </span>
      </button>

      {/* Modal / Converter Popup (Rendered directly into body portal) */}
      {isModalOpen &&
        createPortal(
          <div
            id="dollar-rate-modal-backdrop"
            onClick={() => setIsModalOpen(false)}
            className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-stone-950/80 backdrop-blur-xs overflow-y-auto overscroll-contain animate-in fade-in duration-150"
          >
            <div
              id="dollar-rate-modal-card"
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm sm:max-w-md bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-auto"
            >
              {/* Header */}
              <div className="bg-stone-950 text-white p-4 sm:p-5 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:14px_14px] pointer-events-none" />

                <div className="relative flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <h3 className="text-sm sm:text-base font-black text-white tracking-tight">
                          Daily Dollar Rate
                        </h3>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/80 font-mono">
                          USD/LKR
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-400">
                        Live Sri Lankan Rupee Exchange Rate
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="w-7 h-7 rounded-full bg-stone-900 hover:bg-stone-800 border border-stone-800 flex items-center justify-center text-stone-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Big Rate Display Card */}
                <div className="mt-3.5 bg-stone-900/90 rounded-2xl p-3 border border-stone-800/90 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
                      Today's Official Rate
                    </span>
                    <div className="flex items-baseline space-x-1.5 mt-0.5">
                      <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                        $1.00 USD
                      </span>
                      <span className="text-stone-400 font-mono text-sm">=</span>
                      <span className="text-xl sm:text-2xl font-black text-white font-mono">
                        Rs. {rateData.rate.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleManualRefresh}
                    disabled={isRefreshing}
                    className="flex flex-col items-center justify-center px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 active:bg-stone-600 text-stone-300 hover:text-white transition-all text-[10px] font-bold cursor-pointer disabled:opacity-50"
                    title="Re-sync rate from market right now"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : 'text-stone-400'}`} />
                    <span className="text-[9px] mt-0.5">Refresh</span>
                  </button>
                </div>
              </div>

              {/* Body: Live Converter */}
              <div className="p-4 sm:p-5 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-800 flex items-center space-x-1.5">
                      <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Instant Profit / Currency Converter</span>
                    </span>
                    <span className="text-[10px] text-stone-500 font-mono">
                      Auto-calculating
                    </span>
                  </div>

                  {/* USD Input */}
                  <div className="bg-stone-50 rounded-2xl p-3 border border-stone-200">
                    <div className="flex items-center justify-between text-xs text-stone-600 mb-1">
                      <span className="font-semibold">Amount in Dollars ($ USD)</span>
                      <span className="text-[10px] font-mono text-emerald-700 font-bold">USD</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={usdInput}
                        onChange={(e) => {
                          setLastEdited('usd');
                          setUsdInput(e.target.value);
                        }}
                        placeholder="0.00"
                        className="w-full bg-transparent text-lg sm:text-xl font-mono font-black text-stone-900 focus:outline-none"
                      />
                      <span className="absolute right-0 top-1/2 -translate-y-1/2 text-stone-400 font-mono text-sm font-bold">
                        $
                      </span>
                    </div>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[11px] font-bold font-mono">
                    <span className="text-[10px] text-stone-500 uppercase tracking-wider font-sans shrink-0 mr-1">
                      Presets:
                    </span>
                    {[10, 20, 30, 50, 100].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handlePresetClick(amt)}
                        className={`px-2 py-0.5 rounded-lg border transition-all cursor-pointer shrink-0 ${
                          usdInput === String(amt)
                            ? 'bg-stone-900 text-emerald-300 border-stone-800 shadow-xs'
                            : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-200'
                        }`}
                      >
                        ${amt}
                      </button>
                    ))}
                  </div>

                  {/* LKR Output / Input */}
                  <div className="bg-emerald-50/50 rounded-2xl p-3 border border-emerald-200/80">
                    <div className="flex items-center justify-between text-xs text-stone-600 mb-1">
                      <span className="font-semibold text-emerald-950">
                        Sri Lankan Rupees (Rs. LKR)
                      </span>
                      <span className="text-[10px] font-mono text-emerald-700 font-bold">LKR</span>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={lkrInput}
                        onChange={(e) => {
                          setLastEdited('lkr');
                          setLkrInput(e.target.value);
                        }}
                        placeholder="0.00"
                        className="w-full bg-transparent text-lg sm:text-xl font-mono font-black text-emerald-950 focus:outline-none"
                      />
                      <span className="absolute right-0 top-1/2 -translate-y-1/2 text-emerald-700 font-mono text-xs font-bold">
                        Rs.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Auto-update Info Note */}
                <div className="bg-stone-50 rounded-xl p-2.5 border border-stone-200 text-[11px] text-stone-600 flex items-start space-x-2">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-medium">
                      <strong className="text-stone-900">Auto Daily Update:</strong> Rates update automatically every 24 hours based on official Central Bank / Interbank market rates.
                    </p>
                    <p className="text-[10px] text-stone-500 font-mono">
                      Last synced: {rateData.date}
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-3 bg-stone-50 border-t border-stone-200 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  Done
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

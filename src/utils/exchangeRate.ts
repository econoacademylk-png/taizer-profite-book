export interface DollarRateData {
  rate: number;
  base: string;
  target: string;
  date: string;
  lastUpdated: string;
  loading: boolean;
  error?: string | null;
}

const STORAGE_KEY = 'taizer_daily_dollar_rate';
const DEFAULT_RATE = 331.88;

export function getCachedDollarRate(): DollarRateData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.rate === 'number' && parsed.rate > 0) {
        return {
          rate: Number(parsed.rate.toFixed(2)),
          base: parsed.base || 'USD',
          target: parsed.target || 'LKR',
          date: parsed.date || new Date().toISOString().split('T')[0],
          lastUpdated: parsed.lastUpdated || 'Saved Rate',
          loading: false,
          error: null,
        };
      }
    }
  } catch (e) {
    console.error('Error reading cached dollar rate', e);
  }

  return {
    rate: DEFAULT_RATE,
    base: 'USD',
    target: 'LKR',
    date: new Date().toISOString().split('T')[0],
    lastUpdated: 'Live Rate',
    loading: false,
    error: null,
  };
}

export function saveCachedDollarRate(data: Omit<DollarRateData, 'loading' | 'error'>): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        rate: data.rate,
        base: data.base,
        target: data.target,
        date: data.date,
        lastUpdated: data.lastUpdated,
        savedAt: Date.now(),
      })
    );
  } catch (e) {
    console.error('Error saving cached dollar rate', e);
  }
}

export async function fetchLiveDollarRate(): Promise<DollarRateData> {
  const cached = getCachedDollarRate();

  // 1. Try local server API endpoint (proxied and cached in MongoDB Atlas)
  try {
    const res = await fetch('/api/dollar-rate');
    if (res.ok) {
      const data = await res.json();
      if (typeof data?.rate === 'number' && data.rate > 0) {
        const result: DollarRateData = {
          rate: Number(data.rate.toFixed(2)),
          base: data.base || 'USD',
          target: data.target || 'LKR',
          date: data.date || new Date().toISOString().split('T')[0],
          lastUpdated: data.lastUpdated || new Date().toLocaleTimeString(),
          loading: false,
          error: null,
        };
        saveCachedDollarRate(result);
        return result;
      }
    }
  } catch (err) {
    // Continue to external fallback
  }

  // 2. Direct external provider fallback 1: Open Exchange Rates
  try {
    const extRes = await fetch('https://open.er-api.com/v6/latest/USD');
    if (extRes.ok) {
      const extData = await extRes.json();
      if (extData?.rates?.LKR) {
        const rate = Number(Number(extData.rates.LKR).toFixed(2));
        const result: DollarRateData = {
          rate,
          base: 'USD',
          target: 'LKR',
          date: new Date().toISOString().split('T')[0],
          lastUpdated: extData.time_last_update_utc || new Date().toLocaleTimeString(),
          loading: false,
          error: null,
        };
        saveCachedDollarRate(result);
        return result;
      }
    }
  } catch (err) {
    // Continue to fallback 2
  }

  // 3. Direct external provider fallback 2: ExchangeRate-API
  try {
    const fbRes = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    if (fbRes.ok) {
      const fbData = await fbRes.json();
      if (fbData?.rates?.LKR) {
        const rate = Number(Number(fbData.rates.LKR).toFixed(2));
        const result: DollarRateData = {
          rate,
          base: 'USD',
          target: 'LKR',
          date: fbData.date || new Date().toISOString().split('T')[0],
          lastUpdated: new Date().toLocaleTimeString(),
          loading: false,
          error: null,
        };
        saveCachedDollarRate(result);
        return result;
      }
    }
  } catch (err) {}

  // 4. If all fail, return existing cached rate
  return cached;
}

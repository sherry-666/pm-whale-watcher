/**
 * Formats a number as USD currency.
 * If short is true, formats as $240K, $1.2M, etc.
 */
export function formatCurrency(value: number, short = false): string {
  if (short) {
    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    if (absValue >= 1000000) {
      return `${sign}$${(absValue / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
    }
    if (absValue >= 1000) {
      return `${sign}$${(absValue / 1000).toFixed(0)}K`;
    }
    return `${sign}$${absValue.toFixed(0)}`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Shortens a wallet address to 0x1234...5678 format.
 */
export function shortenAddress(address: string, chars = 4): string {
  if (!address) return '';
  if (address.length <= chars * 2 + 2) return address;
  return `${address.substring(0, chars + 2)}...${address.substring(address.length - chars)}`;
}

/**
 * Formats odds as percentage (e.g. 0.12 -> 12%).
 */
export function formatOdds(odds: number): string {
  return `${Math.round(odds * 100)}%`;
}

/**
 * Formats a date relative to now (e.g. "just now", "10m ago").
 */
export function timeAgo(timestamp: string | Date | number, nowOverride?: number): string {
  const date = new Date(timestamp);
  const now = nowOverride ? new Date(nowOverride) : new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Formats a Date object to "HH:MM:SS UTC"
 */
export function formatUTCClock(date: Date): string {
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss} UTC`;
}

/**
 * Formats a date string to a short local date (e.g., "Jun 20, 23:15")
 */
export function formatShortDate(timestamp: string | Date | number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

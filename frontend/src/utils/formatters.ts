// Formatting utilities

/**
 * Format a number as INR currency using Indian numbering system
 * e.g., 1250000 -> ₹12,50,000.00
 */
export function toAmount(value: number | string | null | undefined): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
  return Number.isFinite(n) ? n : 0;
}

export function formatINR(amount: number | string | null | undefined): string {
  const numeric = toAmount(amount);
  if (numeric === 0) return '₹0.00';

  const absAmount = Math.abs(numeric);
  const sign = numeric < 0 ? '-' : '';

  // Convert to string with 2 decimal places
  const parts = absAmount.toFixed(2).split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];

  // Apply Indian numbering system (lakhs, crores)
  // Group as: 3 digits, then 2 digits repeatedly from right
  let formatted = '';
  const len = integerPart.length;

  if (len <= 3) {
    formatted = integerPart;
  } else {
    // First group of 3 from right
    let remaining = len;
    const groups: string[] = [];

    // Last 3 digits
    groups.unshift(integerPart.slice(-3));
    remaining -= 3;

    // Then groups of 2
    while (remaining > 0) {
      const start = Math.max(0, remaining - 2);
      groups.unshift(integerPart.slice(start, remaining));
      remaining -= 2;
    }

    formatted = groups.join(',');
  }

  return `${sign}₹${formatted}.${decimalPart}`;
}

/**
 * Format a date string to a readable format
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format a date string to a short date format
 */
export function formatShortDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Get status badge color classes using design system
 */
export function getStatusBadgeClass(status: string): string {
  const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';

  switch (status) {
    case 'DRAFT':
    case 'PROPOSED':
      return `${base} bg-neutral-100 text-neutral-700 border border-neutral-200`;
    case 'PENDING_APPROVAL':
      return `${base} bg-warning-50 text-warning-700 border border-warning-100`;
    case 'APPROVED':
      return `${base} bg-success-50 text-success-700 border border-success-100`;
    case 'PAID':
    case 'DISBURSED':
      return `${base} bg-brand-100 text-brand-700 border border-brand-200`;
    case 'REJECTED':
      return `${base} bg-error-50 text-error-700 border border-error-100`;
    case 'CANCELLED':
      return `${base} bg-neutral-100 text-neutral-700 border border-neutral-200`;
    default:
      return `${base} bg-neutral-100 text-neutral-700 border border-neutral-200`;
  }
}

/**
 * Get source origin badge class using design system
 */
export function getSourceOriginClass(origin: 'DOMESTIC' | 'FOREIGN'): string {
  if (origin === 'DOMESTIC') {
    return 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold tracking-wide bg-brand-100 text-brand-700 border border-brand-200';
  }
  return 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold tracking-wide bg-brand-50 text-brand-700 border border-brand-100';
}

/**
 * Get recipient kind badge class using design system
 */
export function getRecipientKindClass(_kind: string): string {
  return 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-secondary border border-neutral-200';
}

/**
 * Truncate UUID for display
 */
export function truncateId(id: string, length = 8): string {
  if (id.length <= length) return id;
  return `${id.slice(0, length)}…`;
}

/**
 * Format amount with tabular numerals CSS class
 */
export function getTabularNumsClass(): string {
  return 'font-mono tabular-nums';
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
/** Date helpers that work in the visitor's local time (toISOString alone would use UTC and,
 *  at Nepal's UTC+5:45, can give yesterday's date in the early morning). */

export function toISODate(d: Date): string {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return toISODate(new Date(y, m - 1, d + days));
}

/** Whole nights between two YYYY-MM-DD dates (0 if invalid or not after check-in). */
export function nightsBetween(checkin: string, checkout: string): number {
  if (!checkin || !checkout) return 0;
  const [y1, m1, d1] = checkin.split('-').map(Number);
  const [y2, m2, d2] = checkout.split('-').map(Number);
  const nights = Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
  return Number.isFinite(nights) && nights > 0 ? nights : 0;
}

export function formatDateLong(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

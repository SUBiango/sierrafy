/**
 * Date-of-birth normalisation (§4.2.4): convert the card's day-first date into
 * ISO 8601 `YYYY-MM-DD` so DOBs can be compared exactly. Sierra Leone eID cards
 * print dates dot-separated (`28.04.2000`); slashes and hyphens are also
 * accepted. Already-ISO input passes through. Returns null for unparseable input.
 */
export function normalizeDob(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const value = input.trim();
  if (value === '') return null;

  // Already ISO: YYYY-MM-DD
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (iso) {
    return isValidYmd(iso[1]!, iso[2]!, iso[3]!) ? value : null;
  }

  // Day-first: DD.MM.YYYY / DD/MM/YYYY / DD-MM-YYYY (tolerates single-digit D/M)
  const dmy = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(value);
  if (dmy) {
    const day = dmy[1]!.padStart(2, '0');
    const month = dmy[2]!.padStart(2, '0');
    const year = dmy[3]!;
    return isValidYmd(year, month, day) ? `${year}-${month}-${day}` : null;
  }

  return null;
}

/** True when the numeric parts form a real calendar date. */
function isValidYmd(year: string, month: string, day: string): boolean {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (m < 1 || m > 12 || d < 1) return false;
  const daysInMonth = new Date(y, m, 0).getDate();
  return d <= daysInMonth;
}

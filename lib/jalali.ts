import { t } from '../translations';

export function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy: number, jm: number, jd: number;

  let gy2 = (gm > 2) ? (gy + 1) : gy;
  let days = 355666 + (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) + gd + g_d_m[gm - 1];
  jy = -1595 + (33 * Math.floor(days / 12053));
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;

  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }

  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }

  return [jy, jm, jd];
}

export function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  const j_y = jy + 1595;
  let days = -355668 + (365 * j_y) + (Math.floor(j_y / 33) * 8) + Math.floor(((j_y % 33) + 3) / 4) + jd + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
  
  let gy = 400 * Math.floor(days / 146097);
  days %= 146097;

  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }

  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  
  let gm = 0, gd = 0;
  if (days > 0) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365 + 1;
  }

  const sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  for (gm = 1; gm <= 12; gm++) {
    if (days <= sal_a[gm]) {
      gd = days;
      break;
    }
    days -= sal_a[gm];
  }
  
  return [gy, gm, gd];
}


export function toJalaliDateString(isoDate: string, options: { format?: 'numeric' | 'long' } = {}): string {
    const date = new Date(isoDate);
    // Use UTC methods to extract date components, avoiding local timezone shifts.
    // FIX: Corrected typo in function name from gregorianToJali to gregorianToJalali
    const [jy, jm, jd] = gregorianToJalali(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());

    if (options.format === 'long') {
        return `${jd.toLocaleString('fa-IR')} ${t.jalaliMonths[jm - 1]} ${jy.toLocaleString('fa-IR')}`;
    }
    
    // Default to numeric
    const fJm = String(jm).padStart(2, '0');
    const fJd = String(jd).padStart(2, '0');
    return `${jy}/${fJm}/${fJd}`;
}

export function parseJalaliDate(jalaliDate: string): Date | null {
  const parts = jalaliDate.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (!parts) return null;

  const [ , jy, jm, jd] = parts.map(Number);
  const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
  
  // Create Date object at midnight UTC for the specified Gregorian date.
  // This avoids local timezone ambiguity that can cause off-by-one-day errors.
  const resultDate = new Date(Date.UTC(gy, gm - 1, gd));
  return resultDate;
}

export function getDaysInJalaliMonth(year: number, month: number): number {
    if (month <= 6) return 31;
    if (month <= 11) return 30;
    // Esfand
    const breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
    const isLeap = breaks.includes(year) || breaks.includes(year - 1) && (year - 1) % 33 === 32;
    return isLeap ? 30 : 29;
}

export function getFirstDayOfWeekJalali(year: number, month: number): number {
    const [gy, gm, gd] = jalaliToGregorian(year, month, 1);
    const date = new Date(gy, gm - 1, gd);
    // Saturday is 6 in JS Date, we want it to be 0
    return (date.getDay() + 1) % 7;
}
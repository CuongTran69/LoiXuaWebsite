export interface VietnameseLunarDate {
  day: number;
  month: number;
  year: number;
  isLeapMonth: boolean;
  yearCanChi: string;
  monthCanChi: string;
  dayCanChi: string;
  solarTerm: string;
  isNewSolarTermDay: boolean;
  isMungMot: boolean;
  isRam: boolean;
  shortDisplay: string;
  fullDisplay: string;
  specialOccasionLabel: string | null;
}

const CAN_NAMES = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'] as const;
const CHI_NAMES = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'] as const;

export const SOLAR_TERMS = [
  'Xuân phân', 'Thanh minh', 'Cốc vũ', 'Lập hạ', 'Tiểu mãn', 'Mang chủng',
  'Hạ chí', 'Tiểu thử', 'Đại thử', 'Lập thu', 'Xử thử', 'Bạch lộ',
  'Thu phân', 'Hàn lộ', 'Sương giáng', 'Lập đông', 'Tiểu tuyết', 'Đại tuyết',
  'Đông chí', 'Tiểu hàn', 'Đại hàn', 'Lập xuân', 'Vũ thủy', 'Kinh trập',
] as const;

const MONTH_NAMES = [
  '', 'Giêng', 'Hai', 'Ba', 'Tư', 'Năm', 'Sáu',
  'Bảy', 'Tám', 'Chín', 'Mười', 'Mười Một', 'Chạp',
] as const;

export function julianDay(day: number, month: number, year: number): number {
  const a = Math.trunc((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  let jd = day + Math.trunc((153 * m + 2) / 5) + 365 * y + Math.trunc(y / 4) - Math.trunc(y / 100) + Math.trunc(y / 400) - 32045;
  if (jd < 2299161) {
    jd = day + Math.trunc((153 * m + 2) / 5) + 365 * y + Math.trunc(y / 4) - 32083;
  }
  return jd;
}

function getNewMoonDay(k: number, timeZone: number): number {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const dr = Math.PI / 180.0;
  let Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
  Jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;

  let C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * M * dr);
  C1 -= 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(2 * Mpr * dr);
  C1 -= 0.0004 * Math.sin(3 * Mpr * dr);
  C1 += 0.0104 * Math.sin(2 * F * dr) - 0.0051 * Math.sin((M + Mpr) * dr);
  C1 -= 0.0074 * Math.sin((M - Mpr) * dr) + 0.0004 * Math.sin((2 * F + M) * dr);
  C1 -= 0.0004 * Math.sin((2 * F - M) * dr) - 0.0006 * Math.sin((2 * F + Mpr) * dr);
  C1 += 0.0100 * Math.sin((2 * F - Mpr) * dr) + 0.0005 * Math.sin((M + 2 * Mpr) * dr);

  const Jd = Jd1 + C1;
  return Math.trunc(Jd + 0.5 + timeZone / 24.0);
}

function getSunLongitude(dayNumber: number, timeZone: number): number {
  const T = (dayNumber - 2451545.5 - timeZone / 24.0) / 36525.0;
  const T2 = T * T;
  const dr = Math.PI / 180.0;
  const M = 357.52910 + 35999.05030 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  let DL = (1.914600 - 0.004817 * T - 0.000014 * T2) * Math.sin(M * dr);
  DL += (0.019993 - 0.000101 * T) * Math.sin(2 * M * dr) + 0.000290 * Math.sin(3 * M * dr);
  let L = (L0 + DL) * dr;
  L = L - Math.PI * 2.0 * Math.floor(L / (Math.PI * 2.0));
  return Math.trunc(L / (Math.PI / 6.0));
}

function getSolarTermIndex(dayNumber: number, timeZone: number): number {
  const T = (dayNumber - 2451545.5 - timeZone / 24.0) / 36525.0;
  const T2 = T * T;
  const dr = Math.PI / 180.0;
  const M = 357.52910 + 35999.05030 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  let DL = (1.914600 - 0.004817 * T - 0.000014 * T2) * Math.sin(M * dr);
  DL += (0.019993 - 0.000101 * T) * Math.sin(2 * M * dr) + 0.000290 * Math.sin(3 * M * dr);
  let deg = (L0 + DL) % 360.0;
  if (deg < 0) deg += 360.0;
  const idx = Math.trunc(deg / 15.0);
  return Math.min(23, Math.max(0, idx));
}

function getLunarMonth11(year: number, timeZone: number): number {
  const off = julianDay(31, 12, year) - 2415021;
  const k = Math.trunc(off / 29.530588853);
  let nm = getNewMoonDay(k, timeZone);
  const sunLong = getSunLongitude(nm, timeZone);
  if (sunLong >= 9) {
    nm = getNewMoonDay(k - 1, timeZone);
  }
  return nm;
}

function getLeapMonthOffset(a11: number, timeZone: number): number {
  let k = Math.trunc((a11 - 2415021.076998695) / 29.530588853 + 0.5);
  let last = 0;
  let i = 1;
  let arc = getSunLongitude(getNewMoonDay(k, timeZone), timeZone);
  while (true) {
    last = arc;
    k += 1;
    arc = getSunLongitude(getNewMoonDay(k, timeZone), timeZone);
    if (arc === last) return i;
    i += 1;
    if (i > 14) break;
  }
  return 0;
}

export function convertToLunar(dd: number, mm: number, yy: number, timeZoneOffset = 7.0): VietnameseLunarDate {
  const dayNum = julianDay(dd, mm, yy);
  const k = Math.trunc((dayNum - 2415021.076998695) / 29.530588853);
  let monthStart = getNewMoonDay(k + 1, timeZoneOffset);
  if (monthStart > dayNum) {
    monthStart = getNewMoonDay(k, timeZoneOffset);
  }

  let a11 = getLunarMonth11(yy, timeZoneOffset);
  let b11 = a11;
  let lunarYear = yy;
  if (a11 >= monthStart) {
    lunarYear = yy;
    a11 = getLunarMonth11(yy - 1, timeZoneOffset);
  } else {
    lunarYear = yy + 1;
    b11 = getLunarMonth11(yy + 1, timeZoneOffset);
  }

  const lunarDay = dayNum - monthStart + 1;
  const diff = Math.trunc((monthStart - a11) / 29.0);
  let isLeap = false;
  let lunarMonth = diff + 11;
  if (b11 - a11 > 365) {
    const leapMonthDiff = getLeapMonthOffset(a11, timeZoneOffset);
    if (diff >= leapMonthDiff) {
      lunarMonth = diff + 10;
      if (diff === leapMonthDiff) {
        isLeap = true;
      }
    }
  }

  if (lunarMonth > 12) lunarMonth -= 12;
  if (lunarMonth >= 11 && diff < 4) lunarYear -= 1;

  const yearCanIndex = (lunarYear + 6) % 10;
  const yearChiIndex = (lunarYear + 8) % 12;
  const yearCanChi = `${CAN_NAMES[yearCanIndex]} ${CHI_NAMES[yearChiIndex]}`;

  const dayCanIndex = (dayNum + 9) % 10;
  const dayChiIndex = (dayNum + 1) % 12;
  const dayCanChi = `${CAN_NAMES[dayCanIndex]} ${CHI_NAMES[dayChiIndex]}`;

  const monthCanIndex = (yearCanIndex * 2 + lunarMonth + 1) % 10;
  const monthChiIndex = (lunarMonth + 1) % 12;
  const monthCanChi = `${CAN_NAMES[monthCanIndex]} ${CHI_NAMES[monthChiIndex]}`;

  const termTodayIndex = getSolarTermIndex(dayNum, timeZoneOffset);
  const termYesterdayIndex = getSolarTermIndex(dayNum - 1, timeZoneOffset);
  const solarTerm = SOLAR_TERMS[termTodayIndex];
  const isNewSolarTermDay = termTodayIndex !== termYesterdayIndex;

  const isMungMot = lunarDay === 1;
  const isRam = lunarDay === 15;
  const shortDisplay = `${lunarDay}/${lunarMonth}${isLeap ? ' Nhuận' : ''} ÂL`;

  const dayPart =
    lunarDay === 1
      ? 'Mùng 1'
      : lunarDay <= 10
        ? `Mùng ${lunarDay}`
        : lunarDay === 15
          ? 'Ngày Rằm'
          : `Ngày ${lunarDay}`;
  const monthName = lunarMonth >= 1 && lunarMonth <= 12 ? MONTH_NAMES[lunarMonth] : String(lunarMonth);
  const leapStr = isLeap ? ' (Nhuận)' : '';
  const fullDisplay = `${dayPart} tháng ${monthName}${leapStr}, năm ${yearCanChi}`;

  const specialOccasionLabel = isMungMot
    ? 'Mùng Một thanh tịnh'
    : isRam
      ? 'Trăng Rằm vẹn tròn'
      : isNewSolarTermDay
        ? `Tiết ${solarTerm}`
        : null;

  return {
    day: lunarDay,
    month: lunarMonth,
    year: lunarYear,
    isLeapMonth: isLeap,
    yearCanChi,
    monthCanChi,
    dayCanChi,
    solarTerm,
    isNewSolarTermDay,
    isMungMot,
    isRam,
    shortDisplay,
    fullDisplay,
    specialOccasionLabel,
  };
}

/**
 * Extracts local Vietnam (UTC+7) or local browser calendar parts from a Date.
 */
export function getLocalDateParts(date: Date = new Date()): { year: number; month: number; day: number; weekday: number } {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    weekday: date.getDay() + 1, // 1=Sun, 2=Mon...7=Sat (matches Apple Calendar .weekday)
  };
}

export function getVietnamDateParts(date: Date = new Date()): { year: number; month: number; day: number; weekday: number } {
  const vn = new Date(date.getTime() + 7 * 3600 * 1000);
  return {
    year: vn.getUTCFullYear(),
    month: vn.getUTCMonth() + 1,
    day: vn.getUTCDate(),
    weekday: vn.getUTCDay() + 1,
  };
}

export function convertDateToLunar(date: Date = new Date(), useVietnamTZ = false): VietnameseLunarDate {
  const p = useVietnamTZ ? getVietnamDateParts(date) : getLocalDateParts(date);
  return convertToLunar(p.day, p.month, p.year);
}

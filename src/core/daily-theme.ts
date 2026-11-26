import { convertToLunar, getLocalDateParts, getVietnamDateParts } from './lunar-calendar';
import type { Saying } from './types';

export type DailyThemeKind =
  | 'solarOccasion'
  | 'lunarFestival'
  | 'lunarMilestone'
  | 'solarTerm'
  | 'weekday';

export interface DailyTheme {
  kind: DailyThemeKind;
  badge: string;
  title: string;
  subtitle: string;
  categories: string[];
  filterKeywords: string[];
}

const SATIRE_CATEGORY = 'cham-biem';
const MIN_POOL = 5;

function matchesKeyword(saying: Saying, keywords: string[]): boolean {
  const text = saying.text.toLowerCase();
  const kws = saying.keywords ?? [];
  return keywords.some(
    (word) => text.includes(word) || kws.some((k) => k.toLowerCase().includes(word))
  );
}

export function filterThemePool(theme: DailyTheme, pool: Saying[]): Saying[] {
  const excludesSatire = theme.kind !== 'weekday';
  const candidates = excludesSatire
    ? pool.filter((s) => !s.categories.includes(SATIRE_CATEGORY))
    : pool;
  const inCategories = candidates.filter((s) =>
    theme.categories.some((cat) => s.categories.includes(cat))
  );

  if (theme.kind !== 'weekday' && theme.filterKeywords.length > 0) {
    const keyworded = inCategories.filter((s) => matchesKeyword(s, theme.filterKeywords));
    if (keyworded.length >= MIN_POOL) return keyworded;
    if (theme.kind === 'lunarFestival' || theme.kind === 'solarOccasion') {
      const anywhere = candidates.filter((s) => matchesKeyword(s, theme.filterKeywords));
      if (anywhere.length >= MIN_POOL) return anywhere;
    }
  }
  if (inCategories.length >= MIN_POOL) return inCategories;
  return pool;
}

export function getDailyTheme(date: Date = new Date(), useVietnamTZ = false): DailyTheme {
  const { year, month, day, weekday } = useVietnamTZ
    ? getVietnamDateParts(date)
    : getLocalDateParts(date);

  const solar = getSolarOccasion(month, day);
  if (solar) return solar;

  const lunar = convertToLunar(day, month, year);
  const festival = getLunarFestival(lunar);
  if (festival) return festival;

  if (lunar.isMungMot || lunar.isRam) {
    return {
      kind: 'lunarMilestone',
      badge: lunar.isRam ? `RẰM THÁNG ${lunar.month} ÂL` : `MÙNG MỘT THÁNG ${lunar.month} ÂL`,
      title: lunar.isRam ? 'Trăng Rằm — Đạo Lý & Sum Vầy' : 'Mùng Một — Lời Lành Đầu Tháng',
      subtitle: 'Ngày rằm, mùng một nhắc nhau sống hiền, nhớ ơn và giữ nếp nhà',
      categories: ['dao-ly', 'gia-dinh', 'am-thuc-phong-tuc'],
      filterKeywords: [],
    };
  }

  if (lunar.isNewSolarTermDay) {
    return {
      kind: 'solarTerm',
      badge: `TIẾT ${lunar.solarTerm.toUpperCase()}`,
      title: `Tiết ${lunar.solarTerm} — Trời Đất & Nhà Nông`,
      subtitle: 'Kinh nghiệm thời tiết, mùa vụ ông cha gửi lại trong ca dao',
      categories: ['thoi-tiet', 'kinh-nghiem-nong-nghiep'],
      filterKeywords: [],
    };
  }

  return getWeekdayTheme(weekday);
}

function getSolarOccasion(month: number, day: number): DailyTheme | null {
  const key = `${month}-${day}`;
  switch (key) {
    case '10-20':
      return {
        kind: 'solarOccasion',
        badge: '20 THÁNG 10 • PHỤ NỮ VIỆT NAM',
        title: 'Phụ Nữ Việt Nam — Đảm Đang Tảo Tần',
        subtitle: 'Tri ân đức hy sinh, vẻ đẹp nết na và tình mẫu tử bao la',
        categories: ['gia-dinh'],
        filterKeywords: ['mẹ', 'bà', 'gái', 'nàng', 'phụ nữ'],
      };
    case '7-27':
      return {
        kind: 'solarOccasion',
        badge: '27 THÁNG 7 • TRI ÂN LIỆT SĨ',
        title: 'Uống Nước Nhớ Nguồn — Đền Ơn Đáp Nghĩa',
        subtitle: 'Đời đời nhớ ơn các anh hùng liệt sĩ đã hy sinh vì nền độc lập',
        categories: ['lich-su-danh-nhan', 'que-huong', 'dao-ly'],
        filterKeywords: ['uống nước', 'nhớ nguồn', 'anh hùng', 'núi sông', 'nước non', 'tiền nhân', 'ơn'],
      };
    case '11-20':
      return {
        kind: 'solarOccasion',
        badge: '20 THÁNG 11 • NHÀ GIÁO VIỆT NAM',
        title: 'Tôn Sư Trọng Đạo — Ơn Sâu Nghĩa Thầy',
        subtitle: 'Công cha, áo mẹ, chữ thầy — ngàn năm đạo học lưu truyền',
        categories: ['ban-be-thay-tro', 'hoc-tap'],
        filterKeywords: ['thầy', 'chữ', 'học', 'trò', 'sư'],
      };
    case '3-8':
      return {
        kind: 'solarOccasion',
        badge: '08 THÁNG 03 • QUỐC TẾ PHỤ NỮ',
        title: 'Nét Đẹp Dịu Dàng Người Phụ Nữ',
        subtitle: 'Tôn vinh đức hạnh, lòng nhân hậu và sự đảm đang',
        categories: ['gia-dinh', 'tinh-yeu'],
        filterKeywords: ['mẹ', 'gái', 'vợ', 'nàng'],
      };
    case '9-2':
      return {
        kind: 'solarOccasion',
        badge: '02 THÁNG 09 • TẾT ĐỘC LẬP',
        title: 'Hào Khí Non Sông — Tự Hào Dân Tộc',
        subtitle: 'Độc lập tự do, rạng rỡ gấm vóc ngàn năm',
        categories: ['que-huong', 'lich-su-danh-nhan'],
        filterKeywords: ['sông', 'núi', 'nước', 'nam', 'đất'],
      };
    case '4-30':
      return {
        kind: 'solarOccasion',
        badge: '30 THÁNG 04 • THỐNG NHẤT NON SÔNG',
        title: 'Non Sông Liền Một Dải',
        subtitle: 'Bắc Nam sum họp một nhà, giang sơn gấm vóc vững bền',
        categories: ['que-huong', 'lich-su-danh-nhan'],
        filterKeywords: ['bắc', 'nam', 'quê', 'sông', 'nước'],
      };
    case '2-14':
      return {
        kind: 'solarOccasion',
        badge: '14 THÁNG 02 • LỄ TÌNH NHÂN',
        title: 'Tình Yêu Đôi Lứa — Thủy Chung Son Sắt',
        subtitle: 'Thương nhau mấy núi cũng trèo, mấy sông cũng lội',
        categories: ['tinh-yeu'],
        filterKeywords: ['yêu', 'thương', 'duyên', 'chàng', 'nàng'],
      };
    case '6-1':
      return {
        kind: 'solarOccasion',
        badge: '01 THÁNG 06 • TẾT THIẾU NHI',
        title: 'Đồng Dao Tuổi Thơ — Khúc Hát Hồn Nhiên',
        subtitle: 'Tiếng ru êm đềm và ký ức trò chơi dân gian thuở nhỏ',
        categories: ['dong-dao-tuoi-tho'],
        filterKeywords: [],
      };
    default:
      return null;
  }
}

function getLunarFestival(lunar: { month: number; day: number; isLeapMonth: boolean }): DailyTheme | null {
  if (lunar.isLeapMonth) return null;
  if (lunar.month === 1 && lunar.day >= 1 && lunar.day <= 3) {
    return {
      kind: 'lunarFestival',
      badge: `MÙNG ${lunar.day} TẾT`,
      title: 'Tết Đến Xuân Về — Sum Vầy Nhớ Nguồn',
      subtitle: 'Ông bà, cha mẹ, con cháu quây quần, nhớ ơn tổ tiên',
      categories: ['am-thuc-phong-tuc', 'gia-dinh'],
      filterKeywords: ['tết', 'xuân', 'bánh chưng', 'pháo', 'tổ tiên', 'ông bà'],
    };
  }
  const key = `${lunar.month}-${lunar.day}`;
  switch (key) {
    case '1-15':
      return {
        kind: 'lunarFestival',
        badge: 'RẰM THÁNG GIÊNG',
        title: 'Rằm Tháng Giêng — Trăng Đầu Năm',
        subtitle: 'Lễ cả năm không bằng Rằm tháng Giêng: cầu an, nhớ ơn',
        categories: ['dao-ly', 'gia-dinh', 'am-thuc-phong-tuc'],
        filterKeywords: ['trăng', 'rằm', 'chùa', 'ơn'],
      };
    case '5-5':
      return {
        kind: 'lunarFestival',
        badge: 'MÙNG 5 THÁNG 5 • TẾT ĐOAN NGỌ',
        title: 'Tết Đoan Ngọ — Giữa Mùa Hè',
        subtitle: 'Tháng năm nắng lửa, ca dao nhà nông và nếp nhà ngày Tết giữa năm',
        categories: ['am-thuc-phong-tuc', 'thoi-tiet', 'kinh-nghiem-nong-nghiep'],
        filterKeywords: ['tháng năm', 'mùng năm', 'đoan', 'nắng'],
      };
    case '7-15':
      return {
        kind: 'lunarFestival',
        badge: 'RẰM THÁNG 7 • VU LAN',
        title: 'Vu Lan — Báo Hiếu Mẹ Cha',
        subtitle: 'Công cha như núi Thái Sơn, nghĩa mẹ như nước trong nguồn chảy ra',
        categories: ['gia-dinh', 'dao-ly'],
        filterKeywords: ['mẹ', 'cha', 'công', 'hiếu', 'ơn'],
      };
    case '8-15':
      return {
        kind: 'lunarFestival',
        badge: 'RẰM THÁNG 8 • TRUNG THU',
        title: 'Trung Thu — Trăng Rằm Tuổi Thơ',
        subtitle: 'Đèn ông sao, trăng tròn và những câu đồng dao thuở nhỏ',
        categories: ['dong-dao-tuoi-tho', 'am-thuc-phong-tuc', 'que-huong'],
        filterKeywords: ['trăng', 'trung thu', 'đèn', 'cuội'],
      };
    case '12-23':
      return {
        kind: 'lunarFestival',
        badge: '23 THÁNG CHẠP • ÔNG CÔNG ÔNG TÁO',
        title: 'Tiễn Táo Quân — Cuối Năm Nhìn Lại',
        subtitle: 'Cuối năm nhìn lại một năm làm ăn, nếp nhà và lời dặn ông bà',
        categories: ['am-thuc-phong-tuc', 'gia-dinh', 'lao-dong'],
        filterKeywords: ['tết', 'cuối năm', 'tháng chạp', 'bếp'],
      };
    default:
      return null;
  }
}

function getWeekdayTheme(weekday: number): DailyTheme {
  switch (weekday) {
    case 2:
      return {
        kind: 'weekday',
        badge: 'ĐẦU TUẦN • HỌC TẬP & Ý CHÍ',
        title: 'Ý Chí Rèn Luyện & Học Tập',
        subtitle: 'Khởi đầu tuần mới với tinh thần ham học, kiên trì bền bỉ',
        categories: ['hoc-tap'],
        filterKeywords: ['học', 'chí', 'rèn', 'sách'],
      };
    case 3:
      return {
        kind: 'weekday',
        badge: 'TÌNH YÊU & DUYÊN NỢ',
        title: 'Tình Yêu Đôi Lứa Mộc Mạc',
        subtitle: 'Tâm tư thầm kín, nỗi niềm tương tư và ân tình son sắt',
        categories: ['tinh-yeu'],
        filterKeywords: ['thương', 'yêu', 'duyên', 'nhớ'],
      };
    case 4:
      return {
        kind: 'weekday',
        badge: 'ĐẠO NGHĨA LÀM NGƯỜI',
        title: 'Nhân Nghĩa & Đạo Lý Làm Người',
        subtitle: 'Nhân nghĩa ở đời, thủy chung trước sau, ơn sâu nghĩa nặng',
        categories: ['dao-ly'],
        filterKeywords: ['nhân', 'nghĩa', 'đức', 'ơn'],
      };
    case 5:
      return {
        kind: 'weekday',
        badge: 'THẾ SỰ & CUỘC SỐNG',
        title: 'Chiêm Nghiệm Đời Người & Thế Sự',
        subtitle: 'Quy luật được mất, tâm an trí sáng giữa dòng đời biến chuyển',
        categories: ['triet-ly-cuoc-song'],
        filterKeywords: ['đời', 'sống', 'được mất', 'thế sự'],
      };
    case 6:
      return {
        kind: 'weekday',
        badge: 'LỜI ĂN TIẾNG NÓI',
        title: 'Giao Tiếp & Ứng Xử Khéo Léo',
        subtitle: 'Lời nói chẳng mất tiền mua, lựa lời mà nói cho vừa lòng nhau',
        categories: ['ung-xu'],
        filterKeywords: ['lời', 'tiếng', 'nói', 'khiêm'],
      };
    case 7:
      return {
        kind: 'weekday',
        badge: 'CẦN CÙ & NGHỀ TRUYỀN THỐNG',
        title: 'Bàn Tay Lao Động & Làng Nghề',
        subtitle: 'Trân trọng giọt mồ hôi, cần cù chịu khó gầy dựng tương lai',
        categories: ['lao-dong'],
        filterKeywords: ['làm', 'công', 'cần cù', 'mồ hôi'],
      };
    default:
      return {
        kind: 'weekday',
        badge: 'MÁI ẤM & HỒN QUÊ',
        title: 'Tình Thâm Gia Đình & Hồn Quê',
        subtitle: 'Mái ấm sum vầy, công cha nghĩa mẹ và tình yêu xứ sở',
        categories: ['gia-dinh', 'que-huong'],
        filterKeywords: ['cha', 'mẹ', 'nhà', 'quê'],
      };
  }
}

import type { Saying } from './types';

export interface NotebookCategoryAlbum {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  categoryKeys: string[];
  discoveredCount: number;
  totalCount: number;
}

export interface CulturalSeal {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  threshold: number;
  isUnlocked: boolean;
  currentProgress: number;
}

const ALBUM_DEFS: Array<{
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  categories: string[];
}> = [
  { id: 'chữ-hiếu', title: 'Chữ Hiếu', subtitle: 'Công cha nghĩa mẹ, tình thân gia đình', icon: '❤️', categories: ['gia-dinh'] },
  { id: 'đạo-lý', title: 'Đạo Lý', subtitle: 'Uống nước nhớ nguồn, ân nghĩa thủy chung', icon: '☀️', categories: ['dao-ly'] },
  { id: 'ý-chí', title: 'Ý Chí', subtitle: 'Khổ luyện thành tài, chuyên cần lao động', icon: '🔥', categories: ['hoc-tap', 'lao-dong'] },
  { id: 'thuận-hòa', title: 'Thuận Hòa', subtitle: 'Nét đẹp giao tiếp và đạo ứng xử', icon: '🤝', categories: ['ung-xu'] },
  { id: 'hồn-quê', title: 'Hồn Quê', subtitle: 'Tình tự non sông, gấm vóc đất trời', icon: '🌿', categories: ['que-huong'] },
  { id: 'triết-lý', title: 'Triết Lý', subtitle: 'Chiêm nghiệm sâu sắc về lẽ đời', icon: '✨', categories: ['triet-ly-cuoc-song'] },
  { id: 'nếp-cũ', title: 'Nếp Cũ', subtitle: 'Phong tục, ẩm thực và nếp xưa', icon: '🍵', categories: ['am-thuc-phong-tuc'] },
];

export function evaluateAlbums(
  sayings: Saying[],
  discoveredIDs: Set<string>,
  aliases: Record<string, string | null> = {}
): NotebookCategoryAlbum[] {
  const resolved = new Set<string>();
  for (const id of discoveredIDs) {
    const mapped = aliases[id];
    resolved.add(mapped ?? id);
  }

  return ALBUM_DEFS.map((def) => {
    let totalCount = 0;
    let discoveredCount = 0;
    for (const s of sayings) {
      if (def.categories.some((c) => s.categories.includes(c))) {
        totalCount += 1;
        if (resolved.has(s.id)) discoveredCount += 1;
      }
    }
    return {
      id: def.id,
      title: def.title,
      subtitle: def.subtitle,
      icon: def.icon,
      categoryKeys: def.categories,
      discoveredCount,
      totalCount,
    };
  });
}

export function evaluateSeals(totalDiscovered: number, albums: NotebookCategoryAlbum[]): CulturalSeal[] {
  const milestones = [
    { id: 'seal-5', title: 'Nhập Môn', subtitle: 'Ghi nhớ 5 câu đầu tiên', icon: '🔖', threshold: 5 },
    { id: 'seal-25', title: 'Cần Mẫn', subtitle: 'Đã khám phá 25 câu', icon: '📚', threshold: 25 },
    { id: 'seal-50', title: 'Tri Kỷ', subtitle: 'Thấu hiểu 50 câu lời xưa', icon: '💮', threshold: 50 },
    { id: 'seal-100', title: 'Bách Khoa', subtitle: 'Gom nhặt 100 viên ngọc quý', icon: '🏵️', threshold: 100 },
    { id: 'seal-250', title: 'Đại Thụ', subtitle: 'Bậc thấu hiểu 250 câu ca dao tục ngữ', icon: '🏆', threshold: 250 },
  ];

  const seals: CulturalSeal[] = milestones.map((m) => ({
    ...m,
    isUnlocked: totalDiscovered >= m.threshold,
    currentProgress: totalDiscovered,
  }));

  const albumSeals = [
    { albumID: 'chữ-hiếu', id: 'seal-album-hieu', title: 'Triện Hiếu Nghĩa', subtitle: 'Thấm nhuần 10 câu về chữ hiếu gia đình', icon: '🏮' },
    { albumID: 'đạo-lý', id: 'seal-album-dao-ly', title: 'Triện Đạo Tự', subtitle: 'Ghi nhớ 10 bài học đạo làm người', icon: '🛡️' },
    { albumID: 'ý-chí', id: 'seal-album-y-chi', title: 'Triện Bền Lòng', subtitle: 'Ghi nhớ 10 lời dạy ý chí rèn luyện', icon: '⚒️' },
    { albumID: 'hồn-quê', id: 'seal-album-hon-que', title: 'Triện Hương Sen', subtitle: 'Ghi nhớ 10 câu yêu thương quê mẹ', icon: '🪷' },
  ];

  for (const def of albumSeals) {
    const album = albums.find((a) => a.id === def.albumID);
    const count = album?.discoveredCount ?? 0;
    seals.push({
      id: def.id,
      title: def.title,
      subtitle: def.subtitle,
      icon: def.icon,
      threshold: 10,
      isUnlocked: count >= 10,
      currentProgress: count,
    });
  }

  return seals;
}

import { hasMeaning, type Saying } from './types';

export type OracleIntentId =
  | 'an-yen'
  | 'tinh-duyen'
  | 'cong-danh'
  | 'gia-dao'
  | 'ung-xu'
  | 'tuy-duyen';

export interface OracleIntent {
  id: OracleIntentId;
  title: string;
  subtitle: string;
  matchedCategories: string[];
  accentToken: string;
}

export const ORACLE_INTENTS: OracleIntent[] = [
  {
    id: 'an-yen',
    title: 'Cầu An Yên',
    subtitle: 'Giải tỏa lo âu, tìm sự bình thản',
    matchedCategories: ['triet-ly-cuoc-song'],
    accentToken: 'var(--cdv-bamboo-text)',
  },
  {
    id: 'tinh-duyen',
    title: 'Tình Duyên',
    subtitle: 'Tâm sự đôi lứa, duyên nợ bền lâu',
    matchedCategories: ['tinh-yeu'],
    accentToken: 'var(--cdv-lotus-text)',
  },
  {
    id: 'cong-danh',
    title: 'Công Danh',
    subtitle: 'Ý chí bền gan, học hành sự nghiệp',
    matchedCategories: ['hoc-tap', 'lao-dong'],
    accentToken: 'var(--cdv-amber-text)',
  },
  {
    id: 'gia-dao',
    title: 'Gia Đạo',
    subtitle: 'Hiếu nghĩa mẹ cha, hòa thuận êm ấm',
    matchedCategories: ['gia-dinh', 'dao-ly'],
    accentToken: 'var(--cdv-cinnabar-text)',
  },
  {
    id: 'ung-xu',
    title: 'Đối Nhân',
    subtitle: 'Lòng khiêm nhường, nhìn thấu sự đời',
    matchedCategories: ['ung-xu', 'ban-be-thay-tro', 'cham-biem'],
    accentToken: 'var(--cdv-indigo-text)',
  },
  {
    id: 'tuy-duyen',
    title: 'Tùy Duyên',
    subtitle: 'Thông điệp gửi đến hôm nay',
    matchedCategories: [],
    accentToken: 'var(--cdv-amber-text)',
  },
];

const WISDOM_POOLS = {
  filialPiety: [
    'Tiền nhân nhắc nhở: Công ơn sinh thành dưỡng dục tựa biển trời, chữ hiếu đứng đầu trăm nết thiện. Dù bận rộn trăm công nghìn việc, hãy luôn nhớ về mẹ cha, giữ trọn đạo hiếu làm con.',
    'Lời xưa răn dạy: Nước mắt chảy xuôi, cha mẹ thương con không bờ bến; phận làm con hãy biết phụng dưỡng khi người còn khỏe, đừng để khi bóng xế tà mới thấy muộn màng.',
    'Cổ nhân đúc kết: Lòng hiếu kính với đấng sinh thành là cái gốc của mọi phúc lành. Sống trọn đạo với mẹ cha thì ắt gia đạo hưng thịnh, đường đời bình yên.',
  ],
  maritalHarmony: [
    "Người xưa nhắn nhủ: Vợ chồng lấy sự thuận hòa và thấu hiểu làm gốc; 'thuận vợ thuận chồng tát biển Đông cũng cạn'. Hãy biết nhường nhịn, cùng nhau đồng cam cộng khổ.",
    'Lời tiền nhân dạy: Chồng giận thì vợ bớt lời, cơm sôi bớt lửa chẳng đời nào khê. Giữ lửa ấm gia đình từ sự bao dung và trân trọng người bạn đời bên cạnh ta.',
    'Cổ nhân khuyên răn: Đạo vợ nghĩa chồng gắn bó keo sơn từ thuở hàn vi; đừng đứng núi này trông núi nọ, hãy vun vén hạnh phúc từ những điều dung dị nhất.',
  ],
  siblingBond: [
    'Tiền nhân răn dạy: Anh em như thể tay chân, rách lành đùm bọc dở hay đỡ đần. Ở đời hãy biết nhường nhịn, thương yêu và đùm bọc nhau, trong ấm thì ngoài mới êm.',
    'Lời xưa nhắc nhở: Máu chảy ruột mềm, cùng một cội nguồn sinh ra. Đừng vì chút lợi danh hay hơn thua ngoài xã hội mà làm tổn thương tình cảm ruột thịt thiêng liêng.',
    "Cổ nhân gửi gắm: 'Anh ngã em nâng', tình thâm cốt nhục là điểm tựa vững chãi nhất. Biết sẻ chia, tương trợ nhau thì họ hàng gia tộc mới hưng vượng, bền lâu.",
  ],
  romanticLove: [
    'Lời xưa gửi gắm: Tình cảm đẹp ở tấm lòng son sắt và sự thủy chung. Gặp nhau là duyên, đi cùng nhau là nợ; hãy mở lòng đón nhận, trân trọng người trước mắt và cùng nhau vượt qua thử thách.',
    "Tiền nhân nhắn nhủ: 'Yêu nhau tam tứ núi cũng trèo, ngũ lục sông cũng lội'. Tình yêu đích thực cần sự kiên định và thấu hiểu; giữ trọn niềm tin thì duyên lành ắt đơm hoa kết trái.",
    'Người xưa khuyên nhủ: Tình duyên chớ vội vàng, lấy chân thành đổi lấy chân tình. Đừng để những hiểu lầm nhất thời làm phai nhạt sợi dây tơ hồng đã gắn kết.',
  ],
  discerningLove: [
    'Người xưa nhắc nhở: Trong tình cảm chớ vội tin lời hoa mỹ đầu môi; cần thời gian để thấu tỏ lòng dạ con người. Giữ lòng tỉnh táo, yêu thương người xứng đáng để không chuốc lấy muộn phiền.',
    'Tiền nhân răn dạy: Duyên phận có hợp có tan, chớ bi lụy người đã đổi thay. Biết buông bỏ điều không thuộc về mình là cách mở lối cho những điều tốt đẹp và an lành phía trước.',
    'Lời xưa khuyên nhủ: Nhìn người qua hành động lúc gian nan chứ đừng nhìn qua lời hứa hẹn ngày bình lặng. Yêu thương nhưng vẫn giữ lòng tự trọng và sự sáng suốt cho chính mình.',
  ],
  perseverance: [
    "Tiền nhân nhắn nhủ: Việc lớn trong đời cốt ở lòng kiên chí; 'có công mài sắt có ngày nên kim'. Đừng nản lòng trước thử thách nhất thời, kiên định với mục tiêu thì ắt gặt hái thành quả xứng đáng.",
    "Lời xưa răn dạy: 'Chớ thấy sóng cả mà ngã tay chèo'. Khó khăn chỉ là phép thử cho ý chí và bản lĩnh; giữ vững tâm thế thì sóng gió nào rồi cũng vượt qua.",
    'Cổ nhân đúc kết: Nước chảy mãi thì đá cũng mòn, tích tiểu thì thành đại. Mỗi bước tiến nhỏ mỗi ngày đều đang đưa bạn đến gần hơn với bến đỗ thành công.',
  ],
  learningAmbition: [
    'Tiền nhân nhắn nhủ: Đi một ngày đàng học một sàng khôn; tri thức là kho báu không bao giờ cạn kiệt. Hãy khiêm nhường học hỏi từ thầy bạn và cuộc đời để mở rộng tầm nhìn.',
    "Lời xưa khuyên răn: 'Ngọc bất trác bất thành khí, nhân bất học bất tri đạo'. Trau dồi trí tuệ và đạo đức mỗi ngày, công danh sự nghiệp ắt theo đó mà rạng rỡ, thăng hoa.",
    'Cổ nhân truyền dạy: Chí lớn phải đi liền với sự rèn luyện bền bỉ mỗi ngày. Đừng mong thành công sau một đêm, tích lũy nội lực vững vàng thì cơ hội đến ắt nắm bắt được.',
  ],
  speechEtiquette: [
    "Cổ nhân đúc kết: 'Lời nói chẳng mất tiền mua, lựa lời mà nói cho vừa lòng nhau'. Giữ hòa khí từ lời ăn tiếng nói, biết lắng nghe nhiều hơn và nói lời hòa ái sẽ mang lại phước lành.",
    'Tiền nhân răn dạy: Uốn lưỡi bảy lần trước khi nói, lời buông ra như tên bắn khó lấy lại. Tránh họa từ miệng mà ra, giữ sự chừng mực và tôn trọng người đối thoại.',
    "Lời xưa nhắc nhở: 'Người khôn nói tiếng dịu dàng dễ nghe'. Lời nói chân thành, nhã nhặn không chỉ xoa dịu hiềm khích mà còn mở ra bao mối duyên lành trong cuộc sống.",
  ],
  humilityMindfulness: [
    'Lời xưa khuyên nhủ: Sông sâu tĩnh lặng, lúa chín cúi đầu. Ở đời chớ vội chê cười kẻ khác mà hãy luôn soi xét lại chính mình; giữ tâm khiêm nhường thì đi đâu cũng được người yêu mến.',
    "Tiền nhân nhắc nhở: 'Cười người hôm trước hôm sau người cười'. Ai cũng có phần thiếu sót, biết nhìn thấy khuyết điểm của bản thân để sửa mình mới là người thực sự có trí tuệ.",
    'Cổ nhân răn dạy: Bớt nhìn lỗi người khác, thêm nhìn lại lòng mình. Tâm kiêu ngạo là khởi đầu của sa sút, khiêm tốn dung dị mới là gốc rễ của sự vững bền.',
  ],
  friendshipCommunity: [
    'Tiền nhân răn dạy: Sống ở đời trọng nghĩa khinh tài; chọn bạn thiện lành mà kết giao, kính trọng người chỉ đường dẫn lối và giữ gìn tình làng nghĩa xóm tối lửa tắt đèn có nhau.',
    "Lời xưa gửi gắm: 'Bầu ơi thương lấy bí cùng, tuy rằng khác giống nhưng chung một giàn'. Tương thân tương ái, cưu mang đùm bọc người xung quanh chính là tạo phúc lành cho chính mình.",
    "Cổ nhân nhắc nhở: Bạn bè quý ở sự chân tình lúc hoạn nạn; 'giàu đổi bạn, sang đổi vợ' là điều tối kỵ. Hãy trân quý những người tri kỷ thật lòng kề vai sát cánh cùng ta.",
  ],
  karmaVirtue: [
    "Người xưa truyền dạy: 'Ở hiền gặp lành, gieo nhân nào gặt quả nấy'. Giữ trọn tâm thiện và lối sống chính trực, phước đức tự thân sẽ là lá chắn vững chãi nhất chở che cuộc đời bạn.",
    'Tiền nhân nhắc nhở: Thà nghèo mà sạch, rách mà thơm; đừng vì cái lợi trước mắt mà đánh đổi lương tâm. Sống ngẩng cao đầu không hổ thẹn với đất trời là hạnh phúc lớn nhất.',
    'Cổ nhân đúc kết: Thiện ác đáo đầu chung hữu báo; tích lũy điều thiện dù nhỏ cũng không bao giờ uổng phí. Hãy lấy lòng từ bi, sự tử tế làm kim chỉ nam soi đường.',
  ],
  laborGratitude: [
    "Tiền nhân gửi gắm: Mỗi hạt cơm dẻo thơm đều thấm đượm mồ hôi công sức; 'tấc đất tấc vàng'. Hãy biết trân quý thành quả lao động, chăm chỉ cần cù và sống biết ơn những điều dung dị.",
    "Lời xưa răn dạy: 'Tay làm hàm nhai, tay quai miệng trễ'. Cuộc sống ấm no không đến từ sự lười biếng hay trông chờ may rủi; hãy tự tạo dựng tương lai bằng bàn tay chân chính của mình.",
    'Cổ nhân nhắc nhở: Biết tiết kiệm khi dư giả, biết vun vén nếp nhà thì qua ngày giông bão vẫn vững vàng. Trân trọng công sức của người khác cũng là trân trọng chính mình.',
  ],
  gratitudeHeritage: [
    "Đạo lý ngàn đời nhắc nhở: 'Uống nước nhớ nguồn, ăn quả nhớ kẻ trồng cây'. Sống trọn ân nghĩa, khắc ghi tấm lòng người đi trước thì phúc đức gia đạo mới bền lâu.",
    'Tiền nhân răn dạy: Được hưởng bóng mát chớ quên người gieo hạt, bước đi thênh thang nhớ người mở lối. Lòng biết ơn là nền tảng cao quý nhất của đạo đức làm người.',
    'Lời xưa nhắn nhủ: Cây có cội mới trổ cành xanh lá, nước có nguồn mới biển rộng sông sâu. Giữ gìn lòng tri ân thì đi đến đâu cũng được quý nhân phù trợ.',
  ],
  peaceMindfulness: [
    "Cổ nhân đúc kết: Cuộc đời như dòng sông có khúc quanh co; 'nước kia dù đục lóng phèn cũng trong'. Đừng vì nghịch cảnh nhất thời mà nản lòng, giữ tâm an định thì giông bão nào rồi cũng qua.",
    'Tiền nhân nhắc nhở: Sông có khúc, người có lúc; thăng trầm được mất là lẽ vô thường ở đời. Học cách buông bỏ những muộn phiền không đáng có, quay về nương tựa nơi sự an lạc nội tâm.',
    'Lời xưa gửi gắm: Tâm an thì vạn sự an; ngoại cảnh dẫu có biến động, chỉ cần lòng mình bất biến thì mọi giông gió đều hóa dịu êm. Hãy tin vào sức mạnh nội tại của chính mình.',
  ],
  natureSeasons: [
    'Tiền nhân truyền dạy: Vạn vật trong đất trời đều có chu kỳ và thời điểm. Biết thuận theo tự nhiên, kiên nhẫn chuẩn bị chu toàn thì khi thời vận đến ắt gặt hái mùa màng bội thu.',
    'Lời xưa đúc kết: Chớ vội vàng khi thời cơ chưa chín, cũng đừng chần chừ khi thời vận đã sang. Nhìn trời nhìn đất, thấu suốt thời cuộc để có những quyết định sáng suốt nhất.',
    'Cổ nhân nhắc nhở: Mưa nắng là việc của trời, cần cù chuẩn bị là việc của người. Giữ tâm thế chủ động, thuận hòa cùng nhân duyên thì việc gì cũng xuôi chèo mát mái.',
  ],
  homelandRoots: [
    'Người xưa nhắn nhủ: Nơi chôn rau cắt rốn là cội nguồn nuôi dưỡng tâm hồn; hãy luôn nhớ về quê cha đất tổ, sống trọn vẹn và tự hào với cốt cách con người Việt Nam.',
    'Tiền nhân gửi gắm: Dù đi muôn dặm non sông, nếp nhà và tình quê hương vẫn là bến đỗ bình yên nhất. Gìn giữ cội nguồn thì tâm hồn mới vững vàng trước mọi sóng gió cuộc đời.',
    'Lời xưa răn dạy: Non sông gấm vóc do tiền nhân bao đời dựng xây; sống có trách nhiệm với gia đình và xã hội chính là cách đền đáp công ơn tổ tiên sâu sắc nhất.',
  ],
  general: [
    'Tiền nhân đúc kết: Ở đời lấy chữ tâm làm gốc, sự kiên định làm bè vượt sóng; giữ trọn đạo nghĩa và niềm tin nơi chính mình thì trăm sự đều hóa an lành.',
    'Lời xưa nhắn nhủ: Thuận theo tự nhiên, tích đức hành thiện thì phước lành tự khắc tìm đến. Hãy bình tâm chiêm nghiệm câu ca dao này để tìm thấy hướng đi sáng suốt cho hôm nay.',
    'Cổ nhân truyền dạy: Gốc rễ của bình an nằm ở nội tâm vững vàng; bớt lo nghĩ viển vông, dồn trọn tâm sức cho hiện tại thì tương lai tự khắc hanh thông, viên mãn.',
  ],
};

const TIERS = [
  { name: 'Thượng Cát', color: 'var(--cdv-cinnabar-text)', subtitle: 'Vạn sự hanh thông, thời vận nở hoa' },
  { name: 'Đại Cát', color: 'var(--cdv-amber-text)', subtitle: 'Công đức viên mãn, phước lộc tràn đầy' },
  { name: 'Bình Hòa', color: 'var(--cdv-bamboo-text)', subtitle: 'Tâm an vạn sự an, giữ lòng son sắt' },
  { name: 'Khai Tâm', color: 'var(--cdv-indigo-text)', subtitle: 'Lắng lòng chiêm nghiệm, ngộ lẽ huyền vi' },
] as const;

const DAILY_ACTIONS = [
  'Hôm nay hãy trao một lời khen chân thành hoặc lời hỏi thăm ấm áp tới người thân yêu.',
  'Dành 5 phút ngồi tĩnh tâm, hít thở sâu và cảm ơn những điều bình dị xung quanh.',
  'Làm một việc tốt nhỏ mà không cần ai ghi nhận.',
  'Bớt lo nghĩ về ngày mai, dồn trọn tâm trí cho công việc trước mắt.',
  'Uống một tách trà ấm, đọc lại câu thơ này để giữ tâm bình khí hòa.',
];

export interface OracleResult {
  saying: Saying;
  intent: OracleIntent;
  omenTier: string;
  omenColor: string;
  omenSubtitle: string;
  stickTitle: string;
  interpretation: string;
  dailyAction: string;
}

export function fnv1a64(input: string): bigint {
  let hash = 14695981039346656037n;
  const prime = 1099511628211n;
  const bytes = new TextEncoder().encode(input);
  for (const b of bytes) {
    hash ^= BigInt(b);
    hash = BigInt.asUintN(64, hash * prime);
  }
  return hash;
}

function ancestralWisdom(saying: Saying, intent: OracleIntent, hash: bigint): string {
  const trimmedMeaning = saying.meaning?.trim();
  if (trimmedMeaning && (intent.id === 'tuy-duyen' || intent.matchedCategories.length === 0)) {
    return trimmedMeaning;
  }

  const combined = `${saying.text.toLowerCase()} ${(saying.keywords ?? []).map((k) => k.toLowerCase()).join(' ')}`;
  const cats = new Set(saying.categories);
  const containsAny = (words: string[]) => words.some((w) => combined.includes(w));

  let pool: string[];
  if (containsAny(['công cha', 'nghĩa mẹ', 'mẹ già', 'cha già', 'thái sơn', 'trong nguồn', 'chữ hiếu', 'thờ mẹ', 'kính cha', 'đạo con', 'sinh thành', 'dưỡng dục', 'mang nặng đẻ đau', 'phụ mẫu', 'mẹ nuôi', 'cha nuôi'])) {
    pool = WISDOM_POOLS.filialPiety;
  } else if (containsAny(['vợ chồng', 'chồng chan', 'thuận vợ', 'tát bể', 'tát biển', 'phu thê', 'tào khang', 'đầu bạc', 'chồng em', 'chồng người', 'lấy chồng', 'lấy vợ', 'gối chăn', 'phu quân', 'đạo vợ', 'nghĩa chồng', 'chồng giận', 'vợ giận'])) {
    pool = WISDOM_POOLS.maritalHarmony;
  } else if (containsAny(['anh em', 'chị em', 'ruột mềm', 'tay chân', 'nhường nhau', 'cùng bọc', 'cùng giọt máu', 'máu chảy', 'anh ngã em nâng'])) {
    pool = WISDOM_POOLS.siblingBond;
  } else if (containsAny(['cắn tiền', 'hai lòng', 'bạc tình', 'phụ tình', 'thay lòng', 'đổi dạ', 'chia phôi', 'bướm hoa', 'ong bướm', 'bậu hiền'])) {
    pool = WISDOM_POOLS.discerningLove;
  } else if (containsAny(['có công', 'mài sắt', 'nên kim', 'nước chảy đá mòn', 'năng nhặt', 'chặt bị', 'sóng cả', 'ngã tay chèo', 'bền gan', 'vượt khó', 'chớ thấy sóng', 'thác ghềnh', 'lửa thử vàng'])) {
    pool = WISDOM_POOLS.perseverance;
  } else if (containsAny(['uống nước', 'nhớ nguồn', 'ăn quả', 'nhớ kẻ', 'trồng cây', 'cội nguồn', 'đền ơn', 'đáp nghĩa', 'ơn sâu'])) {
    pool = WISDOM_POOLS.gratitudeHeritage;
  } else if (containsAny(['lời nói', 'lựa lời', 'uốn lưỡi', 'miệng', 'nói năng', 'khẩu', 'thưa thốt', 'dựa cột', 'dịu dàng', 'tiếng chào'])) {
    pool = WISDOM_POOLS.speechEtiquette;
  } else if (cats.has('cham-biem') || containsAny(['cười người', 'chớ vội cười', 'tự cao', 'kiêu ngạo', 'đẽo cày', 'soi mình', 'nhìn mình', 'khen mình', 'chê người'])) {
    pool = WISDOM_POOLS.humilityMindfulness;
  } else if (containsAny(['bát cơm', 'hạt gạo', 'dẻo thơm', 'đắng cay', 'mồ hôi', 'tấc đất', 'tấc vàng', 'tay làm hàm nhai', 'hạt ngọc'])) {
    pool = WISDOM_POOLS.laborGratitude;
  } else if (cats.has('tinh-yeu') || intent.id === 'tinh-duyen' || containsAny(['thương nhau', 'yêu nhau', 'lòng son', 'duyên nợ', 'trầu cau', 'nhớ thương', 'chàng', 'nàng', 'hẹn hò', 'trúc mai', 'chỉ hồng', 'thề nguyền', 'duyên', 'con đò', 'bến đò', 'say tình'])) {
    pool = WISDOM_POOLS.romanticLove;
  } else if (cats.has('hoc-tap') || intent.id === 'cong-danh' || containsAny(['sàng khôn', 'dùi mài', 'bảng vàng', 'sách đèn', 'chí làm trai', 'công danh', 'học hành', 'đèn sách', 'sĩ tử', 'thi cử'])) {
    pool = WISDOM_POOLS.learningAmbition;
  } else if (cats.has('ban-be-thay-tro') || containsAny(['bạn bè', 'người bạn', 'thầy', 'láng giềng', 'chọn bạn', 'tri kỷ', 'bầu ơi', 'thương lấy bí', 'bán anh em xa', 'mua láng giềng'])) {
    pool = WISDOM_POOLS.friendshipCommunity;
  } else if (cats.has('triet-ly-cuoc-song') || intent.id === 'an-yen' || containsAny(['sông có khúc', 'ba chìm', 'lóng phèn', 'thời vận', 'thăng trầm', 'bình tâm', 'an yên', 'vô thường', 'chớ nghĩ mình hèn'])) {
    pool = WISDOM_POOLS.peaceMindfulness;
  } else if (cats.has('thoi-tiet') || cats.has('kinh-nghiem-nong-nghiep') || containsAny(['thời tiết', 'tháng năm', 'tháng mười', 'mưa', 'nắng', 'chuồn chuồn', 'sấm', 'mùa màng', 'con nước'])) {
    pool = WISDOM_POOLS.natureSeasons;
  } else if (cats.has('que-huong') || cats.has('lich-su-danh-nhan') || containsAny(['quê hương', 'non sông', 'núi sông', 'xứ sở', 'nước non', 'làng quê'])) {
    pool = WISDOM_POOLS.homelandRoots;
  } else if (cats.has('dao-ly') || containsAny(['ở hiền', 'phước đức', 'nhân quả', 'thiện', 'lương tâm', 'tích đức', 'nghĩa nhân', 'lòng thiện'])) {
    pool = WISDOM_POOLS.karmaVirtue;
  } else if (cats.has('gia-dinh') || intent.id === 'gia-dao') {
    pool = WISDOM_POOLS.maritalHarmony;
  } else if (cats.has('lao-dong')) {
    pool = WISDOM_POOLS.laborGratitude;
  } else if (cats.has('ung-xu') || intent.id === 'ung-xu') {
    pool = WISDOM_POOLS.speechEtiquette;
  } else {
    pool = WISDOM_POOLS.general;
  }

  return pool[Number(hash % BigInt(pool.length))];
}

export function drawOracle(sayings: Saying[], intent: OracleIntent): OracleResult | null {
  if (sayings.length === 0) return null;
  let candidates = sayings;
  if (intent.matchedCategories.length > 0) {
    const filtered = sayings.filter((s) => s.categories.some((c) => intent.matchedCategories.includes(c)));
    if (filtered.length > 0) candidates = filtered;
  }
  const explained = candidates.filter(hasMeaning);
  const pool = explained.length > 0 ? explained : candidates;
  const pickedSaying = pool[Math.floor(Math.random() * pool.length)];
  if (!pickedSaying) return null;

  const hash = fnv1a64(pickedSaying.id);
  const tier = TIERS[Number(hash % BigInt(TIERS.length))];
  const stickTitle = pickedSaying.text.split('\n')[0]?.trim() || 'Lời Vàng Ngọc';
  const interpretation = ancestralWisdom(pickedSaying, intent, hash);
  const dailyAction = DAILY_ACTIONS[Number(((hash + 7n) & 0xffff_ffff_ffff_ffffn) % BigInt(DAILY_ACTIONS.length))];

  return {
    saying: pickedSaying,
    intent,
    omenTier: tier.name,
    omenColor: tier.color,
    omenSubtitle: tier.subtitle,
    stickTitle,
    interpretation,
    dailyAction,
  };
}

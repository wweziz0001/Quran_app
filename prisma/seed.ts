// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Slug mapping for all 114 Surahs
const surahSlugs: Record<number, string> = {
  1: 'al-fatiha',
  2: 'al-baqarah',
  3: 'al-imran',
  4: 'an-nisa',
  5: 'al-maidah',
  6: 'al-anam',
  7: 'al-araf',
  8: 'al-anfal',
  9: 'at-tawbah',
  10: 'yunus',
  11: 'hud',
  12: 'yusuf',
  13: 'ar-rad',
  14: 'ibrahim',
  15: 'al-hijr',
  16: 'an-nahl',
  17: 'al-isra',
  18: 'al-kahf',
  19: 'maryam',
  20: 'ta-ha',
  21: 'al-anbiya',
  22: 'al-hajj',
  23: 'al-muminun',
  24: 'an-nur',
  25: 'al-furqan',
  26: 'ash-shuara',
  27: 'an-naml',
  28: 'al-qasas',
  29: 'al-ankabut',
  30: 'ar-rum',
  31: 'luqman',
  32: 'as-sajdah',
  33: 'al-ahzab',
  34: 'saba',
  35: 'fatir',
  36: 'ya-sin',
  37: 'as-saffat',
  38: 'sad',
  39: 'az-zumar',
  40: 'ghafir',
  41: 'fussilat',
  42: 'ash-shura',
  43: 'az-zukhruf',
  44: 'ad-dukhan',
  45: 'al-jathiyah',
  46: 'al-ahqaf',
  47: 'muhammad',
  48: 'al-fath',
  49: 'al-hujurat',
  50: 'qaf',
  51: 'adh-dhariyat',
  52: 'at-tur',
  53: 'an-najm',
  54: 'al-qamar',
  55: 'ar-rahman',
  56: 'al-waqiah',
  57: 'al-hadid',
  58: 'al-mujadila',
  59: 'al-hashr',
  60: 'al-mumtahanah',
  61: 'as-saff',
  62: 'al-jumuah',
  63: 'al-munafiqun',
  64: 'at-taghabun',
  65: 'at-talaq',
  66: 'at-tahrim',
  67: 'al-mulk',
  68: 'al-qalam',
  69: 'al-haqqah',
  70: 'al-maarij',
  71: 'nuh',
  72: 'al-jinn',
  73: 'al-muzzammil',
  74: 'al-muddaththir',
  75: 'al-qiyamah',
  76: 'al-insan',
  77: 'al-mursalat',
  78: 'an-naba',
  79: 'an-naziat',
  80: 'abasa',
  81: 'at-takwir',
  82: 'al-infitar',
  83: 'al-mutaffifin',
  84: 'al-inshiqaq',
  85: 'al-buruj',
  86: 'at-tariq',
  87: 'al-aala',
  88: 'al-ghashiyah',
  89: 'al-fajr',
  90: 'al-balad',
  91: 'ash-shams',
  92: 'al-layl',
  93: 'ad-duhaa',
  94: 'ash-sharh',
  95: 'at-tin',
  96: 'al-alaq',
  97: 'al-qadr',
  98: 'al-bayyinah',
  99: 'az-zalzalah',
  100: 'al-adiyat',
  101: 'al-qariah',
  102: 'at-takathur',
  103: 'al-asr',
  104: 'al-humazah',
  105: 'al-fil',
  106: 'quraysh',
  107: 'al-maun',
  108: 'al-kawthar',
  109: 'al-kafirun',
  110: 'an-nasr',
  111: 'al-masad',
  112: 'al-ikhlas',
  113: 'al-falaq',
  114: 'an-nas',
};

async function main() {
  console.log('🌱 Starting seed...');

  // 1. Seed Tajweed Rules
  console.log('📖 Seeding Tajweed Rules...');
  const tajweedRules = [
    {
      nameArabic: 'الإدغام',
      nameEnglish: 'Idgham',
      code: 'IDGHAM',
      description: 'إدغام النون الساكنة أو التنوين في أحد الحروف الأربعة (ي، ر، م، ل)',
      color: '#4CAF50',
      category: 'NOON_SAKINAH',
      sortOrder: 1,
    },
    {
      nameArabic: 'الإظهار',
      nameEnglish: 'Izhar',
      code: 'IZHAR',
      description: 'إظهار النون الساكنة أو التنوين عند أحرف الحلق الستة',
      color: '#2196F3',
      category: 'NOON_SAKINAH',
      sortOrder: 2,
    },
    {
      nameArabic: 'الإقلاب',
      nameEnglish: 'Iqlab',
      code: 'IQLAB',
      description: 'قلب النون الساكنة أو التنوين ميماً عند الباء',
      color: '#FF9800',
      category: 'NOON_SAKINAH',
      sortOrder: 3,
    },
    {
      nameArabic: 'الإخفاء',
      nameEnglish: 'Ikhfa',
      code: 'IKHFA',
      description: 'إخفاء النون الساكنة أو التنوين عند أحرف الإخفاء الخمسة عشر',
      color: '#9C27B0',
      category: 'NOON_SAKINAH',
      sortOrder: 4,
    },
    {
      nameArabic: 'الغنة',
      nameEnglish: 'Ghunnah',
      code: 'GHUNNAH',
      description: 'صوت يخرج من أعلى الأنف',
      color: '#F44336',
      category: 'GHUNNAH',
      sortOrder: 5,
    },
    {
      nameArabic: 'المد',
      nameEnglish: 'Madd',
      code: 'MADD',
      description: 'إطالة الصوت بحرف من حروف المد',
      color: '#00BCD4',
      category: 'MADD',
      sortOrder: 6,
    },
    {
      nameArabic: 'القلقلة',
      nameEnglish: 'Qalqalah',
      code: 'QALQALAH',
      description: 'اضطراب الصوت عند النطق بحروف القلقلة',
      color: '#795548',
      category: 'QALQALAH',
      sortOrder: 7,
    },
  ];

  for (const rule of tajweedRules) {
    await prisma.tajweedRule.upsert({
      where: { code: rule.code },
      update: rule,
      create: rule,
    });
  }
  console.log(`✅ Created ${tajweedRules.length} Tajweed Rules`);

  // 2. Seed Feature Flags
  console.log('🚩 Seeding Feature Flags...');
  const featureFlags = [
    {
      key: 'semantic_search',
      name: 'Semantic Search',
      description: 'البحث الدلالي في الآيات باستخدام AI',
      enabled: false,
      rollout: 100,
    },
    {
      key: 'audio_hls',
      name: 'HLS Audio Streaming',
      description: 'بث الصوت باستخدام HLS',
      enabled: false,
      rollout: 100,
    },
    {
      key: 'offline_mode',
      name: 'Offline Mode',
      description: 'وضع عدم الاتصال للتطبيق المحمول',
      enabled: false,
      rollout: 50,
    },
    {
      key: 'dark_mode',
      name: 'Dark Mode',
      description: 'وضع داكن للواجهة',
      enabled: true,
      rollout: 100,
    },
    {
      key: 'word_analysis',
      name: 'Word-by-Word Analysis',
      description: 'تحليل الكلمات صرفياً',
      enabled: false,
      rollout: 100,
    },
  ];

  for (const flag of featureFlags) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: flag,
      create: flag,
    });
  }
  console.log(`✅ Created ${featureFlags.length} Feature Flags`);

  // 3. Seed App Settings
  console.log('⚙️ Seeding App Settings...');
  const appSettings = [
    {
      id: 'default_reciter',
      key: 'default_reciter',
      value: 'ar.alafasy',
      description: 'القارئ الافتراضي',
      isPublic: true,
    },
    {
      id: 'default_tafsir',
      key: 'default_tafsir',
      value: 'ibn-kathir',
      description: 'التفسير الافتراضي',
      isPublic: true,
    },
    {
      id: 'default_translation',
      key: 'default_translation',
      value: 'en.sahih',
      description: 'الترجمة الافتراضية',
      isPublic: true,
    },
    {
      id: 'audio_quality',
      key: 'audio_quality',
      value: '128',
      description: 'جودة الصوت الافتراضية (kbps)',
      isPublic: true,
    },
    {
      id: 'max_bookmarks_per_user',
      key: 'max_bookmarks_per_user',
      value: '1000',
      description: 'الحد الأقصى للعلامات المرجعية لكل مستخدم',
      isPublic: false,
    },
    {
      id: 'api_rate_limit',
      key: 'api_rate_limit',
      value: '1000',
      description: 'حد طلبات API بالساعة',
      isPublic: true,
    },
  ];

  for (const setting of appSettings) {
    await prisma.appSetting.upsert({
      where: { key: setting.key },
      update: { ...setting, updatedAt: new Date() },
      create: { ...setting, updatedAt: new Date() },
    });
  }
  console.log(`✅ Created ${appSettings.length} App Settings`);

  // 4. Seed Surah Slugs
  console.log('🔗 Seeding Surah Slugs...');
  let slugsUpdated = 0;
  for (const [number, slug] of Object.entries(surahSlugs)) {
    const result = await prisma.surah.updateMany({
      where: { number: parseInt(number), slug: null },
      data: { slug },
    });
    if (result.count > 0) slugsUpdated++;
  }
  console.log(`✅ Updated ${slugsUpdated} Surah Slugs`);

  console.log('✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { db } from '@quran/shared/db';

/**
 * Get all surahs
 */
export async function getAllSurahs() {
  return db.surah.findMany({
    orderBy: { number: 'asc' },
  });
}

/**
 * Get surah by number
 */
export async function getSurahByNumber(number: number) {
  return db.surah.findUnique({
    where: { number },
    include: {
      _count: { select: { Ayah: true } },
    },
  });
}

/**
 * Get surah with ayahs
 */
export async function getSurahWithAyahs(number: number, page: number = 1, limit: number = 50) {
  const surah = await db.surah.findUnique({
    where: { number },
  });

  if (!surah) return null;

  const ayahs = await db.ayah.findMany({
    where: { surahId: number },
    orderBy: { ayahNumber: 'asc' },
    skip: (page - 1) * limit,
    take: limit,
    include: {
      TafsirEntry: { take: 1 },
      TranslationEntry: { take: 1 },
    },
  });

  const total = await db.ayah.count({ where: { surahId: number } });

  return {
    surah,
    ayahs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Search surahs by name
 */
export async function searchSurahs(query: string) {
  return db.surah.findMany({
    where: {
      OR: [
        { nameArabic: { contains: query } },
        { nameEnglish: { contains: query } },
        { nameSimple: { contains: query } },
      ],
    },
    orderBy: { number: 'asc' },
  });
}

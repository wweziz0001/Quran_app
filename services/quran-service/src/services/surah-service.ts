import { db } from '@quran/shared/db';

/**
 * Get surah statistics
 */
export async function getSurahStats(surahNumber: number) {
  const surah = await db.surah.findUnique({
    where: { number: surahNumber },
    include: {
      _count: { select: { Ayah: true } },
    },
  });

  if (!surah) return null;

  const ayahCount = await db.ayah.count({ where: { surahId: surahNumber } });

  return {
    surah,
    stats: {
      totalAyahs: ayahCount,
      revelationOrder: surah.revelationOrder,
      revelationType: surah.revelationType,
    },
  };
}

/**
 * Check if surah exists
 */
export async function surahExists(number: number): Promise<boolean> {
  const count = await db.surah.count({ where: { number } });
  return count > 0;
}

import { db } from '@quran/shared/db';

/**
 * Get ayah count statistics
 */
export async function getAyahStats() {
  const [total, withTafsir, withTranslation, withAudio] = await Promise.all([
    db.ayah.count(),
    db.ayah.count({ where: { TafsirEntry: { some: {} } } }),
    db.ayah.count({ where: { TranslationEntry: { some: {} } } }),
    db.ayah.count({ where: { RecitationAyah: { some: {} } } }),
  ]);

  return {
    total,
    withTafsir,
    withTranslation,
    withAudio,
  };
}

/**
 * Get ayahs by juz
 */
export async function getAyahsByJuz(juzNumber: number) {
  return db.ayah.findMany({
    where: { juzNumber },
    orderBy: [{ surahId: 'asc' }, { ayahNumber: 'asc' }],
    include: {
      Surah: { select: { nameArabic: true, nameEnglish: true } },
    },
  });
}

/**
 * Get ayahs by page
 */
export async function getAyahsByPage(pageNumber: number) {
  return db.ayah.findMany({
    where: { pageNumber },
    orderBy: [{ surahId: 'asc' }, { ayahNumber: 'asc' }],
    include: {
      Surah: { select: { nameArabic: true, nameEnglish: true } },
    },
  });
}

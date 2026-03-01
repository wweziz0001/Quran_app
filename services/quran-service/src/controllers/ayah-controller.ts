import { db } from '../../shared/db';

/**
 * Get ayahs with filters
 */
export async function getAyahs(filters: {
  surahId?: number;
  juzNumber?: number;
  pageNumber?: number;
  page?: number;
  limit?: number;
}) {
  const { surahId, juzNumber, pageNumber, page = 1, limit = 50 } = filters;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (surahId) where.surahId = surahId;
  if (juzNumber) where.juzNumber = juzNumber;
  if (pageNumber) where.pageNumber = pageNumber;

  const [ayahs, total] = await Promise.all([
    db.ayah.findMany({
      where,
      orderBy: [{ surahId: 'asc' }, { ayahNumber: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        Surah: { select: { nameArabic: true, nameEnglish: true, number: true } },
      },
    }),
    db.ayah.count({ where }),
  ]);

  return {
    ayahs,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

/**
 * Get ayah by ID
 */
export async function getAyahById(id: number) {
  return db.ayah.findUnique({
    where: { id },
    include: {
      Surah: true,
      TafsirEntry: { include: { TafsirSource: true } },
      TranslationEntry: { include: { TranslationSource: true } },
      RecitationAyah: { include: { Recitation: { include: { Reciter: true } } } },
    },
  });
}

/**
 * Get random ayah
 */
export async function getRandomAyah() {
  const count = await db.ayah.count();
  const skip = Math.floor(Math.random() * count);

  return db.ayah.findFirst({
    skip,
    include: { Surah: { select: { nameArabic: true, number: true } } },
  });
}

/**
 * Get ayah by surah and ayah number
 */
export async function getAyahByReference(surahNumber: number, ayahNumber: number) {
  return db.ayah.findFirst({
    where: {
      surahId: surahNumber,
      ayahNumber,
    },
    include: {
      Surah: true,
    },
  });
}

import { db } from '@quran/shared/db';

/**
 * Get all mushaf editions
 */
export async function getAllMushafs() {
  return db.mushafEdition.findMany({
    orderBy: { name: 'asc' },
  });
}

/**
 * Get mushaf by ID
 */
export async function getMushafById(id: string) {
  return db.mushafEdition.findUnique({
    where: { id },
    include: {
      _count: { select: { MushafPage: true } },
    },
  });
}

/**
 * Get mushaf pages
 */
export async function getMushafPages(mushafEditionId: string, page: number = 1, limit: number = 20) {
  const pages = await db.mushafPage.findMany({
    where: { mushafEditionId },
    orderBy: { pageNumber: 'asc' },
    skip: (page - 1) * limit,
    take: limit,
  });

  const total = await db.mushafPage.count({ where: { mushafEditionId } });

  return {
    pages,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get specific page from mushaf
 */
export async function getMushafPage(mushafEditionId: string, pageNumber: number) {
  return db.mushafPage.findFirst({
    where: {
      mushafEditionId,
      pageNumber,
    },
  });
}

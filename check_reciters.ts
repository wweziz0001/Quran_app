import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const reciters = await prisma.reciter.findMany({
    select: { id: true, nameArabic: true, nameEnglish: true, slug: true }
  });
  
  console.log('Reciters in database:');
  reciters.forEach(r => {
    console.log(`  - ${r.slug}: ${r.nameArabic} (${r.nameEnglish})`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());

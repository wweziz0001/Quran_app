import { NextResponse } from 'next/server';

// Mock mushaf editions data
// In production, this would come from a database
const MUSHAF_EDITIONS = [
  {
    id: 'hafs',
    nameArabic: 'مصحف حفص',
    nameEnglish: 'Hafs Mushaf',
    slug: 'hafs',
    type: 'image',
    description: 'Standard Hafs narration with scanned pages',
    isDefault: true,
    isActive: true,
  },
  {
    id: 'warsh',
    nameArabic: 'مصحف ورش',
    nameEnglish: 'Warsh Mushaf',
    slug: 'warsh',
    type: 'image',
    description: 'Warsh narration from Nafi',
    isDefault: false,
    isActive: true,
  },
  {
    id: 'qaloon',
    nameArabic: 'مصحف قالون',
    nameEnglish: 'Qaloon Mushaf',
    slug: 'qaloon',
    type: 'image',
    description: 'Qaloon narration from Nafi',
    isDefault: false,
    isActive: true,
  },
  {
    id: 'indopak',
    nameArabic: 'مصحف إنديباك',
    nameEnglish: 'Indopak Mushaf',
    slug: 'indopak',
    type: 'ttf',
    description: 'Indopak script with custom font',
    isDefault: false,
    isActive: true,
    fontName: 'Indopak',
  },
  {
    id: 'uthmani',
    nameArabic: 'مصحف عثماني',
    nameEnglish: 'Uthmani Mushaf',
    slug: 'uthmani',
    type: 'ttf',
    description: 'Uthmani script with traditional font',
    isDefault: false,
    isActive: true,
    fontName: 'Uthmani',
  },
];

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: MUSHAF_EDITIONS.filter(e => e.isActive),
    });
  } catch (error) {
    console.error('Error fetching mushaf editions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch mushaf editions' },
      { status: 500 }
    );
  }
}

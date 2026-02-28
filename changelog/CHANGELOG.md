# Quran Application - Changelog

## نظرة عامة
هذا الملف يحتوي على سجل جميع التغييرات والإصدارات.

### ترقيم الإصدارات
- **Major (1.x.x)**: تغييرات جذرية أو إعادة بناء كاملة
- **Minor (1.1.x)**: إضافة ميزات جديدة
- **Patch (1.0.x)**: إصلاح أخطاء ومشاكل

### الرموز المستخدمة
- 🟢 كود جديد (تمت إضافته)
- 🔴 كود قديم (تمت إزالته)
- 🔧 إصلاح
- ✨ ميزة جديدة
- 📝 توثيق
- 🎨 تحسينات التصميم

---

## [1.1.7] - 2026-02-27

### 🔧 الإصلاحات

#### إصلاح خاصية حذف القارئ في لوحة التحكم
**المشكلة:** خاصية حذف قارئ في قسم "Reciters & Audio Management" لا تعمل

**السبب:** استخدام اسم خاطئ للعلاقة `recitations` بدلاً من `Recitation` في Prisma

**الملف:** `src/app/api/reciters/[id]/route.ts`

```diff
- select: { recitations: true }
+ select: { Recitation: true }

- recitationsCount: reciter._count.recitations
+ recitationsCount: reciter._count.Recitation

- recitationsDeleted: existingReciter._count.recitations
+ recitationsDeleted: existingReciter._count.Recitation
```

---

## [1.1.6] - 2026-02-27

### 🔧 الإصلاحات

#### إصلاح تكرار كلمة "سورة" في عنوان السورة
**المشكلة:** كان يظهر "سورة سورة الفاتحة" بدلاً من "سورة الفاتحة"

**السبب:** كان المكون يضيف كلمة "سُورَةُ" كبادئة، بينما اسم السورة من قاعدة البيانات يحتوي بالفعل على "سورة"

**الملف:** `src/components/quran/islamic-ornaments.tsx`

```diff
- سُورَةُ {surahName}
+ {surahName}
```

---

## [1.1.5] - 2026-02-27

### 🎨 تحسينات التصميم

#### تحسين شكل أرقام الآيات لتطابق تماماً أرقام السور (مع حالة الاختيار)
**الوصف:**  
تم تحديث تصميم أرقام الآيات لتكون مطابقة تماماً لتصميم أرقام السور في الفهرس، بما في ذلك:

1. **نوع الخط:** مطابق تماماً لنوع الخط في الفهرس (text-sm font-bold)
2. **حالة الاختيار:** عند اختيار آية، يتغير لون الرقم مثل السورة المختارة في الفهرس

**الملفات:**
- `src/components/quran/islamic-ornaments.tsx`
- `src/components/quran/mushaf-viewer.tsx`

**التغييرات:**

```tsx
// إضافة prop جديد isSelected للمكون
export const LuxuriousVerseNumber = ({ 
  number, 
  isDark,
  isSelected = false 
}: { 
  number: number; 
  isDark: boolean;
  isSelected?: boolean;
}) => {
  // ...
  isSelected 
    ? isDark
      ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-slate-900 shadow-lg'
      : 'bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-lg'
    : isDark
      ? 'bg-slate-700/80 text-slate-300 border border-amber-500/20'
      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
}
```

**النتيجة:**
- **الآية غير المختارة (فاتح):** خلفية خضراء فاتحة + نص أخضر داكن
- **الآية المختارة (فاتح):** خلفية متدرجة خضراء + نص أبيض + توهج
- **الآية غير المختارة (داكن):** خلفية رمادية + نص رمادي فاتح
- **الآية المختارة (داكن):** خلفية متدرجة ذهبية + نص داكن + توهج

---

## [1.1.4] - 2026-02-27

### 🎨 تحسينات التصميم

#### تحسين شكل أرقام الآيات لتطابق تماماً أرقام السور (الحالة غير المختارة)
**المشكلة:** أرقام الآيات كانت تظهر بلون مختلف عن أرقام السور غير المختارة في الفهرس

**الملف:** `src/components/quran/islamic-ornaments.tsx`

```diff
- // Luxurious Verse Number - Matching Surah Index Style
+ // Luxurious VerseNumber - Matching Surah Index Style (unselected state)

- isDark 
-   ? 'bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-900'
-   : 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 text-white'
+ isDark 
+   ? 'bg-slate-700/80 text-slate-300 border border-amber-500/20'
+   : 'bg-emerald-50 text-emerald-700 border border-emerald-200'

- {/* Decorative corner */}
- <span className={isDark ? 'bg-white/30' : 'bg-white/30'} />
+ {/* Decorative corner */}
+ <span className={isDark ? 'bg-amber-500/20' : 'bg-emerald-300/50'} />
```

**النتيجة:** أرقام الآيات الآن مطابقة تماماً لأرقام السور غير المختارة:
- **الوضع الفاتح:** خلفية خضراء فاتحة (`emerald-50`) مع نص أخضر داكن (`emerald-700`) وحدود خضراء
- **الوضع الداكن:** خلفية رمادية داكنة (`slate-700/80`) مع نص رمادي فاتح وحدود ذهبية خفيفة

---

## [1.1.3] - 2026-02-27

### 🔧 الإصلاحات

#### إصلاح الوصول لملفات changelog و VERSION في محرر الملفات
**المشكلة:** لم يكن بالإمكان استعراض ملفات مجلد `changelog/` وملف `VERSION` في محرر الملفات بسبب قيود الأمان

**الملف:** `src/app/api/files/route.ts`

```diff
  const ALLOWED_PATTERNS = [
    /^src\//,
    /^prisma\//,
    /^docs\//,
    /^public\//,
+   /^changelog\//,     // changelog/**/*
    // ...
+   /^VERSION$/,        // VERSION file
  ];
```

---

## [1.1.2] - 2026-02-27

### 🎨 تحسينات التصميم

#### تحسين شكل أرقام الآيات في وضعية القائمة
**الوصف:**  
تم تحديث تصميم أرقام الآيات لتكون متناسقة مع تصميم أرقام السور في الفهرس.

**التغييرات:**
- تغيير الشكل من دائري إلى مربع مع حواف مستديرة (rounded-xl)
- إضافة خلفية متدرجة (gradient) مشابهة لخلفية أرقام السور
- إضافة زاوية مزخرفة صغيرة في الأعلى (decorative corner)
- تحسين الظلال والتوهج لتتناسب مع الوضع الداكن والفاتح

**الملف:** `src/components/quran/islamic-ornaments.tsx`

```diff
- // Luxurious Verse Number
+ // Luxurious Verse Number - Matching Surah Index Style

- <span className="inline-flex items-center justify-center mx-3 relative align-middle">
+ <span className="inline-flex items-center justify-center mx-2 relative align-middle">

- {/* Outer glow */}
- <span className="absolute w-12 h-12 rounded-full blur-sm ..." />

- {/* Decorative ring */}
- <span className="absolute w-11 h-11 rounded-full ..." />

- {/* Inner circle with number */}
- <span className="relative w-10 h-10 rounded-full ...">
+ {/* Main container - Square like Surah Index */}
+ <span className="relative w-11 h-11 rounded-xl flex items-center justify-center ...">
+   {/* Decorative corner */}
+   <span className="absolute -top-1 -right-1 w-3 h-3 rotate-45 ..." />
+   {/* Inner border glow */}
+   <span className="absolute inset-0 rounded-xl ..." />
  </span>
```

---

## [1.1.1] - 2026-02-27

### 🔧 الإصلاحات

#### إصلاح #1 - أخطاء أسماء العلاقات في Prisma
**المشكلة:** أخطاء `Unknown field for select statement` في عدة API endpoints بسبب استخدام أسماء خاطئة للعلاقات في `_count`

**الملفات:**
- `src/app/api/tafsir/route.ts`
- `src/app/api/admin/image-mushaf/route.ts`
- `src/app/api/admin/ttf-mushaf/route.ts`

```diff
# tafsir/route.ts
- _count: { select: { tafsirEntries: true } }
+ _count: { select: { TafsirEntry: true } }

# image-mushaf/route.ts
- _count: { select: { pages: true, mushafAyat: true, mushafSurahs: true } }
+ _count: { select: { ImageMushafPage: true, ImageMushafAyah: true, ImageMushafSurah: true } }

# ttf-mushaf/route.ts
- _count: { select: { pages: true, mushafAyat: true, mushafSurahs: true } }
+ _count: { select: { TtfMushafPage: true, TtfMushafAyah: true, TtfMushafSurah: true } }
```

---

#### إصلاح #2 - عدم ظهور الآيات في إدارة القرآن
**المشكلة:** عند استعراض آيات أي سورة، لا تظهر الآيات بالرغم من وجودها في قاعدة البيانات

**السبب:** عدم وجود حالة تحميل للآيات، مما يجعل الـ Dialog يعرض "لا توجد آيات" قبل اكتمال جلب البيانات

**الملف:** `src/components/admin/quran-management-section.tsx`

```diff
+ const [isLoadingVerses, setIsLoadingVerses] = useState(false);

  async function fetchVerses(surahId: number) {
+   setIsLoadingVerses(true);
    try {
      const response = await fetch(`/api/ayah?surahId=${surahId}`);
      const data = await response.json();
      if (data.success) {
        setVerses(data.data);
      }
    } catch (error) {
      toast.error('فشل في تحميل الآيات');
+   } finally {
+     setIsLoadingVerses(false);
    }
  }

  // في قسم العرض
+ {isLoadingVerses ? (
+   <div className="flex items-center justify-center h-32">
+     <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
+   </div>
+ ) : verses.length === 0 ? ...
```

---

## [1.1.0] - 2026-02-27

### ✨ الميزات المضافة

#### 1. محرر SQL في مستعرض قاعدة البيانات
تم إضافة تبويب جديد "محرر SQL" في قسم Database مع:
- تنفيذ استعلامات SELECT, PRAGMA, EXPLAIN
- 8 استعلامات جاهزة للاستخدام السريع
- سجل آخر 20 استعلام
- عرض النتائج في جدول منسق
- اختصار Ctrl+Enter للتنفيذ السريع

#### 2. نظام تتبع الإصدارات
تم إنشاء نظام كامل لتتبع التغييرات:
- ملف VERSION للاصدار الحالي
- مجلد changelog لتوثيق كل إصدار
- تحديث اسم ملف التنزيل ليشمل رقم الإصدار

---

### 🔧 الإصلاحات

#### إصلاح [1.0.1] - خطأ في استيراد الأيقونة Clear
**المشكلة:** خطأ `Clear is not exported from lucide-react` في مكون database-browser.tsx

**الملف:** `src/components/admin/database-browser.tsx`

```diff
- import { Clear } from 'lucide-react';
+ import { X } from 'lucide-react';

- <Clear className="h-4 w-4 mr-1" />
+ <X className="h-4 w-4 mr-1" />
```

---

#### إصلاح [1.0.2] - بطء تحميل قائمة الجداول
**المشكلة:** مهلة طويلة عند تحميل قائمة الجداول بسبب COUNT على كل جدول

**الملفات:**
- `src/app/api/admin/database/tables/route.ts`
- `src/app/api/admin/database/counts/route.ts` (جديد)
- `src/components/admin/database-browser.tsx`

**الحل:** فصل تحميل الجداول عن الأعداد
```diff
- // جلب الأعداد داخل نفس الطلب
- count = await db[tableName].count();

+ // جلب الجداول فوراً بدون أعداد
+ // تم إنشاء API منفصل للأعداد
```

---

#### إصلاح [1.0.3] - زر Download Project غير قابل للنقر
**المشكلة:** الزر يظهر تحت الهيدر بسبب z-index منخفض

**الملف:** `src/components/admin/files-section.tsx`

```diff
- <div className="absolute top-4 right-4 z-10">
+ <div className="absolute top-2 right-2 z-50">
+   <Button size="sm" ...>
```

---

## [1.0.0] - 2026-02-27

### الإصدار الأولي

#### الميزات الأساسية:
- ✨ مستعرض قاعدة البيانات مع CRUD كامل
- ✨ محرر ملفات كامل (Monaco Editor)
- ✨ نظام استيراد البيانات من AlQuran Cloud API
- ✨ إدارة القراء والسور والآيات
- ✨ نظام Themes (Dark/Light)
- ✨ API موثق بالكامل

#### قاعدة البيانات:
- 27 جدول في قاعدة البيانات
- 114 سورة
- 6,236 آية
- 20 قارئ

---

## كيفية إنشاء إصدار جديد

### لإصلاح مشكلة (Patch):
1. تحديث رقم الإصدار في `VERSION` من `1.0.0` إلى `1.0.1`
2. إنشاء ملف في `changelog/v1.0.1.md`
3. توثيق المشكلة والحل

### لإضافة ميزة (Minor):
1. تحديث رقم الإصدار في `VERSION` من `1.0.0` إلى `1.1.0`
2. إنشاء ملف في `changelog/v1.1.0.md`
3. توثيق الميزة الجديدة

### لتغيير جذري (Major):
1. تحديث رقم الإصدار في `VERSION` من `1.0.0` إلى `2.0.0`
2. إنشاء ملف في `changelog/v2.0.0.md`
3. توثيق جميع التغييرات الجذرية

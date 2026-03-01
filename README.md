# 📖 Quran Application

تطبيق قرآني متكامل مبني بأحدث التقنيات، يوفر تجربة قراءة واستماع راقية للقرآن الكريم.

---

## ✨ المميزات الرئيسية

### 📚 عرض المصحف
- عرض المصحف بطرق متعددة (نصي، صور، خط TTF)
- التنقل السلس بين السور والآيات
- دعم التجويد والتلوين

### 🎧 الاستماع للقرآن
- مكتبة قراء متعددة
- تشغيل الصوت على مستوى الآية
- إمكانية تحميل الملفات الصوتية

### 📖 التفاسير
- تفسير ابن كثير
- تفسير الجلالين
- تفسير الميسر

### 🔍 البحث
- بحث متقدم في الآيات
- بحث دلالي (Semantic Search)

### 🛠️ لوحة التحكم
- إدارة قاعدة البيانات (DB Manager)
- محرر ملفات متكامل (Monaco Editor)
- استيراد البيانات من APIs خارجية
- إدارة القراء والسور

---

## 🛠️ التقنيات المستخدمة

### Core
- **Next.js 16** - React Framework
- **TypeScript** - Type Safety
- **Tailwind CSS** - Styling
- **Prisma** - ORM

### UI Components
- **shadcn/ui** - Component Library
- **Lucide React** - Icons
- **Framer Motion** - Animations

### State Management
- **Zustand** - State Management
- **TanStack Query** - Data Fetching

---

## 🚀 البدء السريع

```bash
# تثبيت المتطلبات
bun install

# إعداد قاعدة البيانات
bunx prisma generate

# تشغيل الخادم
bun run dev
```

افتح [http://localhost:3000](http://localhost:3000) في المتصفح.

---

## 📁 هيكل المشروع

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Endpoints
│   ├── admin/             # لوحة التحكم
│   └── quran/             # صفحات القرآن
├── components/            # React Components
│   ├── ui/               # shadcn/ui components
│   ├── quran/            # مكونات القرآن
│   └── admin/            # مكونات لوحة التحكم
├── hooks/                 # Custom Hooks
├── stores/                # Zustand Stores
└── lib/                   # Utilities
```

---

## 📖 التوثيق والتطوير

### للنماذج الذكية والمطورين

إذا كنت نموذج ذكاء اصطناعي أو مطبر يعمل على هذا المشروع، اقرأ الملفات التالية:

| الملف | الوصف |
|-------|-------|
| [AI_INSTRUCTIONS.md](./AI_INSTRUCTIONS.md) | تعليمات للنماذج الذكية |
| [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) | دليل التطوير الكامل |
| [VERSION](./VERSION) | رقم الإصدار الحالي |
| [changelog/CHANGELOG.md](./changelog/CHANGELOG.md) | سجل التغييرات |

### منهجية التوثيق

نستخدم **Semantic Versioning** مع التوثيق الإلزامي:

```
MAJOR.MINOR.PATCH (مثال: 1.2.6)
```

- **PATCH** (1.2.5 → 1.2.6): إصلاح أخطاء
- **MINOR** (1.2.6 → 1.3.0): ميزات جديدة
- **MAJOR** (1.3.0 → 2.0.0): تغييرات جذرية

---

## 🗄️ قاعدة البيانات

### الجداول الرئيسية
- `Surah` - السور (114 سورة)
- `Ayah` - الآيات (6,236 آية)
- `Reciter` - القراء
- `RecitationAyah` - الملفات الصوتية

### إدارة قاعدة البيانات
- واجهة DB Manager متكاملة
- محرر SQL مع استعلامات جاهزة
- نظام Backup و Restore
- Import/Export بصيغ متعددة

---

## 🔗 API Reference

### القرآن
- `GET /api/surahs` - قائمة السور
- `GET /api/ayah?surahId=X` - آيات سورة
- `GET /api/recitations` - التلاوات

### الإدارة
- `GET /api/admin/db/tables` - جداول قاعدة البيانات
- `POST /api/admin/db/query` - تنفيذ SQL
- `POST /api/admin/db/backup` - إنشاء نسخة احتياطية

---

## 📝 الإصدار الحالي

**الإصدار**: 1.3.0

آخر التحديثات:
- ✅ محرر SQL متقدم مع Monaco Editor و Autocomplete
- ✅ تصور هيكل قاعدة البيانات (ER Diagram)
- ✅ محرر البيانات مع CRUD كامل
- ✅ نظام صلاحيات متعدد المستويات
- ✅ مراقبة أداء قاعدة البيانات

انظر [changelog/CHANGELOG.md](./changelog/CHANGELOG.md) للتفاصيل الكاملة.

---

## 📜 الترخيص

هذا المشروع مفتوح المصدر.

---

## 🤝 المساهمة

راجع [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) لمعرفة كيفية المساهمة في المشروع.

---

**Repository**: [github.com/wweziz0001/Quran_app](https://github.com/wweziz0001/Quran_app)

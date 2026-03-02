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

**الإصدار**: 2.0.0
**تاريخ الإصدار**: 2025-03-02

آخر التحديثات:

انظر [changelog/CHANGELOG.md](./changelog/CHANGELOG.md) للتفاصيل الكاملة.

---
🚀 تعليمات تشغيل الـ Microservices محلياً
1️⃣ متطلبات التشغيل
تأكد من تثبيت:

Bun (وقت التشغيل)
FFmpeg (للمعالجة الصوتية - اختياري)
2️⃣ تشغيل التطبيق الرئيسي
```bash
# التطبيق الرئيسي يعمل تلقائياً على منفذ 3000
bun run dev
```
3️⃣ تشغيل الـ Microservices
لكل خدمة يمكنك تشغيلها بشكل منفصل:

```bash

# AI Service (منفذ 3007)
cd services/ai-service && bun run dev

# Audio Service (منفذ 3002)
cd services/audio-service && bun run dev

# Search Service (منفذ 3003)
cd services/search-service && bun run dev

# Quran Service (منفذ 3001)
cd services/quran-service && bun run dev

# Tafsir Service (منفذ 3004)
cd services/tafsir-service && bun run dev

# Users Service (منفذ 3005)
cd services/users-service && bun run dev

# Reciter Service (منفذ 3006)
cd services/reciter-service && bun run dev

# Admin Service (منفذ 3008)
cd services/admin-service && bun run dev
```

4️⃣ تشغيل جميع الخدمات دفعة واحدة
```bash
# تشغيل جميع الخدمات في الخلفية
cd services/ai-service && bun run dev &
cd services/audio-service && bun run dev &
cd services/search-service && bun run dev &
cd services/quran-service && bun run dev &
cd services/tafsir-service && bun run dev &
cd services/users-service && bun run dev &
cd services/reciter-service && bun run dev &
cd services/admin-service && bun run dev &
```

5️⃣ التحقق من عمل الخدمات
```bash
# فحص صحة كل خدمة
curl http://localhost:3001/health?XTransformPort=3001  # Quran
curl http://localhost:3002/health?XTransformPort=3002  # Audio
curl http://localhost:3003/health?XTransformPort=3003  # Search
curl http://localhost:3007/health?XTransformPort=3007  # AI
```

6️⃣ استخدام Docker (للإنتاج)
```bash
# تشغيل جميع الخدمات مع Docker Compose
docker-compose up -d

# أو بناء وتشغيل خدمة محددة
docker build -t quran-ai-service ./services/ai-service
docker run -p 3007:3007 quran-ai-service
```

7️⃣ هيكلية الطلب عبر Gateway
عند الطلب من الـ API Routes، يتم تمرير XTransformPort:

```javascript
// مثال: طلب من AI Service
fetch('/api/embeddings?XTransformPort=3007', {
  method: 'POST',
  body: JSON.stringify({ ayahId: 1 })
})
```
8️⃣ المنافذ المستخدمة

| الوصف | المنفذ | الخدمة |
|-------|-------|-------|
| Next.js |	3000 | التطبيق الرئيسي |
| quran-service |	3001 | السور والآيات |
| audio-service |	3002 |	الصوتيات والبث
| search-service |	3003 |	البحث
| tafsir-service |	3004 |	التفاسير
| users-service |	3005 |	المستخدمين
| reciter-service |	3006 |	القراء
| ai-service |	3007 |	الذكاء الاصطناعي
| admin-service |	3008 |	الإدارة

⚠️ ملاحظات مهمة
للتطوير المحلي: يمكنك الاكتفاء بتشغيل Next.js فقط (الخدمات الاختيارية)
للإنتاج: استخدم Docker Compose أو Kubernetes
Gateway: تأكد من أن Caddy يعمل لتوجيه الطلبات


## 📜 الترخيص

هذا المشروع مفتوح المصدر.

---

## 🤝 المساهمة

راجع [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) لمعرفة كيفية المساهمة في المشروع.

---

**Repository**: [github.com/wweziz0001/Quran_app](https://github.com/wweziz0001/Quran_app)

# Quran Application - Changelog

## نظرة عامة
هذا الملف يحتوي على سجل جميع التغييرات والإصدارات.

### ترقيم الإصدارات
- **Major (X.0.0)**: تغييرات جذرية أو إعادة بناء كاملة
- **Minor (1.X.0)**: إضافة ميزات جديدة
- **Patch (1.0.X)**: إصلاح أخطاء ومشاكل

### الرموز المستخدمة
- 🟢 كود جديد (تمت إضافته)
- 🔴 كود قديم (تمت إزالته)
- 🔧 إصلاح
- ✨ ميزة جديدة
- 📝 توثيق
- 🎨 تحسينات التصميم
- 🏗️ تغيير معماري

---

## [3.0.1] - 2026-03-02

### 🔧 الإصلاحات

#### تحديث سكربت التشغيل التلقائي (setup_and_run.sh)

**المشكلة:**
سكربت `setup_and_run.sh` لم يكن يشغل جميع الخدمات المصغرة (8 خدمات).

**الحل:**
إعادة كتابة السكربت بالكامل مع:
- استخدام مسارات مطلقة
- دالة `start_service()` لتشغيل كل خدمة
- مجلد سجلات منفصل `/logs`
- فحص صحة الخدمات بعد التشغيل

**الملفات المتأثرة:**
- `setup_and_run.sh` - إعادة كتابة كاملة
- `stop_all.sh` - ملف جديد لإيقاف الخدمات

**النتيجة:**
- ✅ تشغيل جميع الخدمات الـ 8 + التطبيق الرئيسي
- ✅ سجلات منفصلة في `/logs/`
- ✅ سكربت إيقاف `stop_all.sh`

**التفاصيل:** انظر `changelog/v3.0.1.md`

---

## [3.0.0] - 2026-03-02

### 🏗️ تغيير معماري جوهري - تحويل كامل للـ Microservices

#### الهدف
تحويل التطبيق من Monolithic إلى Microservices Architecture بالكامل، بحيث تتصل جميع API Routes بالخدمات المصغرة عبر HTTP.

#### Service Clients الجديدة
| الملف | الخدمة | المنفذ |
|-------|--------|--------|
| `src/lib/quran-service-client.ts` | quran-service | 3001 |
| `src/lib/tafsir-service-client.ts` | tafsir-service | 3004 |
| `src/lib/users-service-client.ts` | users-service | 3005 |
| `src/lib/reciter-service-client.ts` | reciter-service | 3006 |
| `src/lib/admin-service-client.ts` | admin-service | 3008 |

#### API Routes المحولة
جميع API Routes الآن تتواصل مع الخدمات المصغرة:

| Route | الخدمة |
|-------|--------|
| `/api/surahs` | quran-service |
| `/api/ayah` | quran-service + tafsir-service |
| `/api/mushaf-editions` | quran-service |
| `/api/mushaf-ayahs` | quran-service |
| `/api/recitations` | audio-service + quran-service |
| `/api/reciters` | reciter-service |
| `/api/tafsir` | tafsir-service |
| `/api/search` | search-service + quran-service |
| `/api/auth/login` | users-service |
| `/api/auth/register` | users-service |

#### البنية الجديدة
```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Application                       │
│                    (Frontend + API Gateway)                  │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP Calls
        ┌───────────────────┼───────────────────┐
        │                   │                   │
   ┌────▼────┐        ┌─────▼─────┐       ┌────▼────┐
   │ quran-  │        │  audio-   │       │ search- │
   │ service │        │  service  │       │ service │
   │  :3001  │        │   :3002   │       │  :3003  │
   └────┬────┘        └─────┬─────┘       └────┬────┘
        │                   │                   │
   ┌────▼────┐        ┌─────▼─────┐       ┌────▼────┐
   │ tafsir- │        │  users-   │       │reciter- │
   │ service │        │  service  │       │ service │
   │  :3004  │        │   :3005   │       │  :3006  │
   └────┬────┘        └─────┬─────┘       └────┬────┘
        │                   │                   │
   ┌────▼────┐        ┌─────▼─────┐            │
   │   ai-   │        │  admin-   │            │
   │ service │        │  service  │            │
   │  :3007  │        │   :3008   │            │
   └────┬────┘        └─────┬─────┘            │
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                    ┌───────▼───────┐
                    │    SQLite     │
                    │   (Shared)    │
                    └───────────────┘
```

#### المزايا
1. **قابلية التوسع**: كل خدمة يمكن توسيعها بشكل مستقل
2. **العزل**: تعطل خدمة لا يوقف التطبيق بالكامل
3. **الصيانة**: سهولة صيانة وتحديث كل خدمة بشكل منفصل
4. **التطوير**: فرق متعددة يمكنها العمل على خدمات مختلفة

**التفاصيل:** انظر `changelog/v3.0.0.md`

---

## [2.0.3] - 2026-03-02

### 🔧 الإصلاحات

#### تفعيل الخدمات المصغرة (Microservices Activation)

**المشكلة:**
الخدمات المصغرة (8 خدمات) لم تكن تعمل بسبب مشاكل في:
- مسارات الاستيراد `../../shared/db` غير صحيحة
- عدم وجود `@quran/shared` كـ dependency
- API التحقق من صحة الخدمات يستخدم Gateway غير مُعد بشكل صحيح

**الحل:**
1. إصلاح مسارات الاستيراد: `import { db } from '@quran/shared/db'`
2. إضافة `@quran/shared: "file:../shared"` في package.json لكل خدمة
3. تعديل API للاتصال المباشر بالخدمات

**الملفات المتأثرة:**
- `services/*/package.json` - إضافة @quran/shared
- `services/*/src/**/*.ts` - إصلاح مسارات الاستيراد
- `src/app/api/admin/deployment/services-health/route.ts` - الاتصال المباشر

**النتيجة:**
- ✅ 8 خدمات مصغرة تعمل بنجاح
- ✅ جميع الخدمات تظهر في واجهة `/admin/deployment`

| الخدمة | المنفذ | الحالة |
|--------|--------|--------|
| quran-service | 3001 | ✅ healthy |
| audio-service | 3002 | ✅ healthy |
| search-service | 3003 | ✅ healthy |
| tafsir-service | 3004 | ✅ healthy |
| users-service | 3005 | ✅ healthy |
| reciter-service | 3006 | ✅ healthy |
| ai-service | 3007 | ✅ healthy |
| admin-service | 3008 | ✅ healthy |

**التفاصيل:** انظر `changelog/v2.0.3.md`

---

## [2.0.2] - 2025-03-02

### ✨ ميزة جديدة

#### إضافة سكربت إعداد وتشغيل تلقائي (setup_and_run.sh)

**الهدف:**
تسهيل عملية إعداد وتشغيل المشروع للمطورين الجدد، بحيث يمكنهم تشغيل المشروع بأمر واحد فقط.

**الميزات:**
1. تثبيت Bun تلقائياً إذا لم يكن مثبت
2. تحميل متغيرات البيئة وجعلها دائمة في ~/.bashrc
3. إنشاء ملف .env تلقائياً مع DATABASE_URL
4. تثبيت جميع الاعتماديات المطلوبة
5. توليد Prisma Client
6. تطبيق قاعدة البيانات
7. تشغيل خادم التطوير تلقائياً

**الملف الجديد:**
- `setup_and_run.sh` - سكربت شل للإعداد والتشغيل التلقائي (قابل للتنفيذ)

**طريقة الاستخدام:**
```bash
bash setup_and_run.sh
# أو
./setup_and_run.sh
```

**النتيجة:**
- ✅ تقليل خطوات الإعداد من عدة خطوات إلى أمر واحد
- ✅ التثبيت التلقائي لـ Bun
- ✅ إعداد ملف .env تلقائياً
- ✅ تشغيل المشروع جاهزاً للعمل

**التفاصيل:** انظر `changelog/v2.0.2.md`

---

## [2.0.1] - 2025-03-02

### 🔧 الإصلاحات

#### إصلاح تعريف حقول ID و updatedAt في نماذج المصاحف

**المشكلة:**
حقول `id` في نماذج `ImageMushafEdition` و `TtfMushafEdition` لم يكن لديها قيمة افتراضية، وحقل `updatedAt` لم يكن يستخدم `@updatedAt` التلقائي.

**السبب:**
نسيان إضافة `@default(cuid())` للـ ID و `@updatedAt` للحقل المحدث.

**الحل:**
1. إضافة `@default(cuid())` إلى حقل `id` في `ImageMushafEdition`
2. إضافة `@updatedAt` إلى حقل `updatedAt` في `ImageMushafEdition`
3. إضافة `@default(cuid())` إلى حقل `id` في `TtfMushafEdition`
4. إضافة `@updatedAt` إلى حقل `updatedAt` في `TtfMushafEdition`

**الملفات المتأثرة:**
- `prisma/schema.prisma` - تحديث نماذج ImageMushafEdition و TtfMushafEdition

**النتيجة:**
- ✅ حقول ID تولد تلقائياً باستخدام cuid() عند إنشاء سجلات جديدة
- ✅ حقول updatedAt تحدث تلقائياً عند تعديل السجلات
- ✅ تحسين توافق قاعدة البيانات مع الـ ORM

**التفاصيل:** انظر `changelog/v2.0.1.md`

---

## [2.0.0] - 2025-03-01

### 🏗️ تغيير معماري جوهري - توحيد هيكلية الخدمات

#### الهدف
توحيد هيكلية الخدمات لبيئة إنتاج قابلة للتوسع، حيث يكون كل المنطق في microservices وتتصل API Routes بالخدمات عبر HTTP.

#### Service Clients الجديدة
| الملف | الوصف |
|-------|-------|
| `src/lib/ai-service-client.ts` | عميل خدمة AI (منفذ 3007) |
| `src/lib/audio-service-client.ts` | عميل خدمة Audio (منفذ 3002) |
| `src/lib/search-service-client.ts` | عميل خدمة Search (منفذ 3003) |
| `src/lib/arabic-normalizer.ts` | أداة تطبيع النصوص العربية |

#### الملفات المنقولة
- جميع ملفات `src/services/ai/` → `services/ai-service/src/services/`
- جميع ملفات `src/services/audio/` → `services/audio-service/src/services/`
- جميع ملفات `src/services/search*` → `services/search-service/src/services/`
- `src/lib/z-ai-client.ts` → `services/ai-service/src/lib/`

#### الملفات المحذوفة
- ❌ `src/services/ai/` (نُقل بالكامل)
- ❌ `src/services/search-service.ts`
- ❌ `src/services/elasticsearch.ts`
- ❌ `src/services/autocomplete.ts`
- ❌ `src/services/arabic-normalizer.ts`
- ❌ معظم ملفات `src/services/audio/`

#### API Routes المحدثة
جميع API Routes الآن تستخدم Service Clients للتواصل مع microservices عبر HTTP.

**التفاصيل:** انظر `changelog/v2.0.0.md`

---

## [2.0.1] - 2025-03-02

### 🔧 الإصلاحات

#### إصلاح تعريف حقول ID و updatedAt في نماذج المصاحف

**المشكلة:**
حقول `id` في نماذج `ImageMushafEdition` و `TtfMushafEdition` لم يكن لديها قيمة افتراضية، وحقل `updatedAt` لم يكن يستخدم `@updatedAt` التلقائي.

**السبب:**
نسيان إضافة `@default(cuid())` للـ ID و `@updatedAt` للحقل المحدث.

**الحل:**
1. إضافة `@default(cuid())` إلى حقل `id` في `ImageMushafEdition`
2. إضافة `@updatedAt` إلى حقل `updatedAt` في `ImageMushafEdition`
3. إضافة `@default(cuid())` إلى حقل `id` في `TtfMushafEdition`
4. إضافة `@updatedAt` إلى حقل `updatedAt` في `TtfMushafEdition`

**الملفات المتأثرة:**
- `prisma/schema.prisma` - تحديث نماذج ImageMushafEdition و TtfMushafEdition

**النتيجة:**
- ✅ حقول ID تولد تلقائياً باستخدام cuid() عند إنشاء سجلات جديدة
- ✅ حقول updatedAt تحدث تلقائياً عند تعديل السجلات
- ✅ تحسين توافق قاعدة البيانات مع الـ ORM

**التفاصيل:** انظر `changelog/v2.0.1.md`

---

## [1.9.0] - 2025-01-XX

### ✨ الميزات الجديدة - Stage 5: Audio Streaming Scaffold

#### نظام بث الصوت الاحترافي (Professional Audio Streaming)

تم إنشاء نظام متكامل لبث الصوت يشمل:

| الميزة | الوصف |
|--------|-------|
| **HLS Streaming** | بث HTTP Live Streaming بجودات متعددة |
| **Adaptive Bitrate** | 64k, 128k, 192k, 256k |
| **Pre-signed URLs** | روابط آمنة موقعة للبث |
| **Redis Caching** | تخزين مؤقت للروابط والمetadata |
| **FFmpeg Integration** | تحويل ومعالجة الصوت |

#### الملفات الجديدة

**src/services/audio/**
- `hls-converter.ts` - تحويل الصوت إلى HLS (~400 سطر)
- `storage.ts` - التخزين المحلي/S3 (~300 سطر)
- `cache.ts` - Redis caching (~250 سطر)
- `audio-processor.ts` - معالجة الصوت (~350 سطر)
- `pre-signed.ts` - روابط موقعة (~200 سطر)
- `index.ts` - نقطة الدخول الرئيسية

**src/app/api/audio/**
- `stream/route.ts` - GET بث الصوت
- `upload/route.ts` - POST رفع الملفات
- `process/route.ts` - POST/GET معالجة الصوت
- `status/route.ts` - GET/DELETE حالة المعالجة

**mini-services/audio-processor/**
- `index.ts` - خدمة المعالجة الخلفية
- `package.json` - إعدادات الحزمة

**scripts/**
- `convert-to-hls.ts` - تحويل الصوت إلى HLS
- `sync-audio-files.ts` - مزامنة الملفات من API خارجي

**التفاصيل:** انظر `changelog/v1.9.0.md`

---

## [1.8.1] - 2025-01-XX

### 🔧 الإصلاحات

#### إصلاح خطأ Prisma في استعلامات Mushaf

**المشكلة:**
خطأ `Unknown field ImageMushafWord for select statement` عند الوصول إلى `/api/admin/image-mushaf` و `/api/admin/ttf-mushaf`.

**السبب:**
محاولة عد `ImageMushafWord` و `TtfMushafWord` من Edition بينما هي مرتبطة بـ Ayah وليست Edition مباشرة.

**الحل:**
إزالة الحقول غير الموجودة من استعلامات `_count`:
- `ImageMushafWord` و `ImageMushafLine` من `image-mushaf/route.ts`
- `TtfMushafWord` من `ttf-mushaf/route.ts`

**الملفات المتأثرة:**
- `src/app/api/admin/image-mushaf/route.ts`
- `src/app/api/admin/ttf-mushaf/route.ts`

**التفاصيل:** انظر `changelog/v1.8.1.md`

---

## [1.8.0] - 2025-01-18

### ✨ الميزات الجديدة - Stage 4: AI Embeddings Scaffold

#### نظام البحث الدلالي والذكاء الاصطناعي

تم إنشاء نظام متكامل للبحث الدلالي والإجابة على الأسئلة القرآنية باستخدام الذكاء الاصطناعي.

| الميزة | الوصف |
|--------|-------|
| **Semantic Search** | البحث بالمعنى وليس بالكلمات فقط |
| **Hybrid Search** | دمج البحث النصي مع البحث الدلالي |
| **Question Answering** | الإجابة على أسئلة المستخدمين حول القرآن |
| **AI Tafsir** | تفسير ذكي للآيات القرآنية |
| **Recommendations** | اقتراح آيات مشابهة ومكملة |

#### الملفات الجديدة

**src/lib/**
- `z-ai-client.ts` - عميل Z-AI SDK

**src/services/ai/**
- `embeddings.ts` - خدمة Embeddings (~200 سطر)
- `semantic-search.ts` - البحث الدلالي (~180 سطر)
- `question-answering.ts` - نظام QA (~250 سطر)
- `tafsir-ai.ts` - تفسير AI (~280 سطر)
- `recommendations.ts` - الاقتراحات (~220 سطر)

**src/app/api/ai/**
- `embeddings/route.ts` - API الـ Embeddings
- `search/route.ts` - API البحث الدلالي
- `chat/route.ts` - API المحادثة/QA
- `tafsir/route.ts` - API التفسير الذكي
- `recommendations/route.ts` - API الاقتراحات

**scripts/**
- `generate-embeddings.ts` - توليد الـ Embeddings
- `test-embeddings.ts` - اختبار النظام
- `benchmark-search.ts` - قياس الأداء

**التفاصيل:** انظر `changelog/v1.8.0.md`

---

## [1.7.1] - 2025-01-18

### 🔧 الإصلاحات

#### إصلاح البحث العربي

**المشكلة:** البحث عن "الله" أو "بسم" لم يرجع أي نتائج رغم وجود الآيات في قاعدة البيانات.

**السبب:** 
1. الألف الموصولة `ٱ` (U+0671) كانت في DIACRITICS فتُحذف بدلاً من تحويلها إلى `ا`
2. SQLite `LIKE` لا يدعم البحث التقريبي للنصوص المُطبَّعة

**الحل:**
1. إزالة `'\u0671'` من DIACRITICS في `arabic-normalizer.ts`
2. تحسين البحث ليستخدم Memory-based Normalized Search

**النتيجة:**
```
البحث عن "بسم": 117 نتيجة ✅
البحث عن "الله": 1842 نتيجة ✅
البحث عن "الرحمن": 159 نتيجة ✅
```

**الملفات المتأثرة:**
- `src/services/arabic-normalizer.ts` - إصلاح تحويل الألف الموصولة
- `src/app/api/search/route.ts` - تحسين البحث بالتطبيع

**التفاصيل:** انظر `changelog/v1.7.1.md`

---

## [1.7.0] - 2025-01-18

### ✨ الميزات الجديدة - Stage 3: Elasticsearch Arabic Analyzer Scaffold

#### محرك بحث عربي متقدم للقرآن الكريم

تم إنشاء نظام بحث متكامل يدعم:

| الميزة | الوصف |
|--------|-------|
| **Arabic Normalization** | تطبيع الحروف العربية (أ، إ، آ → ا) |
| **Diacritics Handling** | إزالة التشكيل تلقائياً للبحث |
| **Synonyms Support** | دعم المرادفات (118+ مرادف قرآني) |
| **Autocomplete** | اقتراحات تلقائية أثناء الكتابة |
| **Fuzzy Search** | بحث تقريبي للكلمات غير الدقيقة |
| **Reference Search** | البحث بالمرجع (2:255، البقرة:255) |

#### الملفات الجديدة

**مجلد elastic/ (12 ملف):**
- `docker-compose.yml` - Elasticsearch 8.11 + Kibana
- `quran-index.json` - تكامل الفهرس الكامل
- `arabic-analyzer.json` - المحلل العربي المخصص
- `synonyms.txt` - 118+ مرادف قرآني
- `stopwords_ar.txt` - كلمات التوقف العربية
- `scripts/` - 4 سكربتات (create-index, index-ayahs, reindex, test-search)

**مجلد src/services/ (4 ملفات):**
- `arabic-normalizer.ts` - تطبيع النصوص العربية (~350 سطر)
- `elasticsearch.ts` - عميل Elasticsearch (~400 سطر)
- `search-service.ts` - خدمة البحث المتقدمة (~300 سطر)
- `autocomplete.ts` - خدمة الاقتراحات (~250 سطر)

**API Endpoints:**
- `src/app/api/search/route.ts` - البحث الرئيسي (GET/POST)
- `src/app/api/search/suggest/route.ts` - اقتراحات Autocomplete
- `src/app/api/search/advanced/route.ts` - البحث المتقدم مع فلاتر

**التفاصيل:** انظر `changelog/v1.7.0.md`

---

## [1.6.1] - 2025-01-17

### 🔧 الإصلاحات

#### ربط تبويب Deployment بـ Microservices

**المشكلة:**
تبويب `/admin/deployment` كان يعرض بيانات محاكاة (simulated) بدلاً من البيانات الحقيقية من الخدمات المصغرة.

**الحل:**
- إنشاء API endpoint جديد للتحقق من حالة الخدمات
- تحديث DeploymentSection للاتصال الفعلي بالخدمات المصغرة
- إضافة ملخص الحالة ووقت الاستجابة

**الملفات المتأثرة:**
- `src/app/api/admin/deployment/services-health/route.ts` - 🟢 جديد
- `src/components/admin/deployment-section.tsx` - تحديث شامل

**النتيجة:**
- ✅ الاتصال الفعلي بالخدمات المصغرة
- ✅ عرض الحالة الحقيقية لكل خدمة
- ✅ ملخص سريع (healthy/unhealthy/not_running)

**التفاصيل:** انظر `changelog/v1.6.1.md`

---

## [1.6.0] - 2025-01-17

### ✨ الميزات الجديدة - Stage 2: Microservices Scaffold

#### تحويل إلى بنية Microservices

تم تحويل التطبيق من Monolithic إلى بنية Microservices مع 8 خدمات مستقلة:

| الخدمة | المنفذ | الوصف |
|--------|--------|-------|
| `quran-service` | 3001 | السور، الآيات، المصاحف |
| `audio-service` | 3002 | القراء، التلاوات، البث الصوتي |
| `search-service` | 3003 | البحث، تكامل Elasticsearch |
| `tafsir-service` | 3004 | التفاسير، الترجمات |
| `users-service` | 3005 | المصادقة، المستخدمين، الجلسات |
| `reciter-service` | 3006 | إدارة القراء |
| `ai-service` | 3007 | الـ embeddings، ميزات AI |
| `admin-service` | 3008 | لوحة التحكم، إدارة قاعدة البيانات |

#### الملفات الجديدة

**الخدمات (services/):**
- `services/shared/` - الوحدة المشتركة (db, types, middleware, utils)
- `services/quran-service/` - خدمة القرآن
- `services/audio-service/` - خدمة الصوتيات
- `services/search-service/` - خدمة البحث
- `services/tafsir-service/` - خدمة التفاسير
- `services/users-service/` - خدمة المستخدمين
- `services/reciter-service/` - خدمة القراء
- `services/ai-service/` - خدمة الذكاء الاصطناعي
- `services/admin-service/` - خدمة الإدارة

**Kubernetes (k8s/):**
- `k8s/namespace.yaml` - Namespace
- `k8s/configmaps/app-config.yaml` - ConfigMap
- `k8s/secrets/app-secrets.yaml` - Secrets
- `k8s/deployments/` - 6 ملفات Deployment
- `k8s/services/` - 6 ملفات Service
- `k8s/ingress.yaml` - Ingress

**Docker:**
- `docker-compose.yml` - للتطوير المحلي
- Dockerfile لكل خدمة

**التفاصيل:** انظر `changelog/v1.6.0.md`

---

## [1.5.2] - 2025-01-16

### 🔧 الإصلاحات

#### إصلاح Schema Visualizer لعرض الجداول الجديدة

**المشكلة:** الجداول الجديدة (search_indices, analytics, notifications, etc.) لم تكن تظهر في تبويب Schema مع columns وعلاقاتها.

**الحل:** تحديث APIs لقراءة `@@map` من Prisma Schema بشكل صحيح.

**النتيجة:**
- ✅ 42 جدول مع جميع الـ columns
- ✅ 34 علاقة بين الجداول (كانت 23)
- ✅ جميع الجداول الجديدة تظهر مع علاقاتها

**التفاصيل:** انظر `changelog/v1.5.2.md`

---

## [1.5.1] - 2025-01-16

### ✨ الميزات الجديدة - استكمال Stage 1

#### إكمال الملفات الناقصة لـ Stage 1

بعد إضافة الجداول الجديدة في v1.5.0، تم إنشاء الملفات الناقصة:

**الملفات الجديدة:**
- `prisma/seed.ts` - بيانات أولية (7 قواعد تجويد + 5 ميزات + 6 إعدادات + 114 slug)
- `src/types/database.ts` - أنواع TypeScript للجداول الجديدة
- 5 API endpoints جديدة (search-index, notifications, analytics, feature-flags, tajweed-rules)

**التفاصيل:** انظر `changelog/v1.5.1.md`

---

## [1.5.0] - 2025-01-16

### ✨ الميزات الجديدة - Stage 1: Enterprise Database Schema

#### إضافة 11 جدول جديد
- **SearchIndex** - فهرس البحث الدلالي (AI-powered search)
- **WordAnalysis** - تحليل الكلمات صرفياً
- **Notification** - نظام إشعارات المستخدمين
- **Analytics** - تحليلات الاستخدام
- **UserSession** - جلسات المستخدمين
- **TajweedRule** - قواعد التجويد (7 قواعد)
- **AudioFile** - ملفات الصوت HLS
- **Collection/CollectionItem** - مجموعات المستخدم
- **APILog** - سجل طلبات API
- **FeatureFlag** - ميزات التطبيق (5 ميزات)

#### تحديثات النماذج
- Soft Delete لـ 6 نماذج (Ayah, Reciter, Recitation, User, TafsirEntry, TranslationEntry)
- Slug للسور (114 slug)
- علاقات جديدة بين الجداول

#### الملفات الجديدة
- `prisma/seed.ts` - بيانات أولية
- `src/types/database.ts` - TypeScript types
- 3 API endpoints جديدة

**التفاصيل:** انظر `changelog/v1.5.0.md`

---

## [1.4.1] - 2025-01-16

### 🔧 الإصلاحات

#### إصلاح تبويب Schema في Database Management

**المشكلة:**
تبويب Schema لا يظهر محتويات الجداول ولا العلاقات. كانت الجداول تظهر كـ nodes فارغة.

**السبب:**
API `/api/admin/db/tables` كان يعيد `columns: []` فارغة.

**الحل:**
تحديث API ليعيد الـ columns من Prisma Schema مع foreign keys.

**الملفات المتأثرة:**
- `src/app/api/admin/db/tables/route.ts` - إعادة كتابة كاملة

**النتيجة:**
- ✅ 31 جدول مع جميع الحقول
- ✅ 23 علاقة بين الجداول
- ✅ Primary Keys و Foreign Keys محددة

**التفاصيل:** انظر `changelog/v1.4.1.md`

---

## [1.4.0] - 2025-01-16

### ⚡ تحسينات الأداء

#### إعادة بناء لوحة الإدارة - صفحات منفصلة بدلاً من صفحة واحدة

**المشكلة:**
لوحة الإدارة `/admin` كانت تعاني من بطء شديد بسبب تحميل جميع المكونات (14 مكون) في صفحة واحدة، مع مشكلة Refresh يعود للـ Dashboard.

**الحل:**
تحويل كل تبويب إلى صفحة مستقلة مع layout مشترك، مما يتيح:
- Lazy Loading تلقائي
- URL مختلف لكل تبويب
- Refresh يحافظ على الصفحة الحالية

**الملفات المتأثرة:**
- `src/app/admin/layout.tsx` - 🟢 جديد (Sidebar المشترك)
- `src/app/admin/page.tsx` - 🔴 تبسيط (Dashboard فقط)
- 14 صفحة جديدة في `src/app/admin/*/page.tsx`

**التفاصيل:** انظر `changelog/v1.4.0.md`

---

## [1.3.4] - 2025-03-01

### 🔴 إزالة كود

#### حذف تبويب Database Browser من لوحة الإدارة

**السبب:**
المستخدم لم يعد بحاجة لتبويب Database Browser، ويستخدم DB Manager كبديل أفضل وأكثر تقدماً.

**الملفات المتأثرة:**
- `src/app/admin/page.tsx` - إزالة DatabaseBrowser
- `src/components/admin/database-browser.tsx` - 🔴 حذف الملف بالكامل

**التفاصيل:** انظر `changelog/v1.3.4.md`

---

## [1.3.3] - 2025-03-01

### 📝 التوثيق

#### إضافة قاعدة التحقق من تشغيل النظام في منهجية التطوير

**المشكلة:**
لم تكن هناك قاعدة واضحة للتحقق من أن النظام يعمل بشكل صحيح. كان يتم الاعتماد فقط على تشغيل الـ dev server كدليل على نجاح التشغيل.

**الحل:**
إضافة قسم جديد "التحقق من تشغيل النظام" في `DEVELOPMENT_GUIDE.md` يتضمن:
- ⚠️ قاعدة واضحة: لا يُعتبر تشغيل service كتشغيل ناجح
- 🎯 المتطلبات: التحقق من 3 واجهات رئيسية (`/`, `/admin`, `/quran`)
- ✅ Checklist للتحقق
- ❌ أمثلة على حالات خاطئة
- 🔧 أمر سريع للتحقق

**الملفات المتأثرة:**
- `DEVELOPMENT_GUIDE.md` - إضافة قسم جديد

**التفاصيل:** انظر `changelog/v1.3.3.md`

---

## [1.3.2] - 2025-03-01

### ✨ الميزات الجديدة

#### Schema Visualizer - تحسينات العرض والعلاقات

**المشكلة:**
- لم تظهر العلاقات بين الجداول
- لم يكن هناك تفاعل عند التأشير على خطوط العلاقات
- الجداول متقاربة جداً

**الحل:**
- ✅ إضافة API لاستخراج العلاقات من Prisma Schema (23 علاقة)
- ✅ إبراز تفاعلي للجداول والحقول عند التأشير على العلاقة
- ✅ زيادة المسافة بين الجداول من 50px إلى 150px

**الملفات المتأثرة:**
- `src/app/api/admin/db/schema/route.ts` (جديد)
- `src/components/admin/database/schema-visualizer.tsx`
- `src/app/admin/page.tsx`

**التفاصيل:** انظر `changelog/v1.3.2.md`

---

## [1.3.1] - 2025-01-19

### 🔧 الإصلاحات

#### إصلاح جميع مشاكل مدير قواعد البيانات

**المشاكل التي تم إصلاحها:**

1. **Dashboard**: أزرار Quick Actions + Pagination للجداول
2. **Tables**: تعديل البيانات + Scroll bar في الفهرس
3. **Query Editor**: مربع الاستعلام + أزرار التنفيذ
4. **Schema**: عرض الجداول (الإصلاحات الأساسية)
5. **Monitor**: ترتيب المربعات + البيانات الصحيحة
6. **Audit Logs**: تسجيل جميع الأحداث (UPDATE, DELETE)
7. **Permissions**: إضافة تعديل الصلاحيات

**الملفات المتأثرة:**
- `src/components/admin/database/database-manager.tsx`
- `src/components/admin/database/schema-visualizer.tsx`
- `src/components/admin/database/performance-monitor.tsx`
- `src/app/api/admin/database/data/[table]/[id]/route.ts`

**التفاصيل:** انظر `changelog/v1.3.1.md`

---

## [1.3.0] - 2025-01-19

### ✨ الميزات الجديدة

#### نظام إدارة قواعد البيانات المتكامل (Enterprise-Grade Database Management)

**الميزات المضافة:**
1. **Monaco SQL Editor** - محرر SQL متقدم مع:
   - Syntax Highlighting
   - Autocomplete للجداول والأعمدة
   - Multiple Tabs
   - Query History & Saved Queries
   - اختصارات لوحة المفاتيح

2. **Schema Visualizer** - تصور هيكل قاعدة البيانات:
   - ER Diagram تفاعلي
   - عرض العلاقات بين الجداول
   - Zoom & Pan

3. **Data Editor** - محرر البيانات مع:
   - Inline Editing
   - CRUD Operations
   - Bulk Delete
   - Pagination

4. **Permissions System** - نظام الصلاحيات:
   - ثلاثة أدوار: Viewer, Editor, Admin
   - صلاحيات دقيقة لكل عملية

5. **Performance Monitor** - مراقبة الأداء:
   - Slow Queries Detection
   - Table Statistics
   - Database Health

**الملفات الجديدة:**
- `src/components/admin/database/sql-editor.tsx`
- `src/components/admin/database/schema-visualizer.tsx`
- `src/components/admin/database/data-editor.tsx`
- `src/components/admin/database/performance-monitor.tsx`
- `src/lib/db-permissions.ts`

**الملفات المحدثة:**
- `src/components/admin/database/database-manager.tsx`
- `src/app/api/admin/db/metrics/route.ts`
- `src/app/api/admin/database/data/[table]/route.ts`

**التفاصيل:** انظر `changelog/v1.3.0.md`

---

## [1.2.7] - 2026-02-28

### 📝 التوثيق

#### إضافة نظام تعليمات للنماذج الذكية

**الهدف:**
عند سحب هذا المشروع إلى نموذج ذكاء اصطناعي آخر، يفهم المنهجية ويقوم بتنفيذها تلقائياً.

**الملفات الجديدة:**
- `DEVELOPMENT_GUIDE.md` - دليل التطوير والمساهمة الكامل
- `AI_INSTRUCTIONS.md` - تعليمات موجهة للنماذج الذكية
- `.cursorrules` - قواعد المشروع لـ Cursor وغيرها

**الملفات المحدثة:**
- `README.md` - تحديث شامل ليحتوي على معلومات المشروع الفعلية
- `VERSION` - تحديث من 1.2.6 إلى 1.2.7

**النتيجة:**
- ✅ النماذج الذكية تفهم منهجية التوثيق تلقائياً
- ✅ تطبيق Semantic Versioning بشكل صحيح
- ✅ توثيق كل تغيير في ملف منفصل
- ✅ رفع الفروع إلى GitHub بشكل منظم

**التفاصيل:** انظر `changelog/v1.2.7.md`

---

## [1.2.6] - 2026-02-28

### 🔧 الإصلاحات

#### إصلاح عدم عمل واجهة مدير قواعد البيانات (DB Manager)

**المشكلة:**
جميع تبويبات واجهة مدير قواعد البيانات لم تكن تعمل:
- Dashboard: لا يعرض أي بيانات
- Tables: لا يظهر فيها أي بيانات
- Audit Logs: لا يظهر فيها أي بيانات
- Backup: الأزرار لا تعمل
- Import/Export: لا تعمل الأزرار

**الأسباب والإصلاحات:**

1. **عدم وجود ملف `.env`** - تم إنشاؤه مع `DATABASE_URL`
2. **خطأ BigInt serialization** - تم إصلاحه بإضافة `Number()`
3. **استعلام `dbstat` غير مدعوم** - تم استبداله بقراءة حجم الملف
4. **زر Export بدون handler** - تم إضافة دالة `handleExport`
5. **خطأ reading 'map' of undefined** - تم إضافة fallback للأمان

**الملفات المتأثرة:**
- `.env` (جديد)
- `src/app/api/admin/db/tables/route.ts`
- `src/app/api/admin/db/metrics/route.ts`
- `src/app/api/admin/db/backup/route.ts`
- `src/components/admin/database/database-manager.tsx`

**النتيجة:**
- ✅ Dashboard: 31 جدول، 25,400+ صف، 10.7 MB
- ✅ Tables: استعراض جميع الجداول والبيانات
- ✅ Query Editor: تنفيذ استعلامات SQL
- ✅ Import/Export: تصدير بصيغ JSON/CSV/SQL
- ✅ Backup: إنشاء نسخ احتياطية
- ✅ Audit Logs: جاهز للعمل

**التفاصيل:** انظر `changelog/v1.2.6.md`

---

## [1.2.5] - 2026-02-28

### ✨ ميزة جديدة

#### نظام إدارة قواعد البيانات المتكامل (Enterprise-Grade Database Management)
تحويل مستعرض قاعدة البيانات البسيط إلى نظام إدارة متكامل يشمل:

**المكونات:**
- Dashboard مع إحصائيات شاملة
- إدارة الجداول مع عرض الهيكل والبيانات
- محرر SQL متقدم مع حماية من الاستعلامات الخطرة
- نظام الاستيراد والتصدير (JSON, CSV, SQL)
- إدارة النسخ الاحتياطي
- سجلات التدقيق الكاملة

**الملفات الجديدة:**
- `src/stores/database-store.ts` - Zustand Store
- `src/components/admin/database/database-manager.tsx` - المكون الرئيسي
- `src/app/api/admin/db/*` - API Endpoints

**التفاصيل:** انظر `changelog/v1.2.5.md`

---

## [1.2.4] - 2026-02-28

### 🔧 الإصلاحات

#### إصلاح عرض الملفات الصوتية على مستوى الآية
**المشكلة:** واجهة استعراض الملفات الصوتية للقارئ كانت تعرض الملفات على مستوى السورة الواحدة وليس بحسب الآيات

**السبب:** API endpoint `/api/recitations` كان يجلب بيانات من جدول `Recitation` (مستوى السورة) بدلاً من `RecitationAyah` (مستوى الآية)

**الملفات المتأثرة:**
- `src/app/api/recitations/route.ts` - تغيير الاستعلام لجلب RecitationAyah
- `src/components/admin/reciters-section.tsx` - تحديث الجدول والدوال

**التفاصيل:** انظر `changelog/v1.2.4.md`

---

## [1.2.3] - 2026-02-28

### ⚡ تحسينات الأداء

#### تحسين استيراد الملفات الصوتية (تحسين جذري)
**المشكلة:** عملية استيراد 6,236 ملف صوتي كانت تستغرق **10-15 دقيقة**

**الحل:** تحويل إلى batch operations:
- جلب جميع الآيات في query واحدة
- فحص الموجودات في query واحدة  
- إنشاء Recitations في batch واحد
- إدراج RecitationAyah في batches من 500

**النتيجة:** الوقت انخفض من **10-15 دقيقة** إلى **~5-10 ثواني**

---

## [1.2.2] - 2026-02-28

### 🔧 الإصلاحات

#### إصلاح #1 - قاعدة البيانات للقراءة فقط (readonly database)
**المشكلة:** لم تكن عمليات الكتابة تعمل في قاعدة البيانات

**السبب:** صلاحيات الملف `db/custom.db` لا تسمح بالكتابة

**الحل:** `chmod 666 db/custom.db`

---

#### إصلاح #2 - استيراد الملفات الصوتية لا يعمل
**المشكلة:** عند محاولة استيراد الملفات الصوتية للقراء، تظهر رسالة خطأ

**السبب:** نماذج Prisma تتطلب حقول `id` و `updatedAt` عند إنشاء سجلات جديدة

**الملفات المتأثرة:**
- `src/app/api/recitations/import-bulk/route.ts` - إضافة id و updatedAt
- `src/app/api/admin/import/route.ts` - إضافة id و updatedAt + تصحيح Recitation
- `src/app/api/tafsir/route.ts` - إضافة id و updatedAt
- `src/app/api/settings/route.ts` - إضافة id و updatedAt

---

## [1.2.1] - 2026-02-28

### 🔧 الإصلاحات

#### إصلاح #1 - عدم عمل استيراد الصوتيات من URL في صفحة القراء
**المشكلة:** عند الضغط على "Import Audio from URL" في صفحة القراء، تنتهي العملية دون أي نتيجة

**السبب:** API endpoint `/api/recitations/import-bulk` غير موجود

**الملف:** `src/app/api/recitations/import-bulk/route.ts` (جديد)

---

#### إصلاح #2 - ظهور 7 قراء بدلاً من 8 في قائمة الاستيراد
**المشكلة:** في واجهة استيراد البيانات، يظهر 7 قراء فقط في قائمة "استيراد الملفات الصوتية للآيات"

**السبب:** القارئ "محمد أيوب" لا يملك `apiIdentifier` في قاعدة البيانات

**الحل:** إضافة `apiIdentifier = 'ar.muhammadayyoub'` للقارئ

---

#### إصلاح #3 - عدم استيراد أي ملفات صوتية من واجهة الاستيراد
**المشكلة:** عند اختيار قارئ والضغط على "استيراد الصوت"، تظهر رسالة "تم استيراد 0 ملف صوتي"

**السبب:** عدم وجود آيات في قاعدة البيانات أو عدم وجود `ayahNumberGlobal`

---

### ✨ الميزات المضافة

#### إضافة دعم `apiIdentifier` في API تحديث القارئ
**الملف:** `src/app/api/reciters/[id]/route.ts`

```diff
+ const { ..., apiIdentifier } = body;
  data: {
+   ...(apiIdentifier !== undefined && { apiIdentifier }),
  }
```

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

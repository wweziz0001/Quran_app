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

<<<<<<< Updated upstream
=======
## [2.0.2] - 2025-03-02

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

